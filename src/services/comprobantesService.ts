import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

interface SubirComprobanteResult {
  success: boolean;
  error?: string;
  url?: string;
}

interface ActualizarEstadoComprobanteResult {
  success: boolean;
  error?: string;
}

class ComprobantesService {
  private readonly BUCKET_NAME = 'comprobantes';

  /**
   * Solicita permisos para acceder a la galería
   */
  async solicitarPermisos(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Abre el selector de imágenes y retorna la imagen seleccionada
   */
  async seleccionarImagen(): Promise<ImagePicker.ImagePickerAsset | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Permitir imagen completa sin recortar
      quality: 0.8, // Comprimir para ahorrar espacio
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets[0];
    }
    return null;
  }

  /**
   * Sube un comprobante de pago a Supabase Storage
   * Si ya existe un comprobante anterior, lo elimina primero
   */
  async subirComprobante(
    cuotaId: string,
    imageUri: string,
    comprobanteUrlAnterior?: string
  ): Promise<SubirComprobanteResult> {
    try {
      // 1. Eliminar comprobante anterior si existe
      if (comprobanteUrlAnterior) {
        await this.eliminarComprobante(comprobanteUrlAnterior);
      }

      // 2. Leer el archivo como base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = imageUri.split('.').pop() || 'jpg';
      const fileName = `comprobante_${cuotaId}_${timestamp}.${extension}`;
      const filePath = `cuotas/${fileName}`;

      // 4. Convertir base64 a ArrayBuffer y subir a Storage
      const arrayBuffer = decode(base64);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, arrayBuffer, {
          contentType: `image/${extension}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error al subir comprobante:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // 5. Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      // 6. Actualizar la cuota con la URL del comprobante
      const { error: updateError } = await supabase
        .from('cuotas')
        .update({
          comprobante_url: urlData.publicUrl,
          comprobante_estado: 'en_revision',
          comprobante_subido_en: new Date().toISOString(),
          comprobante_revisado_en: null, // Resetear fecha de revisión
        })
        .eq('id', cuotaId);

      if (updateError) {
        console.error('Error al actualizar cuota:', updateError);
        // Intentar eliminar el archivo subido si falla la actualización
        await this.eliminarComprobante(urlData.publicUrl);
        return { success: false, error: updateError.message };
      }

      return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
      console.error('Error en subirComprobante:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  }

  /**
   * Elimina un comprobante de Supabase Storage
   */
  async eliminarComprobante(comprobanteUrl: string): Promise<void> {
    try {
      // Extraer el path del archivo desde la URL
      const url = new URL(comprobanteUrl);
      const pathParts = url.pathname.split(`/object/public/${this.BUCKET_NAME}/`);
      if (pathParts.length < 2) {
        console.error('URL de comprobante inválida:', comprobanteUrl);
        return;
      }
      const filePath = pathParts[1];

      // Eliminar archivo de Storage
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error al eliminar comprobante:', error);
      }
    } catch (error) {
      console.error('Error en eliminarComprobante:', error);
    }
  }

  /**
   * El prestamista aprueba un comprobante y marca la cuota como pagada
   */
  async aprobarComprobante(cuotaId: string): Promise<ActualizarEstadoComprobanteResult> {
    try {
      const { error } = await supabase
        .from('cuotas')
        .update({
          comprobante_estado: 'aprobado',
          comprobante_revisado_en: new Date().toISOString(),
          estado: 'pagada',
          fecha_pago: new Date().toISOString(),
        })
        .eq('id', cuotaId);

      if (error) {
        console.error('Error al aprobar comprobante:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error en aprobarComprobante:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  }

  /**
   * El prestamista rechaza un comprobante
   */
  async rechazarComprobante(cuotaId: string): Promise<ActualizarEstadoComprobanteResult> {
    try {
      const { error } = await supabase
        .from('cuotas')
        .update({
          comprobante_estado: 'rechazado',
          comprobante_revisado_en: new Date().toISOString(),
        })
        .eq('id', cuotaId);

      if (error) {
        console.error('Error al rechazar comprobante:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error en rechazarComprobante:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  }

  /**
   * Obtiene el detalle de una cuota incluyendo información del comprobante
   */
  async obtenerDetalleCuota(cuotaId: string) {
    try {
      const { data, error } = await supabase
        .from('cuotas')
        .select('*')
        .eq('id', cuotaId)
        .single();

      if (error) {
        console.error('Error al obtener detalle de cuota:', error);
        return { cuota: null, error: error.message };
      }

      return { cuota: data, error: null };
    } catch (error: any) {
      console.error('Error en obtenerDetalleCuota:', error);
      return { cuota: null, error: error.message || 'Error desconocido' };
    }
  }
}

export default new ComprobantesService();
