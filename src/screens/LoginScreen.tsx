import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Checkbox, Dialog, Portal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import authService from '../services/authService';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Cargar credenciales guardadas al inicio
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    const credentials = await authService.getSavedCredentials();
    if (credentials) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    const result = await authService.login({
      email,
      password,
      remember: rememberMe,
    });
    setLoading(false);

    if (result.success) {
      // La navegación se manejará automáticamente por el AuthContext
      console.log('Login exitoso');
    } else {
      Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setResetLoading(true);
    const result = await authService.resetPassword(resetEmail);
    setResetLoading(false);

    if (result.success) {
      Alert.alert(
        '¡Correo enviado!',
        'Revisa tu correo electrónico para restablecer tu contraseña'
      );
      setShowForgotDialog(false);
      setResetEmail('');
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar el correo');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con gradiente */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.title}>PrestAmigo</Text>
          <Text style={styles.subtitle}>Gestiona tus préstamos fácilmente</Text>
        </LinearGradient>

        {/* Formulario */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>¡Bienvenido!</Text>
          <Text style={styles.instructionText}>
            Inicia sesión para continuar
          </Text>

          <TextInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {/* Recordar credenciales */}
          <TouchableOpacity 
            style={styles.rememberContainer}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              color={colors.primary}
            />
            <Text style={styles.rememberText}>Recordar mis credenciales</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowForgotDialog(true)}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || !email || !password}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
          >
            Iniciar Sesión
          </Button>

          {/* Registro */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Diálogo de Recuperar Contraseña */}
      <Portal>
        <Dialog visible={showForgotDialog} onDismiss={() => setShowForgotDialog(false)}>
          <Dialog.Title>Recuperar Contraseña</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </Text>
            <TextInput
              label="Correo electrónico"
              value={resetEmail}
              onChangeText={setResetEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.dialogInput}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowForgotDialog(false)}>Cancelar</Button>
            <Button 
              onPress={handleForgotPassword}
              loading={resetLoading}
              disabled={resetLoading}
              mode="contained"
            >
              Enviar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.surface,
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  welcomeText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instructionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rememberText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: -spacing.xs,
  },
  forgotPasswordContainer: {
    marginBottom: spacing.xl,
  },
  forgotPassword: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    textAlign: 'left',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  loginButtonContent: {
    height: 52,
  },
  loginButtonLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  registerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  dialogText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  dialogInput: {
    backgroundColor: colors.surface,
  },
});
