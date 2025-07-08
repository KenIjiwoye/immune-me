# FE-05: Implement Reporting and Analytics Screens

## Context
The Immunization Records Management System requires screens for viewing reports and analytics to help healthcare workers and administrators track immunization coverage, due immunizations, and other key metrics.

## Dependencies
- FE-01: Authentication flow implemented
- FE-02: Dashboard screen implemented

## Requirements
1. Create a reports dashboard with various report options
2. Implement immunization coverage reports with charts
3. Create due immunizations reports
4. Implement facility performance reports
5. Add filtering capabilities for all reports

## Code Example

### Reports Dashboard Screen

```typescript
// frontend/app/reports/index.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth';
import ReportCard from '../components/ReportCard';

export default function ReportsDashboardScreen() {
  const { isAuthenticated, user } = useAuth();
  
  // Define available reports based on user role
  const getAvailableReports = () => {
    const reports = [
      {
        id: 'immunization-coverage',
        title: 'Immunization Coverage',
        description: 'View immunization coverage by vaccine type',
        icon: 'pie-chart',
        color: '#4CAF50',
        route: '/reports/immunization-coverage',
      },
      {
        id: 'due-immunizations',
        title: 'Due Immunizations',
        description: 'View patients due for immunizations',
        icon: 'calendar',
        color: '#FF9800',
        route: '/reports/due-immunizations',
      },
    ];
    
    // Add admin/supervisor specific reports
    if (user?.role === 'administrator' || user?.role === 'supervisor') {
      reports.push(
        {
          id: 'facility-performance',
          title: 'Facility Performance',
          description: 'Compare performance across facilities',
          icon: 'bar-chart',
          color: '#2196F3',
          route: '/reports/facility-performance',
        },
        {
          id: 'age-distribution',
          title: 'Age Distribution',
          description: 'View patient age distribution',
          icon: 'people',
          color: '#9C27B0',
          route: '/reports/age-distribution',
        }
      );
    }
    
    return reports;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reports & Analytics' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports & Analytics</Text>
          <Text style={styles.subtitle}>
            View and analyze immunization data to make informed decisions
          </Text>
        </View>
        
        <View style={styles.reportsContainer}>
          {getAvailableReports().map((report) => (
            <ReportCard
              key={report.id}
              title={report.title}
              description={report.description}
              icon={report.icon}
              color={report.color}
              onPress={() => router.push(report.route)}
            />
          ))}
        </View>
      </ScrollView>
    </>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  reportsContainer: {
    padding: 16,
  },
});
```

### Report Card Component

```typescript
// frontend/app/components/ReportCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ReportCardProps = {
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress: () => void;
};

export default function ReportCard({ title, description, icon, color, onPress }: ReportCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={32} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6c757d" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
  },
});
```

### Immunization Coverage Report Screen

```typescript
// frontend/app/reports/immunization-coverage.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth';
import api from '../services/api';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import DateRangePicker from '../components/DateRangePicker';

type CoverageData = {
  name: string;
  count: number;
  color: string;
};

const CHART_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', 
  '#3F51B5', '#00BCD4', '#009688', '#FFEB3B', '#795548'
];

export default function ImmunizationCoverageScreen() {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [coverageData, setCoverageData] = useState<CoverageData[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [totalImmunizations, setTotalImmunizations] = useState(0);
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    // Set default date range to last 6 months
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    
    setStartDate(start);
    setEndDate(end);
    
    loadCoverageData(start, end);
  }, [isAuthenticated]);
  
  const loadCoverageData = async (start: Date, end: Date) => {
    try {
      setIsLoading(true);
      
      const response = await api.get('/reports/immunization-coverage', {
        params: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          facilityId: user?.role === 'administrator' ? undefined : user?.facilityId
        }
      });
      
      const data = response.data;
      let total = 0;
      
      // Transform data for the chart
      const chartData = data.map((item: any, index: number) => {
        total += item.count;
        return {
          name: item.name,
          count: item.count,
          color: CHART_COLORS[index % CHART_COLORS.length]
        };
      });
      
      setCoverageData(chartData);
      setTotalImmunizations(total);
    } catch (error) {
      console.error('Failed to load coverage data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    loadCoverageData(start, end);
  };
  
  const screenWidth = Dimensions.get('window').width - 32;
  
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
  };
  
  const pieChartData = coverageData.map((item) => ({
    name: item.name,
    count: item.count,
    color: item.color,
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  return (
    <>
      <Stack.Screen options={{ title: 'Immunization Coverage' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Immunization Coverage</Text>
          <Text style={styles.subtitle}>
            Distribution of immunizations by vaccine type
          </Text>
        </View>
        
        <View style={styles.filterSection}>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : coverageData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics" size={64} color="#e9ecef" />
            <Text style={styles.emptyText}>No data available for the selected period</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <Text style={styles.totalText}>
              Total Immunizations: {totalImmunizations}
            </Text>
            
            <PieChart
              data={pieChartData}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Vaccine</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Count</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Percentage</Text>
              </View>
              
              {coverageData.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                    <Text style={styles.vaccineName}>{item.name}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{item.count}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {((item.count / totalImmunizations) * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  tableContainer: {
    marginTop: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 12,
  },
  tableCell: {
    fontSize: 14,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  vaccineName: {
    flex: 1,
  },
});
```

### Date Range Picker Component

