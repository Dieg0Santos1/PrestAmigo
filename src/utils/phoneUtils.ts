/**
 * Normalizes a phone number to a strict format: +51XXXXXXXXX
 * Handles various input formats and ensures consistency
 * @param phone - The phone number to normalize
 * @returns Normalized phone number in format +51XXXXXXXXX or empty string if invalid
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove ALL non-digit characters (including spaces, dashes, parentheses, +)
  let digits = phone.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Remove leading zeros
  digits = digits.replace(/^0+/, '');
  
  // Handle Peru numbers (default country)
  // Peru mobile numbers are 9 digits starting with 9
  
  // Case 1: Already has country code 51 (e.g., "51999999999")
  if (digits.startsWith('51') && digits.length === 11) {
    return `+${digits}`;
  }
  
  // Case 2: Duplicated country code (e.g., "5151999999999")
  if (digits.startsWith('5151') && digits.length === 13) {
    return `+${digits.substring(2)}`; // Remove first "51"
  }
  
  // Case 3: Just the 9-digit number (e.g., "999999999")
  if (digits.length === 9 && digits.startsWith('9')) {
    return `+51${digits}`;
  }
  
  // Case 4: Other country codes - keep as is with + prefix
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  
  // Invalid format - return empty
  return '';
}

/**
 * Formats a phone number for display
 * @param phone - The normalized phone number
 * @returns Formatted phone number (e.g., "+51 999 999 999")
 */
export function formatPhoneNumberForDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  
  // Extract country code and number
  const match = normalized.match(/^(\+\d{1,4})(\d+)$/);
  if (!match) return normalized;
  
  const [, countryCode, number] = match;
  
  // Format number in groups of 3
  const formattedNumber = number.replace(/(\d{3})(?=\d)/g, '$1 ');
  
  return `${countryCode} ${formattedNumber}`.trim();
}

/**
 * Validates if a phone number is valid
 * @param phone - The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  
  // Must start with + and have at least 8 digits total
  return /^\+\d{8,15}$/.test(normalized);
}
