import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface ScheduleNotificationParams {
  cuotaId: string;
  cuotaNumero: number;
  monto: number;
  fechaVencimiento: string;
  prestamistaNombre: string;
}

class NotificationsService {
  /**
   * Solicitar permisos de notificaciones y registrar token
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permisos de notificaciones denegados');
        return false;
      }

      // Configurar canal de notificaciones para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('cuotas-recordatorios', {
          name: 'Recordatorios de Cuotas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
        });
      }

      // Registrar el push token del usuario
      await this.registerPushToken();

      return true;
    } catch (error) {
      console.error('Error al solicitar permisos de notificaciones:', error);
      return false;
    }
  }

  /**
   * Obtener y registrar el push token del dispositivo
   */
  async registerPushToken(): Promise<string | null> {
    try {
      // Solo en dispositivos físicos
      if (!Device.isDevice) {
        console.log('Las notificaciones push solo funcionan en dispositivos físicos');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'fa55b52c-0b98-414d-acf0-1cb2c0b87c4d',
      });
      const token = tokenData.data;
      console.log('📱 Push Token obtenido:', token);

      // Guardar el token en la base de datos
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('perfiles')
          .update({ push_token: token })
          .eq('id', user.id);

        if (error) {
          console.error('Error al guardar push token:', error);
        } else {
          console.log('✅ Push token guardado en BD');
        }
      }

