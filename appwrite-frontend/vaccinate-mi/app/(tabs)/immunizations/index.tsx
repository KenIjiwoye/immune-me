import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Layout, Text, Input, Button } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useImmunizations, useRecentImmunizations, useImmunizationsByDateRange } from '../../../hooks/useImmunizations';
import { usePatient } from '../../../hooks/usePatients';
import { ImmunizationRecord } from '../../../types/appwrite';

interface ImmunizationWithPatient extends ImmunizationRecord {
  patientName?: string;
}

export default function Immunizations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'today'>('all');
  const router = useRouter();

  // Calculate today's date range
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const tomorrow = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }, [today]);

  // Use appropriate query based on filter
  const allQuery = useImmunizations({ limit: 100 });
  const recentQuery = useRecentImmunizations(20);
  const todayQuery = useImmunizationsByDateRange(
    today.toISOString(),
    tomorrow.toISOString()
  );

  // Select the right query based on filter
  const activeQuery = filter === 'today' ? todayQuery : filter === 'recent' ? recentQuery : allQuery;
  const { data, isLoading, isError, error, refetch, isFetching } = activeQuery;

  // Get immunization records from the appropriate query
  const rawRecords = useMemo(() => {
    if (!data) return [];

    // For list queries, data has documents property
    if ('documents' in data) {
      return data.documents;
    }

    // For other queries, data is already an array
    return data as ImmunizationRecord[];
  }, [data]);


  // Sort by date (most recent first)
  const sortedRecords = useMemo(() => {
    return [...rawRecords].sort(
      (a, b) =>
        new Date(b.administered_date).getTime() -
        new Date(a.administered_date).getTime()
    );
  }, [rawRecords]);

  // Filter by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return sortedRecords;

    // Note: Client-side filtering by patient name would require loading all patient data
    // For now, just return all records when searching
    // TODO: Implement server-side search or load patient data
    return sortedRecords;
  }, [sortedRecords, searchQuery]);

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleImmunizationPress = (immunization: ImmunizationRecord) => {
    router.push(`/(tabs)/immunizations/${immunization.$id}`);
  };

  const handleAddImmunization = () => {
    router.push('/(tabs)/immunizations/new');
  };

  const handleRefresh = () => {
    refetch();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getVaccineIcon = (): any => {
    return 'medical-outline';
  };


  const renderSearchIcon = () => (
    <Ionicons name="search-outline" size={20} color="#8F9BB3" />
  );

  // Component to load patient name (uses React Query hook)
  const PatientName = ({ patientId }: { patientId: string }) => {
    const { data: patient, isLoading } = usePatient(patientId);

    if (isLoading) return <Text category="s1">Loading...</Text>;

    return (
      <Text category="s1" style={styles.patientName}>
        {patient?.full_name || 'Unknown Patient'}
      </Text>
    );
  };

  const renderImmunizationCard = (immunization: ImmunizationRecord) => (
    <TouchableOpacity
      key={immunization.$id}
      style={styles.card}
      onPress={() => handleImmunizationPress(immunization)}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name={getVaccineIcon()} size={24} color="#3366FF" />
        </View>
        <View style={styles.cardInfo}>
          <PatientName patientId={immunization.patient_id} />
          <Text category="c1" appearance="hint">
            Batch: {immunization.batch_number || 'N/A'}
          </Text>
          <View style={styles.metaContainer}>
            <Ionicons name="calendar-outline" size={14} color="#8F9BB3" />
            <Text category="c2" appearance="hint">
              {formatDate(immunization.administered_date)}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color="#8F9BB3" />
    </TouchableOpacity>
  );

  // Error state
  if (isError) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <Text category="h4" style={styles.headerTitle}>
            Immunizations
          </Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color="#8F9BB3" />
          </TouchableOpacity>
        </Layout>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3D71" />
          <Text category="h6" style={styles.emptyTitle}>
            Failed to Load Immunizations
          </Text>
          <Text category="s1" appearance="hint">
            {error?.message || 'An error occurred'}
          </Text>
          <Button style={{ marginTop: 16 }} onPress={handleRefresh}>
            Try Again
          </Button>
        </View>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <Text category="h4" style={styles.headerTitle}>
          Immunizations
        </Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <Ionicons name="notifications-outline" size={24} color="#8F9BB3" />
        </TouchableOpacity>
      </Layout>

      {/* Search and Filters */}
      <Layout style={styles.searchSection} level="2">
        <Input
          placeholder="Search by patient name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={renderSearchIcon}
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          <Button
            size="small"
            appearance={filter === 'all' ? 'filled' : 'outline'}
            style={[
              styles.filterButton,
              filter === 'all' && styles.activeFilterButton,
            ]}
            onPress={() => setFilter('all')}
          >
            All
          </Button>

          <Button
            size="small"
            appearance={filter === 'recent' ? 'filled' : 'outline'}
            style={[
              styles.filterButton,
              filter === 'recent' && styles.activeFilterButton,
            ]}
            onPress={() => setFilter('recent')}
          >
            Recent
          </Button>

          <Button
            size="small"
            appearance={filter === 'today' ? 'filled' : 'outline'}
            style={[
              styles.filterButton,
              filter === 'today' && styles.activeFilterButton,
            ]}
            onPress={() => setFilter('today')}
          >
            Today
          </Button>
        </ScrollView>
      </Layout>

      {/* Immunization List */}
      {isLoading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading immunizations...
          </Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={64} color="#8F9BB3" />
          <Text category="h6" style={styles.emptyTitle}>
            No immunizations found
          </Text>
          <Text category="s1" appearance="hint" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : 'Start by adding a new immunization record'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && filter === 'all'}
              onRefresh={handleRefresh}
              tintColor="#3366FF"
            />
          }
        >
          {filteredRecords.map((immunization) =>
            renderImmunizationCard(immunization)
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddImmunization}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  headerTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchInput: {
    marginBottom: 12,
  },
  filterScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    marginRight: 0,
  },
  activeFilterButton: {
    backgroundColor: '#3366FF',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 96,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(51, 102, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  patientName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3366FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
