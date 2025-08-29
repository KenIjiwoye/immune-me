# SMS Message Constraints and Formatting Guidelines

## Overview

This document defines the technical constraints, formatting requirements, and best practices for SMS messages in the Orange Network SMS API integration. Understanding these limitations is crucial for creating effective immunization reminder messages that deliver reliably and provide clear information to patients.

## Character Limits and Encoding

### Standard SMS Constraints

#### GSM 7-bit Encoding (Recommended)
- **Single SMS**: 160 characters maximum
- **Character Set**: Basic Latin characters, numbers, common punctuation
- **Cost**: Most economical option
- **Delivery**: Fastest and most reliable

#### Unicode (UCS-2) Encoding
- **Single SMS**: 70 characters maximum
- **Character Set**: Full Unicode support including local languages
- **Cost**: Higher cost per message
- **Use Case**: When local language characters are required

#### Concatenated SMS (Multi-part)
- **Maximum Parts**: 10 SMS parts
- **GSM 7-bit**: Up to 1,530 characters (153 chars per part)
- **Unicode**: Up to 670 characters (67 chars per part)
- **Cost**: Charged per part
- **Delivery Risk**: Higher failure rate with multiple parts

### Character Count Examples

```
Standard Message (GSM 7-bit):
"Reminder: John's BCG vaccination is due on 2024-02-15 at Health Center ABC. Reply STOP to opt out."
Character count: 102/160 ✓

Unicode Message (with local characters):
"Rappel: Vaccination BCG de Jean prévue le 15/02/2024 au Centre de Santé ABC. Répondez STOP pour vous désabonner."
Character count: 125/160 (GSM) or 125/70 (Unicode - requires 2 parts) ⚠️

Long Message (Concatenated):
"Important Reminder: Your child John Doe's BCG vaccination appointment is scheduled for February 15, 2024 at 9:00 AM at Health Center ABC located on Main Street. Please bring the child's health card and arrive 15 minutes early. Reply STOP to opt out."
Character count: 267/160 (requires 2 parts) ⚠️
```

## Message Templates and Variables

### Template Structure

#### 7-Day Reminder Template
```
Template: "Reminder: {patient_name}'s {vaccine_name} vaccination is due on {due_date} at {facility_name}. Reply STOP to opt out."

Variables:
- {patient_name}: Patient's first name (max 20 chars)
- {vaccine_name}: Vaccine abbreviation (max 15 chars)
- {due_date}: Date in local format (10 chars)
- {facility_name}: Facility short name (max 30 chars)

Base template: 85 characters
Variable space: 75 characters
Total maximum: 160 characters ✓
```

#### 1-Day Reminder Template
```
Template: "Tomorrow: {patient_name}'s {vaccine_name} vaccination at {facility_name}. Time: {appointment_time}. Reply STOP to opt out."

Variables:
- {patient_name}: Patient's first name (max 20 chars)
- {vaccine_name}: Vaccine abbreviation (max 15 chars)
- {facility_name}: Facility short name (max 30 chars)
- {appointment_time}: Time format (8 chars)

Base template: 87 characters
Variable space: 73 characters
Total maximum: 160 characters ✓
```

#### Overdue Reminder Template
```
Template: "Overdue: {patient_name}'s {vaccine_name} vaccination was due {days_overdue} days ago. Please visit {facility_name}. Reply STOP to opt out."

Variables:
- {patient_name}: Patient's first name (max 20 chars)
- {vaccine_name}: Vaccine abbreviation (max 15 chars)
- {days_overdue}: Number (max 3 chars)
- {facility_name}: Facility short name (max 30 chars)

Base template: 92 characters
Variable space: 68 characters
Total maximum: 160 characters ✓
```

### Variable Constraints and Formatting

#### Patient Names
```typescript
// Name formatting for SMS
function formatPatientName(fullName: string): string {
  const firstName = fullName.split(' ')[0]
  return firstName.length > 20 ? firstName.substring(0, 17) + '...' : firstName
}

// Examples:
"John" → "John" (4 chars)
"Christopher" → "Christopher" (11 chars)
"Christopher Alexander" → "Christopher" (11 chars - first name only)
"Bartholomew" → "Bartholomew" (11 chars)
"Bartholomew-James" → "Bartholomew-Jam..." (20 chars with truncation)
```

