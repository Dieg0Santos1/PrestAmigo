import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Appearance } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import notificationsService from './src/services/notificationsService';

const prefix = Linking.createURL('/');

// Tema claro personalizado para Paper
const lightTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#1f2937',
    placeholder: '#9ca3af',
  },
};

// Tema claro para Navigation
const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366f1',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#1f2937',
    border: '#e5e7eb',
  },
};

export default function App() {
  // FORZAR TEMA CLARO SIEMPRE - MÉTODO AGRESIVO
  useEffect(() => {
    // Forzar el color scheme a light
    Appearance.setColorScheme('light');
    
    // Configurar la barra de navegación en modo claro (Android)
    if (NavigationBar.setBackgroundColorAsync) {
      NavigationBar.setBackgroundColorAsync('#ffffff');
      NavigationBar.setButtonStyleAsync('dark');
    }

    // Solicitar permisos de notificaciones al iniciar la app
    const requestNotificationPermissions = async () => {
      try {
        await notificationsService.requestPermissions();
      } catch (error) {
        console.error('Error al solicitar permisos de notificaciones:', error);
      }
    };
    requestNotificationPermissions();
  }, []);

  const linking = {
    prefixes: [prefix, 'prestamigo://'],
    config: {
      screens: {
        Auth: {
          screens: {
            Login: 'login',
            Register: 'register',
          },
        },
        Main: {
          screens: {
            Home: 'home',
          },
        },
      },
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={lightTheme}>
        <NavigationContainer linking={linking} theme={navigationTheme}>
          <AuthProvider>
            <StatusBar style="dark" />
            <AppNavigator />
          </AuthProvider>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
