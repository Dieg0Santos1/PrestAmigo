import { supabase } from '../config/supabase';
import { normalizePhoneNumber } from '../utils/phoneUtils';

export interface PrestamoData {
  deudor: {
    nombre: string;
    apellido: string;
    telefono: string;
    email?: string;
  };
  monto: number;
  tasaInteres: number;
  numeroCuotas: number;
  frecuenciaPago: 'diario' | 'semanal' | 'fin_semana' | 'mensual';
  montoCuota: number;
  montoTotal: number;
}

class PrestamosService {
  // Verificar si un usuario existe por teléfono
  async verificarUsuarioExiste(telefono: string) {
    try {
      const normalizedPhone = normalizePhoneNumber(telefono);
      
      console.log('🔍 Buscando usuario con teléfono normalizado:', normalizedPhone);
      
      if (!normalizedPhone) {
        console.log('❌ Teléfono no válido después de normalizar');
        return { existe: false, userId: null };
      }
      
      // USAR FILTRO DIRECTO EN DB - NO traer toda la tabla
      const { data: profile, error } = await supabase
        .from('perfiles')
        .select('user_id, telefono, nombre, apellido')
        .eq('telefono', normalizedPhone)
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error en query de verificación:', error);
        return { existe: false, userId: null };
      }
      
      if (profile) {
        console.log('✅ Usuario encontrado:', profile.nombre, profile.apellido);
        return { 
          existe: true, 
          userId: profile.user_id,
          nombre: profile.nombre,
          apellido: profile.apellido
        };
      }
      
      console.log('❌ Usuario NO encontrado con teléfono:', normalizedPhone);
      return { existe: false, userId: null };
    } catch (error) {
      console.error('Error verificando usuario:', error);
      return { existe: false, userId: null };
    }
  }

  // Crear un nuevo préstamo
  async crearPrestamo(data: PrestamoData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 1. NORMALIZAR Y VALIDAR que el deudor esté registrado
      const normalizedPhone = normalizePhoneNumber(data.deudor.telefono);
      
      console.log('📞 CREAR PRÉSTAMO - Teléfono original:', data.deudor.telefono);
      console.log('📞 CREAR PRÉSTAMO - Teléfono normalizado:', normalizedPhone);
      
      if (!normalizedPhone) {
        return { 
          success: false, 
          error: 'INVALID_PHONE',
          message: 'Número de teléfono inválido' 
        };
      }
      
      // DEBUG: Intentar buscar de TODAS las formas posibles
      console.log('🔍 Buscando con eq()...');
      let { data: deudorProfile, error: deudorError } = await supabase
        .from('perfiles')
        .select('user_id, telefono')
        .eq('telefono', normalizedPhone)
        .maybeSingle();
      
      if (deudorError) {
        console.error('❌ Error buscando deudor con eq():', deudorError);
      }
      
      console.log('🔍 Resultado de eq():', deudorProfile);
      
      // Si no encontró con eq(), intentar con LIKE
      if (!deudorProfile) {
        console.log('🔍 No encontrado con eq(), probando con like()...');
        const result = await supabase
          .from('perfiles')
          .select('user_id, telefono')
          .like('telefono', `%${normalizedPhone}%`)
          .maybeSingle();
        
        deudorProfile = result.data;
        deudorError = result.error;
        
        if (deudorError) {
          console.error('❌ Error buscando deudor con like():', deudorError);
        }
        
        console.log('🔍 Resultado de like():', deudorProfile);
      }
      
      // Si TODAVÍA no encontró, traer TODOS y buscar manualmente
      if (!deudorProfile) {
        console.log('🔍 No encontrado con like(), trayendo todos los perfiles...');
        const { data: allProfiles } = await supabase
          .from('perfiles')
          .select('user_id, telefono, nombre, apellido');
        
        console.log('🔍 Total de perfiles:', allProfiles?.length);
        console.log('🔍 Algunos teléfonos:', allProfiles?.slice(0, 5).map(p => p.telefono));
        
        if (allProfiles) {
          // Buscar coincidencia exacta
          deudorProfile = allProfiles.find(p => p.telefono === normalizedPhone);
          console.log('🔍 Encontrado con comparación exacta:', deudorProfile);
          
          // Si no, buscar cualquier coincidencia normalizada
          if (!deudorProfile) {
            deudorProfile = allProfiles.find(p => normalizePhoneNumber(p.telefono) === normalizedPhone);
            console.log('🔍 Encontrado con normalize():', deudorProfile);
          }
        }
      }
      
      // Si el deudor NO está registrado, rechazar
      if (!deudorProfile) {
        console.log('❌ Deudor NO encontrado con teléfono:', normalizedPhone);
        return { 
          success: false, 
          error: 'USER_NOT_REGISTERED',
          message: 'Este contacto aún no tiene una cuenta en PrestAmigo' 
        };
      }
      
      const deudorId = deudorProfile.user_id;
      console.log('✅ Deudor encontrado con ID:', deudorId);

      // 2. Crear el préstamo (solo si el deudor existe)
      const { data: prestamo, error: prestamoError } = await supabase
        .from('prestamos')
        .insert({
          prestamista_id: user.id,
          deudor_id: deudorId,
          deudor_nombre: data.deudor.nombre,
          deudor_apellido: data.deudor.apellido,
          deudor_telefono: normalizedPhone, // GUARDAR TELÉFONO NORMALIZADO
          deudor_email: data.deudor.email || null,
          monto_prestado: data.monto,
          tasa_interes: data.tasaInteres,
          numero_cuotas: data.numeroCuotas,
          frecuencia_pago: data.frecuenciaPago,
          monto_cuota: data.montoCuota,
          monto_total: data.montoTotal,
          estado: 'activo',
        })
        .select()
        .single();

      if (prestamoError) throw prestamoError;

      // 3. Generar las cuotas
      const cuotas = this.generarCuotas(
        prestamo.id,
        data.numeroCuotas,
        data.montoCuota,
        data.frecuenciaPago,
        new Date()
      );

      const { error: cuotasError } = await supabase
        .from('cuotas')
        .insert(cuotas);

      if (cuotasError) throw cuotasError;

      return { success: true, prestamo };
    } catch (error: any) {
      console.error('Error creando préstamo:', error);
      return { success: false, error: error.message };
    }
  }

  // Generar cuotas basadas en la frecuencia
  private generarCuotas(
    prestamoId: string,
    numeroCuotas: number,
    montoCuota: number,
    frecuencia: string,
    fechaInicio: Date
  ) {
    const cuotas = [];
    let fechaActual = new Date(fechaInicio);

    for (let i = 1; i <= numeroCuotas; i++) {
      // Calcular la fecha de vencimiento según la frecuencia
      switch (frecuencia) {
        case 'diario':
          fechaActual.setDate(fechaActual.getDate() + 1);
          break;
        case 'semanal':
          fechaActual.setDate(fechaActual.getDate() + 7);
          break;
        case 'fin_semana':
          // Buscar el próximo fin de semana (sábado)
          fechaActual.setDate(fechaActual.getDate() + 1);
          while (fechaActual.getDay() !== 6) {
            fechaActual.setDate(fechaActual.getDate() + 1);
          }
          break;
        case 'mensual':
          fechaActual.setMonth(fechaActual.getMonth() + 1);
          break;
      }

      cuotas.push({
        prestamo_id: prestamoId,
        numero_cuota: i,
        monto: montoCuota,
        fecha_vencimiento: fechaActual.toISOString().split('T')[0],
        estado: 'pendiente',
      });
    }

    return cuotas;
  }

  // Obtener préstamos donde soy prestamista
  async obtenerMisPrestamos() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          cuotas (
            id,
            numero_cuota,
            monto,
            fecha_vencimiento,
            estado,
            fecha_pago,
            comprobante_url,
            comprobante_estado,
            comprobante_subido_en,
            comprobante_revisado_en
          )
        `)
        .eq('prestamista_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calcular totales
      const prestamosConTotales = data.map(prestamo => {
        const cuotasPagadas = prestamo.cuotas.filter((c: any) => c.estado === 'pagada').length;
        const montoPagado = prestamo.cuotas
          .filter((c: any) => c.estado === 'pagada')
          .reduce((sum: number, c: any) => sum + parseFloat(c.monto), 0);
        const montoPendiente = prestamo.monto_total - montoPagado;

        return {
          ...prestamo,
          cuotas_pagadas: cuotasPagadas,
          monto_pagado: montoPagado,
          monto_pendiente: montoPendiente,
        };
      });

      return { success: true, prestamos: prestamosConTotales };
    } catch (error: any) {
      console.error('Error obteniendo préstamos:', error);
      return { success: false, error: error.message, prestamos: [] };
    }
  }

  // Obtener préstamos donde soy deudor (mis deudas)
  async obtenerMisDeudas() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          cuotas (
            id,
            numero_cuota,
            monto,
            fecha_vencimiento,
            estado,
            fecha_pago,
            comprobante_url,
            comprobante_estado,
            comprobante_subido_en,
            comprobante_revisado_en
          )
        `)
        .eq('deudor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener datos de los prestamistas
      const prestamistasIds = [...new Set(data.map(d => d.prestamista_id))];
      const { data: prestamistas } = await supabase
        .from('perfiles')
        .select('user_id, nombre, apellido, telefono')
        .in('user_id', prestamistasIds);

      // Crear un mapa de prestamistas
      const prestamistasMap = new Map(
        prestamistas?.map(p => [p.user_id, p]) || []
      );

      // Calcular totales y agregar datos del prestamista
      const deudasConTotales = data.map(deuda => {
        const cuotasPagadas = deuda.cuotas.filter((c: any) => c.estado === 'pagada').length;
        const montoPagado = deuda.cuotas
          .filter((c: any) => c.estado === 'pagada')
          .reduce((sum: number, c: any) => sum + parseFloat(c.monto), 0);
        const montoPendiente = deuda.monto_total - montoPagado;

        const prestamista = prestamistasMap.get(deuda.prestamista_id);

        return {
          ...deuda,
          cuotas_pagadas: cuotasPagadas,
          monto_pagado: montoPagado,
          monto_pendiente: montoPendiente,
          prestamista_nombre: prestamista?.nombre || 'N/A',
          prestamista_apellido: prestamista?.apellido || '',
          prestamista_telefono: prestamista?.telefono || '',
        };
      });

      return { success: true, deudas: deudasConTotales };
    } catch (error: any) {
      console.error('Error obteniendo deudas:', error);
      return { success: false, error: error.message, deudas: [] };
    }
  }

  // Obtener detalles de un préstamo específico
  async obtenerDetallePrestamo(prestamoId: string) {
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          cuotas (
            id,
            numero_cuota,
            monto,
            fecha_vencimiento,
            estado,
            fecha_pago,
            comprobante_url,
            comprobante_estado,
            comprobante_subido_en,
            comprobante_revisado_en
          )
        `)
        .eq('id', prestamoId)
        .single();

      if (error) throw error;

      // Obtener datos del prestamista
      const { data: prestamista } = await supabase
        .from('perfiles')
        .select('nombre, apellido, telefono, email')
        .eq('user_id', data.prestamista_id)
        .single();

      return { 
        success: true, 
        prestamo: {
          ...data,
          prestamista: prestamista || {
            nombre: 'Prestamista',
            apellido: '',
            telefono: '',
            email: ''
          }
        }
      };
    } catch (error: any) {
      console.error('Error obteniendo detalle del préstamo:', error);
      return { success: false, error: error.message };
    }
  }

  // Marcar una cuota como pagada
  async marcarCuotaComoPagada(cuotaId: string, comprobante?: string) {
    try {
      const { error } = await supabase
        .from('cuotas')
        .update({
          estado: 'pagada',
          fecha_pago: new Date().toISOString().split('T')[0],
          comprobante_url: comprobante || null,
        })
        .eq('id', cuotaId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error marcando cuota como pagada:', error);
      return { success: false, error: error.message };
    }
  }

  // Subir comprobante de pago
  async subirComprobante(cuotaId: string, file: any) {
    try {
      // TODO: Implementar subida de archivo a Supabase Storage
      // Por ahora solo actualizamos el estado
      return await this.marcarCuotaComoPagada(cuotaId);
    } catch (error: any) {
      console.error('Error subiendo comprobante:', error);
      return { success: false, error: error.message };
    }
  }

  // Editar un préstamo existente
  async editarPrestamo(prestamoId: string, data: Partial<PrestamoData>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar que el usuario sea el prestamista
      const { data: prestamo, error: checkError } = await supabase
        .from('prestamos')
        .select('prestamista_id')
        .eq('id', prestamoId)
        .single();

      if (checkError) throw checkError;

      if (prestamo.prestamista_id !== user.id) {
        throw new Error('No tienes permiso para editar este préstamo');
      }

      // Actualizar el préstamo
      const updateData: any = {};

      if (data.deudor) {
        if (data.deudor.nombre) updateData.deudor_nombre = data.deudor.nombre;
        if (data.deudor.apellido) updateData.deudor_apellido = data.deudor.apellido;
        if (data.deudor.telefono) updateData.deudor_telefono = data.deudor.telefono;
        if (data.deudor.email) updateData.deudor_email = data.deudor.email;
      }

      if (data.tasaInteres !== undefined) updateData.tasa_interes = data.tasaInteres;

      if (Object.keys(updateData).length === 0) {
        return { success: true, message: 'No hay cambios para aplicar' };
      }

      const { error } = await supabase
        .from('prestamos')
        .update(updateData)
        .eq('id', prestamoId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error editando préstamo:', error);
      return { success: false, error: error.message };
    }
  }

  // Crear pago parcial (dividir una cuota en dos)
  async crearPagoParcial(cuotaId: string, montoParcial: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 1. Obtener la cuota original y verificar permisos
      const { data: cuota, error: cuotaError } = await supabase
        .from('cuotas')
        .select(`
          *,
          prestamos!inner (
            prestamista_id
          )
        `)
        .eq('id', cuotaId)
        .single();

      if (cuotaError) throw cuotaError;

      // Verificar que el usuario sea el prestamista
      if (cuota.prestamos.prestamista_id !== user.id) {
        throw new Error('No tienes permiso para modificar esta cuota');
      }

      // Validaciones
      if (cuota.estado !== 'pendiente') {
        return { 
          success: false, 
          error: 'Solo se pueden dividir cuotas pendientes'
        };
      }

      if (montoParcial <= 0 || montoParcial >= parseFloat(cuota.monto)) {
        return { 
          success: false, 
          error: 'El monto parcial debe ser mayor a 0 y menor al monto total de la cuota'
        };
      }

      // 2. Calcular el monto restante
      const montoRestante = parseFloat(cuota.monto) - montoParcial;

      // 3. Actualizar la cuota original con el nuevo monto
      const { error: updateError } = await supabase
        .from('cuotas')
        .update({
          monto: montoParcial,
          updated_at: new Date().toISOString()
        })
        .eq('id', cuotaId);

      if (updateError) throw updateError;

      // 4. Obtener el conteo de mini-cuotas existentes para esta cuota
      const { data: existingMiniCuotas, error: countError } = await supabase
        .from('cuotas')
        .select('id')
        .eq('cuota_padre_id', cuotaId);

      if (countError) throw countError;

      // El número de cuota para la mini-cuota será: numero_cuota + 0.1, 0.2, 0.3, etc.
      const miniCuotaNumero = cuota.numero_cuota + ((existingMiniCuotas?.length || 0) + 1) * 0.1;

      // 5. Crear la mini-cuota con el monto restante
      const { data: miniCuota, error: miniCuotaError } = await supabase
        .from('cuotas')
        .insert({
          prestamo_id: cuota.prestamo_id,
          numero_cuota: miniCuotaNumero,
          monto: montoRestante,
          fecha_vencimiento: cuota.fecha_vencimiento,
          estado: 'pendiente',
          cuota_padre_id: cuotaId,
          es_pago_parcial: true,
        })
        .select()
        .single();

      if (miniCuotaError) throw miniCuotaError;

      return { 
        success: true, 
        cuotaActualizada: { ...cuota, monto: montoParcial },
        miniCuota 
      };
    } catch (error: any) {
      console.error('Error creando pago parcial:', error);
      return { success: false, error: error.message };
    }
  }

  // Eliminar un préstamo (solo si no tiene cuotas pagadas)
  async eliminarPrestamo(prestamoId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar que el usuario sea el prestamista
      const { data: prestamo, error: checkError } = await supabase
        .from('prestamos')
        .select(`
          prestamista_id,
          cuotas (estado)
        `)
        .eq('id', prestamoId)
        .single();

      if (checkError) throw checkError;

      if (prestamo.prestamista_id !== user.id) {
        throw new Error('No tienes permiso para eliminar este préstamo');
      }

      // Verificar que no tenga cuotas pagadas
      const tieneCuotasPagadas = prestamo.cuotas.some((c: any) => c.estado === 'pagada');
      if (tieneCuotasPagadas) {
        return { 
          success: false, 
          error: 'No se puede eliminar un préstamo con cuotas pagadas',
          code: 'HAS_PAID_CUOTAS'
        };
      }

      // Primero eliminar las cuotas
      const { error: cuotasError } = await supabase
        .from('cuotas')
        .delete()
        .eq('prestamo_id', prestamoId);

      if (cuotasError) throw cuotasError;

      // Luego eliminar el préstamo
      const { error: prestamoError } = await supabase
        .from('prestamos')
        .delete()
        .eq('id', prestamoId);

      if (prestamoError) throw prestamoError;

      return { success: true };
    } catch (error: any) {
      console.error('Error eliminando préstamo:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new PrestamosService();
