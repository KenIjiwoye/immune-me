# FE-08: Admin Vaccine Management System

## Context
The Immunization Records Management System has a robust vaccine infrastructure with complete backend API endpoints and a sophisticated VaccineSelector component for vaccine selection. However, the system currently lacks an administrative interface for managing vaccine items. Administrators need the ability to add new vaccines, update existing vaccine information, and manage vaccine series and schedules to support the Liberia EPI program effectively.

## Dependencies
- FE-01: Authentication flow with role-based access
- FE-06: Settings and profile management (for admin interface patterns)
- BE-05: Vaccine API endpoints (already implemented)
- Backend vaccine model with Liberia EPI support (already implemented)

## Requirements

### Core Functionality
1. **Admin-Only Access**: Restrict vaccine management to users with admin role
2. **Vaccine List Management**: Display all vaccines with search, filter, and pagination
3. **Vaccine Creation**: Form to add new vaccines with all Liberia EPI fields
4. **Vaccine Editing**: Update existing vaccine information
5. **Vaccine Series Management**: Handle multi-dose vaccine series (OPV, Penta, PCV, etc.)
6. **Bulk Operations**: Enable bulk vaccine operations for efficiency
7. **Integration**: Seamless integration with existing VaccineSelector component

### Liberia EPI Specific Requirements
1. **Standard Vaccines Support**: BCG, OPV series, Penta series, PCV series, Rota series, IPV, MCV series, YF, TCV, Vitamin A series
2. **Vaccine Codes**: Support for standard Liberia EPI vaccine codes
3. **Sequence Management**: Handle vaccine sequence numbers for series
4. **Schedule Ages**: Configure recommended ages for each vaccine
5. **Series Grouping**: Visual grouping of related vaccines in series

### Technical Requirements
1. **Role-Based Access Control**: Check user role before allowing access
2. **Form Validation**: Comprehensive validation using Zod schemas
3. **API Integration**: Use existing vaccine endpoints with TanStack Query
4. **Error Handling**: Robust error handling with user-friendly messages
5. **Loading States**: Proper loading indicators for all operations
6. **Responsive Design**: Mobile-optimized interface for tablet/phone use

## API Endpoints Available
- `GET /vaccines` - List all vaccines with pagination and filtering
- `GET /vaccines/:id` - Get vaccine details
- `POST /vaccines` - Create new vaccine
- `PUT /vaccines/:id` - Update vaccine
- `DELETE /vaccines/:id` - Delete vaccine (soft delete recommended)

## Vaccine Data Model
```typescript
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
  createdAt: string;
  updatedAt: string;
};
```

## Code Examples

### Admin Vaccine Management Layout

```typescript
// frontend/app/(drawer)/admin/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { Redirect } from 'expo-router';

export default function AdminLayout() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (!user || user.role !== 'admin') {
    return <Redirect href="/(drawer)" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Admin Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="vaccines"
        options={{
          headerTitle: 'Vaccine Management',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
```

### Admin Dashboard Screen

```typescript
// frontend/app/(drawer)/admin/index.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  const adminActions = [
    {
      title: 'Vaccine Management',
      description: 'Add, edit, and manage vaccines',
      icon: 'medical-outline',
      route: '/admin/vaccines',
      color: '#007bff',
    },
    {
      title: 'User Management',
      description: 'Manage healthcare staff accounts',
      icon: 'people-outline',
      route: '/admin/users',
      color: '#28a745',
    },
    {
      title: 'Facility Management',
      description: 'Manage healthcare facilities',
      icon: 'business-outline',
      route: '/admin/facilities',
      color: '#ffc107',
    },
    {
      title: 'System Reports',
      description: 'Generate system-wide reports',
      icon: 'analytics-outline',
      route: '/admin/reports',
      color: '#dc3545',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>System Administration</Text>
      </View>

      <View style={styles.actionsGrid}>
        {adminActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, { borderLeftColor: action.color }]}
            onPress={() => router.push(action.route)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon as any} size={32} color={action.color} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
        ))}
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  actionsGrid: {
    padding: 16,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
});
```

### Vaccine Management Layout

```typescript
// frontend/app/(drawer)/admin/vaccines/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function VaccineManagementLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Vaccine Management',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerTitle: 'Add Vaccine',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Edit Vaccine',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
```

### Vaccine List Screen

