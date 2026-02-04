import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Button, IconButton, Card, ActivityIndicator } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import comprobantesService from '../services/comprobantesService';
import notificationsService from '../services/notificationsService';
import prestamosService from '../services/prestamosService';
import { formatDate } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

export default function ReviewProofScreen({ route, navigation }: any) {
  const { cuota, prestamoId } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [deudorId, setDeudorId] = useState<string | null>(null);

  // Cargar el ID del deudor al montar el componente
  React.useEffect(() => {
    const cargarDeudor = async () => {
      const { prestamo } = await prestamosService.obtenerDetallePrestamo(prestamoId);
      if (prestamo && prestamo.deudor_id) {
        setDeudorId(prestamo.deudor_id);
      }
    };
    cargarDeudor();
  }, [prestamoId]);

  const handleAprobar = () => {
    Alert.alert(
      '✅ Aprobar Comprobante',
      '¿Confirmas que el comprobante es válido y deseas marcar esta cuota como pagada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            const result = await comprobantesService.aprobarComprobante(cuota.id);
            setLoading(false);

            if (result.success) {
              // Enviar notificación al deudor de que su comprobante fue aprobado
              if (deudorId) {
                await notificationsService.sendProofApprovedNotification(
                  deudorId,
                  cuota.numero,
                  cuota.monto
                );
              }
              
              Alert.alert(
                'Cuota Aprobada',
                'El comprobante ha sido aprobado y la cuota se marcó como pagada.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } else {
              Alert.alert('Error', result.error || 'No se pudo aprobar el comprobante');
            }
          },
        },
      ]
    );
  };

  const handleRechazar = () => {
    Alert.alert(
      '❌ Rechazar Comprobante',
      'El deudor podrá volver a subir un nuevo comprobante. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await comprobantesService.rechazarComprobante(cuota.id);
            setLoading(false);

            if (result.success) {
              // Enviar notificación al deudor de que su comprobante fue rechazado
              if (deudorId) {
                await notificationsService.sendProofRejectedNotification(
                  deudorId,
                  cuota.numero,
                  cuota.monto
                );
              }
              
              Alert.alert(
                'Comprobante Rechazado',
                'El deudor será notificado y podrá subir un nuevo comprobante.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } else {
              Alert.alert('Error', result.error || 'No se pudo rechazar el comprobante');
            }
          },
        },
      ]
    );
  };

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
        <Text style={styles.headerTitle}>Revisar Comprobante</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info de la Cuota */}
        <Card style={styles.cuotaInfoCard}>
          <Card.Content>
            <View style={styles.cuotaInfoHeader}>
              <Text style={styles.cuotaInfoTitle}>Información de la Cuota</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cuota #</Text>
              <Text style={styles.infoValue}>#{cuota.numero}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto</Text>
              <Text style={[styles.infoValue, styles.montoDestacado]}>
                S/ {cuota.monto.toFixed(2)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de vencimiento</Text>
              <Text style={styles.infoValue}>{formatDate(cuota.fecha)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado</Text>
              <View style={styles.estadoBadge}>
                <Text style={styles.estadoText}>⏰ En Revisión</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Comprobante */}
        <View style={styles.comprobanteSection}>
          <Text style={styles.sectionTitle}>Comprobante de Pago</Text>
          <Text style={styles.sectionSubtitle}>
            Verifica que los datos del comprobante coincidan con la información de la cuota
          </Text>

          <Card style={styles.imageCard}>
            <Card.Content style={styles.imageCardContent}>
              {imageLoading && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Cargando imagen...</Text>
                </View>
              )}
              <Image
                source={{ uri: cuota.comprobanteUrl }}
                style={styles.comprobanteImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
            </Card.Content>
          </Card>

          <Text style={styles.zoomHint}>💡 Toca la imagen para ampliarla</Text>
        </View>

        {/* Checklist de verificación */}
        <Card style={styles.checklistCard}>
          <Card.Content>
            <Text style={styles.checklistTitle}>✓ Verifica que:</Text>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistBullet}>•</Text>
              <Text style={styles.checklistText}>
                El monto coincida: <Text style={styles.checklistBold}>S/ {cuota.monto.toFixed(2)}</Text>
              </Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistBullet}>•</Text>
              <Text style={styles.checklistText}>
                La fecha sea cercana al vencimiento: <Text style={styles.checklistBold}>{formatDate(cuota.fecha)}</Text>
              </Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checklistBullet}>•</Text>
              <Text style={styles.checklistText}>
                El comprobante sea legible y auténtico
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            icon="close-circle"
            onPress={handleRechazar}
            style={styles.rechazarButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            disabled={loading}
          >
            Rechazar
          </Button>

          <Button
            mode="contained"
            icon="check-circle"
            onPress={handleAprobar}
            style={styles.aprobarButton}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
            disabled={loading}
            loading={loading}
          >
            Aprobar
          </Button>
        </View>
      </ScrollView>
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
  cuotaInfoCard: {
    margin: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  cuotaInfoHeader: {
    marginBottom: spacing.md,
  },
  cuotaInfoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  montoDestacado: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  estadoBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  estadoText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
  comprobanteSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  imageCard: {
    borderRadius: borderRadius.md,
    elevation: 3,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  imageCardContent: {
    padding: 0,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  comprobanteImage: {
    width: width - spacing.md * 2,
    height: 400,
    backgroundColor: colors.surfaceVariant,
  },
  zoomHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  checklistCard: {
    margin: spacing.md,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  checklistTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  checklistBullet: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginRight: spacing.sm,
    fontWeight: fontWeight.bold,
  },
  checklistText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    flex: 1,
  },
  checklistBold: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  rechazarButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
  },
  aprobarButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
  },
  actionButtonContent: {
    height: 48,
  },
  actionButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
