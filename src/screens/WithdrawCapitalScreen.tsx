import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, IconButton } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import capitalService from '../services/capitalService';

export default function WithdrawCapitalScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [loadingCapital, setLoadingCapital] = useState(true);
  const [capitalActual, setCapitalActual] = useState(0);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    cargarCapital();
  }, []);

  const cargarCapital = async () => {
    setLoadingCapital(true);
    const result = await capitalService.obtenerCapital();
    if (result.success) {
      setCapitalActual(result.capital);
    }
    setLoadingCapital(false);
  };

  const handleWithdraw = async () => {
    if (!monto.trim()) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    if (montoNum > capitalActual) {
      Alert.alert('Error', 'No tienes suficiente capital disponible');
      return;
    }

    setLoading(true);

    const result = await capitalService.retirarCapital(
      montoNum,
      descripcion.trim() || 'Retiro de capital'
    );

    setLoading(false);

    if (result.success) {
      Alert.alert(
        '✅ Retiro Exitoso',
        `Se retiraron S/ ${montoNum.toFixed(2)} de tu capital.\n\nNuevo capital: S/ ${result.nuevoCapital?.toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'No se pudo retirar el capital');
    }
  };

  if (loadingCapital) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando capital...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={colors.text}
        />
        <Text style={styles.headerTitle}>Retirar Capital</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Capital actual */}
          <View style={styles.capitalCard}>
            <Text style={styles.capitalLabel}>Tu capital disponible</Text>
            <Text style={styles.capitalAmount}>S/ {capitalActual.toFixed(2)}</Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⚠️</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Retirar Capital</Text>
              <Text style={styles.infoText}>
                Retira dinero de tu capital disponible. Solo puedes retirar el monto que no esté comprometido en préstamos activos.
              </Text>
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <TextInput
              label="Monto a retirar (S/)"
              value={monto}
              onChangeText={setMonto}
              mode="outlined"
              style={styles.input}
              keyboardType="decimal-pad"
              activeOutlineColor={colors.error}
              left={<TextInput.Affix text="S/" />}
              placeholder="0.00"
            />

            <TextInput
              label="Descripción (opcional)"
              value={descripcion}
              onChangeText={setDescripcion}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={colors.error}
              placeholder="Ej: Gasto personal, Compra, etc."
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Ejemplo visual */}
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>📊 Cálculo</Text>
            <View style={styles.exampleContent}>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Capital actual:</Text>
                <Text style={styles.exampleValue}>S/ {capitalActual.toFixed(2)}</Text>
              </View>
              <Text style={styles.exampleMinus}>-</Text>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Monto a retirar:</Text>
                <Text style={[styles.exampleValue, { color: colors.error }]}>
                  S/ {monto ? parseFloat(monto).toFixed(2) : '0.00'}
                </Text>
              </View>
              <View style={styles.exampleDivider} />
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Capital restante:</Text>
                <Text style={[styles.exampleValue, styles.exampleTotal]}>
                  S/ {monto ? (capitalActual - parseFloat(monto || '0')).toFixed(2) : capitalActual.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={[styles.button, styles.cancelButton]}
              labelStyle={styles.cancelButtonLabel}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleWithdraw}
              loading={loading}
              disabled={loading || !monto || parseFloat(monto || '0') > capitalActual}
              style={[styles.button, styles.withdrawButton]}
              buttonColor={colors.error}
              labelStyle={styles.withdrawButtonLabel}
              icon="minus-circle"
            >
              Retirar
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  capitalCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  capitalLabel: {
    fontSize: fontSize.sm,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  capitalAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.error + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 32,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  exampleCard: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  exampleTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  exampleContent: {
    gap: spacing.sm,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exampleLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  exampleValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  exampleMinus: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    fontWeight: fontWeight.bold,
  },
  exampleDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
  exampleTotal: {
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    borderColor: colors.textSecondary,
  },
  cancelButtonLabel: {
    color: colors.textSecondary,
  },
  withdrawButton: {
    backgroundColor: colors.error,
  },
  withdrawButtonLabel: {
    color: colors.surface,
  },
});
