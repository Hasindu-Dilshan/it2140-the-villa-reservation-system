import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  client,
  initApiClient,
  updateBaseUrl,
  getBaseUrl,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  setUnauthorizedHandler,
} from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState(getBaseUrl());

  // Bootstrap user & token on startup
  useEffect(() => {
    // Register global 401 unauthorized handler
    setUnauthorizedHandler(() => {
      logout();
    });

    const bootstrap = async () => {
      try {
        const currentUrl = await initApiClient();
        setApiUrl(currentUrl);

        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          try {
            // Actively verify session with backend before rendering authenticated state
            const res = await client.get('/api/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.data?.user) {
              setToken(storedToken);
              setUser(res.data.user);
              await AsyncStorage.setItem(
                USER_STORAGE_KEY,
                JSON.stringify(res.data.user)
              );
            }
          } catch (verifyErr) {
            const isAuthRejection =
              verifyErr.status === 401 ||
              verifyErr.status === 403 ||
              (verifyErr.message &&
                (verifyErr.message.toLowerCase().includes('token') ||
                  verifyErr.message.toLowerCase().includes('authorized') ||
                  verifyErr.message.toLowerCase().includes('longer exists') ||
                  verifyErr.message.toLowerCase().includes('not found')));

            if (isAuthRejection) {
              // Stale token from wiped DB or deleted user: cleanly purge local storage
              await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
              await AsyncStorage.removeItem(USER_STORAGE_KEY);
              setToken(null);
              setUser(null);
            } else {
              // Offline or network connectivity issue: keep cached credentials so app functions offline
              setToken(storedToken);
              try {
                setUser(JSON.parse(storedUser));
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    const { user: userData, token: userToken } = res.data;

    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, userToken);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

    setToken(userToken);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, isAdmin = false) => {
    const res = await client.post('/api/auth/register', {
      name,
      email,
      password,
      isAdmin,
    });
    const { user: userData, token: userToken } = res.data;

    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, userToken);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

    setToken(userToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.warn('Logout cleanup error:', e);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await client.get('/api/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify(res.data.user)
        );
      }
    } catch (err) {
      if (err.status === 401 || err.message?.includes('longer exists')) {
        await logout();
      } else {
        console.warn('Error refreshing user:', err.message);
      }
    }
  };

  const changeApiUrl = async (newUrl) => {
    const updated = await updateBaseUrl(newUrl);
    setApiUrl(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin: !!user?.isAdmin,
        login,
        register,
        logout,
        refreshUser,
        apiUrl,
        changeApiUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
