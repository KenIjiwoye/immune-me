
# SMS-08: Frontend SMS Integration

## Context
This task implements comprehensive frontend integration for SMS functionality in the React Native mobile application. It includes SMS status display, patient consent management, administrative SMS controls, and real-time status updates. The frontend provides healthcare workers with intuitive interfaces to manage SMS communications while giving patients control over their SMS preferences.

## Dependencies
- [`SMS-07`](SMS-07-patient-consent.md): Patient consent management system must be implemented
- [`SMS-05`](SMS-05-webhook-tracking.md): Webhook status tracking for real-time updates
- [`FE-01`](../frontend/FE-01-authentication-flow.md): Authentication flow must be in place

## Requirements

### 1. SMS Status Display Components
Create components to display SMS delivery status, message history, and real-time status updates in patient records and notification views.

### 2. Patient Consent Interface
Implement user-friendly interfaces for managing patient SMS consent, preferences, and opt-out functionality.

### 3. Administrative SMS Management
Develop administrative interfaces for bulk SMS operations, template management, and system monitoring.

### 4. Real-time Status Updates
Implement real-time SMS status updates using WebSocket connections or polling mechanisms.

### 5. SMS Analytics Dashboard
Create dashboard components showing SMS delivery statistics, consent rates, and system performance metrics.

### 6. Mobile-Optimized UI
Ensure all SMS interfaces are optimized for mobile devices with responsive design and touch-friendly interactions.

## Code Examples

### SMS Status Component

