import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Layout, Text, OverflowMenu, MenuItem } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { immunizationRecordsService } from '../../../services/immunizationRecordsService';
import { patientsService } from '../../../services/patientsService';
import { ImmunizationRecord, Patient } from '../../../types/appwrite';

export default function ImmunizationDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [immunization, setImmunization] = useState<ImmunizationRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (params.id) {
      loadImmunization();
    }
  }, [params.id]);

  const loadImmunization = async () => {
    try {
      setLoading(true);
      const record = await immunizationRecordsService.get(params.id);
      setImmunization(record);

      // Load patient details
      const patientData = await patientsService.get(record.patient_id);
      setPatient(patientData);
    } catch (error) {
      console.error('Failed to load immunization:', error);
      Alert.alert('Error', 'Failed to load immunization record');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    setMenuVisible(false);
    router.push(`/(tabs)/immunizations/edit/${params.id}`);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this immunization record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await immunizationRecordsService.delete(params.id);
              router.replace('/(tabs)/immunizations');
            } catch (error) {
              console.error('Failed to delete immunization:', error);
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  };

  const handleViewPatient = () => {
    if (patient) {
      router.push(`/(tabs)/(patients)/${patient.$id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderInfoItem = (label: string, value: string | undefined, icon?: string) => (
    <View style={styles.infoItem}>
      <View style={styles.infoHeader}>
        {icon && <Ionicons name={icon as any} size={16} color="#8F9BB3" />}
        <Text category="c1" appearance="hint">
          {label}
        </Text>
      </View>
      <Text category="s1" style={styles.infoValue}>
        {value || 'N/A'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Immunization Details
          </Text>
          <View style={styles.headerButton} />
        </Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading details...
          </Text>
        </View>
      </Layout>
    );
  }

  if (!immunization || !patient) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Immunization Details
          </Text>
          <View style={styles.headerButton} />
        </Layout>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#8F9BB3" />
          <Text category="h6" style={styles.emptyTitle}>
            Record Not Found
          </Text>
          <Text category="s1" appearance="hint">
            This immunization record could not be loaded
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          Immunization Details
        </Text>
        <OverflowMenu
          anchor={(props) => (
            <TouchableOpacity
              {...props}
              style={styles.headerButton}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#8F9BB3" />
            </TouchableOpacity>
          )}
          visible={menuVisible}
          onBackdropPress={() => setMenuVisible(false)}
          placement="bottom end"
          fullWidth={false}
        >
          <MenuItem
            title="Edit Record"
            accessoryLeft={(props) => <Ionicons name="pencil-outline" size={20} color="#8F9BB3" />}
            onPress={handleEdit}
          />
          <MenuItem
            title="Delete Record"
            accessoryLeft={(props) => <Ionicons name="trash-outline" size={20} color="#FF3D71" />}
            onPress={handleDelete}
          />
        </OverflowMenu>
      </Layout>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient Info Card */}
        <TouchableOpacity style={styles.patientCard} onPress={handleViewPatient}>
          <View style={styles.patientHeader}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  patient.full_name
                )}&background=3366FF&color=fff&size=128`,
              }}
              style={styles.avatar}
            />
            <View style={styles.patientInfo}>
              <Text category="s1" style={styles.patientName}>
                {patient.full_name}
              </Text>
              <Text category="c1" appearance="hint">
                DOB: {formatDate(patient.date_of_birth)}
              </Text>
              <Text category="c1" appearance="hint">
                ID: {patient.$id.slice(-11)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color="#8F9BB3" />
        </TouchableOpacity>

        {/* Vaccine Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={24} color="#3366FF" />
            </View>
            <Text category="h6" style={styles.cardTitle}>
              Vaccine Information
            </Text>
          </View>
          <View style={styles.cardContent}>
            {renderInfoItem('Vaccine ID', immunization.vaccine_id, 'flask-outline')}
            {renderInfoItem(
              'Administration Date',
              formatDate(immunization.administered_date),
              'calendar-outline'
            )}
            {renderInfoItem('Batch Number', immunization.batch_number, 'barcode-outline')}
            {immunization.return_date &&
              renderInfoItem(
                'Return Date',
                formatDate(immunization.return_date),
                'time-outline'
              )}
          </View>
        </View>

        {/* Administration Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={24} color="#3366FF" />
            </View>
            <Text category="h6" style={styles.cardTitle}>
              Administration Details
            </Text>
          </View>
          <View style={styles.cardContent}>
            {renderInfoItem('Administered By', immunization.administered_by_user_id, 'person-outline')}
            {renderInfoItem('Health Officer', immunization.health_officer, 'person-outline')}
            {renderInfoItem('Facility ID', immunization.facility_id, 'business-outline')}
          </View>
        </View>

        {/* Additional Information Card */}
        {immunization.notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={24} color="#3366FF" />
              </View>
              <Text category="h6" style={styles.cardTitle}>
                Additional Information
              </Text>
            </View>
            <View style={styles.cardContent}>
              {immunization.notes && (
                <View style={styles.notesSection}>
                  <Text category="c1" appearance="hint" style={styles.notesLabel}>
                    Notes
                  </Text>
                  <Text category="s1" style={styles.notesText}>
                    {immunization.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Metadata Card */}
        <View style={styles.metadataCard}>
          <Text category="c1" appearance="hint" style={styles.metadataText}>
            Created: {formatDate(immunization.created_at)}
          </Text>
          <Text category="c1" appearance="hint" style={styles.metadataText}>
            Last Updated: {formatDate(immunization.updated_at)}
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
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
    gap: 16,
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  patientHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  patientInfo: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 102, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  infoItem: {
    gap: 6,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValue: {
    fontWeight: '500',
  },
  notesSection: {
    gap: 8,
  },
  notesLabel: {
    fontWeight: '500',
  },
  notesText: {
    lineHeight: 20,
  },
  adverseText: {
    color: '#FF3D71',
  },
  metadataCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
  },
});
