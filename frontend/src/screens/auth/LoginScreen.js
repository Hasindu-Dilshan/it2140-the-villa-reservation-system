import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen = ({ navigation }) => {
  const { login, apiUrl, changeApiUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(apiUrl);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  const handleSaveApiUrl = async () => {
    try {
      await changeApiUrl(customUrl);
      Alert.alert('Server Updated', `API base URL set to:\n${customUrl}`);
      setShowConfig(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update server URL');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Luxury Hero Header */}
        <View style={styles.heroSection}>
          <Text style={styles.crownIcon}>✦ ✦ ✦</Text>
          <Text style={styles.heroTitle}>THE VILLA</Text>
          <Text style={styles.heroSubtitle}>HOTEL & RESIDENCES</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Sign in to your private sanctuary</Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Member Access</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. guest@thevilla.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Enter The Villa</Text>
            )}
          </TouchableOpacity>

          {/* Quick Demo Credentials */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>1-Tap Demo Credentials</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => fillDemo('guest@thevilla.com', 'password123')}
                activeOpacity={0.8}
              >
                <Text style={styles.demoPillText}>VIP Guest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoPill, styles.demoAdminPill]}
                onPress={() => fillDemo('admin@thevilla.com', 'password123')}
                activeOpacity={0.8}
              >
                <Text style={[styles.demoPillText, styles.demoAdminText]}>Concierge Admin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Switch to Register */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to The Villa? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Config Toggle */}
        <TouchableOpacity
          style={styles.serverConfigToggle}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.serverConfigText}>
            ⚙️ Server: {apiUrl}
          </Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configBox}>
            <Text style={styles.configLabel}>API Base URL (Cloud / Local):</Text>
            <View style={styles.quickPresetRow}>
              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={() => setCustomUrl('https://it2140-the-villa-reservation-system.vercel.app')}
              >
                <Text style={styles.quickPresetText}>☁️ Vercel Cloud</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={() => setCustomUrl('http://localhost:5001')}
              >
                <Text style={styles.quickPresetText}>💻 Localhost</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.configInput}
              value={customUrl}
              onChangeText={setCustomUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.configSaveBtn} onPress={handleSaveApiUrl}>
              <Text style={styles.configSaveBtnText}>Save Server URL</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  crownIcon: {
    color: colors.accent,
    fontSize: 16,
    letterSpacing: 4,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 3,
    marginTop: 4,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: colors.accent,
    marginVertical: 12,
  },
  tagline: {
    fontSize: 13,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.primary,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  demoAdminPill: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accentBorder,
  },
  demoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  demoAdminText: {
    color: colors.accentDark,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  serverConfigToggle: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  serverConfigText: {
    color: '#64748B',
    fontSize: 11,
  },
  configBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  configLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    marginBottom: 6,
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickPresetBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  quickPresetText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  configInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  configSaveBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  configSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
