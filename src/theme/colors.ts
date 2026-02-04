export const colors = {
  // Colores principales
  primary: '#6366F1', // Indigo moderno
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  
  // Colores secundarios
  secondary: '#10B981', // Verde para éxito/pagos
  secondaryDark: '#059669',
  secondaryLight: '#34D399',
  
  // Colores de estado
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  
  // Texto
  text: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  
  // Bordes y divisores
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  // Colores específicos de la app
  loan: '#6366F1', // Color para préstamos
  debt: '#F59E0B', // Color para deudas
  paid: '#10B981', // Color para pagos realizados
  pending: '#F59E0B', // Color para pendientes
  overdue: '#EF4444', // Color para vencidos
  
  // Degradados
  gradientStart: '#6366F1',
  gradientEnd: '#8B5CF6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
