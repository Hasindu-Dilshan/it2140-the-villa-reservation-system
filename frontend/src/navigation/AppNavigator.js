import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// App Screens
import { RoomListScreen } from '../screens/rooms/RoomListScreen';
import { RoomDetailScreen } from '../screens/rooms/RoomDetailScreen';
import { CreateReservationScreen } from '../screens/reservations/CreateReservationScreen';
import { EditReservationScreen } from '../screens/reservations/EditReservationScreen';
import { MyBookingsScreen } from '../screens/reservations/MyBookingsScreen';
import { AdminManageRoomsScreen } from '../screens/admin/AdminManageRoomsScreen';
import { AdminReservationsScreen } from '../screens/admin/AdminReservationsScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {!token ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="RoomList" component={RoomListScreen} />
            <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
            <Stack.Screen
              name="CreateReservation"
              component={CreateReservationScreen}
            />
            <Stack.Screen
              name="EditReservation"
              component={EditReservationScreen}
            />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen
              name="AdminManageRooms"
              component={AdminManageRoomsScreen}
            />
            <Stack.Screen
              name="AdminReservations"
              component={AdminReservationsScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
});