```typescript
// frontend/app/(drawer)/admin/vaccines/index.tsx
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
  const uniqueSeries = [...new Set(vaccines.map((v: Vaccine) => v.vaccineSeries).filter(Boolean))];

  const renderVaccineCard = ({ item }: { item: Vaccine }) => (
    <TouchableOpacity
      style={styles.vaccineCard}
      onPress={() => router.push(`/admin/vaccines/${item.id}`)}
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
        <TouchableOpacity onPress={() => router.push('/admin/vaccines/add')}>
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
                onPress={() => router.push('/admin/vaccines/add')}
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
```

### Vaccine Form Component

```typescript
// frontend/app/components/VaccineForm.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const vaccineSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500, 'Description too long'),
  vaccineCode: z.string().min(1, 'Vaccine code is required').max(50, 'Code too long'),
  sequenceNumber: z.number().optional(),
  vaccineSeries: z.string().max(100, 'Series name too long').optional(),
  standardScheduleAge: z.string().max(100, 'Schedule age too long').optional(),
  isSupplementary: z.boolean(),
  isActive: z.boolean(),
});

type VaccineFormData = z.infer<typeof vaccineSchema>;

type VaccineFormProps = {
  initialData?: Partial<VaccineFormData>;
  onSubmit: (data: VaccineFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
};

const LIBERIA_VACCINE_SERIES = [
  'BCG',
  'OPV',
  'Penta',
  'PCV',
  'Rota',
  'IPV',
  'MCV',
  'YF',
  'TCV',
  'Vitamin A',
];

export default function VaccineForm({ 
  initialData, 
  onSubmit, 
  isLoading = false, 
  submitLabel = 'Save Vaccine' 
}: VaccineFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VaccineFormData>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: {
      name: '',
      description: '',
      vaccineCode: '',
      sequenceNumber: undefined,
      vaccineSeries: '',
      standardScheduleAge: '',
      isSupplementary: false,
      isActive: true,
      ...initialData,
    },
  });

  const selectedSeries = watch('vaccineSeries');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.field}>
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
                placeholder="e.g., BCG (Anti-TB)"
              />
            )}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
        </View>

        <View style={styles.field}>
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
                placeholder="Detailed description of the vaccine"
                multiline
                numberOfLines={3}
              />
            )}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}
        </View>

        <View style={styles.field}>
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
                autoCapitalize="characters"
              />
            )}
          />
          {errors.vaccineCode && <Text style={styles.errorText}>{errors.vaccineCode.message}</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Series Information</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>Vaccine Series</Text>
          <View style={styles.seriesContainer}>
            {LIBERIA_VACCINE_SERIES.map((series) => (
              <TouchableOpacity
                key={series}
                style={[
                  styles.seriesChip,
                  selectedSeries === series && styles.selectedSeriesChip
                ]}
                onPress={() => setValue('vaccineSeries', selectedSeries === series ? '' : series)}
              >
                <Text style={[
                  styles.seriesChipText,
                  selectedSeries === series && styles.selectedSeriesChipText
                ]}>
                  {series}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Controller
            control={control}
            name="vaccineSeries"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Or enter custom series name"
              />
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sequence Number</Text>
          <Controller
            control={control}
            name="sequenceNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={(text) => onChange(text ? parseInt(text) : undefined)}
                value={value?.toString() || ''}
                placeholder="e.g., 1 for first dose, 2 for second dose"
                keyboardType="numeric"
              />
            )}
          />
          <Text style={styles.helpText}>
            For series vaccines like OPV (1, 2, 3) or Penta (1, 2, 3)
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule Information</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>Standard Schedule Age</Text>
          <Controller
            control={control}
            name="standardScheduleAge"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="e.g., At birth, 6 weeks, 10 weeks, 14 weeks"
              />
            )}
          />
          <Text style={styles.helpText}>
            Recommended age for administration according to Liberia EPI schedule
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.switchContainer}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Supplementary Vaccine</Text>
            <Text style={styles.switchDescription}>
              Mark if this is a supplementary immunization activity vaccine
            </Text>
          </View>
          <Controller
            control={control}
            name="isSupplementary"
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[styles.switch, value && styles.switchActive]}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.switchContainer}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Active Vaccine</Text>
            <Text style={styles.switchDescription}>
              Active vaccines are available for selection during immunization recording
            </Text>
          </View>
          <Controller
            control={control}
            name="isActive"
            render={({ field: { onChange, value } }) => (
              <TouchableOpacity
                style={[styles.switch, value && styles.switchActive]}
                onPress={() => onChange(!value)}
              >
                <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Text style={styles.submitButtonText}>Saving...</Text>
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>{submitLabel}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: '#6c757d',
    fontSize: 12,
    marginTop: 4,
  },
  seriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  seriesChip: {
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedSeriesChip: {
    backgroundColor: '#007bff',
  },
  seriesChipText: {
    fontSize: 12,
    color: '#6c757d',
  },
  selectedSeriesChipText: {
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ced4da',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#007bff',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
```

