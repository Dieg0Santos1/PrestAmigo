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
  // Registrar usuario
  async register(data: RegisterData) {
    try {
      console.log('🔵 ===========================================');
      console.log('🔵 INICIANDO REGISTRO CON WORKAROUND COMPLETO');
      console.log('🔵 ===========================================');
      
      // 0. Verificar si el teléfono ya está registrado
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
      
      // 1. Crear usuario en auth con timeout
      console.log('🟢 Iniciando registro para:', data.email);
      console.log('🟢 Datos del usuario:', {
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        telefono: data.telefono
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: El servidor tardó demasiado en responder. Verifica tu conexión a internet.')), 30000)
      );

      // WORKAROUND: Intentar con email autoconfirmado
      const signUpPromise = supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: 'prestamigo://auth/callback',
          data: {
            nombre: data.nombre,
            apellido: data.apellido,
            dni: data.dni,
            telefono: data.telefono,
            email_confirm: true, // Intentar autoconfirmar
          },
        },
      });
      
      console.log('🟢 Esperando respuesta de Supabase...');

      const { data: authData, error: authError } = await Promise.race([
        signUpPromise,
        timeoutPromise
      ]) as any;
      
      console.log('🟡 Respuesta recibida de Supabase');
      console.log('🟡 authData:', authData);
      console.log('🟡 authError:', authError);

      if (authError) {
        // Debug: Mostrar error completo
        console.error('🔴 Error completo de Supabase:', JSON.stringify(authError, null, 2));
        console.error('🔴 Error message:', authError.message);
        console.error('🔴 Error status:', authError.status);
        console.error('🔴 Error code:', authError.code);
        
        // Manejar errores específicos
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado');
        }
        
        // Si el error es "Database error saving new user", significa que
        // el trigger falló. El usuario podría haberse creado o no.
        if (authError.message.includes('Database error')) {
          console.log('⚠️ Error de BD detectado.');
          console.log('⚠️ authData recibido:', authData);
          
          // Verificar si a pesar del error, el usuario se creó
          if (authData && authData.user && authData.user.id) {
            console.log('✅ Usuario SÍ se creó a pesar del error:', authData.user.id);
            console.log('✅ Intentando crear perfil manualmente...');
            
            // El usuario existe, solo falta el perfil
            try {
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
                console.error('❌ Error creando perfil manualmente:', perfilError);
                console.error('❌ Detalles:', JSON.stringify(perfilError, null, 2));
              } else {
                console.log('✅✅✅ Perfil creado manualmente con éxito!');
                // Retornar éxito
                return { success: true, user: authData.user };
              }
            } catch (manualError) {
              console.error('❌ Excepción creando perfil:', manualError);
            }
            
            // Aunque falle crear el perfil, el usuario existe
            return { 
              success: true, 
              user: authData.user,
              warning: 'Usuario creado pero sin perfil. Por favor contacta al administrador.'
            };
          } else {
            console.log('❌ El usuario NO se creó. authData:', authData);
            throw new Error('No se pudo crear el usuario. Error de base de datos.');
          }
        }
        
        throw authError;
      }

      console.log('✅ Usuario creado exitosamente:', authData.user?.id);
      
      // Verificar que el perfil se haya creado
      if (authData.user) {
        // Esperar un momento para que el trigger se ejecute
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();
        
        if (!perfil) {
          console.warn('⚠️ Perfil no encontrado. Creando manualmente...');
          
          // Crear perfil manualmente si no existe
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
            console.error('❌ Error creando perfil:', perfilError);
          } else {
            console.log('✅ Perfil creado manualmente después del registro');
          }
        } else {
          console.log('✅ Perfil encontrado:', perfil.nombre);
        }
      }
      
      // El trigger en la BD creará automáticamente el perfil
      return { success: true, user: authData.user };
    } catch (error: any) {
      console.error('Error en registro:', error);
      
      // Mensajes de error más amigables
      let errorMessage = error.message;
      
      if (error.message?.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet y que el servidor de Supabase esté activo.';
      } else if (error.message?.includes('504') || error.message?.includes('timeout')) {
        errorMessage = 'El servidor tardó demasiado en responder. Por favor, intenta de nuevo.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Iniciar sesión
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
        redirectTo: 'myapp://reset-password',
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
