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

export default function AddCapitalScreen({ navigation }: any) {
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

  const handleAdd = async () => {
    if (!monto.trim()) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);

    const result = await capitalService.agregarCapital(
      montoNum,
      descripcion.trim() || 'Ingreso de capital'
    );

    setLoading(false);

    if (result.success) {
      Alert.alert(
        '✅ Capital Agregado',
        `Se agregaron S/ ${montoNum.toFixed(2)} a tu capital.\n\nNuevo capital: S/ ${result.nuevoCapital?.toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'No se pudo agregar el capital');
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
        <Text style={styles.headerTitle}>Añadir Capital</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💰</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Añadir Capital</Text>
              <Text style={styles.infoText}>
                Ingresa dinero a tu capital para poder crear nuevos préstamos. 
                Este dinero estará disponible para prestar a otras personas.
              </Text>
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <TextInput
              label="Monto (S/)"
              value={monto}
              onChangeText={setMonto}
              mode="outlined"
              style={styles.input}
              keyboardType="decimal-pad"
              activeOutlineColor={colors.primary}
              left={<TextInput.Affix text="S/" />}
              placeholder="0.00"
            />

            <TextInput
              label="Descripción (opcional)"
              value={descripcion}
              onChangeText={setDescripcion}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={colors.primary}
              placeholder="Ej: Ingreso mensual, Ahorro, etc."
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Ejemplo visual */}
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>📊 Ejemplo</Text>
            <View style={styles.exampleContent}>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Capital actual:</Text>
                <Text style={styles.exampleValue}>S/ {capitalActual.toFixed(2)}</Text>
              </View>
              <Text style={styles.examplePlus}>+</Text>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Monto a agregar:</Text>
                <Text style={[styles.exampleValue, { color: colors.success }]}>
                  S/ {monto ? parseFloat(monto).toFixed(2) : '0.00'}
                </Text>
              </View>
              <View style={styles.exampleDivider} />
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Nuevo capital:</Text>
                <Text style={[styles.exampleValue, styles.exampleTotal]}>
                  S/ {monto ? (capitalActual + parseFloat(monto || '0')).toFixed(2) : capitalActual.toFixed(2)}
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
              onPress={handleAdd}
              loading={loading}
              disabled={loading || !monto}
              style={[styles.button, styles.addButton]}
              buttonColor={colors.success}
              labelStyle={styles.addButtonLabel}
              icon="plus-circle"
            >
              Agregar
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.success + '15',
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
  examplePlus: {
    fontSize: fontSize.lg,
    color: colors.success,
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
    color: colors.success,
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
  addButton: {
    backgroundColor: colors.success,
  },
  addButtonLabel: {
    color: colors.surface,
  },
});
