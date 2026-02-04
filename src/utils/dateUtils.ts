/**
 * Formatea una fecha en formato dd/mm/yyyy
 * @param date Fecha como string ISO o Date
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    // Si es string, parsearlo
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'N/A';
  }
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para la BD
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calcula días entre dos fechas
 */
export const daysBetween = (date1: string | Date, date2: string | Date): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1 + 'T00:00:00') : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2 + 'T00:00:00') : date2;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Verifica si una fecha está vencida
 */
export const isOverdue = (dueDate: string | Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = typeof dueDate === 'string' ? new Date(dueDate + 'T00:00:00') : dueDate;
  due.setHours(0, 0, 0, 0);
  
  return due < today;
};
