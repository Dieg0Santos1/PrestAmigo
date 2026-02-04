import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, IconButton } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';

export default function EditLoanScreen({ route, navigation }: any) {
  const { loan } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deudorNombre: loan?.deudor_nombre || '',
    deudorApellido: loan?.deudor_apellido || '',
    deudorTelefono: loan?.deudor_telefono || '',
    deudorEmail: loan?.deudor_email || '',
    tasaInteres: loan?.tasa_interes?.toString() || '',
  });

  const handleSave = async () => {
    // Validaciones
    if (!formData.deudorNombre.trim()) {
      Alert.alert('Error', 'El nombre del deudor es requerido');
      return;
    }

    if (!formData.deudorApellido.trim()) {
      Alert.alert('Error', 'El apellido del deudor es requerido');
      return;
    }

    if (!formData.deudorTelefono.trim()) {
      Alert.alert('Error', 'El teléfono del deudor es requerido');
      return;
    }

    if (!formData.tasaInteres.trim()) {
      Alert.alert('Error', 'La tasa de interés es requerida');
      return;
    }

    const tasaInteres = parseFloat(formData.tasaInteres);
    if (isNaN(tasaInteres) || tasaInteres < 0) {
      Alert.alert('Error', 'La tasa de interés debe ser un número válido');
      return;
    }

    setLoading(true);

    const result = await prestamosService.editarPrestamo(loan.id, {
      deudor: {
        nombre: formData.deudorNombre.trim(),
        apellido: formData.deudorApellido.trim(),
        telefono: formData.deudorTelefono.trim(),
        email: formData.deudorEmail.trim(),
      },
      tasaInteres: tasaInteres,
    });

    setLoading(false);

    if (result.success) {
      Alert.alert('Éxito', 'Préstamo actualizado correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      Alert.alert('Error', result.error || 'No se pudo actualizar el préstamo');
    }
  };

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
        <Text style={styles.headerTitle}>Editar Préstamo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Puedes editar la información del deudor y la tasa de interés. 
              No se puede modificar el monto o el número de cuotas una vez creado el préstamo.
            </Text>
          </View>

          {/* Información del Deudor */}
          <Text style={styles.sectionTitle}>Información del Deudor</Text>

          <TextInput
            label="Nombre"
            value={formData.deudorNombre}
            onChangeText={(text) => setFormData({ ...formData, deudorNombre: text })}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Apellido"
            value={formData.deudorApellido}
            onChangeText={(text) => setFormData({ ...formData, deudorApellido: text })}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Teléfono"
            value={formData.deudorTelefono}
            onChangeText={(text) => setFormData({ ...formData, deudorTelefono: text })}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            activeOutlineColor={colors.primary}
          />

          <TextInput
            label="Email (opcional)"
            value={formData.deudorEmail}
            onChangeText={(text) => setFormData({ ...formData, deudorEmail: text })}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            activeOutlineColor={colors.primary}
          />

          {/* Información del Préstamo */}
          <Text style={styles.sectionTitle}>Información del Préstamo</Text>

          <TextInput
            label="Tasa de Interés (%)"
            value={formData.tasaInteres}
            onChangeText={(text) => setFormData({ ...formData, tasaInteres: text })}
            mode="outlined"
            style={styles.input}
            keyboardType="decimal-pad"
            activeOutlineColor={colors.primary}
          />

          {/* Información no editable */}
          <View style={styles.readOnlySection}>
            <Text style={styles.readOnlyTitle}>Información no editable:</Text>
            <View style={styles.readOnlyItem}>
              <Text style={styles.readOnlyLabel}>Monto prestado:</Text>
              <Text style={styles.readOnlyValue}>S/ {parseFloat(loan?.monto_prestado || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.readOnlyItem}>
              <Text style={styles.readOnlyLabel}>Número de cuotas:</Text>
              <Text style={styles.readOnlyValue}>{loan?.numero_cuotas || 0}</Text>
            </View>
            <View style={styles.readOnlyItem}>
              <Text style={styles.readOnlyLabel}>Frecuencia:</Text>
              <Text style={styles.readOnlyValue}>
                {loan?.frecuencia_pago === 'diario' ? 'Diario' :
                 loan?.frecuencia_pago === 'semanal' ? 'Semanal' :
                 loan?.frecuencia_pago === 'fin_semana' ? 'Fin de semana' :
                 loan?.frecuencia_pago === 'mensual' ? 'Mensual' : 'N/A'}
              </Text>
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
              onPress={handleSave}
              loading={loading}
              disabled={loading}
              style={[styles.button, styles.saveButton]}
              buttonColor={colors.primary}
              labelStyle={styles.saveButtonLabel}
            >
              Guardar
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
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  readOnlySection: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  readOnlyTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  readOnlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  readOnlyLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  readOnlyValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
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
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonLabel: {
    color: colors.surface,
  },
});