#### Vaccine Names
```typescript
// Vaccine name abbreviations
const vaccineAbbreviations = {
  'Bacillus Calmette-Guérin': 'BCG',
  'Diphtheria, Tetanus, Pertussis': 'DTP',
  'Oral Polio Vaccine': 'OPV',
  'Hepatitis B': 'Hep B',
  'Haemophilus influenzae type b': 'Hib',
  'Pneumococcal Conjugate': 'PCV',
  'Rotavirus': 'Rota',
  'Measles, Mumps, Rubella': 'MMR',
  'Yellow Fever': 'YF',
  'Meningococcal': 'MenA'
}

// Fallback for long names
function formatVaccineName(vaccineName: string): string {
  return vaccineAbbreviations[vaccineName] || 
         (vaccineName.length > 15 ? vaccineName.substring(0, 12) + '...' : vaccineName)
}
```

#### Date Formatting
```typescript
// Date formatting for different locales
function formatDate(date: DateTime, locale: string = 'en'): string {
  switch (locale) {
    case 'en':
      return date.toFormat('yyyy-MM-dd') // 2024-02-15 (10 chars)
    case 'fr':
      return date.toFormat('dd/MM/yyyy') // 15/02/2024 (10 chars)
    default:
      return date.toFormat('yyyy-MM-dd')
  }
}
```

#### Facility Names
```typescript
// Facility name formatting
function formatFacilityName(facilityName: string): string {
  // Remove common prefixes/suffixes to save space
  const cleaned = facilityName
    .replace(/Health Center/gi, 'HC')
    .replace(/Medical Center/gi, 'MC')
    .replace(/Hospital/gi, 'Hosp')
    .replace(/Clinic/gi, 'Clinic')
  
  return cleaned.length > 30 ? cleaned.substring(0, 27) + '...' : cleaned
}

// Examples:
"Central Health Center" → "Central HC" (10 chars)
"St. Mary's Medical Center" → "St. Mary's MC" (13 chars)
"Community Hospital of Monrovia" → "Community Hosp of Monrov..." (30 chars)
```

## Content Guidelines

### Required Elements

#### Legal Requirements
- **Opt-out mechanism**: "Reply STOP to opt out" (22 characters)
- **Sender identification**: Clear facility/service identification
- **Purpose clarity**: Medical appointment reminder context

#### Healthcare Best Practices
- **Patient privacy**: Use first name only, avoid sensitive details
- **Clear action**: Specify what the patient needs to do
- **Contact information**: Facility name for patient reference
- **Urgency indicators**: "Tomorrow", "Overdue", "Reminder"

### Prohibited Content

#### Restricted Information
- Full patient names (privacy risk)
- Medical record numbers
- Detailed medical information
- Insurance information
- Payment details

#### Spam Indicators
- Excessive capitalization
- Multiple exclamation marks
- Promotional language
- Misleading urgency claims

### Language and Tone

#### Recommended Approach
- **Professional but friendly**: Healthcare communication standard
- **Clear and concise**: Easy to understand quickly
- **Action-oriented**: Tell patient what to do
- **Respectful**: Appropriate for all age groups

#### Example Comparisons
```
❌ Poor: "HEY!!! Your kid needs shots NOW!!! Come to clinic ASAP!!!"
✓ Good: "Reminder: John's BCG vaccination is due on 2024-02-15 at Central HC."

❌ Poor: "Patient ID 12345 has overdue immunization record requiring immediate attention"
✓ Good: "Overdue: John's BCG vaccination was due 3 days ago. Please visit Central HC."

❌ Poor: "Don't miss your appointment or face serious health consequences!"
✓ Good: "Tomorrow: John's BCG vaccination at Central HC. Time: 9:00 AM."
```

## Multi-language Support

### Supported Languages

#### Primary Languages (Orange Network Coverage)
- **English (en)**: Default language
- **French (fr)**: West Africa regions
- **Arabic (ar)**: North Africa regions
- **Portuguese (pt)**: Limited regions

#### Template Localization
```typescript
// Multi-language template system
const templates = {
  '7_day_reminder': {
    'en': "Reminder: {patient_name}'s {vaccine_name} vaccination is due on {due_date} at {facility_name}. Reply STOP to opt out.",
    'fr': "Rappel: Vaccination {vaccine_name} de {patient_name} prévue le {due_date} au {facility_name}. Répondez STOP pour vous désabonner.",
    'ar': "تذكير: تطعيم {vaccine_name} لـ {patient_name} مستحق في {due_date} في {facility_name}. رد بـ STOP للإلغاء."
  }
}
```

#### Character Count Considerations
```
English (GSM 7-bit): 160 characters
French (GSM 7-bit): 160 characters (accented characters may trigger Unicode)
Arabic (Unicode): 70 characters (requires Unicode encoding)
Portuguese (GSM 7-bit): 160 characters
```

## Message Optimization Strategies

### Character Conservation Techniques

