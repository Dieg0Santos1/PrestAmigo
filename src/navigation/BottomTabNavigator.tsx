import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import LoansScreen from '../screens/LoansScreen';
import DebtsScreen from '../screens/DebtsScreen';
import LoanDetailScreen from '../screens/LoanDetailScreen';
import DebtDetailScreen from '../screens/DebtDetailScreen';
import AddLoanScreen from '../screens/AddLoanScreen';
import ReviewProofScreen from '../screens/ReviewProofScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BalanceScreen from '../screens/BalanceScreen';
import EditLoanScreen from '../screens/EditLoanScreen';
import AddCapitalScreen from '../screens/AddCapitalScreen';
import WithdrawCapitalScreen from '../screens/WithdrawCapitalScreen';
import LoanSuccessScreen from '../screens/LoanSuccessScreen';

const Tab = createBottomTabNavigator();
const LoansStack = createStackNavigator();
const DebtsStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const BalanceStack = createStackNavigator();

function LoansNavigator() {
  return (
    <LoansStack.Navigator screenOptions={{ headerShown: false }}>
      <LoansStack.Screen name="LoansList" component={LoansScreen} />
      <LoansStack.Screen name="LoanDetail" component={LoanDetailScreen} />
      <LoansStack.Screen name="AddLoan" component={AddLoanScreen} />
      <LoansStack.Screen name="LoanSuccess" component={LoanSuccessScreen} />
      <LoansStack.Screen name="ReviewProof" component={ReviewProofScreen} />
      <LoansStack.Screen name="EditLoan" component={EditLoanScreen} />
    </LoansStack.Navigator>
  );
}

function DebtsNavigator() {
  return (
    <DebtsStack.Navigator screenOptions={{ headerShown: false }}>
      <DebtsStack.Screen name="DebtsList" component={DebtsScreen} />
      <DebtsStack.Screen name="DebtDetail" component={DebtDetailScreen} />
    </DebtsStack.Navigator>
  );
}

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen name="Profile" component={ProfileScreen} />
      <DashboardStack.Screen name="AddCapital" component={AddCapitalScreen} />
      <DashboardStack.Screen name="WithdrawCapital" component={WithdrawCapitalScreen} />
    </DashboardStack.Navigator>
  );
}

function BalanceNavigator() {
  return (
    <BalanceStack.Navigator screenOptions={{ headerShown: false }}>
      <BalanceStack.Screen name="BalanceMain" component={BalanceScreen} />
      <BalanceStack.Screen name="Profile" component={ProfileScreen} />
    </BalanceStack.Navigator>
  );
}

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Icon source="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Loans"
        component={LoansNavigator}
        options={{
          tabBarLabel: 'Préstamos',
          tabBarIcon: ({ color, size }) => (
            <Icon source="cash" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Debts"
        component={DebtsNavigator}
        options={{
          tabBarLabel: 'Deudas',
          tabBarIcon: ({ color, size }) => (
            <Icon source="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Balance"
        component={BalanceNavigator}
        options={{
          tabBarLabel: 'Balance',
          tabBarIcon: ({ color, size }) => (
            <Icon source="chart-line" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
