import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Card, Button, Chip, IconButton, Menu } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import { formatDate } from '../utils/dateUtils';
import PartialPaymentModal from '../components/PartialPaymentModal';
import VoucherZigzagBorder from '../components/VoucherZigzagBorder';

const { width } = Dimensions.get('window');

export default function LoanDetailScreen({ route, navigation }: any) {
  const { loan } = route.params || {};
  const [prestamo, setPrestamo] = useState<any>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [partialPaymentModal, setPartialPaymentModal] = useState<{
    visible: boolean;
    cuotaId: string | null;
    montoTotal: number;
    numeroCuota: number;
  }>({
    visible: false,
    cuotaId: null,
    montoTotal: 0,
    numeroCuota: 0,
  });

  useEffect(() => {
    cargarDetalle();
  }, []);

  // Recargar cuando regrese de la pantalla de revisión
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      cargarDetalle();
    });

    return unsubscribe;
  }, [navigation]);

  const cargarDetalle = async () => {
    setLoading(true);
    const { prestamo: data } = await prestamosService.obtenerDetallePrestamo(loan.id);
    
    if (data) {
      setPrestamo(data);
      const cuotasFormateadas = data.cuotas.map((c: any) => ({
        id: c.id,
        numero: c.numero_cuota,
        monto: parseFloat(c.monto),
        fecha: c.fecha_vencimiento,
        estado: c.estado,
        fechaPago: c.fecha_pago,
        comprobanteUrl: c.comprobante_url,
        comprobanteEstado: c.comprobante_estado,
        cuotaPadreId: c.cuota_padre_id,
        esPagoParcial: c.es_pago_parcial || false,
      }));
      setCuotas(cuotasFormateadas);
    }
    setLoading(false);
  };

  const handleMarkAsPaid = async (cuotaId: string) => {
    Alert.alert(
      'Confirmar Pago',
      '¿Estás seguro de marcar esta cuota como pagada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const result = await prestamosService.marcarCuotaComoPagada(cuotaId);
            if (result.success) {
              Alert.alert('Éxito', 'Cuota marcada como pagada');
              cargarDetalle(); // Recargar datos
            } else {
              Alert.alert('Error', result.error || 'No se pudo marcar como pagada');
            }
          },
        },
      ]
    );
  };

  const handleReviewProof = (cuota: any) => {
    navigation.navigate('ReviewProof', { cuota, prestamoId: loan.id });
  };

  const handleEdit = () => {
    setMenuVisible(false);
    navigation.navigate('EditLoan', { loan: prestamo });
  };

  const handleDelete = () => {
    setMenuVisible(false);
    
    Alert.alert(
      '⚠️ Eliminar Préstamo',
      '¿Estás seguro de que deseas eliminar este préstamo? Esta acción no se puede deshacer.\n\nNota: Solo se pueden eliminar préstamos sin cuotas pagadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await prestamosService.eliminarPrestamo(prestamo.id);
            setLoading(false);

            if (result.success) {
              Alert.alert(
                '✅ Préstamo eliminado',
                'El préstamo ha sido eliminado exitosamente',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } else {
              if (result.code === 'HAS_PAID_CUOTAS') {
                Alert.alert(
                  'No se puede eliminar',
                  'Este préstamo tiene cuotas pagadas y no puede ser eliminado. Solo puedes eliminar préstamos sin pagos realizados.'
                );
              } else {
                Alert.alert('Error', result.error || 'No se pudo eliminar el préstamo');
              }
            }
          },
        },
      ]
    );
  };

  const getComprobanteButtonText = (cuota: any) => {
    if (cuota.comprobanteEstado === 'en_revision') {
      return 'Revisar Comprobante';
    }
    return 'Pendiente';
  };

  const getComprobanteButtonColor = (cuota: any) => {
    if (cuota.comprobanteEstado === 'en_revision') {
      return colors.warning;
    }
    return colors.textSecondary;
  };

  const getEstadoColor = (estado: string) => {
    return estado === 'pagada' ? colors.success : colors.warning;
  };

  const handleOpenPartialPayment = (cuota: any) => {
    setPartialPaymentModal({
      visible: true,
      cuotaId: cuota.id,
      montoTotal: cuota.monto,
      numeroCuota: cuota.numero,
    });
  };

  const handleCreatePartialPayment = async (montoParcial: number) => {
    if (!partialPaymentModal.cuotaId) return;

    const result = await prestamosService.crearPagoParcial(
      partialPaymentModal.cuotaId,
      montoParcial
    );

    if (result.success) {
      Alert.alert(
        '✅ Cuota dividida',
        `La cuota ha sido dividida en dos pagos:\n• Primer pago: S/ ${montoParcial.toFixed(2)}\n• Segundo pago: S/ ${(partialPaymentModal.montoTotal - montoParcial).toFixed(2)}`,
        [{ text: 'OK', onPress: () => cargarDetalle() }]
      );
      setPartialPaymentModal({ visible: false, cuotaId: null, montoTotal: 0, numeroCuota: 0 });
    } else {
      Alert.alert('Error', result.error || 'No se pudo dividir la cuota');
      throw new Error(result.error);
    }
  };

  if (loading || !prestamo) {
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
  const montoPendiente = parseFloat(prestamo.monto_total) - montoPagado;
  const progreso = (montoPagado / parseFloat(prestamo.monto_total)) * 100;

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
        <Text style={styles.headerTitle}>Detalle de Préstamo</Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={24}
              iconColor={colors.text}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={handleEdit} leadingIcon="pencil" title="Editar" />
          <Menu.Item onPress={handleDelete} leadingIcon="delete" title="Eliminar" />
        </Menu>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info del Deudor - Estilo Voucher */}
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
            <View style={styles.deudorHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {prestamo.deudor_nombre[0]}{prestamo.deudor_apellido[0]}
                </Text>
              </View>
              <View style={styles.deudorInfo}>
                <Text style={styles.deudorName}>
                  {prestamo.deudor_nombre} {prestamo.deudor_apellido}
                </Text>
                <Text style={styles.deudorContact}>{prestamo.deudor_telefono}</Text>
              </View>
            </View>
            
            <View style={styles.montoResumen}>
              <View style={styles.montoItem}>
                <Text style={styles.montoLabel}>Monto Total</Text>
                <Text style={styles.montoValue}>S/ {parseFloat(prestamo.monto_total).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.montoItem}>
                <Text style={styles.montoLabel}>Pendiente</Text>
                <Text style={[styles.montoValue, { color: colors.warning }]}>S/ {montoPendiente.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.montoItem}>
                <Text style={styles.montoLabel}>Pagado</Text>
                <Text style={[styles.montoValue, { color: colors.success }]}>S/ {montoPagado.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progreso}%` }]} />
              </View>
              <Text style={styles.progressText}>{progreso.toFixed(0)}% pagado</Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Tasa de interés</Text>
                <Text style={styles.infoValue}>{prestamo.tasa_interes}%</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Cuotas</Text>
                <Text style={styles.infoValue}>{prestamo.numero_cuotas} cuotas</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Fecha inicio</Text>
                <Text style={styles.infoValue}>{formatDate(prestamo.fecha_inicio)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Chip
                  style={[styles.estadoChip, { backgroundColor: prestamo.estado === 'activo' ? colors.success : colors.primary }]}
                  textStyle={[styles.estadoChipText, { color: colors.surface }]}
                >
                  {prestamo.estado === 'activo' ? 'Activo' : 'Completado'}
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
                      {cuota.comprobanteEstado === 'en_revision' && (
                        <View style={styles.comprobanteRevisionBadge}>
                          <Text style={styles.comprobanteRevisionText}>⏰ Comprobante en revisión</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.cuotaRight}>
                    <Text style={styles.cuotaMonto}>S/ {cuota.monto.toFixed(2)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Chip
                        style={[styles.cuotaChip, { backgroundColor: getEstadoColor(cuota.estado) }]}
                        textStyle={[styles.cuotaChipText, { color: colors.surface }]}
                      >
                        {cuota.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
                      </Chip>
                      {cuota.estado === 'pendiente' && !cuota.esPagoParcial && (
                        <IconButton
                          icon="plus-circle"
                          size={24}
                          iconColor={colors.primary}
                          onPress={() => handleOpenPartialPayment(cuota)}
                          style={styles.partialPaymentButton}
                        />
                      )}
                    </View>
                  </View>
                </View>

                {cuota.estado === 'pendiente' && (
                  <View style={styles.botonesContainer}>
                    {cuota.comprobanteEstado === 'en_revision' ? (
                      <Button
                        mode="contained"
                        icon="file-document-check"
                        onPress={() => handleReviewProof(cuota)}
                        style={[styles.reviewButton, { backgroundColor: getComprobanteButtonColor(cuota) }]}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                        compact
                      >
                        {getComprobanteButtonText(cuota)}
                      </Button>
                    ) : (
                      <View style={styles.pendienteContainer}>
                        <Text style={styles.pendienteText}>{getComprobanteButtonText(cuota)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Partial Payment Modal */}
      <PartialPaymentModal
        visible={partialPaymentModal.visible}
        onClose={() => setPartialPaymentModal({ visible: false, cuotaId: null, montoTotal: 0, numeroCuota: 0 })}
        onConfirm={handleCreatePartialPayment}
        montoTotal={partialPaymentModal.montoTotal}
        numeroCuota={partialPaymentModal.numeroCuota}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
  deudorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  deudorInfo: {
    flex: 1,
  },
  deudorName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  deudorContact: {
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
    backgroundColor: colors.primary,
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
  paddingHorizontal: 10,
  paddingVertical: 4,
  minHeight: 12,
  justifyContent: 'center',
},
estadoChipText: {
  fontSize: 12,
  fontWeight: fontWeight.bold,
  lineHeight: 14,
  textAlignVertical: 'center',
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
    marginTop: 2,
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
    paddingHorizontal: 10,
  },
  cuotaChipText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    lineHeight: 16,
  },
  pagarButton: {
    marginTop: spacing.sm,
    borderColor: colors.success,
  },
  pagarButtonContent: {
    height: 32,
  },
  pagarButtonLabel: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  comprobanteRevisionBadge: {
    backgroundColor: colors.warning + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  comprobanteRevisionText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  botonesContainer: {
    marginTop: spacing.sm,
  },
  reviewButton: {
    borderRadius: borderRadius.sm,
  },
  buttonContent: {
    height: 40,
    paddingHorizontal: spacing.sm,
  },
  buttonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  pendienteContainer: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  pendienteText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
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
  partialPaymentButton: {
    margin: 0,
    padding: 0,
  },
});
