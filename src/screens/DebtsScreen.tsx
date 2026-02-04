import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Card, Chip, Button } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import { useFocusEffect } from '@react-navigation/native';

export default function DebtsScreen({ navigation }: any) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [deudas, setDeudas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      cargarDeudas();
    }, [])
  );

  const cargarDeudas = async () => {
    setLoading(true);
    const { deudas: data } = await prestamosService.obtenerMisDeudas();
    
    const deudasFormateadas = data.map((d: any) => ({
      id: d.id,
      prestamista: `${d.prestamista_nombre} ${d.prestamista_apellido}`,
      monto: parseFloat(d.monto_total),
      pagado: d.monto_pagado,
      pendiente: d.monto_pendiente,
      tasa: parseFloat(d.tasa_interes),
      cuotas: d.numero_cuotas,
      cuotasPagadas: d.cuotas_pagadas,
      fechaInicio: d.fecha_inicio,
      estado: d.estado === 'completado' ? 'completado' : 'activo',
      proximaCuota: d.cuotas?.find((c: any) => c.estado === 'pendiente') || null,
    }));
    
    setDeudas(deudasFormateadas);
    setLoading(false);
  };

  const filteredDeudas = deudas.filter(d => {
    return filterStatus === 'all' || d.estado === filterStatus;
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return colors.warning;
      case 'completado': return colors.success;
      case 'vencido': return colors.error;
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Fijo */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Deudas</Text>
          <Text style={styles.subtitle}>Dinero que debo</Text>
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
        <Chip
          selected={filterStatus === 'all'}
          onPress={() => setFilterStatus('all')}
          style={styles.filterChip}
          selectedColor={colors.primary}
        >
          Todas ({deudas.length})
        </Chip>
        <Chip
          selected={filterStatus === 'activo'}
          onPress={() => setFilterStatus('activo')}
          style={styles.filterChip}
          selectedColor={colors.warning}
        >
          Activas ({deudas.filter(d => d.estado === 'activo').length})
        </Chip>
        <Chip
          selected={filterStatus === 'completado'}
          onPress={() => setFilterStatus('completado')}
          style={styles.filterChip}
          selectedColor={colors.success}
        >
          Pagadas ({deudas.filter(d => d.estado === 'completado').length})
        </Chip>
      </ScrollView>
      </View>

      {/* Lista de Deudas */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando deudas...</Text>
          </View>
        ) : filteredDeudas.map((deuda) => (
          <TouchableOpacity 
            key={deuda.id} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DebtDetail', { debt: deuda })}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                {/* Header compacto */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {deuda.prestamista.split(' ').map((n: string) => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.headerInfo}>
                      <Text style={styles.prestamistaName}>{deuda.prestamista}</Text>
                      <Text style={styles.cardSubtitle}>
                        {deuda.cuotasPagadas}/{deuda.cuotas} cuotas • S/ {deuda.pendiente.toFixed(2)} pendiente
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardAmountContainer}>
                    <Text style={styles.cardAmount}>S/ {deuda.monto.toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getEstadoColor(deuda.estado) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getEstadoColor(deuda.estado) }]}>
                        {deuda.estado === 'activo' ? 'Activa' : 'Pagada'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}

        {!loading && filteredDeudas.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>¡No tienes deudas!</Text>
            <Text style={styles.emptySubtext}>
              {filterStatus === 'all' 
                ? 'Mantén tus finanzas en orden' 
                : 'No hay deudas en esta categoría'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  filtersContainer: {
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    elevation: 1,
  },
  cardContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  headerInfo: {
    flex: 1,
  },
  prestamistaName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  cardAmountContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusChip: {
    height: 22,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
