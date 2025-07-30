import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';

type Vaccine = {
  id: number;
  name: string;
  description: string;
  vaccineCode: string;
  sequenceNumber: number | null;
  vaccineSeries: string | null;
  standardScheduleAge: string | null;
  isSupplementary: boolean;
  isActive: boolean;
};

export default function VaccineManagementScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeries, setFilterSeries] = useState<string | null>(null);

  const { data: vaccinesData, isLoading, error, refetch } = useQuery({
    queryKey: ['vaccines', searchQuery, filterSeries],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filterSeries) params.series = filterSeries;
      
      const response = await api.get('/vaccines', { params });
      return response.data;
    },
  });

  const vaccines = vaccinesData?.data || [];
  const uniqueSeries = [...new Set(vaccines.map((v: Vaccine) => v.vaccineSeries).filter(Boolean))] as string[];

  const renderVaccineCard = ({ item }: { item: Vaccine }) => (
    <TouchableOpacity
      style={styles.vaccineCard}
      onPress={() => router.push(`/admin/vaccines/${item.id}` as any)}
    >
      <View style={styles.vaccineHeader}>
        <View style={styles.vaccineInfo}>
          <Text style={styles.vaccineName}>{item.name}</Text>
          <Text style={styles.vaccineCode}>Code: {item.vaccineCode}</Text>
        </View>
        <View style={styles.vaccineStatus}>
          {item.vaccineSeries && (
            <View style={styles.seriesBadge}>
              <Text style={styles.seriesText}>{item.vaccineSeries}</Text>
            </View>
          )}
          {item.sequenceNumber && (
            <View style={styles.sequenceBadge}>
              <Text style={styles.sequenceText}>#{item.sequenceNumber}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#d4edda' : '#f8d7da' }]}>
            <Text style={[styles.statusText, { color: item.isActive ? '#155724' : '#721c24' }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.vaccineDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      {item.standardScheduleAge && (
        <Text style={styles.scheduleAge}>Recommended age: {item.standardScheduleAge}</Text>
      )}
      
      <View style={styles.vaccineFooter}>
        <Text style={styles.supplementaryText}>
          {item.isSupplementary ? 'Supplementary' : 'Standard Schedule'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );

  const renderSeriesFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filterSeries === item && styles.activeFilterChip
      ]}
      onPress={() => setFilterSeries(filterSeries === item ? null : item)}
    >
      <Text style={[
        styles.filterChipText,
        filterSeries === item && styles.activeFilterChipText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (error) {
    Toast.show({
      type: 'error',
      text1: 'Error loading vaccines',
      text2: 'Please try again',
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vaccine Management</Text>
        <TouchableOpacity onPress={() => router.push('/admin/vaccines/add' as any)}>
          <Ionicons name="add" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vaccines..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {uniqueSeries.length > 0 && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Filter by series:</Text>
          <FlatList
            horizontal
            data={uniqueSeries}
            renderItem={renderSeriesFilter}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading vaccines...</Text>
        </View>
      ) : (
        <FlatList
          data={vaccines}
          renderItem={renderVaccineCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.vaccinesList}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={64} color="#6c757d" />
              <Text style={styles.emptyText}>No vaccines found</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/admin/vaccines/add' as any)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add First Vaccine</Text>
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
  vaccinesList: {
    padding: 16,
  },
  vaccineCard: {
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
  vaccineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  vaccineCode: {
    fontSize: 12,
    color: '#6c757d',
  },
  vaccineStatus: {
    alignItems: 'flex-end',
  },
  seriesBadge: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  seriesText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  sequenceBadge: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  sequenceText: {
    fontSize: 10,
    color: '#856404',
    fontWeight: 'bold',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  vaccineDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  scheduleAge: {
    fontSize: 12,
    color: '#007bff',
    marginBottom: 8,
  },
  vaccineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplementaryText: {
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
