import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Layout, Text, Input, Button, Select, SelectItem, Datepicker, IndexPath } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function PatientNew() {
  const [vaccineType, setVaccineType] = useState<IndexPath | undefined>();
  const [dateAdministered, setDateAdministered] = useState<Date>(new Date());
  const [nextDoseDate, setNextDoseDate] = useState<Date | undefined>();
  const [facility, setFacility] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');

  const patient = {
    name: 'Eleanor Pena',
    dob: '05/12/1986',
    patientId: '987-654-321',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCTL-v5tOhl8JDjLNRmuEmg6ovOnda_XzvnJImUQCMGDCYRJITHh8Rtx18XYDnpk-CmmeBdY1C1D_Q0d_bquEl-mGijDY5QgcpDXyhuPd5xFJmrr3HiTtKGvgA79hSHwzf_hSCtxJgArV0PZGgO0pH-IFC0DI9Irau2-ouTLBDD5KjvdN0kETgEwAXcumvj8bE1OBW81MWAr3J_EhED06LIYdkmVadMhQwQUdoRMObiYgy4hhJFGmcLTW9ln3iMgQ_sSw4tiPpN9zQ',
  };

  const vaccines = ['COVID-19 (Pfizer)', 'Influenza', 'MMR'];

  const handleBack = () => {
    router.back();
  };

  const handleScanBatch = () => {
    console.log('Scan batch number');
  };

  const handleSave = () => {
    console.log('Save record', {
      vaccineType: vaccineType !== undefined ? vaccines[vaccineType.row] : undefined,
      dateAdministered,
      facility,
      batchNumber,
      nextDoseDate,
      notes,
    });
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
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          New Immunization
        </Text>
        <View style={styles.headerSpacer} />
      </Layout>

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
                {patient.name}
              </Text>
              <Text category="c1" appearance="hint">
                DOB: {patient.dob}
              </Text>
              <Text category="c1" appearance="hint">
                Patient ID: {patient.patientId}
              </Text>
            </View>
            <Image source={{ uri: patient.avatar }} style={styles.avatar} />
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
                value={vaccineType !== undefined ? vaccines[vaccineType.row] : ''}
                selectedIndex={vaccineType}
                onSelect={(index) => setVaccineType(index as IndexPath)}
              >
                {vaccines.map((vaccine, index) => (
                  <SelectItem key={index} title={vaccine} />
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
      </KeyboardAvoidingView>

      {/* Fixed Footer */}
      <Layout style={styles.footer} level="2">
        <Button style={styles.saveButton} onPress={handleSave}>
          Save Record
        </Button>
      </Layout>
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
  backButton: {
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
  headerSpacer: {
    width: 40,
  },
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
