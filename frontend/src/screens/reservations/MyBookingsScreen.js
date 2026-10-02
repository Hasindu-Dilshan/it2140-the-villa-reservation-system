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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { client, formatImageUrl, DEFAULT_VILLA_IMAGE } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';

const STATUS_FILTERS = ['All', 'Confirmed', 'Pending', 'Cancelled'];

const BookingThumb = ({ imageUri }) => {
  const [sourceUri, setSourceUri] = useState(formatImageUrl(imageUri));
  useEffect(() => {
    setSourceUri(formatImageUrl(imageUri));
  }, [imageUri]);

  return (
    <Image
      source={{ uri: sourceUri }}
      style={styles.thumb}
      resizeMode="cover"
      onError={() => setSourceUri(DEFAULT_VILLA_IMAGE)}
    />
  );
};

export const MyBookingsScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  // If an admin accesses this screen, redirect them to Concierge All Bookings
  useEffect(() => {
    if (isAdmin) {
      navigation.replace('AdminReservations');
    }
  }, [isAdmin, navigation]);

  const fetchMyReservations = useCallback(async () => {
    if (isAdmin) return;
    try {
      const res = await client.get('/api/reservations?myBookings=true');
      setReservations(res.data?.reservations || []);
    } catch (err) {
      console.warn('Error fetching reservations:', err.message);
      Alert.alert('Error', err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  // Focus listener to auto-refresh
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMyReservations();
    });
    return unsubscribe;
  }, [navigation, fetchMyReservations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyReservations();
  };

  const handleCancelBooking = (bookingId, roomNumber) => {
    Alert.alert(
      'Cancel Reservation',
      `Are you sure you want to cancel your reservation for Room ${roomNumber}?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/api/reservations/${bookingId}`);
              Alert.alert('Booking Cancelled', 'Your reservation has been removed.');
              fetchMyReservations();
            } catch (err) {
              Alert.alert('Cancellation Error', err.message || 'Unable to cancel booking.');
            }
          },
        },
      ]
    );
  };

  const handleModifyBooking = (booking) => {
    const room = booking.roomId;
    if (!room) {
      Alert.alert('Error', 'Room details are not available for this booking.');
      return;
    }
    navigation.navigate('EditReservation', {
      reservation: booking,
      room,
    });
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
        <Text style={styles.screenTitle}>My Reservations</Text>
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
          <Text style={styles.loadingText}>Retrieving your bookings...</Text>
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
            const nights = calculateNights(item.checkInDate, item.checkOutDate);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.roomTypeRow}>
                    <Text style={styles.roomTag}>ROOM {room.roomNumber || 'VILLA'}</Text>
                    <Text style={styles.roomTypeTitle}>
                      {room.roomType || 'The Villa Suite'}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.cardBody}>
                  {room.roomImage && (
                    <BookingThumb imageUri={room.roomImage} />
                  )}

                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dates:</Text>
                      <Text style={styles.detailValue}>
                        {formatDateDisplay(item.checkInDate)} →{' '}
                        {formatDateDisplay(item.checkOutDate)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Stay:</Text>
                      <Text style={styles.detailValue}>
                        {nights} {nights === 1 ? 'Night' : 'Nights'} •{' '}
                        {item.guestCount} {item.guestCount === 1 ? 'Guest' : 'Guests'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total:</Text>
                      <Text style={styles.priceHighlight}>${item.totalPrice}</Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardFooter}>
                  <Text style={styles.bookingIdText}>
                    Booking #{item._id.slice(-6).toUpperCase()}
                  </Text>

                  {item.status !== 'Cancelled' && (
                    <View style={styles.footerActions}>
                      <TouchableOpacity
                        style={styles.modifyBtn}
                        onPress={() => handleModifyBooking(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modifyBtnText}>✏️ Modify Stay</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() =>
                          handleCancelBooking(item._id, room.roomNumber || 'Selected')
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              iconText="📅"
              title="No Reservations Found"
              message={
                activeFilter === 'All'
                  ? 'You do not have any active or past reservations yet.'
                  : `No reservations found with status "${activeFilter}".`
              }
              actionLabel="Discover Luxury Villas"
              onAction={() => navigation.navigate('RoomList')}
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
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  roomTypeRow: {
    flex: 1,
  },
  roomTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
  },
  roomTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  bookingDetails: {
    flex: 1,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  priceHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accentDark,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bookingIdText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modifyBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  modifyBtnText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: colors.statusCancelledBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: colors.statusCancelled,
    fontSize: 11,
    fontWeight: '700',
  },
});
