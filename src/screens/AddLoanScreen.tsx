import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput, Button, RadioButton, IconButton, SegmentedButtons } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import capitalService from '../services/capitalService';
import notificationsService from '../services/notificationsService';
import PhoneInput from '../components/PhoneInput';
import authService from '../services/authService';

export default function AddLoanScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState('');
  const [tasaInteres, setTasaInteres] = useState('');
  const [numeroCuotas, setNumeroCuotas] = useState('');
  const [frecuenciaPago, setFrecuenciaPago] = useState('mensual'); // diario, semanal, mensual, fin_semana
  const [loading, setLoading] = useState(false);

  const calcularMontoCuota = () => {
    if (!monto || !numeroCuotas || !tasaInteres) return 0;
    
    const montoTotal = parseFloat(monto);
    const tasa = parseFloat(tasaInteres) / 100;
    const cuotas = parseInt(numeroCuotas);
    
    // Calcular monto total con interés
    const montoConInteres = montoTotal * (1 + tasa);
    
    // Dividir entre número de cuotas
    return (montoConInteres / cuotas).toFixed(2);
  };

  const calcularMontoTotal = () => {
    if (!monto || !tasaInteres) return 0;
    
    const montoTotal = parseFloat(monto);
    const tasa = parseFloat(tasaInteres) / 100;
    
    return (montoTotal * (1 + tasa)).toFixed(2);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre');
      return;
    }
    if (!apellido.trim()) {
      Alert.alert('Error', 'Por favor ingresa el apellido');
      return;
    }
    if (!telefono.trim()) {
      Alert.alert('Error', 'Por favor ingresa el teléfono');
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }
    if (!tasaInteres || parseFloat(tasaInteres) < 0) {
      Alert.alert('Error', 'Por favor ingresa una tasa de interés válida');
      return;
    }
    if (!numeroCuotas || parseInt(numeroCuotas) <= 0) {
      Alert.alert('Error', 'Por favor ingresa el número de cuotas');
      return;
    }

    setLoading(true);
    
    // Validar capital disponible
    const montoPrestamo = parseFloat(monto);
    const { success: capitalSuccess, capital: capitalDisponible } = await capitalService.obtenerCapital();
    
    if (!capitalSuccess) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo verificar tu capital disponible');
      return;
    }
    
    if (capitalDisponible < montoPrestamo) {
      setLoading(false);
      Alert.alert(
        '⚠️ Capital Insuficiente',
        `No tienes suficiente capital disponible para este préstamo.\n\nCapital disponible: S/ ${capitalDisponible.toFixed(2)}\nMonto solicitado: S/ ${montoPrestamo.toFixed(2)}\nFaltante: S/ ${(montoPrestamo - capitalDisponible).toFixed(2)}\n\nAgrega más capital desde la sección Balance para poder crear este préstamo.`,
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    
    const prestamoData = {
      deudor: {
        nombre,
        apellido,
        telefono,
      },
      monto: parseFloat(monto),
      tasaInteres: parseFloat(tasaInteres),
      numeroCuotas: parseInt(numeroCuotas),
      frecuenciaPago: frecuenciaPago as 'diario' | 'semanal' | 'fin_semana' | 'mensual',
      montoCuota: parseFloat(calcularMontoCuota()),
      montoTotal: parseFloat(calcularMontoTotal()),
    };

    const result = await prestamosService.crearPrestamo(prestamoData);
    
    if (result.success) {
      // Descontar el monto del capital disponible
      const capitalResult = await capitalService.descontarPorPrestamo(
        result.prestamo.id,
        montoPrestamo
      );
      
      if (!capitalResult.success) {
        console.error('Error descontando capital:', capitalResult.error);
        // Continuar de todas formas ya que el préstamo se creó
      }
      
      // Obtener el nombre del prestamista actual para la notificación
      const perfilResult = await authService.getProfile();
      if (perfilResult.success && perfilResult.perfil) {
        const prestamistaNombre = `${perfilResult.perfil.nombre} ${perfilResult.perfil.apellido}`;
        // Enviar notificación al deudor (el deudor_id viene en result.prestamo)
        if (result.prestamo.deudor_id) {
          await notificationsService.sendLoanCreatedNotification(
            result.prestamo.deudor_id,
            prestamistaNombre,
            montoPrestamo
          );
        }
      }
      
      setLoading(false);
      
      // Navegar a la pantalla de éxito con el préstamo creado
      navigation.navigate('LoanSuccess', { prestamo: result.prestamo });
    } else if (result.error === 'USER_NOT_REGISTERED') {
      setLoading(false);
      // Alerta especial cuando el usuario no está registrado
      Alert.alert(
        '📱 Usuario no registrado',
        `${nombre} ${apellido} aún no tiene una cuenta en PrestAmigo.\n\nPara crear un préstamo, tu contacto debe:\n
1️⃣ Descargar la app\n2️⃣ Registrarse con su número: ${telefono}\n3️⃣ Luego podrás crear el préstamo\n\n¡Ínvitalo a unirse a PrestAmigo!`,
        [
          {
            text: 'Entendido',
            style: 'default',
          },
        ],
        { cancelable: true }
      );
    } else {
      Alert.alert('Error', result.error || result.message || 'No se pudo crear el préstamo');
    }
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
        <Text style={styles.headerTitle}>Nuevo Préstamo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Sección: Datos del Deudor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Deudor</Text>
          
          <TextInput
            label="Nombre"
            value={nombre}
            onChangeText={setNombre}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Apellido"
            value={apellido}
            onChangeText={setApellido}
            mode="outlined"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="account" />}
          />

          <PhoneInput
            value={telefono}
            onChangeText={setTelefono}
            label="Teléfono"
            placeholder="999999999"
          />
        </View>

        {/* Sección: Detalles del Préstamo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Préstamo</Text>
          
          <TextInput
            label="Monto del Préstamo"
            value={monto}
            onChangeText={setMonto}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="cash" />}
            placeholder="0.00"
          />

          <TextInput
            label="Tasa de Interés (%)"
            value={tasaInteres}
            onChangeText={setTasaInteres}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="percent" />}
            placeholder="5"
            right={<TextInput.Affix text="%" />}
          />

          <TextInput
            label="Número de Cuotas"
            value={numeroCuotas}
            onChangeText={setNumeroCuotas}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="calendar-month" />}
            placeholder="12"
          />
        </View>

        {/* Frecuencia de Pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frecuencia de Pago</Text>
          
          <SegmentedButtons
            value={frecuenciaPago}
            onValueChange={setFrecuenciaPago}
            buttons={[
              {
                value: 'diario',
                label: 'Diario',
                icon: 'calendar-today',
              },
              {
                value: 'semanal',
                label: 'Semanal',
                icon: 'calendar-week',
              },
            ]}
            style={styles.segmentedButtons}
          />

          <SegmentedButtons
            value={frecuenciaPago}
            onValueChange={setFrecuenciaPago}
            buttons={[
              {
                value: 'fin_semana',
                label: 'Fin de Semana',
                icon: 'calendar-weekend',
              },
              {
                value: 'mensual',
                label: 'Mensual',
                icon: 'calendar-month',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Resumen */}
        {monto && tasaInteres && numeroCuotas && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen del Préstamo</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monto prestado:</Text>
              <Text style={styles.summaryValue}>S/ {parseFloat(monto).toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Interés ({tasaInteres}%):</Text>
              <Text style={styles.summaryValue}>
                S/ {(parseFloat(monto) * parseFloat(tasaInteres) / 100).toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Total a cobrar:</Text>
              <Text style={styles.summaryValueBold}>S/ {calcularMontoTotal()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cuota {frecuenciaPago}:</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                S/ {calcularMontoCuota()}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Número de cuotas:</Text>
              <Text style={styles.summaryValue}>{numeroCuotas}</Text>
            </View>
          </View>
        )}

        {/* Botón Guardar */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          labelStyle={styles.submitButtonLabel}
        >
          Crear Préstamo
        </Button>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  segmentedButtons: {
    marginBottom: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  summaryLabelBold: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryValueBold: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  submitButtonContent: {
    height: 52,
  },
  submitButtonLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
