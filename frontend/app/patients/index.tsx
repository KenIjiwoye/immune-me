import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { usePatients } from '../../hooks/usePatients';
import PatientCard from '../components/PatientCard';
import { PatientQueryParams, PatientWithRelations } from '../../types/patient';

export default function PatientListScreen() {
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const queryParams: PatientQueryParams = {
    page,
    limit: 20,
    search: searchQuery || undefined,
    ...params,
  };

  const {
    data: patientsData,
    isLoading,
    isError,
    refetch,
  } = usePatients(queryParams);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = () => {
    if (patientsData?.meta && page < patientsData.meta.totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const renderPatient = ({ item }: { item: PatientWithRelations }) => (
    <PatientCard
      patient={item}
      onPress={() => router.push(`/patients/${item.id || 0}`)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients by name or phone..."
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#6c757d" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/patients/new')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={64} color="#e9ecef" />
      <Text style={styles.emptyText}>
        {searchQuery ? 'No patients found' : 'No patients yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery 
          ? 'Try adjusting your search criteria' 
          : 'Add your first patient to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.addFirstButton}
          onPress={() => router.push('/patients/new')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addFirstButtonText}>Add Patient</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || page > 1) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007bff" />
      </View>
    );
  };

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>Failed to load patients</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={patientsData?.data || []}
        keyExtractor={(item) => item.id?.toString() || '0'}
        renderItem={renderPatient}
        contentContainerStyle={[
          styles.list,
          patientsData?.data?.length === 0 && styles.emptyList
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007bff"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  addButton: {
    marginLeft: 12,
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});