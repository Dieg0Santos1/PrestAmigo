import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Card, Chip, Searchbar, FAB } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import prestamosService from '../services/prestamosService';
import { useFocusEffect } from '@react-navigation/native';

export default function LoansScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, completed
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar préstamos cuando la pantalla gana foco
  useFocusEffect(
    React.useCallback(() => {
      cargarPrestamos();
    }, [])
  );

  const cargarPrestamos = async () => {
    setLoading(true);
    const { prestamos: data } = await prestamosService.obtenerMisPrestamos();
    
    // Mapear datos de Supabase al formato esperado
    const prestamosFormateados = data.map((p: any) => ({
      id: p.id,
      deudor: `${p.deudor_nombre} ${p.deudor_apellido}`,
      monto: parseFloat(p.monto_total),
      pagado: p.monto_pagado,
      pendiente: p.monto_pendiente,
      tasa: parseFloat(p.tasa_interes),
      cuotas: p.numero_cuotas,
      cuotasPagadas: p.cuotas_pagadas,
      fechaInicio: p.fecha_inicio,
      estado: p.estado === 'completado' ? 'completado' : 'activo',
      proximaCuota: p.cuotas?.find((c: any) => c.estado === 'pendiente')?.fecha_vencimiento || null,
    }));
    
    setPrestamos(prestamosFormateados);
    setLoading(false);
  };

  const filteredPrestamos = prestamos.filter(p => {
    const matchesSearch = p.deudor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.estado === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return colors.success;
      case 'completado': return colors.info;
      case 'vencido': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'activo': return 'Activo';
      case 'completado': return 'Completado';
      case 'vencido': return 'Vencido';
      default: return estado;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Fijo */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.title}>Préstamos Otorgados</Text>
          <Text style={styles.subtitle}>Dinero que prestaste</Text>
        </View>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Buscar por nombre..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            iconColor={colors.primary}
          />
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
          textStyle={styles.filterChipText}
          selectedColor={colors.primary}
        >
          Todos ({prestamos.length})
        </Chip>
        <Chip
          selected={filterStatus === 'activo'}
          onPress={() => setFilterStatus('activo')}
          style={styles.filterChip}
          textStyle={styles.filterChipText}
          selectedColor={colors.success}
        >
          Activos ({prestamos.filter(p => p.estado === 'activo').length})
        </Chip>
        <Chip
          selected={filterStatus === 'completado'}
          onPress={() => setFilterStatus('completado')}
          style={styles.filterChip}
          textStyle={styles.filterChipText}
          selectedColor={colors.info}
        >
          Completados ({prestamos.filter(p => p.estado === 'completado').length})
        </Chip>
      </ScrollView>
      </View>

      {/* Lista de Préstamos */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando préstamos...</Text>
          </View>
        ) : filteredPrestamos.map((prestamo) => (
          <TouchableOpacity 
            key={prestamo.id} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LoanDetail', { loan: prestamo })}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                {/* Header compacto */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {prestamo.deudor.split(' ').map((n: string) => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.headerInfo}>
                      <Text style={styles.deudorName}>{prestamo.deudor}</Text>
                      <Text style={styles.cardSubtitle}>
                        {prestamo.cuotasPagadas}/{prestamo.cuotas} cuotas • S/ {prestamo.pendiente.toFixed(2)} pendiente
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardAmountContainer}>
                    <Text style={styles.cardAmount}>S/ {prestamo.monto.toFixed(2)}</Text>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: getEstadoColor(prestamo.estado) + '20' }]}
                      textStyle={[styles.statusChipText, { color: getEstadoColor(prestamo.estado) }]}
                    >
                      {getEstadoLabel(prestamo.estado)}
                    </Chip>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}

        {!loading && filteredPrestamos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No se encontraron préstamos</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'Comienza creando un nuevo préstamo'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        label="Nuevo Préstamo"
        style={styles.fab}
        onPress={() => navigation.navigate('AddLoan')}
        color={colors.surface}
      />
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
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: colors.background,
  },
  filtersContainer: {
    paddingBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: fontSize.sm,
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
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  deudorName: {
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
    minHeight: 24,
    height: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    lineHeight: 12,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});
