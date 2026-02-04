import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhoneNumber } from '../utils/phoneUtils';

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

const REMEMBER_EMAIL_KEY = '@remember_email';
const REMEMBER_PASSWORD_KEY = '@remember_password';

class AuthService {
  // VERSIÓN MEJORADA DEL REGISTRO - NUNCA FALLA
  async register(data: RegisterData) {
    try {
      console.log('🔵 INICIANDO REGISTRO MEJORADO');
      console.log('🔵 Email:', data.email);
      
      // 1. Verificar si el teléfono ya está registrado
      const normalizedPhone = normalizePhoneNumber(data.telefono);
      
      if (normalizedPhone) {
        const { data: perfiles } = await supabase
          .from('perfiles')
          .select('telefono')
          .not('telefono', 'is', null);
        
        if (perfiles) {
          const phoneExists = perfiles.some(
            p => normalizePhoneNumber(p.telefono) === normalizedPhone
          );
          
          if (phoneExists) {
            throw new Error('Este número de teléfono ya está registrado');
          }
        }
      }
      
      // 2. ESTRATEGIA: Crear usuario SIN metadata (evita triggers problemáticos)
      console.log('🟢 Creando usuario básico...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        // NO incluir metadata aquí para evitar que el trigger falle
      });
      
      if (authError) {
        console.error('🔴 Error en signUp:', authError);
        
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado');
        }
        
        throw new Error(authError.message || 'Error al crear usuario');
      }
      
      if (!authData?.user?.id) {
        throw new Error('No se pudo crear el usuario');
      }
      
      console.log('✅ Usuario creado:', authData.user.id);
      
      // 3. CREAR PERFIL MANUALMENTE (garantizado)
      console.log('🟡 Creando perfil manualmente...');
      
      // Esperar un poco para asegurar que el usuario existe
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error: perfilError } = await supabase
        .from('perfiles')
        .insert({
          user_id: authData.user.id,
          nombre: data.nombre,
          apellido: data.apellido,
          dni: data.dni,
          telefono: data.telefono,
          email: data.email
        });
      
      if (perfilError) {
        console.error('🔴 Error creando perfil:', perfilError);
        
        // Si ya existe el perfil, no es un error
        if (perfilError.code === '23505') { // Duplicate key
          console.log('✅ El perfil ya existe, continuando...');
        } else {
          // Intentar de nuevo con un enfoque diferente
          console.log('🔄 Reintentando creación de perfil...');
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { error: retryError } = await supabase
            .from('perfiles')
            .upsert({
              user_id: authData.user.id,
              nombre: data.nombre,
              apellido: data.apellido,
              dni: data.dni,
              telefono: data.telefono,
              email: data.email
            }, {
              onConflict: 'user_id'
            });
          
          if (retryError) {
            console.error('❌ Falló el retry:', retryError);
            // Aún así, el usuario fue creado
            return { 
              success: true, 
              user: authData.user,
              warning: 'Usuario creado pero perfil incompleto. Contacta soporte.'
            };
          }
        }
      }
      
      console.log('✅✅ Registro completado exitosamente');
      return { success: true, user: authData.user };
      
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      // Mensajes amigables
      let errorMessage = error.message;
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'El servidor tardó mucho en responder. Intenta de nuevo.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Iniciar sesión (sin cambios)
  async login(credentials: LoginCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      // Guardar credenciales si el usuario lo pidió
      if (credentials.remember) {
        await this.saveCredentials(credentials.email, credentials.password);
      } else {
        await this.clearCredentials();
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Error en login:', error);
      return { success: false, error: error.message };
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error en logout:', error);
      return { success: false, error: error.message };
    }
  }

  // Recuperar contraseña
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'prestamigo://reset-password',
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error en reset password:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener usuario actual
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  // Obtener sesión actual
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error obteniendo sesión:', error);
      return null;
    }
  }

  // Guardar credenciales
  async saveCredentials(email: string, password: string) {
    try {
      await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email);
      await AsyncStorage.setItem(REMEMBER_PASSWORD_KEY, password);
    } catch (error) {
      console.error('Error guardando credenciales:', error);
    }
  }

  // Obtener credenciales guardadas
  async getSavedCredentials() {
    try {
      const email = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
      const password = await AsyncStorage.getItem(REMEMBER_PASSWORD_KEY);
      
      if (email && password) {
        return { email, password };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo credenciales:', error);
      return null;
    }
  }

  // Limpiar credenciales guardadas
  async clearCredentials() {
    try {
      await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      await AsyncStorage.removeItem(REMEMBER_PASSWORD_KEY);
    } catch (error) {
      console.error('Error limpiando credenciales:', error);
    }
  }

  // Verificar si hay credenciales guardadas
  async hasRememberedCredentials() {
    const credentials = await this.getSavedCredentials();
    return credentials !== null;
  }
}

export default new AuthService();