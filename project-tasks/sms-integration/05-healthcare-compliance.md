# Healthcare Compliance and Patient Data Protection

## Overview

This document outlines the healthcare compliance requirements, patient data protection measures, and consent management procedures for the SMS integration. Compliance with healthcare regulations and patient privacy laws is critical for the immunization management system.

## Regulatory Framework

### International Standards

#### HIPAA (Health Insurance Portability and Accountability Act)
- **Scope**: US-based healthcare data protection
- **Relevance**: Best practices for patient data handling
- **Key Requirements**: 
  - Patient consent for communications
  - Secure transmission and storage
  - Access controls and audit logging
  - Data breach notification procedures

#### GDPR (General Data Protection Regulation)
- **Scope**: EU data protection regulation
- **Relevance**: International best practices
- **Key Requirements**:
  - Explicit consent for data processing
  - Right to data portability and deletion
  - Data minimization principles
  - Privacy by design implementation

### Regional Healthcare Regulations

#### West African Health Data Protection
- **Liberia Health Information Privacy**: Patient consent requirements
- **ECOWAS Health Data Guidelines**: Cross-border data sharing protocols
- **National Health Ministry Regulations**: Local compliance requirements

#### Key Compliance Areas
1. **Patient Consent Management**
2. **Data Encryption and Security**
3. **Access Controls and Audit Logging**
4. **Data Retention and Deletion**
5. **Breach Notification Procedures**

## Patient Consent Management

### Consent Types and Requirements

#### 1. Initial SMS Consent
```typescript
// backend/app/models/sms_consent.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@adonisjs/lucid/orm'
import Patient from './patient'
import User from './user'

export default class SMSConsent extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare patientId: number

  @column()
  declare phoneNumber: string

  // Consent status
  @column()
  declare consentGiven: boolean

  @column.dateTime()
  declare consentDate: DateTime | null

  @column()
  declare consentMethod: 'registration' | 'verbal' | 'written' | 'sms_reply' | 'guardian'

  @column()
  declare consentDetails: string | null // Additional consent information

  // Opt-out tracking
  @column()
  declare optedOut: boolean

  @column.dateTime()
  declare optOutDate: DateTime | null

  @column()
  declare optOutMethod: 'sms_stop' | 'verbal' | 'written' | 'admin' | 'system'

  // Guardian consent (for minors)
  @column()
  declare guardianName: string | null

  @column()
  declare guardianRelationship: string | null

  @column()
  declare guardianPhone: string | null

  // Audit fields
  @column()
  declare createdBy: number | null

  @column()
  declare updatedBy: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedBy' })
  declare updater: BelongsTo<typeof User>
}
```

#### 2. Consent Validation Service
```typescript
// backend/app/services/sms_consent_service.ts
import SMSConsent from '#models/sms_consent'
import Patient from '#models/patient'
import { DateTime } from 'luxon'

export default class SMSConsentService {
  /**
   * Check if patient has valid SMS consent
   */
  async hasValidConsent(patientId: number, phoneNumber: string): Promise<boolean> {
    const consent = await SMSConsent.query()
      .where('patientId', patientId)
      .where('phoneNumber', phoneNumber)
      .where('consentGiven', true)
      .where('optedOut', false)
      .first()

    if (!consent) return false

    // Check if consent is still valid (not expired)
    const consentAge = DateTime.now().diff(consent.consentDate!, 'months').months
    const maxConsentAgeMonths = 12 // Consent expires after 12 months

    return consentAge <= maxConsentAgeMonths
  }

  /**
   * Record initial consent
   */
  async recordConsent(data: {
    patientId: number
    phoneNumber: string
    consentMethod: string
    consentDetails?: string
    guardianName?: string
    guardianRelationship?: string
    guardianPhone?: string
    createdBy: number
  }): Promise<SMSConsent> {
    // Check if patient is a minor (requires guardian consent)
    const patient = await Patient.findOrFail(data.patientId)
    const isMinor = this.isMinor(patient.dateOfBirth)

    if (isMinor && !data.guardianName) {
      throw new Error('Guardian consent required for minor patients')
    }

    return SMSConsent.updateOrCreate(
      { 
        patientId: data.patientId, 
        phoneNumber: data.phoneNumber 
      },
      {
        consentGiven: true,
        consentDate: DateTime.now(),
        consentMethod: data.consentMethod,
        consentDetails: data.consentDetails,
        guardianName: data.guardianName,
        guardianRelationship: data.guardianRelationship,
        guardianPhone: data.guardianPhone,
        optedOut: false,
        optOutDate: null,
        optOutMethod: null,
        createdBy: data.createdBy,
        updatedBy: data.createdBy
      }
    )
  }

  /**
   * Handle opt-out request
   */
  async recordOptOut(
    patientId: number, 
    phoneNumber: string, 
    method: string,
    updatedBy?: number
  ): Promise<void> {
    const consent = await SMSConsent.query()
      .where('patientId', patientId)
      .where('phoneNumber', phoneNumber)
      .first()

    if (consent) {
      consent.optedOut = true
      consent.optOutDate = DateTime.now()
      consent.optOutMethod = method
      consent.updatedBy = updatedBy || null
      await consent.save()
    }

    // Cancel any pending SMS messages
    await this.cancelPendingMessages(patientId, phoneNumber)
  }

  /**
   * Handle re-consent (opt back in)
   */
  async recordReConsent(
    patientId: number,
    phoneNumber: string,
    method: string,
    updatedBy: number
  ): Promise<void> {
    const consent = await SMSConsent.query()
      .where('patientId', patientId)
      .where('phoneNumber', phoneNumber)
      .first()

    if (consent) {
      consent.optedOut = false
      consent.optOutDate = null
      consent.optOutMethod = null
      consent.consentDate = DateTime.now() // Refresh consent date
      consent.consentMethod = method
      consent.updatedBy = updatedBy
      await consent.save()
    }
  }

  private isMinor(dateOfBirth: DateTime): boolean {
    const age = DateTime.now().diff(dateOfBirth, 'years').years
    return age < 18
  }

  private async cancelPendingMessages(patientId: number, phoneNumber: string): Promise<void> {
    const SMSMessage = (await import('#models/sms_message')).default
    
    await SMSMessage.query()
      .where('patientId', patientId)
      .where('phoneNumber', phoneNumber)
      .whereIn('status', ['scheduled', 'pending'])
      .update({
        status: 'cancelled',
        errorMessage: 'Patient opted out'
      })
  }
}
```

### Consent Collection Methods

#### 1. Registration Form Consent
```typescript
// Frontend consent collection during patient registration
interface ConsentFormData {
  smsConsent: boolean
  phoneNumber: string
  guardianConsent?: {
    guardianName: string
    guardianRelationship: string
    guardianPhone: string
  }
}

// Consent validation
function validateConsent(patientAge: number, consentData: ConsentFormData): boolean {
  if (patientAge < 18 && !consentData.guardianConsent) {
    throw new Error('Guardian consent required for patients under 18')
  }
  
  if (consentData.smsConsent && !consentData.phoneNumber) {
    throw new Error('Phone number required for SMS consent')
  }
  
  return true
}
```

#### 2. Verbal Consent Documentation
```typescript
// Backend API for recording verbal consent
export default class ConsentController {
  async recordVerbalConsent({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const { patientId, phoneNumber, guardianInfo, witnessInfo } = request.only([
      'patientId', 'phoneNumber', 'guardianInfo', 'witnessInfo'
    ])

    const consentService = new SMSConsentService()
    
    const consent = await consentService.recordConsent({
      patientId,
      phoneNumber,
      consentMethod: 'verbal',
      consentDetails: JSON.stringify({
        witness: witnessInfo,
        recordedBy: user.fullName,
        recordedAt: DateTime.now().toISO()
      }),
      guardianName: guardianInfo?.name,
      guardianRelationship: guardianInfo?.relationship,
      guardianPhone: guardianInfo?.phone,
      createdBy: user.id
    })

    return response.json({ success: true, consent })
  }
}
```

## Data Encryption and Security

### Database Encryption

#### Phone Number Encryption
```typescript
// backend/app/models/patient.ts (enhanced)
import { BaseModel, column, beforeSave } from '@adonisjs/lucid/orm'
import Encryption from '@adonisjs/core/services/encryption'

export default class Patient extends BaseModel {
  @column()
  declare primaryPhone: string

  @column()
  declare secondaryPhone: string

  // Encrypt phone numbers before saving
  @beforeSave()
  static async encryptPhoneNumbers(patient: Patient) {
    if (patient.$dirty.primaryPhone && patient.primaryPhone) {
      patient.primaryPhone = Encryption.encrypt(patient.primaryPhone)
    }
    
    if (patient.$dirty.secondaryPhone && patient.secondaryPhone) {
      patient.secondaryPhone = Encryption.encrypt(patient.secondaryPhone)
    }
  }

  // Decrypt phone numbers when accessing
  get decryptedPrimaryPhone(): string | null {
    return this.primaryPhone ? Encryption.decrypt(this.primaryPhone) : null
  }

  get decryptedSecondaryPhone(): string | null {
    return this.secondaryPhone ? Encryption.decrypt(this.secondaryPhone) : null
  }
}
```

#### SMS Message Content Encryption
```typescript
// backend/app/models/sms_message.ts (enhanced)
export default class SMSMessage extends BaseModel {
  @column()
  declare messageContent: string

  @column()
  declare phoneNumber: string

  @beforeSave()
  static async encryptSensitiveData(message: SMSMessage) {
    if (message.$dirty.messageContent) {
      message.messageContent = Encryption.encrypt(message.messageContent)
    }
    
    if (message.$dirty.phoneNumber) {
      message.phoneNumber = Encryption.encrypt(message.phoneNumber)
    }
  }

  get decryptedMessageContent(): string {
    return Encryption.decrypt(this.messageContent)
  }

  get decryptedPhoneNumber(): string {
    return Encryption.decrypt(this.phoneNumber)
  }
}
```

### Transmission Security

#### HTTPS Enforcement
```typescript
// backend/app/middleware/force_https_middleware.ts
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

export default class ForceHttpsMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    // Force HTTPS in production
    if (process.env.NODE_ENV === 'production' && !request.secure()) {
      const httpsUrl = `https://${request.hostname()}${request.url()}`
      return response.redirect(httpsUrl, true, 301)
    }
    
    await next()
  }
}
```

#### API Communication Security
```typescript
// backend/app/services/providers/orange_sms_provider.ts (enhanced)
import https from 'https'
import axios from 'axios'

export default class OrangeSMSProvider {
  private httpClient: any

  constructor() {
    // Configure secure HTTPS client
    this.httpClient = axios.create({
      baseURL: process.env.ORANGE_SMS_BASE_URL,
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: true, // Verify SSL certificates
        minVersion: 'TLSv1.2' // Minimum TLS version
      }),
      headers: {
        'User-Agent': 'ImmunizationSystem/1.0',
        'Content-Type': 'application/json'
      }
    })

    // Add request interceptor for authentication
    this.httpClient.interceptors.request.use((config: any) => {
      config.headers.Authorization = `Bearer ${process.env.ORANGE_SMS_API_KEY}`
      return config
    })
  }
}
```

## Access Controls and Audit Logging

### Role-Based Access Control

#### SMS Permission System
```typescript
// backend/app/models/user.ts (enhanced)
export default class User extends BaseModel {
  // SMS-related permissions
  get canSendSMS(): boolean {
    return this.role === 'administrator' || this.role === 'nurse'
  }

  get canViewSMSLogs(): boolean {
    return ['administrator', 'nurse', 'data_manager'].includes(this.role)
  }

  get canManageConsent(): boolean {
    return this.role === 'administrator' || this.role === 'nurse'
  }

  get canExportSMSData(): boolean {
    return this.role === 'administrator'
  }
}
```

#### Access Control Middleware
```typescript
// backend/app/middleware/sms_permissions_middleware.ts
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

export default class SMSPermissionsMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn, permissions: string[]) {
    const user = auth.user!
    
    const hasPermission = permissions.some(permission => {
      switch (permission) {
        case 'send_sms':
          return user.canSendSMS
        case 'view_sms_logs':
          return user.canViewSMSLogs
        case 'manage_consent':
          return user.canManageConsent
        case 'export_sms_data':
          return user.canExportSMSData
        default:
          return false
      }
    })

    if (!hasPermission) {
      return response.status(403).json({
        error: 'Insufficient permissions for SMS operations'
      })
    }

    await next()
  }
}
```

### Comprehensive Audit Logging

#### SMS Audit Log Model
```typescript
// backend/app/models/sms_audit_log.ts
import { BaseModel, column, belongsTo, BelongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from './user'
import Patient from './patient'

export default class SMSAuditLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Action details
  @column()
  declare action: string // 'consent_given', 'consent_revoked', 'message_sent', 'data_accessed'

  @column()
  declare entityType: string // 'sms_message', 'sms_consent', 'patient'

  @column()
  declare entityId: number

  // User and patient context
  @column()
  declare userId: number | null

  @column()
  declare patientId: number | null

  // Action details
  @column()
  declare details: string // JSON string with action-specific details

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  // Compliance fields
  @column()
  declare dataAccessed: string | null // What data was accessed

  @column()
  declare justification: string | null // Reason for access

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>
}
```

#### Audit Logging Service
```typescript
// backend/app/services/sms_audit_service.ts
import SMSAuditLog from '#models/sms_audit_log'
import { HttpContext } from '@adonisjs/core/http'

export default class SMSAuditService {
  /**
   * Log SMS-related actions
   */
  static async logAction(data: {
    action: string
    entityType: string
    entityId: number
    userId?: number
    patientId?: number
    details?: object
    ipAddress?: string
    userAgent?: string
    dataAccessed?: string
    justification?: string
  }): Promise<void> {
    await SMSAuditLog.create({
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      patientId: data.patientId,
      details: data.details ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      dataAccessed: data.dataAccessed,
      justification: data.justification
    })
  }

  /**
   * Log from HTTP context
   */
  static async logFromContext(
    ctx: HttpContext,
    action: string,
    entityType: string,
    entityId: number,
    additionalData?: object
  ): Promise<void> {
    await this.logAction({
      action,
      entityType,
      entityId,
      userId: ctx.auth.user?.id,
      ipAddress: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent'),
      details: additionalData
    })
  }

  /**
   * Log consent changes
   */
  static async logConsentChange(
    consentId: number,
    patientId: number,
    action: 'consent_given' | 'consent_revoked' | 'consent_updated',
    userId: number,
    details: object,
    ctx?: HttpContext
  ): Promise<void> {
    await this.logAction({
      action,
      entityType: 'sms_consent',
      entityId: consentId,
      userId,
      patientId,
      details,
      ipAddress: ctx?.request.ip(),
      userAgent: ctx?.request.header('user-agent')
    })
  }

  /**
   * Log data access
   */
  static async logDataAccess(
    entityType: string,
    entityId: number,
    userId: number,
    dataAccessed: string,
    justification: string,
    ctx?: HttpContext
  ): Promise<void> {
    await this.logAction({
      action: 'data_accessed',
      entityType,
      entityId,
      userId,
      dataAccessed,
      justification,
      ipAddress: ctx?.request.ip(),
      userAgent: ctx?.request.header('user-agent')
    })
  }
}
```

## Data Retention and Deletion

### Retention Policies

#### SMS Message Retention
```typescript
// backend/app/services/sms_retention_service.ts
import SMSMessage from '#models/sms_message'
import SMSAuditLog from '#models/sms_audit_log'
import { DateTime } from 'luxon'

export default class SMSRetentionService {
  /**
   * Archive old SMS messages
   */
  async archiveOldMessages(): Promise<void> {
    const cutoffDate = DateTime.now().minus({ years: 2 }).toSQL()
    
    // Find messages older than 2 years
    const oldMessages = await SMSMessage.query()
      .where('createdAt', '<', cutoffDate)
      .whereIn('status', ['delivered', 'failed'])
    
    for (const message of oldMessages) {
      // Archive to separate table or external storage
      await this.archiveMessage(message)
      
      // Log the archival
      await SMSAuditLog.create({
        action: 'message_archived',
        entityType: 'sms_message',
        entityId: message.id,
        patientId: message.patientId,
        details: JSON.stringify({
          originalCreatedAt: message.createdAt,
          archivedAt: DateTime.now()
        })
      })
      
      // Delete from main table
      await message.delete()
    }
  }

  /**
   * Delete patient data on request
   */
  async deletePatientSMSData(patientId: number, requestedBy: number): Promise<void> {
    // Delete SMS messages
    const messages = await SMSMessage.query().where('patientId', patientId)
    for (const message of messages) {
      await message.delete()
    }
    
    // Delete consent records
    const consents = await SMSConsent.query().where('patientId', patientId)
    for (const consent of consents) {
      await consent.delete()
    }
    
    // Log the deletion
    await SMSAuditLog.create({
      action: 'patient_data_deleted',
      entityType: 'patient',
      entityId: patientId,
      userId: requestedBy,
      patientId,
      details: JSON.stringify({
        deletedAt: DateTime.now(),
        messagesDeleted: messages.length,
        consentsDeleted: consents.length
      })
    })
  }

  private async archiveMessage(message: SMSMessage): Promise<void> {
    // Implementation depends on archival strategy
    // Could be separate database table, file storage, etc.
  }
}
```

### Scheduled Cleanup Jobs

```typescript
// backend/start/scheduler.ts (additions)
import SMSRetentionService from '#services/sms_retention_service'

// Archive old SMS messages monthly
scheduler.addCronJob('archive-sms-messages', '0 2 1 * *', async () => {
  const retentionService = new SMSRetentionService()
  await retentionService.archiveOldMessages()
})

// Clean up old audit logs (keep for 7 years)
scheduler.addCronJob('cleanup-audit-logs', '0 3 1 * *', async () => {
  const cutoffDate = DateTime.now().minus({ years: 7 }).toSQL()
  
  await SMSAuditLog.query()
    .where('createdAt', '<', cutoffDate)
    .delete()
})
```

## Breach Notification Procedures

### Breach Detection and Response

```typescript
// backend/app/services/security_incident_service.ts
export default class SecurityIncidentService {
  /**
   * Report potential data breach
   */
  async reportBreach(incident: {
    type: 'unauthorized_access' | 'data_leak' | 'system_compromise'
    description: string
    affectedPatients?: number[]
    discoveredBy: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }): Promise<void> {
    // Log the incident
    await this.logSecurityIncident(incident)
    
    // Immediate response based on severity
    if (incident.severity === 'critical' || incident.severity === 'high') {
      await this.initiateEmergencyResponse(incident)
    }
    
    // Notify relevant authorities if required
    if (this.requiresRegulatoryNotification(incident)) {
      await this.notifyRegulators(incident)
    }
    
    // Notify affected patients if required
    if (incident.affectedPatients && incident.affectedPatients.length > 0) {
      await this.notifyAffectedPatients(incident)
    }
  }

  private async initiateEmergencyResponse(incident: any): Promise<void> {
    // Disable SMS functionality if compromised
    if (incident.type === 'system_compromise') {
      await this.disableSMSSystem()
    }
    
    // Alert administrators
    await this.alertAdministrators(incident)
    
    // Begin forensic logging
    await this.enableForensicMode()
  }

  private requiresRegulatoryNotification(incident: any): boolean {
    // Determine if incident requires regulatory notification
    // Based on local healthcare regulations
    return incident.severity === 'critical' || 
           (incident.affectedPatients && incident.affectedPatients.length > 100)
  }
}
```

## Compliance Monitoring and Reporting

### Compliance Dashboard

```typescript
// backend/app/controllers/compliance_controller.ts
export default class ComplianceController {
  /**
   * Get compliance metrics
   */
  async getComplianceMetrics({ response, auth }: HttpContext) {
    const user = auth.user!
    
    if (!user.canViewSMSLogs) {
      return response.status(403).json({ error: 'Insufficient permissions' })
    }

    const metrics = await this.calculateComplianceMetrics()
    
    return response.json(metrics)
  }

  private async calculateComplianceMetrics() {
    const last30Days = DateTime.now().minus({ days: 30 })
    
    // Consent metrics
    const totalPatients = await Patient.query().count('* as total')
    const patientsWithConsent = await SMSConsent.query()
      .where('consentGiven', true)
      .where('optedOut', false)
      .count('* as total')
    
    // Opt-out metrics
    const optOuts = await SMSConsent.query()
      .where('optedOut', true)
      .where('optOutDate', '>=', last30Days.toSQL())
      .count('* as total')
    
    // Audit coverage
    const smsMessagesSent = await SMSMessage.query()
      .where('status', 'sent')
      .where('sentAt', '>=', last30Days.toSQL())
      .count('* as total')
    
    const auditedActions = await SMSAuditLog.query()
      .where('action', 'message_sent')
      .where('createdAt', '>=', last30Days.toSQL())
      .count('* as total')
    
    return {
      consentRate: (patientsWithConsent[0].total / totalPatients[0].total) * 100,
      optOutRate: optOuts[0].total,
      auditCoverage: (auditedActions[0].total / smsMessagesSent[0].total) * 100,
      dataRetentionCompliance: await this.checkRetentionCompliance(),
      encryptionStatus: await this.checkEncryptionStatus()
    }
  }
}
```

## Related Documentation

- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)
- **Message Constraints**: [`03-message-constraints.md`](03-message-constraints.md)
- **Delivery Tracking**: [`04-delivery-tracking.md`](04-delivery-tracking.md)
- **Operational Constraints**: [`10-operational-constraints.md`](10-operational-constraints.md)
- **Implementation Checklist**: [`11-implementation-checklist.md`](11-implementation-checklist.md)