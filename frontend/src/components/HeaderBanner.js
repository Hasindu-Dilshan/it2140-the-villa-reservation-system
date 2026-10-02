import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export const HeaderBanner = ({ navigation, showNavButtons = true }) => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandCrown}>✦</Text>
            <Text style={styles.brandTitle}>THE VILLA</Text>
            <Text style={styles.brandCrown}>✦</Text>
          </View>
          <Text style={styles.brandSubtitle}>EXQUISITE SUITES & RESIDENCES</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userBar}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>
            Welcome, <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          </Text>
          {isAdmin ? (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN CONCIERGE</Text>
            </View>
          ) : (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>VIP GUEST</Text>
            </View>
          )}
        </View>
      </View>

      {showNavButtons && (
        <View style={styles.quickActions}>
          {!isAdmin && (
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => navigation.navigate('MyBookings')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionPillIcon}>🗓️</Text>
              <Text style={styles.actionPillText}>My Bookings</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <>
              <TouchableOpacity
                style={[styles.actionPill, styles.adminPill]}
                onPress={() => navigation.navigate('AdminReservations')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionPillIcon}>📋</Text>
                <Text style={styles.actionPillText}>All Bookings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionPill, styles.accentPill]}
                onPress={() => navigation.navigate('AdminManageRooms')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionPillIcon}>➕</Text>
                <Text style={[styles.actionPillText, styles.accentPillText]}>Add Villa</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandCrown: {
    color: colors.accent,
    fontSize: 14,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 2,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoutText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  welcomeText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: 'rgba(197, 160, 89, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  adminBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  guestBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guestBadgeText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  adminPill: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  accentPill: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionPillIcon: {
    fontSize: 13,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  accentPillText: {
    color: '#FFFFFF',
  },
});
