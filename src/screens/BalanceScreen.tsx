import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import capitalService from '../services/capitalService';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface BalanceData {
  capital: number;
  dineroPrestado: number;
  capitalDisponible: number;
  totalDeudas: number;
  ingresos: number;
  ingresosProyectados: number;
  prestamosActivos: number;
  deudasActivas: number;
  tasaPromedioInteres: number;
  totalCuotasPendientes: number;
}

export default function BalanceScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<BalanceData>({
    capital: 0,
    dineroPrestado: 0,
    capitalDisponible: 0,
    totalDeudas: 0,
    ingresos: 0,
    ingresosProyectados: 0,
    prestamosActivos: 0,
    deudasActivas: 0,
    tasaPromedioInteres: 0,
    totalCuotasPendientes: 0,
  });

  useFocusEffect(
    React.useCallback(() => {
      cargarBalance();
    }, [])
  );

  const cargarBalance = async () => {
    setLoading(true);

    const [prestamosResult, deudasResult, capitalResult] = await Promise.all([
      prestamosService.obtenerMisPrestamos(),
      prestamosService.obtenerMisDeudas(),
      capitalService.obtenerCapital(),
    ]);

    const prestamos = prestamosResult.prestamos || [];
    const deudas = deudasResult.deudas || [];
    const capitalDisponible = capitalResult.capital || 0;

    // Calcular dinero prestado total (capital activo en préstamos)
    const dineroPrestado = prestamos.reduce(
      (sum: number, p: any) => sum + parseFloat(p.monto_pendiente || 0),
      0
    );

    // Calcular total de deudas
    const totalDeudas = deudas.reduce(
      (sum: number, d: any) => sum + parseFloat(d.monto_pendiente || 0),
      0
    );

    // Calcular ingresos (total cobrado de intereses)
    const ingresos = prestamos.reduce((sum: number, p: any) => {
      const montoPrestado = parseFloat(p.monto_prestado);
      const montoPagado = parseFloat(p.monto_pagado || 0);
      // Los intereses ganados son la diferencia entre lo pagado y el capital proporcional
      const capitalProporcional = (montoPagado / parseFloat(p.monto_total)) * montoPrestado;
      const interesesGanados = montoPagado - capitalProporcional;
      return sum + Math.max(0, interesesGanados);
    }, 0);

    // Calcular ingresos proyectados (intereses pendientes por cobrar)
    const ingresosProyectados = prestamos.reduce((sum: number, p: any) => {
      const montoPrestado = parseFloat(p.monto_prestado);
      const montoTotal = parseFloat(p.monto_total);
      const totalIntereses = montoTotal - montoPrestado;
      
      const montoPagado = parseFloat(p.monto_pagado || 0);
      const capitalProporcional = (montoPagado / montoTotal) * montoPrestado;
      const interesesCobrados = montoPagado - capitalProporcional;
      
      const interesesPendientes = totalIntereses - Math.max(0, interesesCobrados);
      return sum + Math.max(0, interesesPendientes);
    }, 0);

    // Capital total = capital disponible + dinero prestado - deudas
    const capital = capitalDisponible + dineroPrestado - totalDeudas;

    // Contar préstamos y deudas activos
    const prestamosActivos = prestamos.filter((p: any) => p.estado === 'activo').length;
    const deudasActivas = deudas.filter((d: any) => d.estado === 'activo').length;

    // Calcular tasa promedio de interés de préstamos activos
    const prestamosActivosList = prestamos.filter((p: any) => p.estado === 'activo');
    const tasaPromedioInteres = prestamosActivosList.length > 0
      ? prestamosActivosList.reduce((sum: number, p: any) => sum + parseFloat(p.tasa_interes || 0), 0) / prestamosActivosList.length
      : 0;

    // Contar total de cuotas pendientes
    const totalCuotasPendientes = prestamos.reduce((sum: number, p: any) => {
      return sum + (p.cuotas || []).filter((c: any) => c.estado === 'pendiente').length;
    }, 0);

    setBalance({
      capital,
      dineroPrestado,
      capitalDisponible,
      totalDeudas,
      ingresos,
      ingresosProyectados,
      prestamosActivos,
      deudasActivas,
      tasaPromedioInteres,
      totalCuotasPendientes,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando balance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Balance Financiero</Text>
            <Text style={styles.headerSubtitle}>Vista detallada de tus finanzas</Text>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Capital Card - Destacado */}
        <Card style={styles.capitalCard}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.capitalGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.capitalContent}>
              <Text style={styles.capitalLabel}>💼 Capital Total</Text>
              <Text style={styles.capitalAmount}>S/ {balance.capital.toFixed(2)}</Text>
              <View style={styles.capitalBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Disponible</Text>
                  <Text style={styles.breakdownValue}>S/ {balance.capitalDisponible.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>En Préstamos</Text>
                  <Text style={styles.breakdownValue}>S/ {balance.dineroPrestado.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Card>

        {/* Ingresos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Ingresos</Text>
          <View style={styles.cardsRow}>
            <Card style={styles.halfCard}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>✅</Text>
                </View>
                <Text style={styles.cardLabel}>Ganados</Text>
                <Text style={[styles.cardValue, { color: colors.success }]}>
                  S/ {balance.ingresos.toFixed(2)}
                </Text>
                <Text style={styles.cardSubtext}>Por intereses cobrados</Text>
              </Card.Content>
            </Card>

            <Card style={styles.halfCard}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>⏳</Text>
                </View>
                <Text style={styles.cardLabel}>Proyectados</Text>
                <Text style={[styles.cardValue, { color: colors.warning }]}>
                  S/ {balance.ingresosProyectados.toFixed(2)}
                </Text>
                <Text style={styles.cardSubtext}>Intereses por cobrar</Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Préstamos vs Deudas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Préstamos vs Deudas</Text>
          <Card style={styles.fullCard}>
            <Card.Content>
              <View style={styles.vsContainer}>
                <View style={styles.vsItem}>
                  <Text style={styles.vsEmoji}>💸</Text>
                  <Text style={styles.vsLabel}>Dinero Prestado</Text>
                  <Text style={[styles.vsValue, { color: colors.loan }]}>
                    S/ {balance.dineroPrestado.toFixed(2)}
                  </Text>
                  <Text style={styles.vsSubtext}>{balance.prestamosActivos} préstamos activos</Text>
                </View>

                <View style={styles.vsDivider}>
                  <Text style={styles.vsDividerText}>vs</Text>
                </View>

                <View style={styles.vsItem}>
                  <Text style={styles.vsEmoji}>📋</Text>
                  <Text style={styles.vsLabel}>Total Deudas</Text>
                  <Text style={[styles.vsValue, { color: colors.error }]}>
                    S/ {balance.totalDeudas.toFixed(2)}
                  </Text>
                  <Text style={styles.vsSubtext}>{balance.deudasActivas} deudas activas</Text>
                </View>
              </View>

              {/* Balance Neto */}
              <View style={styles.netBalanceContainer}>
                <Text style={styles.netBalanceLabel}>Balance Neto</Text>
                <Text style={[
                  styles.netBalanceValue,
                  { color: (balance.dineroPrestado - balance.totalDeudas) > 0 ? colors.success : colors.error }
                ]}>
                  S/ {(balance.dineroPrestado - balance.totalDeudas).toFixed(2)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Estadísticas Adicionales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Estadísticas</Text>
          
          <Card style={styles.fullCard}>
            <Card.Content>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>%</Text>
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Tasa Promedio</Text>
                    <Text style={styles.statValue}>{balance.tasaPromedioInteres.toFixed(2)}%</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>📅</Text>
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Cuotas Pendientes</Text>
                    <Text style={styles.statValue}>{balance.totalCuotasPendientes}</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>💵</Text>
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Ingresos Totales</Text>
                    <Text style={styles.statValue}>
                      S/ {(balance.ingresos + balance.ingresosProyectados).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Text style={styles.statIcon}>📊</Text>
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Rentabilidad</Text>
                    <Text style={styles.statValue}>
                      {balance.dineroPrestado > 0 
                        ? ((balance.ingresos / balance.dineroPrestado) * 100).toFixed(2)
                        : '0.00'}%
                    </Text>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Info Card */}
        <View style={styles.section}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <View style={styles.infoContent}>
                <Text style={styles.infoIcon}>💡</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Balance Financiero</Text>
                  <Text style={styles.infoText}>
                    Tu capital representa el total de dinero que tienes invertido en préstamos más lo que ya has cobrado, 
                    menos tus deudas pendientes. Los ingresos reflejan las ganancias por intereses.
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
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
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
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
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.surface,
    opacity: 0.9,
  },
  capitalCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: borderRadius.lg,
    elevation: 6,
    overflow: 'hidden',
  },
  capitalGradient: {
    padding: spacing.lg,
  },
  capitalContent: {
    alignItems: 'center',
  },
  capitalLabel: {
    fontSize: fontSize.md,
    color: colors.surface,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  capitalAmount: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    marginBottom: spacing.md,
  },
  capitalBreakdown: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  breakdownLabel: {
    fontSize: fontSize.xs,
    color: colors.surface,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  breakdownValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.surface,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  cardSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fullCard: {
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  vsItem: {
    flex: 1,
    alignItems: 'center',
  },
  vsEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  vsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  vsValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  vsSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  vsDivider: {
    width: 40,
    alignItems: 'center',
  },
  vsDividerText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  netBalanceContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
  netBalanceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  netBalanceValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  statsGrid: {
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  infoCard: {
    borderRadius: borderRadius.md,
    elevation: 1,
    backgroundColor: colors.primary + '10',
    marginBottom: spacing.xl,
  },
  infoContent: {
    flexDirection: 'row',
    gap: spacing.md,
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
});
