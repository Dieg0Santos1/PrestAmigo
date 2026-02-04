import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { Card, Button, Chip, IconButton, Portal, Dialog } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import comprobantesService from '../services/comprobantesService';
import notificationsService from '../services/notificationsService';
import authService from '../services/authService';
import { formatDate } from '../utils/dateUtils';
import VoucherZigzagBorder from '../components/VoucherZigzagBorder';

const { width } = Dimensions.get('window');

export default function DebtDetailScreen({ route, navigation }: any) {
  const { debt } = route.params || {};
  const [deuda, setDeuda] = useState<any>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    cargarDetalle();
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    // Solicitar permisos de notificaciones
    const hasPermission = await notificationsService.requestPermissions();
    if (!hasPermission) {
      console.log('Permisos de notificaciones denegados');
    }
  };

  const cargarDetalle = async () => {
    setLoading(true);
    const { prestamo: data } = await prestamosService.obtenerDetallePrestamo(debt.id);
    
    if (data) {
      setDeuda(data);
      const cuotasFormateadas = data.cuotas.map((c: any) => ({
        id: c.id,
        numero: c.numero_cuota,
        monto: parseFloat(c.monto),
        fecha: c.fecha_vencimiento,
        estado: c.estado,
        fechaPago: c.fecha_pago,
        comprobante: !!c.comprobante_url,
        comprobanteUrl: c.comprobante_url,
        comprobanteEstado: c.comprobante_estado,
        cuotaPadreId: c.cuota_padre_id,
        esPagoParcial: c.es_pago_parcial || false,
      }));
      setCuotas(cuotasFormateadas);

      // Programar notificaciones para las cuotas pendientes
      const prestamistaNombre = `${data.prestamista?.nombre || ''} ${data.prestamista?.apellido || ''}`;
      await notificationsService.scheduleNotificationsForLoan(data.cuotas, prestamistaNombre.trim());
    }
    setLoading(false);
  };

  const handleUploadProof = async (cuota: any) => {
    // Verificar permisos
    const hasPermission = await comprobantesService.solicitarPermisos();
    if (!hasPermission) {
      Alert.alert(
        'Permisos requeridos',
        'Necesitamos acceso a tu galería para subir el comprobante'
      );
      return;
    }

    setSelectedCuota(cuota);
    setModalVisible(true);
  };

  const handleSelectImage = async () => {
    const image = await comprobantesService.seleccionarImagen();
    if (image) {
      setImagePreview(image.uri);
    }
  };

  const handleConfirmUpload = async () => {
    if (!imagePreview || !selectedCuota) return;

    setUploading(true);
    const result = await comprobantesService.subirComprobante(
      selectedCuota.id,
      imagePreview,
      selectedCuota.comprobanteUrl // URL anterior para eliminar
    );

    setUploading(false);

    if (result.success) {
      // Cancelar notificación de esta cuota ya que se subió comprobante
      await notificationsService.cancelNotificationForCuota(selectedCuota.id);
      
      // Obtener el nombre del deudor actual para la notificación
      const perfilResult = await authService.getProfile();
      if (perfilResult.success && perfilResult.perfil && deuda.prestamista_id) {
        const deudorNombre = `${perfilResult.perfil.nombre} ${perfilResult.perfil.apellido}`;
        // Enviar notificación al prestamista
        await notificationsService.sendProofUploadedNotification(
          deuda.prestamista_id,
          deudorNombre,
          selectedCuota.numero,
          selectedCuota.monto
        );
      }
      
      Alert.alert(
        '✅ Comprobante enviado',
        'Tu comprobante está en revisión. El prestamista lo verificará pronto.'
      );
      setModalVisible(false);
      setImagePreview(null);
      setSelectedCuota(null);
      cargarDetalle();
    } else {
      Alert.alert('Error', result.error || 'No se pudo subir el comprobante');
    }
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setImagePreview(null);
    setSelectedCuota(null);
  };

  const getComprobanteButtonText = (cuota: any) => {
    if (cuota.comprobanteEstado === 'en_revision') {
      return 'En Revisión';
    } else if (cuota.comprobanteEstado === 'rechazado') {
      return 'Volver a Subir';
    } else if (cuota.estado === 'pendiente') {
      return 'Subir Comprobante';
    }
    return 'Comprobante';
  };

  const getComprobanteButtonIcon = (cuota: any) => {
    if (cuota.comprobanteEstado === 'en_revision') {
      return 'clock-outline';
    } else if (cuota.comprobanteEstado === 'rechazado') {
      return 'refresh';
    }
    return 'camera';
  };

  const getComprobanteButtonColor = (cuota: any) => {
    if (cuota.comprobanteEstado === 'en_revision') {
      return colors.warning;
    } else if (cuota.comprobanteEstado === 'rechazado') {
      return colors.error;
    }
    return colors.primary;
  };

  const getEstadoColor = (estado: string) => {
    return estado === 'pagada' ? colors.success : colors.error;
  };

  if (loading || !deuda) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  const montoPagado = cuotas
    .filter(c => c.estado === 'pagada')
    .reduce((sum, c) => sum + c.monto, 0);
  const montoPendiente = parseFloat(deuda.monto_total) - montoPagado;
  const progreso = (montoPagado / parseFloat(deuda.monto_total)) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={colors.text}
        />
        <Text style={styles.headerTitle}>Detalle de Deuda</Text>
        <IconButton
          icon="dots-vertical"
          size={24}
          iconColor={colors.text}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info del Prestamista - Estilo Voucher */}
        <View style={styles.voucherContainer}>
          {/* Borde zigzag superior estilo voucher */}
          <VoucherZigzagBorder 
            width={width - (spacing.md * 2)}
            height={12}
            color={colors.background}
            backgroundColor="#f0f4f8"
            triangleCount={14}
          />

          <View style={styles.voucherContent}>
            <View style={styles.prestamistaHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {deuda.prestamista?.nombre?.charAt(0) || 'P'}{deuda.prestamista?.apellido?.charAt(0) || 'R'}
                </Text>
              </View>
              <View style={styles.prestamistaInfo}>
                <Text style={styles.prestamistaName}>
                  {deuda.prestamista?.nombre || 'N/A'} {deuda.prestamista?.apellido || ''}
                </Text>
                <Text style={styles.prestamistaContact}>
                  {deuda.prestamista?.telefono || 'Sin teléfono'}
                </Text>
              </View>
            </View>
            
            <View style={styles.montoResumen}>
              <View style={styles.montoItem}>
                <Text style={styles.montoLabel}>Monto Total</Text>
                <Text style={styles.montoValue}>S/ {parseFloat(deuda.monto_total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.montoItem}>
                <Text style={styles.montoLabel}>Pendiente</Text>
                <Text style={[styles.montoValue, { color: colors.error }]}>S/ {montoPendiente.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.montoItem}>
                <Text style={styles.montoLabel}>Pagado</Text>
                <Text style={[styles.montoValue, { color: colors.success }]}>S/ {montoPagado.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progreso}%`, backgroundColor: colors.warning }]} />
              </View>
              <Text style={styles.progressText}>{progreso.toFixed(0)}% pagado</Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tasa de interés</Text>
                <Text style={styles.infoValue}>{deuda.tasa_interes || 0}%</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Cuotas</Text>
                <Text style={styles.infoValue}>{deuda.numero_cuotas || 0} cuotas</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Fecha inicio</Text>
                <Text style={styles.infoValue}>
                  {formatDate(deuda.fecha_inicio)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Chip
                  style={styles.estadoChip}
                  textStyle={styles.estadoChipText}
                >
                  {deuda.estado === 'activo' ? 'Activa' : deuda.estado}
                </Chip>
              </View>
            </View>
          </View>
        </View>

        {/* Lista de Cuotas */}
        <View style={styles.cuotasSection}>
          <Text style={styles.sectionTitle}>Cuotas ({cuotas.length})</Text>
          
          {cuotas.map((cuota) => (
            <Card 
              key={cuota.id} 
              style={[
                styles.cuotaCard,
                cuota.esPagoParcial && styles.miniCuotaCard
              ]}
            >
              <Card.Content style={styles.cuotaContent}>
                <View style={styles.cuotaHeader}>
                  <View style={styles.cuotaLeft}>
                    <View style={[
                      styles.cuotaNumero,
                      { backgroundColor: getEstadoColor(cuota.estado) + '20' }
                    ]}>
                      <Text style={[styles.cuotaNumeroText, { color: getEstadoColor(cuota.estado) }]}>
                        #{cuota.numero}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cuotaFecha}>{formatDate(cuota.fecha)}</Text>
                        {cuota.esPagoParcial && (
                          <Chip 
                            style={styles.miniCuotaChip}
                            textStyle={styles.miniCuotaChipText}
                          >
                            Pago parcial
                          </Chip>
                        )}
                      </View>
                      {cuota.estado === 'pagada' && cuota.fechaPago && (
                        <Text style={styles.cuotaFechaPago}>Pagado: {formatDate(cuota.fechaPago)}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cuotaRight}>
                    <Text style={styles.cuotaMonto}>S/ {cuota.monto.toFixed(2)}</Text>
                    <View style={[styles.cuotaEstadoBadge, { backgroundColor: getEstadoColor(cuota.estado) + '20' }]}>
                      <Text style={[styles.cuotaEstadoText, { color: getEstadoColor(cuota.estado) }]}>
                        {cuota.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>

                {cuota.estado === 'pendiente' && (
                  <Button
                    mode="contained"
                    icon={getComprobanteButtonIcon(cuota)}
                    onPress={() => handleUploadProof(cuota)}
                    style={[styles.uploadButton, { backgroundColor: getComprobanteButtonColor(cuota) }]}
                    contentStyle={styles.uploadButtonContent}
                    labelStyle={styles.uploadButtonLabel}
                    disabled={cuota.comprobanteEstado === 'en_revision'}
                    compact
                  >
                    {getComprobanteButtonText(cuota)}
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Modal de subida de comprobante */}
      <Portal>
        <Dialog visible={modalVisible} onDismiss={handleCancelModal}>
          <Dialog.Title>📸 Subir Comprobante</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.modalInstructions}>
              Toma o selecciona una foto clara del comprobante de pago. El prestamista la revisará y aprobará el pago.
            </Text>

            {imagePreview ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imagePreview }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
                <Button
                  mode="text"
                  icon="refresh"
                  onPress={handleSelectImage}
                  style={styles.changeImageButton}
                >
                  Cambiar imagen
                </Button>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="image"
                onPress={handleSelectImage}
                style={styles.selectImageButton}
              >
                Seleccionar imagen
              </Button>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelModal} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onPress={handleConfirmUpload}
              disabled={!imagePreview || uploading}
              loading={uploading}
            >
              {uploading ? 'Subiendo...' : 'Enviar'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  voucherContainer: {
    backgroundColor: '#f0f4f8',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    margin: spacing.md,
    marginBottom: spacing.lg,
  },
  voucherContent: {
    padding: spacing.lg,
    backgroundColor: '#f0f4f8',
  },
  prestamistaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  prestamistaInfo: {
    flex: 1,
  },
  prestamistaName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  prestamistaContact: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  montoResumen: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  montoItem: {
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: colors.divider,
  },
  montoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  montoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  estadoChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '30',
    height: 28,
  },
  estadoChipText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  cuotasSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  cuotaCard: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.sm,
    elevation: 1,
  },
  cuotaContent: {
    padding: spacing.sm,
  },
  cuotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cuotaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cuotaNumero: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cuotaNumeroText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  cuotaFecha: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  cuotaFechaPago: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  cuotaRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cuotaMonto: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cuotaChip: {
    height: 20,
  },
  cuotaEstadoBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  cuotaEstadoText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  uploadButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  uploadButtonContent: {
    height: 40,
    paddingHorizontal: spacing.sm,
  },
  uploadButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  modalInstructions: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    marginBottom: spacing.sm,
  },
  changeImageButton: {
    marginTop: spacing.xs,
  },
  selectImageButton: {
    marginTop: spacing.md,
    borderColor: colors.primary,
  },
  miniCuotaCard: {
    marginLeft: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  miniCuotaChip: {
    height: 20,
    marginLeft: spacing.xs,
    backgroundColor: colors.info + '20',
  },
  miniCuotaChipText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
});
