import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Card, IconButton, FAB, Portal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const [nombreUsuario, setNombreUsuario] = useState<string>('Usuario');
  const [balance, setBalance] = useState({
    totalPrestado: 0,
    totalAdeudado: 0,
    proximosCobros: 0,
    proximosPagos: 0,
  });
  const [proximasCuotas, setProximasCuotas] = useState<any[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      cargarDatos();
    }, [])
  );

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: fabOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fabOpen]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando datos del dashboard...');
      
      // Obtener perfil del usuario
      console.log('1️⃣ Obteniendo perfil...');
      const perfilResult = await authService.getProfile();
      if (perfilResult.success && perfilResult.perfil) {
        setNombreUsuario(perfilResult.perfil.nombre);
        console.log('✅ Perfil obtenido:', perfilResult.perfil.nombre);
      } else {
        console.log('⚠️ No se pudo obtener perfil:', perfilResult.error);
      }
      
      // Obtener préstamos y deudas
      console.log('2️⃣ Obteniendo préstamos y deudas...');
      const [prestamosResult, deudasResult] = await Promise.all([
        prestamosService.obtenerMisPrestamos(),
        prestamosService.obtenerMisDeudas(),
      ]);

      console.log('✅ Préstamos:', prestamosResult.prestamos?.length || 0);
      console.log('✅ Deudas:', deudasResult.deudas?.length || 0);

      const prestamos = prestamosResult.prestamos || [];
      const deudas = deudasResult.deudas || [];

      // Calcular totales
      const totalPrestado = prestamos.reduce((sum: number, p: any) => sum + parseFloat(p.monto_pendiente || 0), 0);
      const totalAdeudado = deudas.reduce((sum: number, d: any) => sum + parseFloat(d.monto_pendiente || 0), 0);

      // Obtener próximas cuotas de préstamos (a cobrar)
      const cuotasCobro = prestamos.flatMap((p: any) => 
        (p.cuotas || []).filter((c: any) => c.estado === 'pendiente').map((c: any) => ({
          id: c.id,
          tipo: 'cobro',
          persona: `${p.deudor_nombre} ${p.deudor_apellido}`,
          monto: parseFloat(c.monto),
          fecha: c.fecha_vencimiento,
          prestamoId: p.id,
        }))
      );

      // Obtener próximas cuotas de deudas (a pagar)
      const cuotasPago = deudas.flatMap((d: any) => 
        (d.cuotas || []).filter((c: any) => c.estado === 'pendiente').map((c: any) => ({
          id: c.id,
          tipo: 'pago',
          persona: `${d.prestamista_nombre} ${d.prestamista_apellido}`,
          monto: parseFloat(c.monto),
          fecha: c.fecha_vencimiento,
          deudaId: d.id,
        }))
      );

      // Combinar y ordenar por fecha
      const todasCuotas = [...cuotasCobro, ...cuotasPago].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      ).slice(0, 5); // Solo las primeras 5

      // Calcular próximos cobros y pagos
      const proximosCobros = cuotasCobro.length > 0 ? cuotasCobro[0].monto : 0;
      const proximosPagos = cuotasPago.length > 0 ? cuotasPago[0].monto : 0;

      setBalance({
        totalPrestado,
        totalAdeudado,
        proximosCobros,
        proximosPagos,
      });
      setProximasCuotas(todasCuotas);
      
      console.log('✅ Dashboard cargado exitosamente');
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con gradiente */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>Hola, {nombreUsuario} 👋</Text>
              <Text style={styles.subtitle}>Tu balance general</Text>
            </View>
            <IconButton
              icon="account-circle"
              size={32}
              iconColor={colors.surface}
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileButton}
            />
          </View>
        </LinearGradient>

        {/* Cards de Balance */}
        <View style={styles.balanceContainer}>
          {/* Préstamos Otorgados */}
          <TouchableOpacity 
            style={styles.balanceCard}
            onPress={() => navigation.navigate('Loans')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.loan, colors.primary]}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.balanceLabel}>💰 Mis Préstamos</Text>
              <Text style={styles.balanceAmount}>S/ {balance.totalPrestado.toFixed(2)}</Text>
              <Text style={styles.balanceSubtext}>
                Próx. cobro: S/ {balance.proximosCobros.toFixed(2)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Deudas */}
          <TouchableOpacity 
            style={styles.balanceCard}
            onPress={() => navigation.navigate('Debts')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.warning, '#F97316']}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.balanceLabel}>📋 Mis Deudas</Text>
              <Text style={styles.balanceAmount}>S/ {balance.totalAdeudado.toFixed(2)}</Text>
              <Text style={styles.balanceSubtext}>
                Próx. pago: S/ {balance.proximosPagos.toFixed(2)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Balance Neto */}
        <Card style={styles.netBalanceCard}>
          <Card.Content>
            <View style={styles.netBalanceContent}>
              <View>
                <Text style={styles.netBalanceLabel}>Balance Neto</Text>
                <Text style={[
                  styles.netBalanceAmount,
                  { color: balance.totalPrestado - balance.totalAdeudado > 0 ? colors.success : colors.error }
                ]}>
                  S/ {(balance.totalPrestado - balance.totalAdeudado).toFixed(2)}
                </Text>
              </View>
              <View style={styles.netBalanceIcon}>
                <Text style={styles.netBalanceEmoji}>
                  {balance.totalPrestado - balance.totalAdeudado > 0 ? '📈' : '📉'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Próximas Cuotas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximas Cuotas</Text>
            {proximasCuotas.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>

          {proximasCuotas.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>📅</Text>
              <Text style={styles.emptyStateTitle}>No hay cuotas próximas</Text>
              <Text style={styles.emptyStateText}>
                Cuando tengas préstamos o deudas activos, verás aquí las próximas cuotas a cobrar o pagar.
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('Loans')}
              >
                <Text style={styles.createButtonText}>Crear Préstamo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            proximasCuotas.map((cuota) => (
              <Card key={cuota.id} style={styles.cuotaCard}>
                <Card.Content>
                  <View style={styles.cuotaContent}>
                    <View style={styles.cuotaLeft}>
                      <View style={[
                        styles.cuotaIcon,
                        { backgroundColor: cuota.tipo === 'cobro' ? colors.success + '20' : colors.warning + '20' }
                      ]}>
                        <Text style={styles.cuotaIconText}>
                          {cuota.tipo === 'cobro' ? '⬇️' : '⬆️'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cuotaPersona}>{cuota.persona}</Text>
                        <Text style={styles.cuotaFecha}>{formatDate(cuota.fecha)}</Text>
                      </View>
                    </View>
                    <View style={styles.cuotaRight}>
                      <Text style={[
                        styles.cuotaMonto,
                        { color: cuota.tipo === 'pago' ? colors.warning : colors.success }
                      ]}>
                        {cuota.tipo === 'pago' ? '-' : ''}S/ {cuota.monto.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Individual FABs for better positioning */}
      {fabOpen && (
        <>
          {/* Crear Préstamo - Top */}
          <Animated.View
            style={[
              styles.fabAction,
              {
                bottom: 8 + insets.bottom + 200,
                opacity: animatedValue,
                transform: [
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [80, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.fabLabelContainer}>
              <View style={styles.fabLabelBackground}>
                <Text style={styles.fabLabelText}>Crear Préstamo</Text>
              </View>
              <FAB
                icon="cash-multiple"
                color={colors.surface}
                style={[styles.fabButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate('Loans', { screen: 'AddLoan' });
                }}
                size="small"
              />
            </View>
          </Animated.View>

          {/* Añadir Capital - Middle */}
          <Animated.View
            style={[
              styles.fabAction,
              {
                bottom: 8 + insets.bottom + 130,
                opacity: animatedValue,
                transform: [
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.fabLabelContainer}>
              <View style={styles.fabLabelBackground}>
                <Text style={styles.fabLabelText}>Añadir Capital</Text>
              </View>
              <FAB
                icon="cash-plus"
                color={colors.surface}
                style={[styles.fabButton, { backgroundColor: colors.success }]}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate('AddCapital');
                }}
                size="small"
              />
            </View>
          </Animated.View>

          {/* Retiro Capital - Bottom */}
          <Animated.View
            style={[
              styles.fabAction,
              {
                bottom: 8 + insets.bottom + 60,
                opacity: animatedValue,
                transform: [
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.fabLabelContainer}>
              <View style={styles.fabLabelBackground}>
                <Text style={styles.fabLabelText}>Retiro Capital</Text>
              </View>
              <FAB
                icon="cash-minus"
                color={colors.surface}
                style={[styles.fabButton, { backgroundColor: colors.error }]}
                onPress={() => {
                  setFabOpen(false);
                  navigation.navigate('WithdrawCapital');
                }}
                size="small"
              />
            </View>
          </Animated.View>
        </>
      )}

      {/* Main FAB Button */}
      <FAB
        icon={fabOpen ? 'close' : 'plus'}
        style={[
          styles.fabMain,
          {
            bottom: 8 + insets.bottom,
            backgroundColor: colors.primary,
          },
        ]}
        color={colors.surface}
        onPress={() => setFabOpen(!fabOpen)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  profileButton: {
    margin: 0,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.surface,
    opacity: 0.9,
  },
  balanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  balanceCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceGradient: {
    padding: spacing.md,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  balanceSubtext: {
    fontSize: fontSize.xs,
    color: colors.surface,
    opacity: 0.8,
  },
  netBalanceCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  netBalanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netBalanceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  netBalanceAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  netBalanceIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  netBalanceEmoji: {
    fontSize: 32,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sectionLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  cuotaCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 1,
  },
  cuotaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cuotaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cuotaIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cuotaIconText: {
    fontSize: 24,
  },
  cuotaPersona: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  cuotaFecha: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cuotaRight: {
    alignItems: 'flex-end',
  },
  cuotaMonto: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  emptyStateEmoji: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  createButtonText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text,
  },
  fabMain: {
    position: 'absolute',
    right: spacing.md,
  },
  fabAction: {
    position: 'absolute',
    right: spacing.md,
  },
  fabLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fabLabelBackground: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  fabLabelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  fabButton: {
    elevation: 4,
  },
});
