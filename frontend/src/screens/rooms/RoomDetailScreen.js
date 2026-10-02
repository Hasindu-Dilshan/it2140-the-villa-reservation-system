import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { client, formatImageUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const RoomDetailScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { isAdmin } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoomDetail = async () => {
      try {
        const res = await client.get(`/api/rooms/${roomId}`);
        setRoom(res.data?.room);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to fetch room details');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetail();
  }, [roomId]);

  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to permanently delete Room ${room?.roomNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/api/rooms/${roomId}`);
              Alert.alert('Room Deleted', 'The room has been removed.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete room');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading suite details...</Text>
      </View>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Suite not found</Text>
        <TouchableOpacity
          style={styles.backButtonDefault}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Return to Suites</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrl = formatImageUrl(room.roomImage);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Hero Image Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          <View style={styles.imageGradientOverlay} />

          {/* Floating Back Button */}
          <TouchableOpacity
            style={styles.floatingBackButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          {/* Type Badge */}
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{room.roomType}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentCard}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.roomTag}>EXCLUSIVE VILLA</Text>
              <Text style={styles.roomNumber}>ROOM {room.roomNumber}</Text>
              <Text style={styles.roomType}>{room.roomType}</Text>
            </View>

            <View style={styles.priceBadge}>
              <Text style={styles.priceCurrency}>$</Text>
              <Text style={styles.priceAmount}>{room.pricePerNight}</Text>
              <Text style={styles.priceUnit}>/ night</Text>
            </View>
          </View>

          {/* Specs / Highlights */}
          <View style={styles.specsRow}>
            <View style={styles.specBox}>
              <Text style={styles.specIcon}>👥</Text>
              <View>
                <Text style={styles.specLabel}>GUEST CAPACITY</Text>
                <Text style={styles.specValue}>Up to {room.maxCapacity} Guests</Text>
              </View>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specIcon}>
                {room.isAvailable ? '🟢' : '🔴'}
              </Text>
              <View>
                <Text style={styles.specLabel}>AVAILABILITY</Text>
                <Text
                  style={[
                    styles.specValue,
                    { color: room.isAvailable ? colors.statusConfirmed : colors.statusCancelled },
                  ]}
                >
                  {room.isAvailable ? 'Ready for Booking' : 'Not Available'}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The Experience</Text>
            <Text style={styles.descriptionText}>
              Immerse yourself in authentic island elegance at The Villa. Designed
              with organic teak finishes, tranquil natural lighting, and supreme
              comfort, Room {room.roomNumber} offers our signature retreat experience
              complete with tailored guest concierge services.
            </Text>
          </View>

          {/* Amenities Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Curated Amenities</Text>
            {room.amenities && room.amenities.length > 0 ? (
              <View style={styles.amenitiesGrid}>
                {room.amenities.map((item, index) => (
                  <View key={index} style={styles.amenityCard}>
                    <Text style={styles.amenityCheck}>✦</Text>
                    <Text style={styles.amenityTitle}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyAmenities}>Standard villa amenities included.</Text>
            )}
          </View>

          {/* Admin Management Actions */}
          {isAdmin && (
            <View style={styles.adminSection}>
              <Text style={styles.adminSectionTitle}>Concierge Admin Controls</Text>
              <View style={styles.adminButtonsRow}>
                <TouchableOpacity
                  style={styles.adminEditBtn}
                  onPress={() => navigation.navigate('AdminManageRooms', { editRoom: room })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.adminEditBtnText}>✏️ Edit Room Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adminDeleteBtn}
                  onPress={handleDeleteRoom}
                  activeOpacity={0.8}
                >
                  <Text style={styles.adminDeleteBtnText}>🗑️ Delete Room</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Bottom Booking Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomRateLabel}>Nightly Rate</Text>
          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomPriceVal}>${room.pricePerNight}</Text>
            <Text style={styles.bottomPriceUnit}> / night</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            !room.isAvailable && styles.bookButtonDisabled,
          ]}
          disabled={!room.isAvailable}
          onPress={() => navigation.navigate('CreateReservation', { room })}
          activeOpacity={0.85}
        >
          <Text style={styles.bookButtonText}>
            {room.isAvailable ? 'Book Stay Now' : 'Currently Unavailable'}
          </Text>
          {room.isAvailable && <Text style={styles.bookButtonArrow}>→</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 16,
  },
  backButtonDefault: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    marginTop: -4,
  },
  heroBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contentCard: {
    marginTop: -16,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  roomTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  roomNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  roomType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  priceCurrency: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  priceAmount: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  priceUnit: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  specBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specIcon: {
    fontSize: 20,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityCard: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  amenityCheck: {
    color: colors.accent,
    fontSize: 12,
  },
  amenityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyAmenities: {
    fontSize: 13,
    color: colors.textMuted,
  },
  adminSection: {
    backgroundColor: colors.accentLight,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    marginBottom: 20,
  },
  adminSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentDark,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adminEditBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  adminDeleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomRateLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomPriceVal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  bottomPriceUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bookButtonDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  bookButtonArrow: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
});
