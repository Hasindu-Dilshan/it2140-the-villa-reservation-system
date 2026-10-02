import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { client, formatImageUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const CreateReservationScreen = ({ route, navigation }) => {
  const { room: paramRoom, reservation, mode } = route.params || {};
  const room = paramRoom || reservation?.roomId || {};
  const isEdit = mode === 'edit' || Boolean(reservation);
  const { isAdmin } = useAuth();

  // Initialize with tomorrow for check-in and 3 days later for check-out (or existing reservation dates)
  const initialCheckIn = useMemo(() => {
    if (reservation?.checkInDate) {
      const d = new Date(reservation.checkInDate);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0); // 2:00 PM check-in
    return d;
  }, [reservation]);

  const initialCheckOut = useMemo(() => {
    if (reservation?.checkOutDate) {
      const d = new Date(reservation.checkOutDate);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date();
    d.setDate(d.getDate() + 4);
    d.setHours(11, 0, 0, 0); // 11:00 AM check-out
    return d;
  }, [reservation]);

  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [guestCount, setGuestCount] = useState(reservation?.guestCount || 1);
  const [submitting, setSubmitting] = useState(false);

  // Compute duration in nights
  const durationNights = useMemo(() => {
    const diff = checkOutDate.getTime() - checkInDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }, [checkInDate, checkOutDate]);

  // Real-time authoritative price preview
  const totalPrice = useMemo(() => {
    return durationNights * (room?.pricePerNight || 0);
  }, [durationNights, room]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Quick Date Shift Helpers
  const adjustCheckIn = (daysToAdd) => {
    const newIn = new Date(checkInDate);
    newIn.setDate(newIn.getDate() + daysToAdd);

    // If moving before today + 1, prevent
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (newIn < tomorrow) return;

    setCheckInDate(newIn);

    // Ensure checkOut is at least 1 day after new checkIn
    if (newIn >= checkOutDate) {
      const newOut = new Date(newIn);
      newOut.setDate(newIn.getDate() + 1);
      setCheckOutDate(newOut);
    }
  };

  const adjustStayLength = (nights) => {
    const newOut = new Date(checkInDate);
    newOut.setDate(checkInDate.getDate() + nights);
    setCheckOutDate(newOut);
  };

  const adjustCheckOut = (daysToAdd) => {
    const newOut = new Date(checkOutDate);
    newOut.setDate(newOut.getDate() + daysToAdd);

    // Must be at least 1 day after checkIn
    const minOut = new Date(checkInDate);
    minOut.setDate(checkInDate.getDate() + 1);

    if (newOut < minOut) {
      Alert.alert('Invalid Date', 'Check-out date must be after check-in date.');
      return;
    }
    setCheckOutDate(newOut);
  };

  const handleBookingSubmit = async () => {
    if (guestCount > room.maxCapacity) {
      Alert.alert(
        'Capacity Exceeded',
        `This room accommodates a maximum of ${room.maxCapacity} guests.`
      );
      return;
    }

    if (checkInDate >= checkOutDate) {
      Alert.alert('Invalid Dates', 'Check-out date must be after check-in date.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        roomId: room._id,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        guestCount: Number(guestCount),
      };

      let resultReservation;
      if (isEdit && reservation?._id) {
        const res = await client.put(`/api/reservations/${reservation._id}`, payload);
        resultReservation = res.data.reservation;
      } else {
        const res = await client.post('/api/reservations', payload);
        resultReservation = res.data.reservation;
      }

      const destination = isAdmin ? 'AdminReservations' : 'MyBookings';
      const actionLabel = isAdmin ? 'View All Bookings' : 'View My Bookings';

      Alert.alert(
        isEdit ? 'Reservation Updated!' : 'Reservation Confirmed!',
        isEdit
          ? `Your reservation for Room ${room.roomNumber} has been updated successfully.`
          : `Your reservation for Room ${room.roomNumber} has been received. Status: ${resultReservation.status}`,
        [
          {
            text: actionLabel,
            onPress: () => navigation.navigate(destination),
          },
        ]
      );
    } catch (err) {
      Alert.alert(isEdit ? 'Update Error' : 'Booking Error', err.message || 'Could not complete reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{isEdit ? 'Modify Stay' : 'Reserve Stay'}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Room Snapshot Card */}
        <View style={styles.roomCard}>
          <Image
            source={{ uri: formatImageUrl(room.roomImage) }}
            style={styles.roomThumb}
            resizeMode="cover"
          />
          <View style={styles.roomInfo}>
            <Text style={styles.roomNumberTag}>ROOM {room.roomNumber}</Text>
            <Text style={styles.roomTitle}>{room.roomType}</Text>
            <Text style={styles.roomRate}>
              ${room.pricePerNight} <Text style={styles.perNight}>/ night</Text>
            </Text>
            <Text style={styles.capacityNote}>
              👥 Max {room.maxCapacity} Guests
            </Text>
          </View>
        </View>

        {/* Date Selection Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>1. Select Dates</Text>

          {/* Quick Stay Presets */}
          <Text style={styles.presetLabel}>Quick Presets:</Text>
          <View style={styles.presetRow}>
            {[1, 2, 3, 5, 7].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.presetBtn,
                  durationNights === n && styles.presetBtnActive,
                ]}
                onPress={() => adjustStayLength(n)}
              >
                <Text
                  style={[
                    styles.presetBtnText,
                    durationNights === n && styles.presetBtnTextActive,
                  ]}
                >
                  {n} {n === 1 ? 'Night' : 'Nights'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Check-In Controls */}
          <View style={styles.dateSelectorBox}>
            <View style={styles.dateHeaderCol}>
              <Text style={styles.dateTypeLabel}>CHECK-IN DATE</Text>
              <Text style={styles.dateValueText}>{formatDate(checkInDate)}</Text>
              <Text style={styles.timeNotice}>Check-in after 2:00 PM</Text>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => adjustCheckIn(-1)}
              >
                <Text style={styles.stepBtnText}>-1d</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => adjustCheckIn(1)}
              >
                <Text style={styles.stepBtnText}>+1d</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Check-Out Controls */}
          <View style={styles.dateSelectorBox}>
            <View style={styles.dateHeaderCol}>
              <Text style={styles.dateTypeLabel}>CHECK-OUT DATE</Text>
              <Text style={styles.dateValueText}>{formatDate(checkOutDate)}</Text>
              <Text style={styles.timeNotice}>Check-out before 11:00 AM</Text>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => adjustCheckOut(-1)}
              >
                <Text style={styles.stepBtnText}>-1d</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => adjustCheckOut(1)}
              >
                <Text style={styles.stepBtnText}>+1d</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Guest Counter Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>2. Number of Guests</Text>
          <View style={styles.guestCounterRow}>
            <View>
              <Text style={styles.guestTitle}>Total Guests</Text>
              <Text style={styles.guestSubtitle}>
                Capacity: {room.maxCapacity} {room.maxCapacity === 1 ? 'Guest' : 'Guests'} max
              </Text>
            </View>

            <View style={styles.counterControls}>
              <TouchableOpacity
                style={[styles.counterBtn, guestCount <= 1 && styles.counterBtnDisabled]}
                disabled={guestCount <= 1}
                onPress={() => setGuestCount((prev) => Math.max(1, prev - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.counterValue}>{guestCount}</Text>

              <TouchableOpacity
                style={[
                  styles.counterBtn,
                  guestCount >= room.maxCapacity && styles.counterBtnDisabled,
                ]}
                disabled={guestCount >= room.maxCapacity}
                onPress={() =>
                  setGuestCount((prev) => Math.min(room.maxCapacity, prev + 1))
                }
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {guestCount >= room.maxCapacity && (
            <Text style={styles.maxCapNotice}>
              Maximum allowed guest count reached for this villa.
            </Text>
          )}
        </View>

        {/* Real-time Server-Side Price Preview */}
        <View style={styles.priceSummaryCard}>
          <Text style={styles.priceSummaryTitle}>Stay Summary & Authoritative Pricing</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              ${room.pricePerNight} × {durationNights} {durationNights === 1 ? 'night' : 'nights'}
            </Text>
            <Text style={styles.summaryVal}>${totalPrice}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Resort Amenities & Concierge Fee</Text>
            <Text style={[styles.summaryVal, { color: colors.statusConfirmed }]}>INCLUDED</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Complimentary Island Breakfast</Text>
            <Text style={[styles.summaryVal, { color: colors.statusConfirmed }]}>INCLUDED</Text>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL PRICE</Text>
              <Text style={styles.totalSub}>All taxes & fees included</Text>
            </View>
            <Text style={styles.totalAmount}>${totalPrice}</Text>
          </View>
        </View>

        {/* Booking CTA Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          disabled={submitting}
          onPress={handleBookingSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isEdit ? 'Update Reservation' : 'Confirm & Book Reservation'}
              </Text>
              <Text style={styles.submitButtonArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
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
  roomCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    alignItems: 'center',
  },
  roomThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomNumberTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginVertical: 2,
  },
  roomRate: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  perNight: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  capacityNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  presetBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateSelectorBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 10,
  },
  dateHeaderCol: {
    flex: 1,
  },
  dateTypeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  dateValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  timeNotice: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  guestCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  guestSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.3,
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: -2,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  maxCapNotice: {
    marginTop: 10,
    fontSize: 11,
    color: colors.statusPending,
    fontWeight: '600',
  },
  priceSummaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  priceSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  totalSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.accent,
  },
  submitButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  submitButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
