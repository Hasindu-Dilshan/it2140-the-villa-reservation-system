import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { client } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Cancelled'];

export const AdminReservationsScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchAllReservations = useCallback(async () => {
    try {
      const res = await client.get('/api/reservations');
      setReservations(res.data?.reservations || []);
    } catch (err) {
      console.warn('Error fetching all reservations:', err.message);
      Alert.alert('Error', err.message || 'Failed to fetch guest reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllReservations();
  }, [fetchAllReservations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllReservations();
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setActionLoadingId(bookingId);
    try {
      await client.patch(`/api/reservations/${bookingId}/status`, {
        status: newStatus,
      });
      Alert.alert('Status Updated', `Booking is now marked as "${newStatus}".`);
      fetchAllReservations();
    } catch (err) {
      Alert.alert('Unable to Update Status', err.message || 'Action failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteBooking = (bookingId) => {
    Alert.alert(
      'Delete Reservation',
      'Are you sure you want to permanently delete this reservation record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/api/reservations/${bookingId}`);
              Alert.alert('Deleted', 'Reservation record removed.');
              fetchAllReservations();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete reservation');
            }
          },
        },
      ]
    );
  };

  const filteredReservations = reservations.filter((r) => {
    if (activeFilter === 'All') return true;
    return r.status === activeFilter;
  });

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 1;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Master Reservations</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Fetching guest reservations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReservations}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => {
            const room = item.roomId || {};
            const guest = item.userId || {};
            const nights = calculateNights(item.checkInDate, item.checkOutDate);
            const isActing = actionLoadingId === item._id;

            return (
              <View style={styles.card}>
                {/* Guest Profile Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName}>{guest.name || 'Guest User'}</Text>
                    <Text style={styles.guestEmail}>{guest.email || 'No email'}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                {/* Booking & Room Summary */}
                <View style={styles.cardBody}>
                  <View style={styles.roomSummaryRow}>
                    <Text style={styles.roomTag}>ROOM {room.roomNumber || 'VILLA'}</Text>
                    <Text style={styles.roomType}>{room.roomType || 'Suite'}</Text>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>STAY DATES</Text>
                      <Text style={styles.detailValue}>
                        {formatDateDisplay(item.checkInDate)} → {formatDateDisplay(item.checkOutDate)}
                      </Text>
                    </View>

                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>GUESTS & DURATION</Text>
                      <Text style={styles.detailValue}>
                        {nights} {nights === 1 ? 'Night' : 'Nights'} • {item.guestCount} {item.guestCount === 1 ? 'Guest' : 'Guests'}
                      </Text>
                    </View>

                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>TOTAL AUTHORITATIVE PRICE</Text>
                      <Text style={styles.totalPriceValue}>${item.totalPrice}</Text>
                    </View>
                  </View>
                </View>

                {/* Admin Actions */}
                <View style={styles.cardFooter}>
                  {isActing ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <View style={styles.actionsRow}>
                      {item.status === 'Pending' && (
                        <>
                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => handleUpdateStatus(item._id, 'Confirmed')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.approveBtnText}>✓ Approve Stay</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => handleUpdateStatus(item._id, 'Cancelled')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.rejectBtnText}>✕ Decline</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {item.status === 'Confirmed' && (
                        <TouchableOpacity
                          style={styles.cancelBookingBtn}
                          onPress={() => handleUpdateStatus(item._id, 'Cancelled')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.cancelBookingBtnText}>Cancel Booking</Text>
                        </TouchableOpacity>
                      )}

                      {item.status === 'Cancelled' && (
                        <TouchableOpacity
                          style={styles.reopenBtn}
                          onPress={() => handleUpdateStatus(item._id, 'Pending')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.reopenBtnText}>Restore to Pending</Text>
                        </TouchableOpacity>
                      )}

                      {item.status !== 'Cancelled' && (
                        <TouchableOpacity
                          style={styles.modifyBtn}
                          onPress={() =>
                            navigation.navigate('EditReservation', {
                              reservation: item,
                              room: room,
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={styles.modifyBtnText}>✏️</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteBooking(item._id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              iconText="📋"
              title="No Reservations Found"
              message={
                activeFilter === 'All'
                  ? 'No guest reservations have been made yet.'
                  : `No bookings found matching status "${activeFilter}".`
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  guestEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardBody: {
    gap: 10,
  },
  roomSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
  },
  roomType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  detailsGrid: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  totalPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accentDark,
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.statusConfirmed,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.statusCancelledBg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.statusCancelled,
  },
  rejectBtnText: {
    color: colors.statusCancelled,
    fontWeight: '700',
    fontSize: 12,
  },
  cancelBookingBtn: {
    flex: 1,
    backgroundColor: colors.statusCancelledBg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBookingBtnText: {
    color: colors.statusCancelled,
    fontWeight: '700',
    fontSize: 12,
  },
  reopenBtn: {
    flex: 1,
    backgroundColor: colors.statusPendingBg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  reopenBtnText: {
    color: colors.statusPending,
    fontWeight: '700',
    fontSize: 12,
  },
  modifyBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modifyBtnText: {
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteBtnText: {
    fontSize: 14,
  },
});
