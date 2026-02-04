import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { formatDate } from '../utils/dateUtils';
import VoucherZigzagBorder from '../components/VoucherZigzagBorder';

const { width } = Dimensions.get('window');

interface LoanSuccessScreenProps {
  route: any;
  navigation: any;
}

export default function LoanSuccessScreen({ route, navigation }: LoanSuccessScreenProps) {
  const { prestamo } = route.params || {};

  if (!prestamo) {
    navigation.goBack();
    return null;
  }

  const handleFinish = () => {
    navigation.navigate('Loans', { screen: 'LoansList' });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con marca */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandName}>PrestAmigo</Text>
        </View>

        {/* Icono de éxito */}
        <View style={styles.successIconContainer}>
          <LinearGradient
            colors={[colors.success, '#059669']}
            style={styles.successIcon}
          >
            <Text style={styles.checkmark}>✓</Text>
          </LinearGradient>
        </View>

        {/* Título */}
        <Text style={styles.title}>Préstamo Creado</Text>

        {/* Monto principal */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>S/</Text>
          <Text style={styles.amount}>{parseFloat(prestamo.monto_prestado).toFixed(2)}</Text>
        </View>

        {/* Subtítulo */}
        <Text style={styles.subtitle}>Rápido e inmediato</Text>

        {/* Voucher de Detalles */}
        <View style={styles.voucherContainer}>
          {/* Borde zigzag superior estilo voucher */}
          <VoucherZigzagBorder 
            width={width - (spacing.lg * 2)}
            height={12}
            color={colors.background}
            backgroundColor="#f0f4f8"
            triangleCount={14}
          />

          <View style={styles.voucherContent}>
            <Text style={styles.detailsTitle}>Detalles del Préstamo</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Deudor:</Text>
              <Text style={styles.detailValue}>
                {prestamo.deudor_nombre} {prestamo.deudor_apellido}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Teléfono:</Text>
              <Text style={styles.detailValue}>{prestamo.deudor_telefono}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monto:</Text>
              <Text style={styles.detailValue}>
                S/ {parseFloat(prestamo.monto_prestado).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tasa de interés:</Text>
              <Text style={styles.detailValue}>{prestamo.tasa_interes}%</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cuotas:</Text>
              <Text style={styles.detailValue}>{prestamo.numero_cuotas} cuotas</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fecha y hora:</Text>
              <Text style={styles.detailValue}>
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón de continuar */}
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.finishButtonGradient}
          >
            <Text style={styles.finishButtonText}>Ver Mis Préstamos</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Mensaje informativo */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            El deudor recibirá una notificación y podrá ver este préstamo en su sección de deudas.
          </Text>
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
  scrollContent: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
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
    marginBottom: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  voucherContent: {
    padding: spacing.lg,
    backgroundColor: '#f0f4f8',
  },
  successIconContainer: {
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  checkmark: {
    fontSize: 28,
    color: colors.surface,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  currencySymbol: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginRight: spacing.xs,
  },
  amount: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  operationCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  finishButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  finishButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
