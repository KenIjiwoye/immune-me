import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInYears } from 'date-fns';
import { Patient } from '../../types/patient';

interface PatientCardProps {
  patient: Patient;
  onPress?: () => void;
  showArrow?: boolean;
}

export default function PatientCard({ 
  patient, 
  onPress, 
  showArrow = true 
}: PatientCardProps) {
  const birthDate = new Date(patient.dateOfBirth);
  const age = differenceInYears(new Date(), birthDate);
  const formattedBirthDate = format(birthDate, 'MMM d, yyyy');

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{patient.fullName}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons 
              name={patient.sex === 'M' ? 'male' : 'female'} 
              size={16} 
              color="#6c757d" 
            />
            <Text style={styles.infoText}>
              {patient.sex === 'M' ? 'Male' : 'Female'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
            <Text style={styles.infoText}>
              {age} years ({formattedBirthDate})
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={16} color="#6c757d" />
            <Text style={styles.infoText}>{patient.district}</Text>
          </View>
          
          {patient.contactPhone && (
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={16} color="#6c757d" />
              <Text style={styles.infoText}>{patient.contactPhone}</Text>
            </View>
          )}
        </View>

        {patient.motherName && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={16} color="#6c757d" />
              <Text style={styles.infoText}>Mother: {patient.motherName}</Text>
            </View>
          </View>
        )}
      </View>

      {showArrow && onPress && (
        <View style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color="#6c757d" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  arrow: {
    marginLeft: 8,
  },
});