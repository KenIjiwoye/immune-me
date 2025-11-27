import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Layout, Text, Input, Button, Select, SelectItem, Datepicker, IndexPath } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';

import type { Vaccine } from '../../types/appwrite';

interface InitialData {
  vaccineType?: IndexPath;
  dateAdministered: Date;
  facility: string;
  batchNumber: string;
  nextDoseDate?: Date;
  notes: string;
}

interface PatientData {
  name?: string;
  dob?: string;
  patientId: string;
  avatar?: string;
  vaccineType?: IndexPath;
  dateAdministered?: Date;
  facility?: string;
  batchNumber?: string;
  nextDoseDate?: Date;
  notes?: string;
}

interface Props {
  initialData: InitialData;
  patientData: PatientData;
  onSave: (data: any) => void;
  mode: 'new' | 'edit';
  vaccines: Vaccine[];
}

export default function ImmunizationForm({ initialData, patientData, onSave, mode, vaccines = [] }: Props) {
  const [vaccineType, setVaccineType] = useState<IndexPath | undefined>(initialData.vaccineType);
  const [dateAdministered, setDateAdministered] = useState<Date>(initialData.dateAdministered);
  const [nextDoseDate, setNextDoseDate] = useState<Date | undefined>(initialData.nextDoseDate);
  const [facility, setFacility] = useState(initialData.facility);
  const [batchNumber, setBatchNumber] = useState(initialData.batchNumber);
  const [notes, setNotes] = useState(initialData.notes);

  const handleScanBatch = () => {
    console.log('Scan batch number');
  };

  const handleSaveInternal = () => {
    const data = {
      vaccine: vaccineType !== undefined ? vaccines[vaccineType.row] : undefined,
      dateAdministered,
      facility,
      batchNumber,
      nextDoseDate,
      notes,
    };
    onSave(data);
  };

  const renderCalendarIcon = (props: any) => (
    <Ionicons name="calendar-outline" size={20} color="#8F9BB3" />
  );

  const renderBatchAccessory = () => (
    <TouchableOpacity onPress={handleScanBatch} style={styles.scanButton}>
      <Ionicons name="qr-code-outline" size={20} color="#3366FF" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <View style={styles.patientCard}>
          <View style={styles.patientInfo}>
            <Text category="s1" style={styles.patientName}>
              {patientData.name}
            </Text>
            <Text category="c1" appearance="hint">
              DOB: {patientData.dob}
            </Text>
            <Text category="c1" appearance="hint">
              Patient ID: {patientData.patientId}
            </Text>
          </View>
          <Image source={{ uri: patientData.avatar }} style={styles.avatar} />
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Vaccine Type */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Vaccine Type*
            </Text>
            <Select
              placeholder="Select vaccine"
              value={vaccineType !== undefined && vaccines[vaccineType.row] ? vaccines[vaccineType.row].name : ''}
              selectedIndex={vaccineType}
              onSelect={(index) => setVaccineType(index as IndexPath)}
            >
              {vaccines.map((vaccine) => (
                <SelectItem key={vaccine.$id} title={vaccine.name} />
              ))}
            </Select>
          </View>

          {/* Date Administered */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Date Administered*
            </Text>
            <Datepicker
              date={dateAdministered}
              onSelect={(nextDate) => setDateAdministered(nextDate)}
              accessoryRight={renderCalendarIcon}
            />
          </View>

          {/* Administered By */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Administered By
            </Text>
            <Input
              value="Dr. Robert Johnson"
              disabled
              style={styles.disabledInput}
            />
          </View>

          {/* Facility */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Facility
            </Text>
            <Input
              placeholder="e.g. General Hospital"
              value={facility}
              onChangeText={setFacility}
            />
          </View>

          {/* Batch Number */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Batch Number
            </Text>
            <Input
              placeholder="Enter or scan batch number"
              value={batchNumber}
              onChangeText={setBatchNumber}
              accessoryRight={renderBatchAccessory}
            />
          </View>

          {/* Next Dose Date */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Next Dose Date (Optional)
            </Text>
            <Datepicker
              placeholder="Select a date"
              date={nextDoseDate}
              onSelect={(nextDate) => setNextDoseDate(nextDate)}
              accessoryRight={renderCalendarIcon}
            />
          </View>

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text category="label" style={styles.label}>
              Notes
            </Text>
            <Input
              placeholder="Enter any additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              textStyle={styles.textArea}
              style={styles.textAreaContainer}
            />
          </View>
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <Layout style={styles.footer} level="2">
        <Button style={styles.saveButton} onPress={handleSaveInternal}>
          {mode === 'new' ? 'Save Record' : 'Update Record'}
        </Button>
      </Layout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EDF1F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  patientInfo: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontWeight: 'bold',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  form: {
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontWeight: '500',
  },
  disabledInput: {
    backgroundColor: '#F7F9FC',
  },
  scanButton: {
    padding: 4,
  },
  textAreaContainer: {
    minHeight: 112,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F7',
  },
  saveButton: {
    width: '100%',
  },
});