import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';

type Facility = {
  id: number;
  name: string;
  district: string;
  address: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
};

export default function FacilitiesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState<string | null>(null);

  const { data: facilitiesData, isLoading, error, refetch } = useQuery({
    queryKey: ['facilities', searchQuery, filterDistrict],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filterDistrict) params.district = filterDistrict;

      const response = await api.get('/facilities', { params });
      return response.data;
    },
  });

  const facilities = facilitiesData?.data || [];
  const uniqueDistricts = [...new Set(facilities.map((facility: Facility) => facility.district).filter(Boolean))] as string[];

  const renderFacilityCard = ({ item }: { item: Facility }) => (
    <TouchableOpacity
      style={styles.facilityCard}
      onPress={() => router.push(`/admin/facilities/${item.id}` as any)}
    >
      <View style={styles.facilityHeader}>
        <View style={styles.facilityInfo}>
          <Text style={styles.facilityName}>{item.name}</Text>
          <Text style={styles.facilityDistrict}>{item.district}</Text>
          <Text style={styles.facilityAddress}>{item.address}</Text>
        </View>
        <View style={styles.facilityStatus}>
          <View style={styles.districtBadge}>
            <Text style={styles.districtText}>{item.district}</Text>
          </View>
        </View>
      </View>

      <View style={styles.facilityContact}>
        <Text style={styles.contactPhone}>📞 {item.contactPhone}</Text>
      </View>

      <View style={styles.facilityFooter}>
        <Text style={styles.createdText}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );

  const renderDistrictFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filterDistrict === item && styles.activeFilterChip
      ]}
      onPress={() => setFilterDistrict(filterDistrict === item ? null : item)}
    >
      <Text style={[
        styles.filterChipText,
        filterDistrict === item && styles.activeFilterChipText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (error) {
    Toast.show({
      type: 'error',
      text1: 'Error loading facilities',
      text2: 'Please try again',
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facilities</Text>
        <TouchableOpacity onPress={() => router.push('/admin/facilities/add' as any)}>
          <Ionicons name="add" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search facilities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {uniqueDistricts.length > 0 && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Filter by district:</Text>
          <FlatList
            horizontal
            data={uniqueDistricts}
            renderItem={renderDistrictFilter}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading facilities...</Text>
        </View>
      ) : (
        <FlatList
          data={facilities}
          renderItem={renderFacilityCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.facilitiesList}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color="#6c757d" />
              <Text style={styles.emptyText}>No facilities found</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/admin/facilities/add' as any)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add First Facility</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
  },
  filtersList: {
    paddingRight: 16,
  },
  filterChip: {
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#007bff',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6c757d',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  facilitiesList: {
    padding: 16,
  },
  facilityCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  facilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  facilityDistrict: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  facilityAddress: {
    fontSize: 14,
    color: '#6c757d',
  },
  facilityStatus: {
    alignItems: 'flex-end',
  },
  districtBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffc107',
  },
  districtText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  facilityContact: {
    marginBottom: 8,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6c757d',
  },
  facilityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});