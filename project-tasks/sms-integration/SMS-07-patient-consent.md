# SMS-07: Patient Consent & Preferences

## Context
This task implements a comprehensive patient consent and preference management system for SMS communications, ensuring HIPAA compliance and healthcare regulations adherence. The system manages opt-in/opt-out functionality, consent tracking, communication preferences, and provides patients with full control over their SMS notifications while maintaining complete audit trails.

## Dependencies
- [`SMS-01`](SMS-01-database-schema.md): SMS consent table must be created
- [`SMS-02`](SMS-02-sms-service-layer.md): SMS consent service integration required
- [`SMS-05`](SMS-05-webhook-tracking.md): Inbound message handling for STOP requests

## Requirements

### 1. Consent Management System
Create a comprehensive consent management system that tracks patient SMS preferences, consent methods, and opt-out requests with full audit trails.

### 2. Patient Preference Interface
Implement user-friendly interfaces for patients to manage their SMS preferences, including opt-in/opt-out functionality and communication timing preferences.

### 3. HIPAA Compliance Features
Ensure all consent management features comply with HIPAA regulations, including secure data handling, audit logging, and patient rights management.

### 4. Automated Consent Validation
Implement automated consent validation before sending any SMS messages, with real-time checking and preference enforcement.

### 5. Bulk Consent Management
Provide administrative tools for bulk consent management, import/export functionality, and consent status reporting.

### 6. Legal Documentation
Create proper legal documentation, consent forms, and privacy notices for SMS communications.

## Code Examples

### Enhanced SMS Consent Service

