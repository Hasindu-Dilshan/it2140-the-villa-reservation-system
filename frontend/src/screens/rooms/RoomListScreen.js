import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { client } from '../../api/client';
import { HeaderBanner } from '../../components/HeaderBanner';
import { RoomCard } from '../../components/RoomCard';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';

const ROOM_TYPES = ['All', 'Standard Villa', 'Deluxe Pool Villa', 'Ocean View Suite'];

export const RoomListScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      let url = '/api/rooms';
      const params = [];
      if (selectedType !== 'All') {
        params.push(`roomType=${encodeURIComponent(selectedType)}`);
      }
      if (availableOnly) {
        params.push('isAvailable=true');
      }
      if (searchQuery.trim()) {
        params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const res = await client.get(url);
      setRooms(res.data?.rooms || []);
    } catch (err) {
      console.warn('Error fetching rooms:', err.message);
      Alert.alert('Unable to load rooms', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, availableOnly, searchQuery]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Focus listener to refresh when navigating back
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRooms();
    });
    return unsubscribe;
  }, [navigation, fetchRooms]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await client.delete(`/api/rooms/${roomId}`);
      Alert.alert('Success', 'Room has been removed');
      fetchRooms();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete room');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Hotel Luxury Header Banner */}
      <HeaderBanner navigation={navigation} />

      <View style={styles.container}>
        {/* Search & Filter Header */}
        <View style={styles.filterSection}>
          {/* Search Input */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search villa or room number..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Room Type Filter Pills */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={ROOM_TYPES}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.typePillsList}
            renderItem={({ item }) => {
              const isSelected = selectedType === item;
              return (
                <TouchableOpacity
                  style={[styles.typePill, isSelected && styles.typePillActive]}
                  onPress={() => setSelectedType(item)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      isSelected && styles.typePillTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Availability Toggle */}
          <View style={styles.subFilterRow}>
            <TouchableOpacity
              style={[
                styles.availToggle,
                availableOnly && styles.availToggleActive,
              ]}
              onPress={() => setAvailableOnly(!availableOnly)}
            >
              <Text
                style={[
                  styles.availToggleText,
                  availableOnly && styles.availToggleTextActive,
                ]}
              >
                {availableOnly ? '✓ Available Only' : '○ Show All (Inc. Booked)'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.roomCountText}>
              Showing <Text style={styles.roomCountNumber}>{rooms.length}</Text> Suites
            </Text>
          </View>
        </View>

        {/* Room List or Empty/Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Fetching luxury villas...</Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
            renderItem={({ item }) => (
              <RoomCard
                room={item}
                onPress={() => navigation.navigate('RoomDetail', { roomId: item._id })}
                onEdit={
                  isAdmin
                    ? () => navigation.navigate('AdminManageRooms', { editRoom: item })
                    : undefined
                }
                onDelete={isAdmin ? () => handleDeleteRoom(item._id) : undefined}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                iconText="🏨"
                title="No Suites Found"
                message="No villas matched your current filter criteria. Try adjusting your search."
                actionLabel="Reset Filters"
                onAction={() => {
                  setSelectedType('All');
                  setAvailableOnly(false);
                  setSearchQuery('');
                }}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  typePillsList: {
    paddingVertical: 4,
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  availToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availToggleActive: {
    backgroundColor: colors.statusConfirmedBg,
    borderColor: colors.statusConfirmed,
  },
  availToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  availToggleTextActive: {
    color: colors.statusConfirmed,
    fontWeight: '700',
  },
  roomCountText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  roomCountNumber: {
    fontWeight: '700',
    color: colors.primary,
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
});
