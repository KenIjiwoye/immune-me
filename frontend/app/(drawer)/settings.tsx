import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import SettingsToggle from '../components/SettingsToggle';
import ThemeSelector from '../components/ThemeSelector';

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
  language: z.string(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsScreen() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  const { control, setValue, watch } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      language: 'en',
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await api.get(`/users/${user.id}/settings`);
      return response.data;
    },
    enabled: !!user?.id && isAuthenticated,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return api.post(`/users/${user?.id}/settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', user?.id] });
    },
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (settings) {
      setValue('theme', settings.theme || 'light');
      setValue('notifications', {
        email: settings.notifications?.email ?? true,
        push: settings.notifications?.push ?? true,
        sms: settings.notifications?.sms ?? false,
      });
      setValue('language', settings.language || 'en');
    }
  }, [isAuthenticated, settings, setValue]);

  const handleSettingChange = (field: keyof SettingsFormData, value: string | SettingsFormData['notifications']) => {
    setValue(field, value);
    const currentValues = watch();
    updateSettingsMutation.mutate(currentValues);
  };

  const handleNotificationChange = (type: keyof SettingsFormData['notifications'], value: boolean) => {
    const currentNotifications = watch('notifications');
    const newNotifications = { ...currentNotifications, [type]: value };
    setValue('notifications', newNotifications);
    updateSettingsMutation.mutate({ ...watch(), notifications: newNotifications });
  };

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <Controller
              control={control}
              name="theme"
              render={({ field: { value } }) => (
                <ThemeSelector
                  selectedTheme={value}
                  onThemeChange={(theme) => handleSettingChange('theme', theme)}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <Controller
              control={control}
              name="notifications"
              render={({ field: { value } }) => (
                <>
                  <SettingsToggle
                    label="Email Notifications"
                    description="Receive updates via email"
                    value={value.email}
                    onValueChange={(val) => handleNotificationChange('email', val)}
                    icon="mail-outline"
                  />
                  <SettingsToggle
                    label="Push Notifications"
                    description="Receive push notifications"
                    value={value.push}
                    onValueChange={(val) => handleNotificationChange('push', val)}
                    icon="notifications-outline"
                  />
                  <SettingsToggle
                    label="SMS Notifications"
                    description="Receive SMS updates"
                    value={value.sms}
                    onValueChange={(val) => handleNotificationChange('sms', val)}
                    icon="chatbubble-outline"
                  />
                </>
              )}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={() => router.push('/profile')}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="person-outline" size={24} color="#007bff" />
                <Text style={styles.settingLabel}>Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>
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
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});
