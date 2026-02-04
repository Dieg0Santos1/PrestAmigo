import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Card, IconButton, Dialog, Portal } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const [profile, setProfile] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    dni: '',
  });

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          telefono: data.telefono || '',
          email: user?.email || '',
          dni: data.dni || '',
        });
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validaciones
    if (!profile.nombre.trim() || !profile.apellido.trim()) {
      Alert.alert('Error', 'El nombre y apellido son obligatorios');
      return;
    }

    if (!profile.telefono.trim()) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return;
    }

    try {
      setSaving(true);

      // Actualizar perfil
      const { error: profileError } = await supabase
        .from('perfiles')
        .update({
          nombre: profile.nombre.trim(),
          apellido: profile.apellido.trim(),
          telefono: profile.telefono.trim(),
        })
        .eq('user_id', user?.id);

      if (profileError) throw profileError;

      // Si cambió el email, actualizarlo en auth
      if (profile.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email,
        });

        if (emailError) {
          Alert.alert(
            'Email no actualizado',
            'El perfil se guardó pero el email no pudo actualizarse. Verifica que el email sea válido.'
          );
        } else {
          Alert.alert(
            'Verifica tu nuevo email',
            'Se ha enviado un correo de confirmación a tu nuevo email. Por favor verifica tu correo para completar el cambio.'
          );
        }
      } else {
        Alert.alert('✅ Perfil actualizado', 'Tus datos han sido guardados correctamente');
      }

      cargarPerfil();
    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== 'eliminar') {
      Alert.alert('Error', 'Por favor escribe "eliminar" para confirmar');
      return;
    }

    try {
      setSaving(true);

      // Verificar que no tenga préstamos activos
      const { data: prestamos } = await supabase
        .from('prestamos')
        .select('id, estado')
        .or(`prestamista_id.eq.${user?.id},deudor_id.eq.${user?.id}`)
        .eq('estado', 'activo');

      if (prestamos && prestamos.length > 0) {
        Alert.alert(
          'No se puede eliminar',
          'Tienes préstamos o deudas activas. Debes finalizarlos antes de eliminar tu cuenta.'
        );
        setSaving(false);
        setDeleteDialogVisible(false);
        setConfirmText('');
        return;
      }

      // 1. Primero eliminar el perfil
      const { error: profileError } = await supabase
        .from('perfiles')
        .delete()
        .eq('user_id', user?.id);

      if (profileError) {
        console.error('Error eliminando perfil:', profileError);
        throw new Error('No se pudo eliminar el perfil');
      }

      // 2. Eliminar el usuario de auth usando la API del cliente
      // Nota: Esto requiere que el usuario esté autenticado
      const { error: deleteError } = await supabase.rpc('delete_user');

      if (deleteError) {
        console.error('Error eliminando usuario:', deleteError);
        // Si falla, al menos cerrar sesión
        await signOut();
        throw new Error('Perfil eliminado pero el usuario de autenticación no pudo ser eliminado. Contacta soporte.');
      }

      // 3. Cerrar sesión
      await signOut();

      Alert.alert(
        'Cuenta eliminada',
        'Tu cuenta ha sido eliminada permanentemente'
      );
    } catch (error: any) {
      console.error('Error eliminando cuenta:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar la cuenta');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.nombre[0]}{profile.apellido[0]}
            </Text>
          </View>
          <Text style={styles.userName}>
            {profile.nombre} {profile.apellido}
          </Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
        </View>

        {/* Form */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Información Personal</Text>

            <TextInput
              label="Nombre"
              value={profile.nombre}
              onChangeText={(text) => setProfile({ ...profile, nombre: text })}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.divider}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Apellido"
              value={profile.apellido}
              onChangeText={(text) => setProfile({ ...profile, apellido: text })}
              style={styles.input}
              mode="outlined"
              outlineColor={colors.divider}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="DNI"
              value={profile.dni}
              onChangeText={(text) => setProfile({ ...profile, dni: text })}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              maxLength={8}
              outlineColor={colors.divider}
              activeOutlineColor={colors.primary}
              editable={false}
              disabled
            />

            <TextInput
              label="Teléfono"
              value={profile.telefono}
              onChangeText={(text) => setProfile({ ...profile, telefono: text })}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              outlineColor={colors.divider}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Email"
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              outlineColor={colors.divider}
              activeOutlineColor={colors.primary}
            />

            <Button
              mode="contained"
              onPress={handleSaveProfile}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
              contentStyle={styles.buttonContent}
            >
              Guardar Cambios
            </Button>
          </Card.Content>
        </Card>

        {/* Danger Zone */}
        <Card style={styles.dangerCard}>
          <Card.Content>
            <Text style={styles.dangerTitle}>⚠️ Zona de Peligro</Text>
            <Text style={styles.dangerText}>
              Una vez que elimines tu cuenta, no hay vuelta atrás. Esto borrará permanentemente
              todos tus datos personales.
            </Text>

            <Button
              mode="outlined"
              onPress={() => setDeleteDialogVisible(true)}
              style={styles.deleteButton}
              textColor={colors.error}
              contentStyle={styles.buttonContent}
            >
              Eliminar Cuenta
            </Button>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="text"
          onPress={signOut}
          style={styles.logoutButton}
          textColor={colors.textSecondary}
          icon="logout"
        >
          Cerrar Sesión
        </Button>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => {
          setDeleteDialogVisible(false);
          setConfirmText('');
        }}>
          <Dialog.Title>⚠️ Eliminar Cuenta</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Esta acción es permanente y no se puede deshacer.
              {'\n\n'}
              Para confirmar, escribe <Text style={styles.boldText}>eliminar</Text> en el campo de abajo:
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="eliminar"
              style={styles.confirmInput}
              mode="outlined"
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setDeleteDialogVisible(false);
              setConfirmText('');
            }} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onPress={handleDeleteAccount}
              textColor={colors.error}
              loading={saving}
              disabled={saving || confirmText.toLowerCase() !== 'eliminar'}
            >
              Eliminar
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
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  formCard: {
    margin: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 2,
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
  saveButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    height: 48,
  },
  dangerCard: {
    margin: spacing.md,
    marginTop: spacing.xl,
    borderRadius: borderRadius.md,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  dangerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  dangerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deleteButton: {
    borderColor: colors.error,
  },
  logoutButton: {
    marginVertical: spacing.xl,
    alignSelf: 'center',
  },
  dialogText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  boldText: {
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  confirmInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
});
