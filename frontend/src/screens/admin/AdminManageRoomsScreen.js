import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { client, formatImageUrl } from '../../api/client';

const ROOM_TYPES = ['Standard Villa', 'Deluxe Pool Villa', 'Ocean View Suite'];

const PRESET_AMENITIES = [
  'Private Infinity Pool',
  'Panoramic Ocean View',
  'King Plush Bed',
  'High-Speed Wi-Fi',
  'Complimentary Breakfast',
  'Rainfall Shower',
  'Outdoor Jacuzzi',
  'Private Sun Terrace',
  'Dedicated Butler Service',
  'Smart TV & Soundbar',
];

export const AdminManageRoomsScreen = ({ route, navigation }) => {
  const editRoom = route.params?.editRoom;
  const isEditing = !!editRoom;

  const [roomNumber, setRoomNumber] = useState(editRoom?.roomNumber || '');
  const [roomType, setRoomType] = useState(editRoom?.roomType || 'Standard Villa');
  const [pricePerNight, setPricePerNight] = useState(
    editRoom?.pricePerNight ? String(editRoom.pricePerNight) : ''
  );
  const [maxCapacity, setMaxCapacity] = useState(
    editRoom?.maxCapacity ? String(editRoom.maxCapacity) : '2'
  );
  const [isAvailable, setIsAvailable] = useState(
    editRoom ? editRoom.isAvailable : true
  );
  const [selectedAmenities, setSelectedAmenities] = useState(
    editRoom?.amenities || ['High-Speed Wi-Fi', 'Complimentary Breakfast']
  );
  const [customAmenity, setCustomAmenity] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleAmenity = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim()) {
      if (!selectedAmenities.includes(customAmenity.trim())) {
        setSelectedAmenities([...selectedAmenities, customAmenity.trim()]);
      }
      setCustomAmenity('');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access to upload a villa photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Required', 'Please enter a room number (e.g. V-105)');
      return;
    }

    if (!pricePerNight.trim() || isNaN(Number(pricePerNight)) || Number(pricePerNight) < 0) {
      Alert.alert('Required', 'Please enter a valid price per night');
      return;
    }

    if (!maxCapacity.trim() || isNaN(Number(maxCapacity)) || Number(maxCapacity) < 1) {
      Alert.alert('Required', 'Please enter a valid max capacity (at least 1)');
      return;
    }

    if (!isEditing && !selectedImage) {
      Alert.alert('Image Required', 'Please select a photo for the villa.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('roomNumber', roomNumber.trim());
      formData.append('roomType', roomType);
      formData.append('pricePerNight', pricePerNight.trim());
      formData.append('maxCapacity', maxCapacity.trim());
      formData.append('isAvailable', String(isAvailable));
      formData.append('amenities', JSON.stringify(selectedAmenities));

      if (selectedImage) {
        const uri = selectedImage.uri;
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'jpg';

        formData.append('roomImage', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: `photo.${fileType}`,
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
        });
      }

      if (isEditing) {
        await client.put(`/api/rooms/${editRoom._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Success', `Room ${roomNumber} updated successfully!`);
      } else {
        await client.post('/api/rooms', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Success', `Room ${roomNumber} added to inventory!`);
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', err.message || 'Unable to save room details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>‹ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>
          {isEditing ? `Edit Room ${editRoom.roomNumber}` : 'Add New Villa'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Basic Specs Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Room Specifications</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ROOM NUMBER *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. V-401"
              placeholderTextColor={colors.textMuted}
              value={roomNumber}
              onChangeText={setRoomNumber}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ROOM CATEGORY *</Text>
            <View style={styles.typeSelectorRow}>
              {ROOM_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeBtn,
                    roomType === type && styles.typeBtnActive,
                  ]}
                  onPress={() => setRoomType(type)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      roomType === type && styles.typeBtnTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>PRICE / NIGHT (USD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 650"
                placeholderTextColor={colors.textMuted}
                value={pricePerNight}
                onChangeText={setPricePerNight}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>MAX CAPACITY (GUESTS) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 4"
                placeholderTextColor={colors.textMuted}
                value={maxCapacity}
                onChangeText={setMaxCapacity}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Availability Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Room Availability</Text>
              <Text style={styles.toggleSubtitle}>
                Allow guests to book this villa immediately
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#CBD5E1', true: colors.statusConfirmed }}
              thumbColor={isAvailable ? '#FFFFFF' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Image Picker Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Villa Photography</Text>
          <Text style={styles.cardHelper}>
            High-resolution hero photography showcased to prospective guests
          </Text>

          {/* Current / Selected Image Preview */}
          {(selectedImage || editRoom?.roomImage) && (
            <View style={styles.previewContainer}>
              <Image
                source={{
                  uri: selectedImage
                    ? selectedImage.uri
                    : formatImageUrl(editRoom.roomImage),
                }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <Text style={styles.previewLabel}>
                {selectedImage ? 'Selected Photo' : 'Current Photo'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            <Text style={styles.imagePickerIcon}>📷</Text>
            <Text style={styles.imagePickerText}>
              {selectedImage || editRoom?.roomImage
                ? 'Replace Villa Photo'
                : 'Select Photo from Library'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amenities Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Select Amenities</Text>

          <View style={styles.amenitiesWrap}>
            {PRESET_AMENITIES.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  style={[
                    styles.amenityChip,
                    isSelected && styles.amenityChipActive,
                  ]}
                  onPress={() => toggleAmenity(amenity)}
                >
                  <Text
                    style={[
                      styles.amenityChipText,
                      isSelected && styles.amenityChipTextActive,
                    ]}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {amenity}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Amenity Adder */}
          <View style={styles.customAmenityRow}>
            <TextInput
              style={styles.customAmenityInput}
              placeholder="Add other perk (e.g. Wine Cellar)"
              placeholderTextColor={colors.textMuted}
              value={customAmenity}
              onChangeText={setCustomAmenity}
            />
            <TouchableOpacity
              style={styles.addAmenityBtn}
              onPress={addCustomAmenity}
            >
              <Text style={styles.addAmenityBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
          disabled={submitting}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Save Changes' : 'Publish Villa to Collection'}
            </Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  cardHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.primary,
  },
  typeSelectorRow: {
    flexDirection: 'column',
    gap: 6,
  },
  typeBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  toggleSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '700',
  },
  imagePickerBtn: {
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.accentBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  imagePickerIcon: {
    fontSize: 18,
  },
  imagePickerText: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: '700',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  amenityChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityChipActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accentBorder,
  },
  amenityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amenityChipTextActive: {
    color: colors.accentDark,
    fontWeight: '700',
  },
  customAmenityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customAmenityInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.primary,
  },
  addAmenityBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 10,
  },
  addAmenityBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