```typescript
// frontend/app/components/SMSStatusCard.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DateTime } from 'luxon'

interface SMSMessage {
  id: number
  messageType: string
  messageContent: string
  status: string
  deliveryStatus?: string
  scheduledAt: string
  sentAt?: string
  deliveredAt?: string
  failedAt?: string
  retryCount: number
}

interface SMSStatusCardProps {
  patientId: number
  notificationId?: number
  onRefresh?: () => void
}

export default function SMSStatusCard({ patientId, notificationId, onRefresh }: SMSStatusCardProps) {
  const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadSMSMessages()
  }, [patientId, notificationId])

  const loadSMSMessages = async () => {
    try {
      const params = new URLSearchParams({
        patientId: patientId.toString(),
        ...(notificationId && { notificationId: notificationId.toString() })
      })

      const response = await fetch(`/api/sms/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSmsMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load SMS messages:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSMSMessages()
    onRefresh?.()
  }

  const getStatusIcon = (status: string, deliveryStatus?: string) => {
    switch (status) {
      case 'pending':
        return <Ionicons name="time-outline" size={16} color="#ffc107" />
      case 'sent':
        return <Ionicons name="checkmark-outline" size={16} color="#28a745" />
      case 'delivered':
        return <Ionicons name="checkmark-done-outline" size={16} color="#28a745" />
      case 'failed':
        return <Ionicons name="close-outline" size={16} color="#dc3545" />
      case 'cancelled':
        return <Ionicons name="ban-outline" size={16} color="#6c757d" />
      default:
        return <Ionicons name="help-outline" size={16} color="#6c757d" />
    }
  }

  const getStatusText = (message: SMSMessage) => {
    switch (message.status) {
      case 'pending':
        return `Scheduled for ${DateTime.fromISO(message.scheduledAt).toFormat('MMM dd, HH:mm')}`
      case 'sent':
        return `Sent ${DateTime.fromISO(message.sentAt!).toFormat('MMM dd, HH:mm')}`
      case 'delivered':
        return `Delivered ${DateTime.fromISO(message.deliveredAt!).toFormat('MMM dd, HH:mm')}`
      case 'failed':
        return `Failed ${DateTime.fromISO(message.failedAt!).toFormat('MMM dd, HH:mm')}`
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'Unknown status'
    }
  }

  const getReminderTypeLabel = (messageType: string) => {
    switch (messageType) {
      case '7_day_reminder':
        return '7-Day Reminder'
      case '1_day_reminder':
        return '1-Day Reminder'
      case 'overdue_reminder':
        return 'Overdue Reminder'
      default:
        return messageType
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007bff" />
        <Text style={styles.loadingText}>Loading SMS status...</Text>
      </View>
    )
  }

  if (smsMessages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={24} color="#6c757d" />
        <Text style={styles.emptyText}>No SMS messages</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SMS Reminders</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons 
            name="refresh-outline" 
            size={20} 
            color="#007bff" 
            style={refreshing ? styles.rotating : undefined}
          />
        </TouchableOpacity>
      </View>

      {smsMessages.map((message) => (
        <View key={message.id} style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <Text style={styles.reminderType}>
              {getReminderTypeLabel(message.messageType)}
            </Text>
            <View style={styles.statusContainer}>
              {getStatusIcon(message.status, message.deliveryStatus)}
              <Text style={styles.statusText}>
                {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={styles.messageContent} numberOfLines={2}>
            {message.messageContent}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={styles.timestampText}>
              {getStatusText(message)}
            </Text>
            {message.retryCount > 0 && (
              <Text style={styles.retryText}>
                Retried {message.retryCount} time{message.retryCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  loadingText: {
    marginLeft: 8,
    color: '#6c757d'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  emptyText: {
    marginTop: 8,
    color: '#6c757d'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  rotating: {
    // Add rotation animation if needed
  },
  messageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  reminderType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#6c757d'
  },
  messageContent: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 8,
    lineHeight: 18
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timestampText: {
    fontSize: 11,
    color: '#6c757d'
  },
  retryText: {
    fontSize: 11,
    color: '#ffc107',
    fontStyle: 'italic'
  }
})

// Helper function (would be implemented elsewhere)
function getAuthToken(): string {
  // Implementation to get auth token
  return ''
}
```

### SMS Consent Management Screen

```typescript
// frontend/app/(drawer)/patients/[id]/sms-consent.tsx
import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ActivityIndicator 
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

interface ConsentStatus {
  hasConsent: boolean
  consentDetails: Array<{
    id: number
    consentGiven: boolean
    consentDate: string
    consentMethod: string
    optedOut: boolean
    optOutDate?: string
  }>
  preferences: {
    smsEnabled: boolean
    preferredTime?: string
    languagePreference?: string
    reminderTypes?: string[]
  }
  lastActivity?: string
}

export default function SMSConsentScreen() {
  const { id: patientId } = useLocalSearchParams()
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadConsentStatus()
  }, [patientId])

  const loadConsentStatus = async () => {
    try {
      const response = await fetch(`/api/sms/consent/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConsentStatus(data)
      }
    } catch (error) {
      console.error('Failed to load consent status:', error)
      Alert.alert('Error', 'Failed to load SMS consent status')
    } finally {
      setLoading(false)
    }
  }

  const updateConsent = async (consentGiven: boolean) => {
    setUpdating(true)

    try {
      const response = await fetch('/api/sms/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          patientId: Number(patientId),
          phoneNumber: getPatientPhone(), // Would get from patient data
          consentGiven,
          consentMethod: 'web_form'
        })
      })

      if (response.ok) {
        await loadConsentStatus()
        Alert.alert(
          'Success', 
          `SMS consent ${consentGiven ? 'granted' : 'revoked'} successfully`
        )
      } else {
        throw new Error('Failed to update consent')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update SMS consent')
    } finally {
      setUpdating(false)
    }
  }

  const handleConsentToggle = (value: boolean) => {
    if (!value) {
      Alert.alert(
        'Revoke SMS Consent',
        'Are you sure you want to revoke SMS consent? The patient will no longer receive vaccination reminders via text message.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Revoke', 
            style: 'destructive',
            onPress: () => updateConsent(false)
          }
        ]
      )
    } else {
      updateConsent(true)
    }
  }

  const updatePreferences = async (preferences: any) => {
    setUpdating(true)

    try {
      const response = await fetch(`/api/sms/consent/${patientId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        await loadConsentStatus()
        Alert.alert('Success', 'SMS preferences updated successfully')
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update SMS preferences')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading consent status...</Text>
      </View>
    )
  }

  if (!consentStatus) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
        <Text style={styles.errorText}>Failed to load consent status</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadConsentStatus}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.title}>SMS Consent Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.consentSection}>
        <View style={styles.consentCard}>
          <View style={styles.consentHeader}>
            <Text style={styles.sectionTitle}>SMS Notifications</Text>
            <Switch
              value={consentStatus.hasConsent}
              onValueChange={handleConsentToggle}
              disabled={updating}
            />
          </View>

          <Text style={styles.consentDescription}>
            Allow SMS reminders for vaccination appointments. Patient can opt out at any time by replying STOP.
          </Text>

          {consentStatus.hasConsent && (
            <View style={styles.preferencesSection}>
              <Text style={styles.preferencesTitle}>Notification Preferences</Text>
              
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Reminder Types</Text>
                <View style={styles.reminderTypes}>
                  {['7-Day Notice', '1-Day Notice', 'Overdue Alert'].map((type, index) => (
                    <View key={index} style={styles.reminderTypeChip}>
                      <Text style={styles.reminderTypeText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Preferred Time</Text>
                <Text style={styles.preferenceValue}>
                  {consentStatus.preferences.preferredTime || '9:00 AM'}
                </Text>
              </View>

              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Language</Text>
                <Text style={styles.preferenceValue}>
                  {consentStatus.preferences.languagePreference === 'en' ? 'English' : 'French'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Consent History</Text>
        
        {consentStatus.consentDetails.map((detail, index) => (
          <View key={detail.id} style={styles.historyItem}>
            <View style={styles.historyHeader}>
              <View style={styles.historyStatus}>
                <Ionicons 
                  name={detail.consentGiven ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={detail.consentGiven ? "#28a745" : "#dc3545"} 
                />
                <Text style={styles.historyStatusText}>
                  {detail.consentGiven ? 'Consent Given' : 'Consent Revoked'}
                </Text>
              </View>
              <Text style={styles.historyDate}>
                {new Date(detail.consentDate).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.historyMethod}>
              Method: {detail.consentMethod.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.legalSection}>
        <Text style={styles.legalTitle}>Privacy Notice</Text>
        <Text style={styles.legalText}>
          Phone numbers are used only for vaccination reminders. We do not share patient information with third parties. 
          Standard message and data rates may apply. Patients can opt out at any time by replying STOP to any message.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  consentSection: {
    padding: 16
  },
  consentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  consentDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 16
  },
  preferencesSection: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12
  },
  preferenceItem: {
    marginBottom: 12
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4
  },
  preferenceValue: {
    fontSize: 14,
    color: '#333'
  },
  reminderTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  reminderTypeChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4
  },
  reminderTypeText: {
    fontSize: 12,
    color: '#1976d2'
  },
  historySection: {
    padding: 16
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  historyStatusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500'
  },
  historyDate: {
    fontSize: 12,
    color: '#6c757d'
  },
  historyMethod: {
    fontSize: 12,
    color: '#6c757d'
  },
  legalSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8
  },
  legalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  legalText: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16
  }
})

// Helper functions (would be implemented elsewhere)
function getAuthToken(): string {
  return ''
}

function getPatientPhone(): string {
  return ''
}
```

### SMS Analytics Dashboard Component

```typescript
// frontend/app/components/SMSAnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface SMSAnalytics {
  totalSent: number
  delivered: number
  failed: number
  pending: number
  deliveryRate: number
  consentRate: number
  optOutRate: number
  recentActivity: Array<{
    type: string
    count: number
    timestamp: string
  }>
}

interface SMSAnalyticsDashboardProps {
  facilityId?: number
  timeframe?: 'day' | 'week' | 'month'
}

export default function SMSAnalyticsDashboard({ facilityId, timeframe = 'day' }: SMSAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<SMSAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  useEffect(() => {
    loadAnalytics()
  }, [facilityId, selectedTimeframe])

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        timeframe: selectedTimeframe,
        ...(facilityId && { facilityId: facilityId.toString() })
      })

      const response = await fetch(`/api/sms/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to load SMS analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon, color }: {
    title: string
    value: string | number
    subtitle?: string
    icon: string
    color: string
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading SMS analytics...</Text>
      </View>
    )
  }

  if (!analytics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SMS Analytics</Text>
        <View style={styles.timeframeSelector}>
          {['day', 'week', 'month'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timeframeButton,
                selectedTimeframe === period && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe(period as any)}
            >
              <Text style={[
                styles.timeframeButtonText,
                selectedTimeframe === period && styles.timeframeButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Messages Sent"
          value={analytics.totalSent.toLocaleString()}
          icon="send-outline"
          color="#007bff"
        />
        <StatCard
          title="Delivered"
          value={analytics.delivered.toLocaleString()}
          subtitle={`${analytics.deliveryRate.toFixed(1)}% delivery rate`}
          icon="checkmark-done-outline"
          color="#28a745"
        />
        <StatCard
          title="Failed"
          value={analytics.failed.toLocaleString()}
          icon="close-outline"
          color="#dc3545"
        />
        <StatCard
          title="Pending"
          value={analytics.pending.toLocaleString()}
          icon="time-outline"
          color="#ffc107"
        />
      </View>

      <View style={styles.consentSection}>
        <Text style={styles.sectionTitle}>Consent Management</Text>
        <View style={styles.consentStats}>
          <View style={styles.consentStat}>
            <Text style={styles.consentValue}>{analytics.consentRate.toFixed(1)}%</Text>
            <Text style={styles.consentLabel}>Consent Rate</Text>
          </View>
          <View style={styles.consentStat}>
            <Text style={styles.consentValue}>{analytics.optOutRate.toFixed(1)}%</Text>
            <Text style={styles.consentLabel}>Opt-out Rate</Text>
          </View>
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {analytics.recentActivity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <Text style={styles.activityType}>{activity.type}</Text>
            <Text style={styles.activityCount}>{activity.count}</Text>
            <Text style={styles.activityTime}>
              {new Date(activity.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: '#dc3545'
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 2
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius:
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4
  },
  timeframeButtonActive: {
    backgroundColor: '#007bff'
  },
  timeframeButtonText: {
    fontSize: 14,
    color: '#6c757d'
  },
  timeframeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statTitle: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4
  },
  consentSection: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  consentStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16
  },
  consentStat: {
    flex: 1,
    alignItems: 'center'
  },
  consentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff'
  },
  consentLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4
  },
  activitySection: {
    padding: 16
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8
  },
  activityType: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  activityCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginRight: 12
  },
  activityTime: {
    fontSize: 12,
    color: '#6c757d'
  }
})

// Helper function (would be implemented elsewhere)
function getAuthToken(): string {
  return ''
}
```

## Acceptance Criteria

1. **SMS Status Display**: Real-time SMS delivery status shown in patient records and notifications
2. **Patient Consent Interface**: User-friendly consent management with clear opt-in/opt-out functionality
3. **Administrative Controls**: Comprehensive SMS management interfaces for healthcare staff
4. **Real-time Updates**: Live status updates using WebSocket or polling mechanisms
5. **Analytics Dashboard**: Visual analytics showing SMS performance and consent metrics
6. **Mobile Optimization**: All interfaces optimized for mobile devices with touch-friendly design
7. **Error Handling**: Comprehensive error handling with user-friendly error messages
8. **Accessibility**: Interfaces comply with accessibility standards for healthcare applications
9. **Performance**: Efficient loading and smooth interactions even with large datasets
10. **Integration**: Seamless integration with existing patient management workflows

## Implementation Notes

### Mobile-First Design
- Design all interfaces with mobile devices as the primary target
- Use touch-friendly button sizes and spacing
- Implement responsive layouts that work on various screen sizes
- Optimize for one-handed operation where possible

### Real-time Updates
- Implement WebSocket connections for real-time SMS status updates
- Use polling as fallback for environments without WebSocket support
- Provide visual indicators for real-time data updates
- Handle connection failures gracefully

### User Experience
- Provide clear visual feedback for all user actions
- Use consistent design patterns across all SMS-related interfaces
- Implement loading states and skeleton screens for better perceived performance
- Include helpful tooltips and contextual help

### Performance Optimization
- Implement efficient data loading with pagination
- Use caching strategies for frequently accessed data
- Optimize image and asset loading
- Implement lazy loading for large lists

### Error Handling
- Provide meaningful error messages for different failure scenarios
- Implement retry mechanisms for failed operations
- Show offline indicators when network is unavailable
- Gracefully handle API timeouts and server errors

## Testing Requirements

### Unit Testing
- Test all React Native components with various props and states
- Validate form validation and user input handling
- Test error handling scenarios and edge cases
- Verify accessibility features and screen reader compatibility

### Integration Testing
- Test API integration with backend SMS services
- Verify real-time update functionality
- Test consent management workflow end-to-end
- Validate analytics data accuracy and display

### User Acceptance Testing
- Test with healthcare workers in realistic scenarios
- Validate consent management workflow with patients
- Test on various mobile devices and screen sizes
- Verify accessibility with assistive technologies

### Performance Testing
- Test with large datasets and high user loads
- Validate smooth scrolling and interaction performance
- Test memory usage and potential memory leaks
- Measure and optimize app startup and navigation times

## Related Documentation

- **Patient Consent Management**: [`SMS-07-patient-consent.md`](SMS-07-patient-consent.md)
- **Webhook & Status Tracking**: [`SMS-05-webhook-tracking.md`](SMS-05-webhook-tracking.md)
- **Authentication Flow**: [`../frontend/FE-01-authentication-flow.md`](../frontend/FE-01-authentication-flow.md)
- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)