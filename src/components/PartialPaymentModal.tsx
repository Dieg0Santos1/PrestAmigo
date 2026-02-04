import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';

interface PartialPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (montoParcial: number) => Promise<void>;
  montoTotal: number;
  numeroCuota: number;
}

export default function PartialPaymentModal({
  visible,
  onClose,
  onConfirm,
  montoTotal,
  numeroCuota,
}: PartialPaymentModalProps) {
  const [montoParcial, setMontoParcial] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calcular el monto restante
  const montoRestante = montoParcial 
    ? Math.max(0, montoTotal - parseFloat(montoParcial || '0'))
    : montoTotal;

  useEffect(() => {
    if (visible) {
      setMontoParcial('');
      setError('');
    }
  }, [visible]);

  const handleMontoChange = (text: string) => {
    // Solo permitir números y un punto decimal
    const cleanText = text.replace(/[^0-9.]/g, '');
    
    // Evitar múltiples puntos decimales
    const parts = cleanText.split('.');
    if (parts.length > 2) return;
    
    setMontoParcial(cleanText);
    setError('');
  };

  const validateAndSubmit = async () => {
    const monto = parseFloat(montoParcial);

    // Validaciones
    if (!montoParcial || isNaN(monto)) {
      setError('Ingresa un monto válido');
      return;
    }

    if (monto <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (monto >= montoTotal) {
      setError('El monto debe ser menor al total de la cuota');
      return;
    }

    if (montoRestante < 10) {
      setError('El monto restante debe ser al menos S/ 10');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(monto);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear el pago parcial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Dividir Cuota #{numeroCuota}</Text>
              <Text style={styles.subtitle}>Monto original: S/ {montoTotal.toFixed(2)}</Text>
            </View>
            <IconButton
              icon="close"
              size={24}
              iconColor={colors.textSecondary}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.label}>Monto del primer pago</Text>
            <Text style={styles.hint}>
              Ingresa el monto que el deudor pagará primero
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.currency}>S/</Text>
              <TextInput
                style={styles.input}
                value={montoParcial}
                onChangeText={handleMontoChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                editable={!loading}
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Calculation Display */}
            {montoParcial && !error && (
              <View style={styles.calculationBox}>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Primer pago:</Text>
                  <Text style={styles.calculationValue}>
                    S/ {parseFloat(montoParcial || '0').toFixed(2)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Segundo pago:</Text>
                  <Text style={[styles.calculationValue, styles.remainingAmount]}>
                    S/ {montoRestante.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Se creará una segunda cuota con el monto restante. Ambas cuotas 
                tendrán la misma fecha de vencimiento.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                loading && styles.buttonDisabled
              ]}
              onPress={validateAndSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Dividir Cuota</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  closeButton: {
    margin: -8,
  },
  content: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  currency: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
  },
  calculationBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  calculationLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  calculationValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  remainingAmount: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceVariant,
  },
  buttonSecondaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
