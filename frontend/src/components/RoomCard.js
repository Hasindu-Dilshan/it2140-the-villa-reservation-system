import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../theme/colors';
import { formatImageUrl, DEFAULT_VILLA_IMAGE } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const RoomCard = ({ room, onPress, onEdit, onDelete }) => {
  const { isAdmin } = useAuth();
  const [imgSrc, setImgSrc] = useState(formatImageUrl(room.roomImage));

  useEffect(() => {
    setImgSrc(formatImageUrl(room.roomImage));
  }, [room.roomImage]);

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to remove Room ${room.roomNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(room._id) }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imgSrc }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImgSrc(DEFAULT_VILLA_IMAGE)}
        />
        <View style={styles.imageOverlay} />

        {/* Room Type Pill */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{room.roomType}</Text>
        </View>

        {/* Availability Badge */}
        <View
          style={[
            styles.statusPill,
            room.isAvailable ? styles.statusAvailable : styles.statusUnavailable,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: room.isAvailable ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: room.isAvailable ? '#065F46' : '#991B1B' },
            ]}
          >
            {room.isAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>

        {/* Price Tag Overlay */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceCurrency}>$</Text>
          <Text style={styles.priceValue}>{room.pricePerNight}</Text>
          <Text style={styles.pricePeriod}>/ night</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.roomNumber}>ROOM {room.roomNumber}</Text>
            <Text style={styles.roomType}>{room.roomType}</Text>
          </View>

          <View style={styles.capacityBadge}>
            <Text style={styles.capacityIcon}>👥</Text>
            <Text style={styles.capacityText}>Max {room.maxCapacity} Guests</Text>
          </View>
        </View>

        {/* Amenities Preview */}
        {room.amenities && room.amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {room.amenities.slice(0, 3).map((amenity, index) => (
              <View key={index} style={styles.amenityTag}>
                <Text style={styles.amenityText}>✓ {amenity}</Text>
              </View>
            ))}
            {room.amenities.length > 3 && (
              <View style={styles.amenityTagMore}>
                <Text style={styles.amenityTextMore}>+{room.amenities.length - 3} more</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.bookButtonText}>View Details & Reserve</Text>
            <Text style={styles.bookButtonArrow}>→</Text>
          </TouchableOpacity>

          {isAdmin && (
            <View style={styles.adminActions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onEdit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.adminActionText}>✏️ Edit</Text>
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeletePress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteActionText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  typeBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statusPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusAvailable: {
    backgroundColor: 'rgba(209, 250, 229, 0.95)',
  },
  statusUnavailable: {
    backgroundColor: 'rgba(254, 226, 226, 0.95)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceContainer: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  priceCurrency: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 1,
  },
  priceValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  pricePeriod: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 4,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 2,
  },
  roomType: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capacityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  amenityTag: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  amenityText: {
    fontSize: 11,
    color: colors.accentDark,
    fontWeight: '600',
  },
  amenityTagMore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amenityTextMore: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 10,
  },
  bookButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bookButtonArrow: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  adminActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteActionText: {
    fontSize: 14,
  },
});