#### Abbreviation Standards
```typescript
const commonAbbreviations = {
  // Time references
  'tomorrow': 'tmrw',
  'appointment': 'appt',
  'vaccination': 'vacc',
  
  // Locations
  'Health Center': 'HC',
  'Medical Center': 'MC',
  'Hospital': 'Hosp',
  'Clinic': 'Clinic',
  
  // Actions
  'Please visit': 'Visit',
  'Reply STOP to opt out': 'Text STOP to stop'
}
```

#### Dynamic Content Adjustment
```typescript
function optimizeMessage(template: string, variables: object): string {
  let message = renderTemplate(template, variables)
  
  // If message exceeds 160 characters, apply optimizations
  if (message.length > 160) {
    // Apply abbreviations
    message = applyAbbreviations(message)
    
    // Truncate less critical information
    if (message.length > 160) {
      message = truncateNonEssential(message)
    }
    
    // Last resort: truncate and add ellipsis
    if (message.length > 160) {
      message = message.substring(0, 157) + '...'
    }
  }
  
  return message
}
```

### Template Validation

#### Pre-deployment Checks
```typescript
interface TemplateValidation {
  maxLength: number
  requiredVariables: string[]
  optOutIncluded: boolean
  characterEncoding: 'GSM' | 'Unicode'
  estimatedParts: number
}

function validateTemplate(template: string): TemplateValidation {
  const maxVariableLength = calculateMaxVariableLength(template)
  const baseLength = template.replace(/{[^}]+}/g, '').length
  const totalMaxLength = baseLength + maxVariableLength
  
  return {
    maxLength: totalMaxLength,
    requiredVariables: extractVariables(template),
    optOutIncluded: template.includes('STOP'),
    characterEncoding: containsUnicodeChars(template) ? 'Unicode' : 'GSM',
    estimatedParts: Math.ceil(totalMaxLength / (containsUnicodeChars(template) ? 70 : 160))
  }
}
```

## Testing and Quality Assurance

### Message Testing Checklist

#### Content Validation
- [ ] All variables properly replaced
- [ ] Character count within limits
- [ ] Opt-out mechanism included
- [ ] Professional tone maintained
- [ ] No sensitive information exposed

#### Technical Validation
- [ ] Proper character encoding
- [ ] No special characters causing issues
- [ ] Template rendering works correctly
- [ ] Multi-language support functional
- [ ] Concatenation handling if needed

#### User Experience Testing
- [ ] Message clear and actionable
- [ ] Information sufficient for patient
- [ ] Timing appropriate for reminder type
- [ ] Facility contact information clear
- [ ] Opt-out process explained

### Sample Test Messages

#### Test Data Set
```typescript
const testPatients = [
  {
    name: "John Doe",
    vaccine: "BCG",
    facility: "Central Health Center",
    dueDate: "2024-02-15",
    appointmentTime: "9:00 AM"
  },
  {
    name: "Christopher Alexander Johnson",
    vaccine: "Diphtheria, Tetanus, Pertussis",
    facility: "Community Medical Center of Greater Monrovia",
    dueDate: "2024-02-20",
    appointmentTime: "2:30 PM"
  }
]
```

#### Expected Results
```
Test 1 (Normal case):
"Reminder: John's BCG vaccination is due on 2024-02-15 at Central HC. Reply STOP to opt out."
Length: 95/160 ✓

Test 2 (Long names case):
"Reminder: Christopher's DTP vaccination is due on 2024-02-20 at Community MC of Grea... Reply STOP to opt out."
Length: 160/160 ✓ (optimized)
```

## Error Handling and Fallbacks

### Message Generation Failures

#### Variable Substitution Errors
```typescript
function safeTemplateRender(template: string, variables: object): string {
  try {
    return renderTemplate(template, variables)
  } catch (error) {
    // Fallback to basic message
    return `Vaccination reminder for ${variables.patientName || 'patient'}. Contact ${variables.facilityName || 'your health center'}. Reply STOP to opt out.`
  }
}
```

#### Character Limit Exceeded
```typescript
function handleLongMessage(message: string): string {
  if (message.length <= 160) return message
  
  // Try optimization first
  const optimized = optimizeMessage(message)
  if (optimized.length <= 160) return optimized
  
  // Fallback to essential information only
  return createFallbackMessage(extractEssentialInfo(message))
}
```

## Related Documentation

- **API Specifications**: [`01-api-specifications.md`](01-api-specifications.md)
- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)
- **Delivery Tracking**: [`04-delivery-tracking.md`](04-delivery-tracking.md)
- **Healthcare Compliance**: [`05-healthcare-compliance.md`](05-healthcare-compliance.md)
- **Quick Reference**: [`12-quick-reference.md`](12-quick-reference.md)