```typescript
// backend/app/services/sms_consent_service.ts (enhanced)
import { DateTime } from 'luxon'
import SMSConsent from '#models/sms_consent'
import Patient from '#models/patient'
import User from '#models/user'
import Logger from '@adonisjs/core/logger'

export interface ConsentData {
  patientId: number
  phoneNumber: string
  consentGiven: boolean
  consentMethod: 'registration' | 'verbal' | 'written' | 'sms_reply' | 'web_form'
  userId?: number
  consentDetails?: string
  witnessName?: string
}

export interface ConsentPreferences {
  smsEnabled: boolean
  preferredTime?: string // HH:MM format
  timeZone?: string
  languagePreference?: string
  reminderTypes?: string[] // ['7_day', '1_day', 'overdue']
}

export default class SMSConsentService {
  /**
   * Record comprehensive patient SMS consent
   */
  public async recordConsent(data: ConsentData): Promise<SMSConsent> {
    const existingConsent = await SMSConsent.findByPatientAndPhone(
      data.patientId,
      data.phoneNumber
    )

    const consentData = {
      patientId: data.patientId,
      phoneNumber: data.phoneNumber,
      consentGiven: data.consentGiven,
      consentDate: data.consentGiven ? DateTime.now() : null,
      consentMethod: data.consentMethod,
      consentDetails: data.consentDetails,
      witnessName: data.witnessName,
      optedOut: !data.consentGiven,
      optOutDate: !data.consentGiven ? DateTime.now() : null,
      optOutMethod: !data.consentGiven ? data.consentMethod : null,
      createdBy: data.userId,
      updatedBy: data.userId
    }

    let consent: SMSConsent

    if (existingConsent) {
      // Update existing consent
      consent = await existingConsent.merge(consentData).save()
      Logger.info(`Updated SMS consent for patient ${data.patientId}: ${data.consentGiven}`)
    } else {
      // Create new consent record
      consent = await SMSConsent.create(consentData)
      Logger.info(`Created SMS consent for patient ${data.patientId}: ${data.consentGiven}`)
    }

    // Update patient SMS preferences
    await this.updatePatientSMSPreferences(data.patientId, data.consentGiven)

    // Log consent change for audit
    await this.logConsentChange(consent, data.consentMethod, data.userId)

    return consent
  }

  /**
   * Update patient SMS preferences
   */
  public async updatePatientPreferences(
    patientId: number,
    preferences: ConsentPreferences,
    userId?: number
  ): Promise<void> {
    const patient = await Patient.findOrFail(patientId)

    await patient.merge({
      smsPreferred: preferences.smsEnabled,
      preferredLanguage: preferences.languagePreference || patient.preferredLanguage
    }).save()

    // Store additional preferences in custom data
    if (preferences.preferredTime || preferences.timeZone || preferences.reminderTypes) {
      await this.storePreferenceData(patientId, preferences, userId)
    }

    Logger.info(`Updated SMS preferences for patient ${patientId}`)
  }

  /**
   * Get comprehensive consent status for patient
   */
  public async getConsentStatus(patientId: number): Promise<{
    hasConsent: boolean
    consentDetails: SMSConsent[]
    preferences: ConsentPreferences
    lastActivity: DateTime | null
  }> {
    const consents = await SMSConsent.query()
      .where('patient_id', patientId)
      .orderBy('created_at', 'desc')

    const activeConsent = consents.find(c => c.hasValidConsent())
    const patient = await Patient.findOrFail(patientId)

    // Get stored preferences
    const preferences = await this.getStoredPreferences(patientId)

    return {
      hasConsent: !!activeConsent,
      consentDetails: consents,
      preferences: {
        smsEnabled: patient.smsPreferred,
        languagePreference: patient.preferredLanguage,
        ...preferences
      },
      lastActivity: consents[0]?.updatedAt || null
    }
  }

  /**
   * Handle bulk consent import
   */
  public async bulkImportConsent(
    consentData: Array<{
      patientId: number
      phoneNumber: string
      consentGiven: boolean
      consentMethod: string
      consentDate?: string
    }>,
    userId: number
  ): Promise<{ imported: number; errors: Array<{ patientId: number; error: string }> }> {
    const results = { imported: 0, errors: [] }

    for (const data of consentData) {
      try {
        await this.recordConsent({
          patientId: data.patientId,
          phoneNumber: data.phoneNumber,
          consentGiven: data.consentGiven,
          consentMethod: data.consentMethod as any,
          userId
        })
        results.imported++
      } catch (error) {
        results.errors.push({
          patientId: data.patientId,
          error: error.message
        })
        Logger.error(`Failed to import consent for patient ${data.patientId}:`, error)
      }
    }

    Logger.info(`Bulk consent import completed: ${results.imported} imported, ${results.errors.length} errors`)
    return results
  }

  /**
   * Generate consent report
   */
  public async generateConsentReport(facilityId?: number): Promise<{
    totalPatients: number
    consentedPatients: number
    optedOutPatients: number
    pendingConsent: number
    consentByMethod: Record<string, number>
    recentActivity: Array<{
      patientId: number
      patientName: string
      action: string
      date: DateTime
      method: string
    }>
  }> {
    let patientsQuery = Patient.query()
    
    if (facilityId) {
      patientsQuery = patientsQuery.where('facility_id', facilityId)
    }

    const totalPatients = await patientsQuery.count('* as total').first()
    const total = Number(totalPatients?.total || 0)

    // Get consent statistics
    const consentStats = await SMSConsent.query()
      .select('consent_given', 'opted_out', 'consent_method')
      .count('* as count')
      .groupBy('consent_given', 'opted_out', 'consent_method')

    let consented = 0
    let optedOut = 0
    const consentByMethod: Record<string, number> = {}

    for (const stat of consentStats) {
      const count = Number(stat.count)
      
      if (stat.consentGiven && !stat.optedOut) {
        consented += count
      } else if (stat.optedOut) {
        optedOut += count
      }

      consentByMethod[stat.consentMethod] = (consentByMethod[stat.consentMethod] || 0) + count
    }

    const pendingConsent = total - consented - optedOut

    // Get recent activity
    const recentActivity = await SMSConsent.query()
      .preload('patient')
      .orderBy('updated_at', 'desc')
      .limit(10)

    const activityData = recentActivity.map(consent => ({
      patientId: consent.patientId,
      patientName: consent.patient.fullName,
      action: consent.consentGiven ? 'Opted In' : 'Opted Out',
      date: consent.updatedAt,
      method: consent.consentMethod || 'Unknown'
    }))

    return {
      totalPatients: total,
      consentedPatients: consented,
      optedOutPatients: optedOut,
      pendingConsent,
      consentByMethod,
      recentActivity: activityData
    }
  }

  /**
   * Validate consent before SMS sending
   */
  public async validateConsentForSending(
    patientId: number,
    phoneNumber: string
  ): Promise<{
    canSend: boolean
    reason?: string
    consentDetails?: SMSConsent
  }> {
    const consent = await SMSConsent.findByPatientAndPhone(patientId, phoneNumber)

    if (!consent) {
      return {
        canSend: false,
        reason: 'No consent record found'
      }
    }

    if (!consent.hasValidConsent()) {
      return {
        canSend: false,
        reason: consent.optedOut ? 'Patient has opted out' : 'Consent not given',
        consentDetails: consent
      }
    }

    // Check if consent is recent enough (optional business rule)
    const consentAge = DateTime.now().diff(consent.consentDate || DateTime.now(), 'days').days
    if (consentAge > 365) { // 1 year consent expiry
      return {
        canSend: false,
        reason: 'Consent has expired (over 1 year old)',
        consentDetails: consent
      }
    }

    return {
      canSend: true,
      consentDetails: consent
    }
  }

  /**
   * Handle automated opt-out from STOP messages
   */
  public async handleAutomatedOptOut(phoneNumber: string): Promise<{
    processed: number
    patients: Array<{ patientId: number; patientName: string }>
  }> {
    const consents = await SMSConsent.query()
      .where('phone_number', phoneNumber)
      .where('consent_given', true)
      .where('opted_out', false)
      .preload('patient')

    const results = {
      processed: 0,
      patients: []
    }

    for (const consent of consents) {
      await consent.merge({
        optedOut: true,
        optOutDate: DateTime.now(),
        optOutMethod: 'sms_stop'
      }).save()

      // Update patient SMS preference
      await this.updatePatientSMSPreferences(consent.patientId, false)

      // Cancel pending SMS messages
      await this.cancelPendingSMSMessages(consent.patientId, phoneNumber)

      results.processed++
      results.patients.push({
        patientId: consent.patientId,
        patientName: consent.patient.fullName
      })

      Logger.info(`Automated opt-out processed for patient ${consent.patientId} via STOP message`)
    }

    return results
  }

  // Private helper methods
  private async updatePatientSMSPreferences(patientId: number, enabled: boolean): Promise<void> {
    const patient = await Patient.find(patientId)
    if (patient) {
      await patient.merge({ smsPreferred: enabled }).save()
    }
  }

  private async logConsentChange(
    consent: SMSConsent,
    method: string,
    userId?: number
  ): Promise<void> {
    // This could be implemented with a dedicated audit log table
    Logger.info(`Consent change logged: Patient ${consent.patientId}, Method: ${method}, User: ${userId}`)
  }

  private async storePreferenceData(
    patientId: number,
    preferences: ConsentPreferences,
    userId?: number
  ): Promise<void> {
    // Store additional preferences in a custom data table or JSON field
    // Implementation would depend on chosen storage method
  }

  private async getStoredPreferences(patientId: number): Promise<Partial<ConsentPreferences>> {
    // Retrieve stored preferences
    return {}
  }

  private async cancelPendingSMSMessages(patientId: number, phoneNumber: string): Promise<void> {
    const { default: SMSMessage } = await import('#models/sms_message')
    
    await SMSMessage.query()
      .where('patient_id', patientId)
      .where('phone_number', phoneNumber)
      .where('status', 'pending')
      .update({
        status: 'cancelled',
        error_message: 'Patient opted out via STOP message'
      })
  }
}
```

