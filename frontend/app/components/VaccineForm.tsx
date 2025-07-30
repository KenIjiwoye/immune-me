import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';

const vaccineSchema = z.object({
  name: z.string().min(1, 'Vaccine name is required'),
  description: z.string().min(1, 'Description is required'),
  vaccineCode: z.string().min(1, 'Vaccine code is required'),
  sequenceNumber: z.number().nullable().optional(),
  vaccineSeries: z.string().nullable().optional(),
  standardScheduleAge: z.string().nullable().optional(),
  isSupplementary: z.boolean(),
  isActive: z.boolean(),
});

type VaccineFormData = z.infer<typeof vaccineSchema>;

interface VaccineFormProps {
  initialData?: Partial<VaccineFormData>;
  onSubmit: (data: VaccineFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

const LIBERIA_EPI_VACCINES = [
  { name: 'BCG', code: 'BCG', series: 'BCG', sequence: 1, age: 'At birth' },
  { name: 'OPV-0', code: 'OPV0', series: 'OPV', sequence: 0, age: 'At birth' },
  { name: 'OPV-1', code: 'OPV1', series: 'OPV', sequence: 1, age: '6 weeks' },
  { name: 'OPV-2', code: 'OPV2', series: 'OPV', sequence: 2, age: '10 weeks' },
  { name: 'OPV-3', code: 'OPV3', series: 'OPV', sequence: 3, age: '14 weeks' },
  { name: 'Penta-1', code: 'PENTA1', series: 'Penta', sequence: 1, age: '6 weeks' },
  { name: 'Penta-2', code: 'PENTA2', series: 'Penta', sequence: 2, age: '10 weeks' },
  { name: 'Penta-3', code: 'PENTA3', series: 'Penta', sequence: 3, age: '14 weeks' },
  { name: 'PCV-1', code: 'PCV1', series: 'PCV', sequence: 1, age: '6 weeks' },
  { name: 'PCV-2', code: 'PCV2', series: 'PCV', sequence: 2, age: '10 weeks' },
  { name: 'PCV-3', code: 'PCV3', series: 'PCV', sequence: 3, age: '14 weeks' },
  { name: 'Rota-1', code: 'ROTA1', series: 'Rota', sequence: 1, age: '6 weeks' },
  { name: 'Rota-2', code: 'ROTA2', series: 'Rota', sequence: 2, age: '10 weeks' },
  { name: 'IPV', code: 'IPV', series: 'IPV', sequence: 1, age: '14 weeks' },
  { name: 'MCV-1', code: 'MCV1', series: 'MCV', sequence: 1, age: '9 months' },
  { name: 'MCV-2', code: 'MCV2', series: 'MCV', sequence: 2, age: '15 months' },
  { name: 'Yellow Fever', code: 'YF', series: 'YF', sequence: 1, age: '9 months' },
  { name: 'TCV', code: 'TCV', series: 'TCV', sequence: 1, age: '9 months' },
  { name: 'Vitamin A-1', code: 'VITA1', series: 'Vitamin A', sequence: 1, age: '6 months' },
  { name: 'Vitamin A-2', code: 'VITA2', series: 'Vitamin A', sequence: 2, age: '12 months' },
];

export default function VaccineForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  submitButtonText = 'Save Vaccine' 
}: VaccineFormProps) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VaccineFormData>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: {
      name: '',
      description: '',
      vaccineCode: '',
      sequenceNumber: null,
      vaccineSeries: null,
      standardScheduleAge: null,
      isSupplementary: false,
      isActive: true,
      ...initialData,
    } as VaccineFormData,
  });

  const watchedValues = watch();

  const handleQuickSelect = (vaccine: typeof LIBERIA_EPI_VACCINES[0]) => {
    setValue('name', vaccine.name);
    setValue('vaccineCode', vaccine.code);
    setValue('vaccineSeries', vaccine.series);
    setValue('sequenceNumber', vaccine.sequence);
    setValue('standardScheduleAge', vaccine.age);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{submitButtonText}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Quick Select (Liberia EPI)</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickSelectContainer}
        >
          {LIBERIA_EPI_VACCINES.map((vaccine, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickSelectItem}
              onPress={() => handleQuickSelect(vaccine)}
            >
              <Text style={styles.quickSelectName}>{vaccine.name}</Text>
              <Text style={styles.quickSelectCode}>{vaccine.code}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vaccine Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vaccine Name *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter vaccine name"
                />
              )}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vaccine Code *</Text>
            <Controller
              control={control}
              name="vaccineCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.vaccineCode && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="e.g., BCG, OPV1, PENTA1"
                />
              )}
            />
            {errors.vaccineCode && <Text style={styles.errorText}>{errors.vaccineCode.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter vaccine description"
                  multiline
                  numberOfLines={3}
                />
              )}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Vaccine Series</Text>
              <Controller
                control={control}
                name="vaccineSeries"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value || ''}
                    placeholder="e.g., OPV, Penta"
                  />
                )}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Sequence Number</Text>
              <Controller
                control={control}
                name="sequenceNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(text ? parseInt(text) : null)}
                    value={value?.toString() || ''}
                    placeholder="e.g., 1, 2, 3"
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Standard Schedule Age</Text>
            <Controller
              control={control}
              name="standardScheduleAge"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value || ''}
                  placeholder="e.g., At birth, 6 weeks, 9 months"
                />
              )}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Supplementary Vaccine</Text>
            <Controller
              control={control}
              name="isSupplementary"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#767577', true: '#007bff' }}
                  thumbColor={value ? '#fff' : '#f4f3f4'}
                />
              )}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Active</Text>
            <Controller
              control={control}
              name="isActive"
              render={({ field: { onChange, value } }) => (
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: '#767577', true: '#007bff' }}
                  thumbColor={value ? '#fff' : '#f4f3f4'}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.submitButtonText}>Saving...</Text>
            ) : (
              <Text style={styles.submitButtonText}>{submitButtonText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  quickSelectContainer: {
    marginBottom: 24,
  },
  quickSelectItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 80,
    alignItems: 'center',
  },
  quickSelectName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#212529',
  },
  quickSelectCode: {
    fontSize: 10,
    color: '#6c757d',
  },
  section: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#b3d9ff',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
