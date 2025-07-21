import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Vaccine = {
  id: number;
  name: string;
  description: string;
  vaccineCode: string;
  sequenceNumber: number | null;
  vaccineSeries: string | null;
  standardScheduleAge: string | null;
  isSupplementary: boolean;
};

type VaccineSelectorProps = {
  vaccines: Vaccine[];
  selectedVaccineId: number;
  onSelect: (vaccineId: number) => void;
  error?: string;
};

export default function VaccineSelector({ vaccines, selectedVaccineId, onSelect, error }: VaccineSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedVaccine = vaccines.find(v => v.id === selectedVaccineId);
  
  return (
    <>
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedVaccine ? styles.selectedText : styles.placeholderText}>
          {selectedVaccine ? selectedVaccine.name : 'Select a vaccine'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6c757d" />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vaccine</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={vaccines}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.vaccineItem,
                    selectedVaccineId === item.id && styles.selectedVaccineItem
                  ]}
                  onPress={() => {
                    onSelect(item.id);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.vaccineInfo}>
                    <Text style={styles.vaccineName}>{item.name}</Text>
                    {item.standardScheduleAge && (
                      <Text style={styles.vaccineAge}>Recommended age: {item.standardScheduleAge}</Text>
                    )}
                    {item.description && (
                      <Text style={styles.vaccineDescription}>{item.description}</Text>
                    )}
                    {item.vaccineSeries && (
                      <Text style={styles.vaccineSeries}>Series: {item.vaccineSeries}</Text>
                    )}
                    {item.sequenceNumber && (
                      <Text style={styles.vaccineSequence}>Dose: {item.sequenceNumber}</Text>
                    )}
                    <Text style={styles.vaccineCode}>Code: {item.vaccineCode}</Text>
                  </View>
                  {selectedVaccineId === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.vaccineList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
  },
  selectorError: {
    borderColor: '#dc3545',
  },
  selectedText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  vaccineList: {
    paddingBottom: 16,
  },
  vaccineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectedVaccineItem: {
    backgroundColor: '#e8f4fc',
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vaccineAge: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  vaccineDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  vaccineSeries: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  vaccineSequence: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  vaccineCode: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});