### Consent Management Controller

```typescript
// backend/app/controllers/sms_consent_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import SMSConsentService from '#services/sms_consent_service'
import Patient from '#models/patient'

export default class SMSConsentController {
  private consentService: SMSConsentService

  constructor() {
    this.consentService = new SMSConsentService()
  }

  /**
   * Get consent status for a patient
   */
  public async show({ params, response }: HttpContext) {
    const patientId = params.id
    const consentStatus = await this.consentService.getConsentStatus(patientId)
    
    return response.json(consentStatus)
  }

  /**
   * Record patient consent
   */
  public async store({ request, response, auth }: HttpContext) {
    const data = request.only([
      'patientId',
      'phoneNumber',
      'consentGiven',
      'consentMethod',
      'consentDetails',
      'witnessName'
    ])

    const consent = await this.consentService.recordConsent({
      ...data,
      userId: auth.user?.id
    })

    return response.status(201).json(consent)
  }

  /**
   * Update patient SMS preferences
   */
  public async updatePreferences({ params, request, response, auth }: HttpContext) {
    const patientId = params.id
    const preferences = request.only([
      'smsEnabled',
      'preferredTime',
      'timeZone',
      'languagePreference',
      'reminderTypes'
    ])

    await this.consentService.updatePatientPreferences(
      patientId,
      preferences,
      auth.user?.id
    )

    return response.json({ message: 'Preferences updated successfully' })
  }

  /**
   * Bulk import consent data
   */
  public async bulkImport({ request, response, auth }: HttpContext) {
    const { consentData } = request.only(['consentData'])

    if (!Array.isArray(consentData)) {
      return response.status(400).json({ error: 'consentData must be an array' })
    }

    const results = await this.consentService.bulkImportConsent(
      consentData,
      auth.user?.id
    )

    return response.json(results)
  }

  /**
   * Generate consent report
   */
  public async report({ request, response }: HttpContext) {
    const facilityId = request.input('facilityId')
    const report = await this.consentService.generateConsentReport(facilityId)
    
    return response.json(report)
  }

  /**
   * Handle opt-out request
   */
  public async optOut({ request, response }: HttpContext) {
    const { phoneNumber } = request.only(['phoneNumber'])

    if (!phoneNumber) {
      return response.status(400).json({ error: 'Phone number is required' })
    }

    const results = await this.consentService.handleAutomatedOptOut(phoneNumber)
    
    return response.json(results)
  }
}
```

