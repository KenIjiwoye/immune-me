import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ThemeOption = 'light' | 'dark' | 'auto';

interface ThemeSelectorProps {
  selectedTheme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
}

export default function ThemeSelector({ selectedTheme, onThemeChange }: ThemeSelectorProps) {
  const themes: { value: ThemeOption; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'auto', label: 'Auto', icon: 'phone-portrait-outline' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Theme</Text>
      <View style={styles.themeOptions}>
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme.value}
            style={[
              styles.themeOption,
              selectedTheme === theme.value && styles.selectedTheme,
            ]}
            onPress={() => onThemeChange(theme.value)}
          >
            <Ionicons
              name={theme.icon as any}
              size={24}
              color={selectedTheme === theme.value ? '#fff' : '#007bff'}
            />
            <Text
              style={[
                styles.themeLabel,
                selectedTheme === theme.value && styles.selectedThemeLabel,
              ]}
            >
              {theme.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212529',
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectedTheme: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  themeLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#007bff',
  },
  selectedThemeLabel: {
    color: '#fff',
  },
});