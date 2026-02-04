import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput as RNTextInput,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme/colors';
import { normalizePhoneNumber } from '../utils/phoneUtils';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  phoneLength: number; // Expected phone number length (without country code)
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51', phoneLength: 9 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', phoneLength: 10 },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', dialCode: '+591', phoneLength: 8 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55', phoneLength: 11 },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', phoneLength: 9 },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57', phoneLength: 10 },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506', phoneLength: 8 },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', dialCode: '+53', phoneLength: 8 },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', phoneLength: 9 },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', dialCode: '+503', phoneLength: 8 },
  { code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '+34', phoneLength: 9 },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', dialCode: '+502', phoneLength: 8 },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', dialCode: '+504', phoneLength: 8 },
  { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52', phoneLength: 10 },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', dialCode: '+505', phoneLength: 8 },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', dialCode: '+507', phoneLength: 8 },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', dialCode: '+595', phoneLength: 9 },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', dialCode: '+1', phoneLength: 10 },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', dialCode: '+598', phoneLength: 8 },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1', phoneLength: 10 },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', dialCode: '+58', phoneLength: 10 },
];

interface PhoneInputProps {
  value: string;
  onChangeText: (phone: string) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

/**
 * PhoneInput component with country code selector
 * Returns standardized phone number: dialCode + number (no spaces)
 * Example: +51999999999
 */
export default function PhoneInput({
  value,
  onChangeText,
  label = 'Teléfono',
  placeholder = '999999999',
  error = false,
  disabled = false,
}: PhoneInputProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Peru default
  const [searchQuery, setSearchQuery] = useState('');

  // Extract phone number without country code
  const getPhoneNumber = () => {
    if (!value) return '';
    
    // Find if value starts with any dial code
    const country = COUNTRY_CODES.find(c => value.startsWith(c.dialCode));
    if (country) {
      return value.substring(country.dialCode.length);
    }
    
    return value;
  };

  // Handle phone number change
  const handlePhoneChange = (phoneNumber: string) => {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Limit to country-specific phone length
    const limitedNumber = cleanNumber.substring(0, selectedCountry.phoneLength);
    
    // Combine country code + clean number (no spaces)
    const fullNumber = selectedCountry.dialCode + limitedNumber;
    
    // NORMALIZAR antes de enviar - asegura formato consistente
    const normalized = normalizePhoneNumber(fullNumber);
    onChangeText(normalized || fullNumber);
  };

  // Handle country selection
  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    
    // Update phone number with new country code
    const currentNumber = getPhoneNumber();
    const newFullNumber = country.dialCode + currentNumber;
    
    // NORMALIZAR antes de enviar
    const normalized = normalizePhoneNumber(newFullNumber);
    onChangeText(normalized || newFullNumber);
    
    setModalVisible(false);
    setSearchQuery('');
  };

  // Filter countries by search
  const filteredCountries = COUNTRY_CODES.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery)
  );

  // Update selected country if value changes externally
  React.useEffect(() => {
    if (value) {
      const country = COUNTRY_CODES.find(c => value.startsWith(c.dialCode));
      if (country && country.code !== selectedCountry.code) {
        setSelectedCountry(country);
      }
    }
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Country Code Selector */}
        <TouchableOpacity
          style={[styles.countrySelector, error && styles.countryErrorBorder]}
          onPress={() => !disabled && setModalVisible(true)}
          disabled={disabled}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>

        {/* Phone Number Input */}
        <View style={styles.phoneInputContainer}>
          <TextInput
            label={label}
            value={getPhoneNumber()}
            onChangeText={handlePhoneChange}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.phoneInput}
            outlineColor={error ? colors.error : colors.border}
            activeOutlineColor={error ? colors.error : colors.primary}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            left={<TextInput.Icon icon="phone" />}
          />
        </View>
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar País</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              placeholder="Buscar país o código..."
              style={styles.searchInput}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              left={<TextInput.Icon icon="magnify" />}
            />

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === selectedCountry.code && styles.countryItemSelected,
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    height: 56,
    minWidth: 110,
    gap: spacing.xs,
  },
  countryErrorBorder: {
    borderColor: colors.error,
  },
  flag: {
    fontSize: fontSize.xl,
  },
  dialCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  arrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  phoneInputContainer: {
    flex: 1,
  },
  phoneInput: {
    backgroundColor: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.xxl,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  searchInput: {
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.md,
  },
  countryItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  countryFlag: {
    fontSize: fontSize.xl,
  },
  countryName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  countryDialCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
});
