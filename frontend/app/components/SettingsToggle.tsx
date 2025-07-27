import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
  disabled?: boolean;
}

export default function SettingsToggle({
  label,
  description,
  value,
  onValueChange,
  icon,
  disabled = false,
}: SettingsToggleProps) {
  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.content}>
        {icon && (
          <Ionicons name={icon as any} size={24} color="#007bff" style={styles.icon} />
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
          {description && (
            <Text style={[styles.description, disabled && styles.disabledText]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#767577', true: '#007bff' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#6c757d',
  },
});