      return token;
    } catch (error) {
      console.error('Error al registrar push token:', error);
      return null;
    }
  }

  /**
   * Programar notificación 2 días antes del vencimiento de una cuota
   */
  async schedulePaymentReminder(params: ScheduleNotificationParams): Promise<string | null> {
    try {
      const { cuotaId, cuotaNumero, monto, fechaVencimiento, prestamistaNombre } = params;

      // Calcular la fecha de notificación (2 días antes del vencimiento)
      const fechaVencimientoDate = new Date(fechaVencimiento);
      const fechaNotificacion = new Date(fechaVencimientoDate);
      fechaNotificacion.setDate(fechaNotificacion.getDate() - 2);
      fechaNotificacion.setHours(9, 0, 0, 0); // A las 9:00 AM

      // Solo programar si la fecha de notificación es en el futuro
      const ahora = new Date();
      if (fechaNotificacion <= ahora) {
        console.log('La fecha de notificación ya pasó, no se programa');
        return null;
      }

      const trigger = fechaNotificacion;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Recordatorio de Pago',
          body: `Tu cuota #${cuotaNumero} de S/ ${monto.toFixed(2)} a ${prestamistaNombre} vence en 2 días`,
          data: { cuotaId, type: 'payment_reminder' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      // Guardar el ID de la notificación para poder cancelarla después
      await this.saveNotificationId(cuotaId, notificationId);

      console.log(`Notificación programada para cuota ${cuotaId}: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Error al programar notificación:', error);
      return null;
    }
  }

  /**
   * Programar notificaciones para todas las cuotas pendientes de un préstamo
   */
  async scheduleNotificationsForLoan(
    cuotas: any[],
    prestamistaNombre: string
  ): Promise<void> {
    try {
      const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente');

      for (const cuota of cuotasPendientes) {
        await this.schedulePaymentReminder({
          cuotaId: cuota.id,
          cuotaNumero: cuota.numero_cuota,
          monto: parseFloat(cuota.monto),
          fechaVencimiento: cuota.fecha_vencimiento,
          prestamistaNombre,
        });
      }
    } catch (error) {
      console.error('Error al programar notificaciones para préstamo:', error);
    }
  }

  /**
   * Cancelar notificación de una cuota específica
   */
  async cancelNotificationForCuota(cuotaId: string): Promise<void> {
    try {
      const notificationId = await this.getNotificationId(cuotaId);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await this.removeNotificationId(cuotaId);
        console.log(`Notificación cancelada para cuota ${cuotaId}`);
      }
    } catch (error) {
      console.error('Error al cancelar notificación:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('@notifications_map');
      console.log('Todas las notificaciones canceladas');
    } catch (error) {
      console.error('Error al cancelar todas las notificaciones:', error);
    }
  }

  /**
   * Obtener todas las notificaciones programadas (para debug)
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error al obtener notificaciones programadas:', error);
      return [];
    }
  }

  /**
   * Guardar ID de notificación en AsyncStorage
   */
  private async saveNotificationId(cuotaId: string, notificationId: string): Promise<void> {
    try {
      const mapJson = await AsyncStorage.getItem('@notifications_map');
      const map = mapJson ? JSON.parse(mapJson) : {};
      map[cuotaId] = notificationId;
      await AsyncStorage.setItem('@notifications_map', JSON.stringify(map));
    } catch (error) {
      console.error('Error al guardar ID de notificación:', error);
    }
  }

  /**
   * Obtener ID de notificación de AsyncStorage
   */
  private async getNotificationId(cuotaId: string): Promise<string | null> {
    try {
      const mapJson = await AsyncStorage.getItem('@notifications_map');
      const map = mapJson ? JSON.parse(mapJson) : {};
      return map[cuotaId] || null;
    } catch (error) {
      console.error('Error al obtener ID de notificación:', error);
      return null;
    }
  }

  /**
   * Enviar notificación push a un usuario específico usando su push token
   */
  private async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('📤 Notificación enviada:', result);
      return response.ok;
    } catch (error) {
      console.error('Error al enviar push notification:', error);
      return false;
    }
  }

  /**
   * Obtener el push token de un usuario por su ID
   */
  private async getUserPushToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !data || !data.push_token) {
        console.log(`⚠️ Usuario ${userId} no tiene push token registrado`);
        return null;
      }

      return data.push_token;
    } catch (error) {
      console.error('Error al obtener push token:', error);
      return null;
    }
  }

  /**
   * Enviar notificación cuando se crea un préstamo (al DEUDOR)
   */
  async sendLoanCreatedNotification(
    deudorId: string,
    prestamistaNombre: string,
    monto: number
  ): Promise<void> {
    try {
      const pushToken = await this.getUserPushToken(deudorId);
      if (!pushToken) {
        console.log('No se puede enviar notificación: deudor sin token');
        return;
      }

      await this.sendPushNotification(
        pushToken,
        '💰 Nuevo Préstamo Recibido',
        `${prestamistaNombre} te ha prestado S/ ${monto.toFixed(2)}`,
        { type: 'loan_created' }
      );
    } catch (error) {
      console.error('Error al enviar notificación de préstamo:', error);
    }
  }

  /**
   * Enviar notificación cuando el deudor sube un comprobante (al PRESTAMISTA)
   */
  async sendProofUploadedNotification(
    prestamistaId: string,
    deudorNombre: string,
    cuotaNumero: number,
    monto: number
  ): Promise<void> {
    try {
      const pushToken = await this.getUserPushToken(prestamistaId);
      if (!pushToken) {
        console.log('No se puede enviar notificación: prestamista sin token');
        return;
      }

      await this.sendPushNotification(
        pushToken,
        '📷 Comprobante Recibido',
        `${deudorNombre} subió comprobante de la cuota #${cuotaNumero} (S/ ${monto.toFixed(2)}). Revísalo ahora.`,
        { type: 'proof_uploaded', cuotaNumero }
      );
    } catch (error) {
      console.error('Error al enviar notificación de comprobante:', error);
    }
  }

  /**
   * Enviar notificación cuando el prestamista aprueba un comprobante (al DEUDOR)
   */
  async sendProofApprovedNotification(
    deudorId: string,
    cuotaNumero: number,
    monto: number
  ): Promise<void> {
    try {
      const pushToken = await this.getUserPushToken(deudorId);
      if (!pushToken) {
        console.log('No se puede enviar notificación: deudor sin token');
        return;
      }

      await this.sendPushNotification(
        pushToken,
        '✅ Pago Aprobado',
        `Tu pago de la cuota #${cuotaNumero} (S/ ${monto.toFixed(2)}) ha sido aprobado`,
        { type: 'proof_approved', cuotaNumero }
      );
    } catch (error) {
      console.error('Error al enviar notificación de aprobación:', error);
    }
  }

  /**
   * Enviar notificación cuando el prestamista rechaza un comprobante (al DEUDOR)
   */
  async sendProofRejectedNotification(
    deudorId: string,
    cuotaNumero: number,
    monto: number
  ): Promise<void> {
    try {
      const pushToken = await this.getUserPushToken(deudorId);
      if (!pushToken) {
        console.log('No se puede enviar notificación: deudor sin token');
        return;
      }

      await this.sendPushNotification(
        pushToken,
        '❌ Comprobante Rechazado',
        `Tu comprobante de la cuota #${cuotaNumero} (S/ ${monto.toFixed(2)}) fue rechazado. Por favor, sube uno nuevo.`,
        { type: 'proof_rejected', cuotaNumero }
      );
    } catch (error) {
      console.error('Error al enviar notificación de rechazo:', error);
    }
  }

  /**
   * Eliminar ID de notificación de AsyncStorage
   */
  private async removeNotificationId(cuotaId: string): Promise<void> {
    try {
      const mapJson = await AsyncStorage.getItem('@notifications_map');
      const map = mapJson ? JSON.parse(mapJson) : {};
      delete map[cuotaId];
      await AsyncStorage.setItem('@notifications_map', JSON.stringify(map));
    } catch (error) {
      console.error('Error al eliminar ID de notificación:', error);
    }
  }

  /**
   * Enviar notificación inmediata (para testing)
   */
  async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // null = inmediato
      });
    } catch (error) {
      console.error('Error al enviar notificación inmediata:', error);
    }
  }
}

export default new NotificationsService();
