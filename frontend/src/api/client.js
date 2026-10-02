import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default host based on platform
const getDefaultHost = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001';
  }
  return 'http://localhost:5001';
};

export const API_STORAGE_KEY = '@the_villa_api_url';
export const TOKEN_STORAGE_KEY = '@the_villa_token';
export const USER_STORAGE_KEY = '@the_villa_user';

let currentBaseUrl = getDefaultHost();

export const client = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize stored API URL if customized
export const initApiClient = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem(API_STORAGE_KEY);
    if (savedUrl) {
      currentBaseUrl = savedUrl;
      client.defaults.baseURL = savedUrl;
    }
  } catch (e) {
    console.warn('Failed to load saved API URL:', e);
  }
  return currentBaseUrl;
};

export const updateBaseUrl = async (newUrl) => {
  let cleaned = newUrl.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  currentBaseUrl = cleaned;
  client.defaults.baseURL = cleaned;
  await AsyncStorage.setItem(API_STORAGE_KEY, cleaned);
  return cleaned;
};

export const getBaseUrl = () => currentBaseUrl;

// Request interceptor: attach Authorization header
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error reading token from storage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let onUnauthorizedCallback = null;

export const setUnauthorizedHandler = (callback) => {
  onUnauthorizedCallback = callback;
};

// Response interceptor: extract clean error message and preserve HTTP status
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected network error occurred';

    // If session expired or unauthorized on protected routes, trigger callback
    const requestUrl = error.config?.url || '';
    if (status === 401 && !requestUrl.includes('/api/auth/login') && !requestUrl.includes('/api/auth/register')) {
      if (typeof onUnauthorizedCallback === 'function') {
        onUnauthorizedCallback();
      }
    }

    const customError = new Error(message);
    customError.status = status;
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

// Format image URL helper
export const formatImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80';
  }
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }
  // Remove leading slash if any to append cleanly
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${currentBaseUrl}${path}`;
};