### Patient Consent Form Component

```typescript
// frontend/app/components/PatientConsentForm.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { Picker } from '@react-native-picker/picker'

interface ConsentFormProps {
  patientId: number
  onConsentUpdate: (consent: boolean) => void
}

export default function PatientConsentForm({ patientId, onConsentUpdate }: ConsentFormProps) {
  const [consentGiven, setConsentGiven] = useState(false)
  const [consentMethod, setConsentMethod] = useState('verbal')
  const [preferences, setPreferences] = useState({
    smsEnabled: false,
    preferredTime: '09:00',
    languagePreference: 'en',
    reminderTypes: ['7_day', '1_day', 'overdue']
  })
  const [loading, setLoading] = useState(false)

  const handleConsentChange = async (value: boolean) => {
    setConsentGiven(value)
    
    if (!value) {
      // If opting out, show confirmation
      Alert.alert(
        'Opt Out Confirmation',
        'Are you sure you want to opt out of SMS reminders? You will no longer receive vaccination reminders via text message.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Opt Out', 
            style: 'destructive',
            onPress: () => saveConsent(false)
          }
        ]
      )
    } else {
      saveConsent(true)
    }
  }

  const saveConsent = async (consent: boolean) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/sms/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          patientId,
          phoneNumber: getPatientPhone(),
          consentGiven: consent,
          consentMethod
        })
      })

      if (response.ok) {
        onConsentUpdate(consent)
        Alert.alert('Success', `SMS consent ${consent ? 'granted' : 'revoked'} successfully`)
      } else {
        throw new Error('Failed to update consent')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update SMS consent. Please try again.')
      setConsentGiven(!consent) // Revert the change
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async () => {
    setLoading(true)
    
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
        Alert.alert('Success', 'SMS preferences updated successfully')
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update SMS preferences. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Notification Consent</Text>
      
      <View style={styles.consentSection}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Receive SMS Reminders</Text>
          <Switch
            value={consentGiven}
            onValueChange={handleConsentChange}
            disabled={loading}
          />
        </View>
        
        <Text style={styles.description}>
          By enabling SMS reminders, you consent to receive text messages about upcoming vaccinations. 
          You can opt out at any time by replying STOP to any message.
        </Text>
      </View>

      {consentGiven && (
        <View style={styles.preferencesSection}>
          <Text style={styles.sectionTitle}>SMS Preferences</Text>
          
          <View style={styles.preferenceRow}>
            <Text style={styles.label}>Preferred Time</Text>
            <Picker
              selectedValue={preferences.preferredTime}
              onValueChange={(value) => setPreferences({...preferences, preferredTime: value})}
              style={styles.picker}
            >
              <Picker.Item label="9:00 AM" value="09:00" />
              <Picker.Item label="12:00 PM" value="12:00" />
              <Picker.Item label="2:00 PM" value="14:00" />
              <Picker.Item label="5:00 PM" value="17:00" />
            </Picker>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.label}>Language</Text>
            <Picker
              selectedValue={preferences.languagePreference}
              onValueChange={(value) => setPreferences({...preferences, languagePreference: value})}
              style={styles.picker}
            >
              <Picker.Item label="English" value="en" />
              <Picker.Item label="French" value="fr" />
            </Picker>
          </View>

          <TouchableOpacity 
            style={styles.updateButton}
            onPress={updatePreferences}
            disabled={loading}
          >
            <Text style={styles.updateButtonText}>Update Preferences</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.legalSection}>
        <Text style={styles.legalText}>
          Your phone number will be used only for vaccination reminders. 
          We will not share your information with third parties. 
          Standard message and data rates may apply.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  consentSection: {
    marginBottom: 20
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  label: {
    fontSize: 16,
    fontWeight: '500'
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  preferencesSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  preferenceRow: {
    marginBottom: 15
  },
  picker: {
    marginTop: 5
  },
  updateButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  legalSection: {
    padding: 15,
    backgroundColor: '#f1f3f4',
    borderRadius: 8
  },
  legalText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  }
})

// Helper functions (would be implemented elsewhere)
function getAuthToken(): string {
  // Implementation to get auth token
  return ''
}

function getPatientPhone(): string {
  // Implementation to get patient phone number
  return ''
}
```