### Add Vaccine Screen

```typescript
// frontend/app/(drawer)/admin/vaccines/add.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import VaccineForm from '../../../components/VaccineForm';

export default function AddVaccineScreen() {
  const queryClient = useQueryClient();

  const createVaccineMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/vaccines', data);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Vaccine created successfully',
        text2: 'The vaccine has been added to the system',
      });
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create vaccine',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Vaccine</Text>
        <View style={{ width: 24 }} />
      </View>

      <VaccineForm
        onSubmit={createVaccineMutation.mutate}
        isLoading={createVaccineMutation.isPending}
        submitLabel="Create Vaccine"
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
});
```

### Edit Vaccine Screen

```typescript
// frontend/app/(drawer)/admin/vaccines/[id].tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import VaccineForm from '../../../components/VaccineForm';

export default function EditVaccineScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const { data: vaccine, isLoading, error } = useQuery({
    queryKey: ['vaccine', id],
    queryFn: async () => {
      const response = await api.get(`/vaccines/${id}`);
      return response.data;
    },
  });

  const updateVaccineMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/vaccines/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Vaccine updated successfully',
        text2: 'The vaccine information has been saved',
      });
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine', id] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update vaccine',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  const deleteVaccineMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/vaccines/${id}`);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Vaccine deleted successfully',
        text2: 'The vaccine has been removed from the system',
      });
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to delete vaccine',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading vaccine details...</Text>
      </View>
    );
  }

  if (error || !vaccine) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>Failed to load vaccine details</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Vaccine</Text>
        <TouchableOpacity 
          onPress={() => deleteVaccineMutation.mutate()}
          disabled={deleteVaccineMutation.isPending}
        >
          <Ionicons name="trash-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      </View>

      <VaccineForm
        initialData={vaccine}
        onSubmit={updateVaccineMutation.mutate}
        isLoading={updateVaccineMutation.isPending}
        submitLabel="Update Vaccine"
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

## Directory Structure

```
frontend/app/(drawer)/admin/
├── _layout.tsx              # Admin layout with role-based access
├── index.tsx               # Admin dashboard
└── vaccines/
    ├── _layout.tsx         # Vaccine management layout
    ├── index.tsx          # Vaccine list screen
    ├── add.tsx           # Add vaccine screen
    └── [id].tsx         # Edit vaccine screen

frontend/app/components/
└── VaccineForm.tsx        # Reusable vaccine form component
```

## Integration with Drawer Navigation

Update the main drawer navigation to include admin access:

```typescript
// Add to frontend/app/(drawer)/_layout.tsx
const adminMenuItems = user?.role === 'admin' ? [
  {
    name: 'admin/index',
    options: {
      drawerLabel: 'Admin',
      drawerIcon: ({ color, size }: any) => (
        <Ionicons name="settings-outline" size={size} color={color} />
      ),
    },
  },
] : [];
```

## Expected Outcome

1. **Complete Admin Interface**: Full administrative interface for vaccine management
2. **Role-Based Access**: Only admin users can access vaccine management features
3. **Comprehensive Vaccine Management**: Create, read, update, and delete vaccines
4. **Liberia EPI Support**: Full support for Liberia immunization schedule requirements
5. **Search and Filtering**: Efficient vaccine discovery and management
6. **Form Validation**: Robust validation using established patterns
7. **Integration**: Seamless integration with existing VaccineSelector component

## Testing Guidelines

1. **Role-Based Access**: Test that non-admin users cannot access admin screens
2. **CRUD Operations**: Test all vaccine management operations
3. **Form Validation**: Test all validation scenarios
4. **Search and Filtering**: Test vaccine discovery features
5. **Integration**: Test that new vaccines appear in VaccineSelector
6. **Error Handling**: Test network errors and edge cases
7. **Mobile Responsiveness**: Test on various screen sizes

## Implementation Steps

1. Create admin directory structure and layouts
2. Implement admin dashboard with navigation
3. Build vaccine management list screen
4. Create reusable VaccineForm component
5. Implement add and edit vaccine screens
6. Add role-based access controls
7. Update main navigation to include admin access
8. Test complete workflow from admin dashboard to vaccine creation

## Next Steps After Implementation

1. Add bulk vaccine operations (import/export)
2. Implement vaccine schedule configuration interface
3. Add vaccine usage analytics and reporting
4. Create vaccine series management tools
5. Implement vaccine approval workflows for multi-facility setups