```typescript
// frontend/app/components/DateRangePicker.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

type DateRangePickerProps = {
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
};

export default function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);
  
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setTempStartDate(selectedDate);
      
      // If end date is before start date, update end date
      if (tempEndDate && selectedDate > tempEndDate) {
        setTempEndDate(selectedDate);
      }
      
      // Apply date range if both dates are selected
      if (tempEndDate) {
        onDateRangeChange(selectedDate, tempEndDate);
      }
    }
  };
  
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setTempEndDate(selectedDate);
      
      // Apply date range if both dates are selected
      if (tempStartDate) {
        onDateRangeChange(tempStartDate, selectedDate);
      }
    }
  };
  
  const applyPresetRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    
    setTempStartDate(start);
    setTempEndDate(end);
    onDateRangeChange(start, end);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Date Range</Text>
      
      <View style={styles.datePickersContainer}>
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateLabel}>From</Text>
          <View style={styles.dateValueContainer}>
            <Text style={styles.dateValue}>
              {tempStartDate ? format(tempStartDate, 'MMM d, yyyy') : 'Select date'}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.dateLabel}>To</Text>
          <View style={styles.dateValueContainer}>
            <Text style={styles.dateValue}>
              {tempEndDate ? format(tempEndDate, 'MMM d, yyyy') : 'Select date'}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.presetContainer}>
        <Text style={styles.presetLabel}>Quick Select:</Text>
        <View style={styles.presetButtons}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => applyPresetRange(1)}
          >
            <Text style={styles.presetButtonText}>1M</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => applyPresetRange(3)}
          >
            <Text style={styles.presetButtonText}>3M</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => applyPresetRange(6)}
          >
            <Text style={styles.presetButtonText}>6M</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => applyPresetRange(12)}
          >
            <Text style={styles.presetButtonText}>1Y</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {showStartPicker && (
        <DateTimePicker
          value={tempStartDate || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          maximumDate={new Date()}
        />
      )}
      
      {showEndPicker && (
        <DateTimePicker
          value={tempEndDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={tempStartDate || undefined}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePicker: {
    width: '48%',
  },
  dateLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  dateValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
  },
  dateValue: {
    fontSize: 14,
  },
  presetContainer: {
    marginTop: 16,
  },
  presetLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  presetButtons: {
    flexDirection: 'row',
  },
  presetButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  presetButtonText: {
    fontSize: 14,
    color: '#495057',
  },
});
```

### Due Immunizations Report Screen

```typescript
// frontend/app/reports/due-immunizations.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth';
import api from '../services/api';
import { format, isAfter, isBefore, addDays } from 'date-fns';

type DueImmunization = {
  patientId: number;
  patientName: string;
  contactPhone: string;
  vaccineName: string;
  dueDate: string;
};

export default function DueImmunizationsScreen() {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dueImmunizations, setDueImmunizations] = useState<DueImmunization[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    loadDueImmunizations();
  }, [isAuthenticated]);
  
  const loadDueImmunizations = async () => {
    try {
      setIsLoading(true);
      
      const response = await api.get('/reports/due-immunizations', {
        params: {
          daysAhead: 30,
          facilityId: user?.role === 'administrator' ? undefined : user?.facilityId
        }
      });
      
      setDueImmunizations(response.data);
    } catch (error) {
      console.error('Failed to load due immunizations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getFilteredImmunizations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = addDays(today, 7);
    
    switch (filter) {
      case 'today':
        return dueImmunizations.filter(item => {
          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        });
      case 'week':
        return dueImmunizations.filter(item => {
          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return isAfter(dueDate, today) && isBefore(dueDate, nextWeek);
        });
      case 'overdue':
        return dueImmunizations.filter(item => {
          const dueDate = new Date(item.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return isBefore(dueDate, today);
        });
      default:
        return dueImmunizations;
    }
  };
  
  const renderItem = ({ item }: { item: DueImmunization }) => {
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isOverdue = isBefore(dueDate, today);
    
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => router.push(`/patients/${item.patientId}`)}
      >
        <View style={styles.itemContent}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.vaccineName}>{item.vaccineName}</Text>
          <View style={styles.itemFooter}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#6c757d" />
              <Text style={[
                styles.dueDate,
                isOverdue && styles.overdue
              ]}>
                {isOverdue ? 'Overdue: ' : 'Due: '}
                {format(dueDate, 'MMM d, yyyy')}
              </Text>
            </View>
            {item.contactPhone && (
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={14} color="#6c757d" />
                <Text style={styles.phone}>{item.contactPhone}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Due Immunizations' }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Due Immunizations</Text>
          <Text style={styles.subtitle}>
            Patients due for immunizations in the next 30 days
          </Text>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filter === 'today' && styles.activeFilter]}
            onPress={() => setFilter('today')}
          >
            <Text style={[styles.filterText, filter === 'today' && styles.activeFilterText]}>
              Today
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filter === 'week' && styles.activeFilter]}
            onPress={() => setFilter('week')}
          >
            <Text style={[styles.filterText, filter === 'week' && styles.activeFilterText]}>
              This Week
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filter === 'overdue' && styles.activeFilter]}
            onPress={() => setFilter('overdue')}
          >
            <Text style={[styles.filterText, filter === 'overdue' && styles.activeFilterText]}>
              Overdue
            </Text>
          </TouchableOpacity>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : getFilteredImmunizations().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#e9ecef" />
            <Text style={styles.emptyText}>No due immunizations found</Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredImmunizations()}
            keyExtractor={(item, index) => `${item.patientId}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor
