import { DateTime } from 'luxon'
import Patient from '#models/patient'
import Vaccine from '#models/vaccine'
import Facility from '#models/facility'

export interface MessageTemplate {
  type: 'appointment_reminder' | 'overdue_alert' | 'confirmation' | 'general'
  template: string
  maxLength: number
}

export interface MessageVariables {
  patientName: string
  vaccineName: string
  dueDate?: string
  facilityName: string
  facilityPhone?: string
  nextDate?: string
  date?: string
}

export default class SmsTemplateService {
  private templates: Record<string, MessageTemplate> = {
    appointment_reminder: {
      type: 'appointment_reminder',
      template: 'Dear {patientName}, your {vaccineName} vaccination is due on {dueDate}. Please visit {facilityName}. Call {facilityPhone} for info.',
      maxLength: 160
    },
    overdue_alert: {
      type: 'overdue_alert',
      template: 'URGENT: {patientName} missed {vaccineName} vaccination due {dueDate}. Visit {facilityName} immediately. Call {facilityPhone}.',
      maxLength: 160
    },
    confirmation: {
      type: 'confirmation',
      template: '{patientName} received {vaccineName} vaccination on {date} at {facilityName}. Next dose due: {nextDate}.',
      maxLength: 160
    },
    general: {
      type: 'general',
      template: 'Health reminder for {patientName}: Please contact {facilityName} at {facilityPhone} regarding your vaccination schedule.',
      maxLength: 160
    }
  }

  /**
   * Generate SMS message from template
   */
  generateMessage(
    templateType: string,
    variables: Partial<MessageVariables>,
    customTemplate?: string
  ): { message: string; success: boolean; error?: string } {
    try {
      const template = customTemplate || this.templates[templateType]?.template

      if (!template) {
        return {
          message: '',
          success: false,
          error: `Template not found: ${templateType}`
        }
      }

      // Replace variables in template
      let message = template
      Object.entries(variables).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          message = message.replace(new RegExp(`{${key}}`, 'g'), String(value))
        }
      })

      // Check for unreplaced variables
      const unreplacedVars = message.match(/{[^}]+}/g)
      if (unreplacedVars) {
        return {
          message: '',
          success: false,
          error: `Missing variables: ${unreplacedVars.join(', ')}`
        }
      }

      // Check message length
      if (message.length > 160) {
        // Try to create a shorter version
        const shortenedMessage = this.shortenMessage(message, templateType, variables)
        if (shortenedMessage.length <= 160) {
          return {
            message: shortenedMessage,
            success: true
          }
        }

        return {
          message: '',
          success: false,
          error: `Message too long: ${message.length} characters (max 160)`
        }
      }

      return {
        message,
        success: true
      }
    } catch (error) {
      return {
        message: '',
        success: false,
        error: `Template generation error: ${error.message}`
      }
    }
  }

  /**
   * Generate message for appointment reminder
   */
  async generateAppointmentReminder(
    patient: Patient,
    vaccine: Vaccine,
    dueDate: DateTime,
    facility: Facility
  ): Promise<{ message: string; success: boolean; error?: string }> {
    const variables: MessageVariables = {
      patientName: this.shortenName(patient.fullName),
      vaccineName: this.shortenVaccineName(vaccine.name),
      dueDate: this.formatDate(dueDate),
      facilityName: this.shortenFacilityName(facility.name),
      facilityPhone: facility.contactPhone || 'N/A'
    }

    return this.generateMessage('appointment_reminder', variables)
  }

  /**
   * Generate message for overdue alert
   */
  async generateOverdueAlert(
    patient: Patient,
    vaccine: Vaccine,
    dueDate: DateTime,
    facility: Facility
  ): Promise<{ message: string; success: boolean; error?: string }> {
    const variables: MessageVariables = {
      patientName: this.shortenName(patient.fullName),
      vaccineName: this.shortenVaccineName(vaccine.name),
      dueDate: this.formatDate(dueDate),
      facilityName: this.shortenFacilityName(facility.name),
      facilityPhone: facility.contactPhone || 'N/A'
    }

    return this.generateMessage('overdue_alert', variables)
  }

  /**
   * Generate confirmation message
   */
  async generateConfirmation(
    patient: Patient,
    vaccine: Vaccine,
    vaccinationDate: DateTime,
    facility: Facility,
    nextDueDate?: DateTime
  ): Promise<{ message: string; success: boolean; error?: string }> {
    const variables: MessageVariables = {
      patientName: this.shortenName(patient.fullName),
      vaccineName: this.shortenVaccineName(vaccine.name),
      date: this.formatDate(vaccinationDate),
      facilityName: this.shortenFacilityName(facility.name),
      nextDate: nextDueDate ? this.formatDate(nextDueDate) : 'TBD'
    }

    return this.generateMessage('confirmation', variables)
  }

  /**
   * Shorten message to fit within 160 characters
   */
  private shortenMessage(
    message: string,
    templateType: string,
    variables: Partial<MessageVariables>
  ): string {
    // Define shortened templates for different message types
    const shortTemplates: Record<string, string> = {
      appointment_reminder: '{patientName}: {vaccineName} due {dueDate}. Visit {facilityName}.',
      overdue_alert: 'URGENT {patientName}: {vaccineName} overdue {dueDate}. Visit {facilityName}.',
      confirmation: '{patientName}: {vaccineName} done {date}. Next: {nextDate}.',
      general: '{patientName}: Contact {facilityName} re: vaccination.'
    }

    const shortTemplate = shortTemplates[templateType]
    if (!shortTemplate) {
      return message.substring(0, 160)
    }

    // Generate message with short template
    let shortMessage = shortTemplate
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        shortMessage = shortMessage.replace(new RegExp(`{${key}}`, 'g'), String(value))
      }
    })

    return shortMessage.length <= 160 ? shortMessage : shortMessage.substring(0, 160)
  }

  /**
   * Shorten patient name for SMS
   */
  private shortenName(fullName: string): string {
    if (!fullName) return 'Patient'
    
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].length > 15 ? parts[0].substring(0, 15) : parts[0]
    }
    
    // Use first name and last initial
    const firstName = parts[0]
    const lastInitial = parts[parts.length - 1].charAt(0)
    
    return `${firstName} ${lastInitial}.`
  }

  /**
   * Shorten vaccine name for SMS
   */
  private shortenVaccineName(vaccineName: string): string {
    if (!vaccineName) return 'vaccine'

    // Common vaccine abbreviations
    const abbreviations: Record<string, string> = {
      'Bacillus Calmette-Guérin': 'BCG',
      'Diphtheria, Tetanus, Pertussis': 'DTP',
      'Diphtheria, Tetanus, Pertussis, Hepatitis B, Haemophilus influenzae type b': 'Penta',
      'Oral Polio Vaccine': 'OPV',
      'Inactivated Polio Vaccine': 'IPV',
      'Pneumococcal Conjugate Vaccine': 'PCV',
      'Rotavirus': 'Rota',
      'Measles, Mumps, Rubella': 'MMR',
      'Measles': 'Measles',
      'Yellow Fever': 'YF',
      'Meningococcal': 'Meningo',
      'Hepatitis B': 'HepB',
      'Haemophilus influenzae type b': 'Hib'
    }

    // Check for exact matches first
    if (abbreviations[vaccineName]) {
      return abbreviations[vaccineName]
    }

    // Check for partial matches
    for (const [fullName, abbrev] of Object.entries(abbreviations)) {
      if (vaccineName.toLowerCase().includes(fullName.toLowerCase())) {
        return abbrev
      }
    }

    // If no abbreviation found, truncate if too long
    return vaccineName.length > 20 ? vaccineName.substring(0, 20) : vaccineName
  }

  /**
   * Shorten facility name for SMS
   */
  private shortenFacilityName(facilityName: string): string {
    if (!facilityName) return 'Clinic'

    // Remove common words to save space
    let shortened = facilityName
      .replace(/Health Center/gi, 'HC')
      .replace(/Medical Center/gi, 'MC')
      .replace(/Hospital/gi, 'Hosp')
      .replace(/Clinic/gi, 'Clinic')
      .replace(/Community/gi, 'Comm')
      .replace(/Government/gi, 'Govt')

    return shortened.length > 25 ? shortened.substring(0, 25) : shortened
  }

  /**
   * Format date for SMS (short format)
   */
  private formatDate(date: DateTime): string {
    return date.toFormat('dd-MMM')  // e.g., "15-Jan"
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): Record<string, MessageTemplate> {
    return { ...this.templates }
  }

  /**
   * Add or update custom template
   */
  setCustomTemplate(type: string, template: string): void {
    this.templates[type] = {
      type: type as any,
      template,
      maxLength: 160
    }
  }

  /**
   * Validate template variables
   */
  validateTemplate(template: string): { valid: boolean; variables: string[]; errors: string[] } {
    const variables = template.match(/{[^}]+}/g) || []
    const uniqueVariables = [...new Set(variables.map(v => v.slice(1, -1)))]
    const errors: string[] = []

    // Check template length with sample data
    const sampleData: Record<string, string> = {
      patientName: 'John D.',
      vaccineName: 'BCG',
      dueDate: '15-Jan',
      facilityName: 'City HC',
      facilityPhone: '123-456',
      nextDate: '15-Feb',
      date: '01-Jan'
    }

    let testMessage = template
    uniqueVariables.forEach(variable => {
      const sampleValue = sampleData[variable] || 'TEST'
      testMessage = testMessage.replace(new RegExp(`{${variable}}`, 'g'), sampleValue)
    })

    if (testMessage.length > 160) {
      errors.push(`Template too long: ${testMessage.length} characters (max 160)`)
    }

    return {
      valid: errors.length === 0,
      variables: uniqueVariables,
      errors
    }
  }
}