## Acceptance Criteria

1. **Consent Tracking**: Complete audit trail of all consent changes with timestamps and methods
2. **HIPAA Compliance**: All consent management features comply with healthcare regulations
3. **Patient Control**: Patients can easily opt-in/opt-out and manage their preferences
4. **Automated Validation**: Real-time consent validation before sending SMS messages
5. **Bulk Management**: Administrative tools for bulk consent import/export and reporting
6. **Legal Documentation**: Proper consent forms and privacy notices
7. **STOP Handling**: Automated processing of STOP requests with immediate opt-out
8. **Preference Management**: Granular control over SMS timing and content preferences
9. **Reporting**: Comprehensive consent status reporting and analytics
10. **Data Security**: Secure handling of consent data with proper access controls

## Implementation Notes

### HIPAA Compliance Requirements
- Maintain complete audit trails for all consent changes
- Implement secure data storage and access controls
- Provide patient rights management and data deletion capabilities
- Ensure proper consent documentation and legal compliance

### User Experience Considerations
- Make opt-in/opt-out process simple and clear
- Provide immediate confirmation of consent changes
- Offer granular preference controls for patient convenience
- Include clear privacy notices and legal information

### Technical Implementation
- Implement real-time consent validation in SMS sending pipeline
- Use secure storage for consent data with encryption
- Provide efficient bulk operations for administrative tasks
- Implement proper error handling and recovery mechanisms

## Testing Requirements

### Unit Testing
- Test consent validation logic with various scenarios
- Validate preference management functionality
- Test bulk import/export operations
- Verify audit logging completeness

### Integration Testing
- Test consent validation in SMS sending pipeline
- Verify STOP request processing integration
- Test patient preference interface functionality
- Validate reporting and analytics accuracy

### Compliance Testing
- Verify HIPAA compliance requirements
- Test audit trail completeness and accuracy
- Validate data security and access controls
- Test patient rights management features

## Related Documentation

- **Database Schema**: [`SMS-01-database-schema.md`](SMS-01-database-schema.md)
- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)
- **Webhook & Status Tracking**: [`SMS-05-webhook-tracking.md`](SMS-05-webhook-tracking.md)
- **Healthcare Compliance**: [`05-healthcare-compliance.md`](05-healthcare-compliance.md)