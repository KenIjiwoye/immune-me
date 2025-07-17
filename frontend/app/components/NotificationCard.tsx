import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

type NotificationCardProps = {
  notification: {
    id: number;
    patientName: string;
    vaccineName: string;
    dueDate: string;
    status: 'pending' | 'viewed' | 'completed' | 'overdue';
  };
  onPress: () => void;
};

export default function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'viewed':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'overdue':
        return '#F44336';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'viewed':
        return 'eye-outline';
      case 'completed':
        return 'checkmark-circle-outline';
      case 'overdue':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formattedDate = format(new Date(notification.dueDate), 'MMM d, yyyy');
  const statusColor = getStatusColor(notification.status);
  const statusIcon = getStatusIcon(notification.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.patientName}>{notification.patientName}</Text>
        <Text style={styles.vaccineName}>{notification.vaccineName}</Text>
        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#6c757d" />
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
          <View style={[styles.statusContainer, { backgroundColor: `${statusColor}20` }]}>
            <Ionicons name={statusIcon as any} size={14} color={statusColor} />
            <Text style={[styles.status, { color: statusColor }]}>
              {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vaccineName: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status: {
    fontSize: 12,
    marginLeft: 4,
  },
  arrow: {
    marginLeft: 8,
  },
});