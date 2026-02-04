import { supabase } from '../config/supabase';

class CapitalService {
  // Obtener el capital actual del usuario
  async obtenerCapital() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Intentar obtener el capital del usuario
      const { data: capital, error } = await supabase
        .from('capital_usuario')
        .select('monto')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      // Si no existe, crear con monto 0
      if (!capital) {
        const { data: nuevoCapital, error: createError } = await supabase
          .from('capital_usuario')
          .insert({ user_id: user.id, monto: 0 })
          .select('monto')
          .single();

        if (createError) throw createError;
        
        return { success: true, capital: parseFloat(nuevoCapital?.monto || '0') };
      }

      return { success: true, capital: parseFloat(capital.monto || '0') };
    } catch (error: any) {
      console.error('Error obteniendo capital:', error);
      return { success: false, error: error.message, capital: 0 };
    }
  }

  // Añadir capital
  async agregarCapital(monto: number, descripcion?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      if (monto <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      // Obtener capital actual
      const { capital: capitalActual } = await this.obtenerCapital();

      // Actualizar capital
      const nuevoCapital = capitalActual + monto;
      
      const { error: updateError } = await supabase
        .from('capital_usuario')
        .upsert({ 
          user_id: user.id, 
          monto: nuevoCapital 
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      // Registrar transacción
      await this.registrarTransaccion('ingreso', monto, descripcion || 'Ingreso de capital');

      return { success: true, nuevoCapital };
    } catch (error: any) {
      console.error('Error agregando capital:', error);
      return { success: false, error: error.message };
    }
  }

  // Retirar capital
  async retirarCapital(monto: number, descripcion?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      if (monto <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      // Obtener capital actual
      const { capital: capitalActual } = await this.obtenerCapital();

      if (capitalActual < monto) {
        throw new Error('No tienes suficiente capital disponible');
      }

      // Actualizar capital
      const nuevoCapital = capitalActual - monto;
      
      const { error: updateError } = await supabase
        .from('capital_usuario')
        .update({ monto: nuevoCapital })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Registrar transacción
      await this.registrarTransaccion('retiro', monto, descripcion || 'Retiro de capital');

      return { success: true, nuevoCapital };
    } catch (error: any) {
      console.error('Error retirando capital:', error);
      return { success: false, error: error.message };
    }
  }

  // Descontar capital al crear préstamo
  async descontarPorPrestamo(prestamoId: string, monto: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { capital: capitalActual } = await this.obtenerCapital();

      if (capitalActual < monto) {
        return { 
          success: false, 
          error: 'No tienes suficiente capital disponible para este préstamo',
          code: 'INSUFFICIENT_CAPITAL'
        };
      }

      const nuevoCapital = capitalActual - monto;
      
      const { error: updateError } = await supabase
        .from('capital_usuario')
        .update({ monto: nuevoCapital })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await this.registrarTransaccion(
        'prestamo', 
        monto, 
        `Préstamo creado (ID: ${prestamoId.substring(0, 8)}...)`
      );

      return { success: true, nuevoCapital };
    } catch (error: any) {
      console.error('Error descontando capital:', error);
      return { success: false, error: error.message };
    }
  }

  // Agregar capital al recibir pago de cuota
  async agregarPorPagoCuota(cuotaId: string, monto: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { capital: capitalActual } = await this.obtenerCapital();
      const nuevoCapital = capitalActual + monto;
      
      const { error: updateError } = await supabase
        .from('capital_usuario')
        .update({ monto: nuevoCapital })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await this.registrarTransaccion(
        'cobro', 
        monto, 
        `Cobro de cuota (ID: ${cuotaId.substring(0, 8)}...)`
      );

      return { success: true, nuevoCapital };
    } catch (error: any) {
      console.error('Error agregando capital por pago:', error);
      return { success: false, error: error.message };
    }
  }

  // Registrar transacción
  private async registrarTransaccion(tipo: string, monto: number, descripcion: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase
        .from('transacciones_capital')
        .insert({
          user_id: user.id,
          tipo,
          monto,
          descripcion,
        });
    } catch (error) {
      console.error('Error registrando transacción:', error);
      // No lanzar error, es solo para registro
    }
  }

  // Obtener historial de transacciones
  async obtenerHistorial(limit: number = 50) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('transacciones_capital')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, transacciones: data || [] };
    } catch (error: any) {
      console.error('Error obteniendo historial:', error);
      return { success: false, error: error.message, transacciones: [] };
    }
  }
}

export default new CapitalService();
