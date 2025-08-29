# SMS-06: Message Templates & Optimization

## Context
This task implements a comprehensive message template system optimized for the 160-character SMS limit with multi-language support, dynamic content substitution, and character count optimization. The template system ensures consistent, professional messaging while maximizing information delivery within Orange Network SMS constraints.

## Dependencies
- [`SMS-01`](SMS-01-database-schema.md): SMS templates table must be created
- [`SMS-02`](SMS-02-sms-service-layer.md): SMS template service integration required

## Requirements

### 1. Template Management System
Create a comprehensive template management system with CRUD operations, versioning, and multi-language support for the three reminder types.

### 2. Character Count Optimization
Implement intelligent character count optimization with abbreviation systems, dynamic content truncation, and multi-part message handling.

### 3. Dynamic Content Substitution
Develop robust placeholder replacement system with data validation, formatting options, and fallback values.

### 4. Multi-Language Support
Implement localization support for English and local languages with proper character encoding and cultural considerations.

### 5. Template Validation & Testing
Create validation tools for template testing, character count verification, and content preview functionality.

### 6. Template Analytics
Implement analytics to track template performance, delivery rates, and optimization opportunities.

## Code Examples

### Enhanced SMS Template Model

```typescript
// backend/app/models/sms_template.ts (enhanced)
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class SMSTemplate extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare templateType: string

  @column()
  declare messageTemplate: string

  @column()
  declare characterCount: number

  @column()
  declare languageCode: string

  @column()
  declare isActive: boolean

  @column()
  declare version: number

  @column()
  declare createdBy: number | null

  @column()
  declare updatedBy: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedBy' })
  declare updater: BelongsTo<typeof User>

  // Template placeholders and their descriptions
  public static getPlaceholders(templateType: string): Record<string, string> {
    const commonPlaceholders = {
      '{patient_name}': 'Patient full name',
      '{facility_name}': 'Health facility name',
      '{vaccine_name}': 'Vaccine name',
      '{due_date}': 'Due date (YYYY-MM-DD format)'
    }

    const specificPlaceholders = {
      '7_day_reminder': {
        ...commonPlaceholders,
        '{days_until_due}': 'Number of days until due date'
      },
      '1_day_reminder': {
        ...commonPlaceholders,
        '{appointment_time}': 'Appointment time'
      },
      'overdue_reminder': {
        ...commonPlaceholders,
        '{days_overdue}': 'Number of days overdue'
      }
    }

    return specificPlaceholders[templateType] || commonPlaceholders
  }

  // Validate template format and placeholders
  public validateTemplate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const placeholders = SMSTemplate.getPlaceholders(this.templateType)
    
    // Check for required placeholders
    const requiredPlaceholders = ['{patient_name}', '{vaccine_name}']
    for (const placeholder of requiredPlaceholders) {
      if (!this.messageTemplate.includes(placeholder)) {
        errors.push(`Missing required placeholder: ${placeholder}`)
      }
    }

    // Check for invalid placeholders
    const templatePlaceholders = this.messageTemplate.match(/{[^}]+}/g) || []
    for (const placeholder of templatePlaceholders) {
      if (!placeholders[placeholder]) {
        errors.push(`Invalid placeholder: ${placeholder}`)
      }
    }

    // Check character count
    if (this.characterCount > 160) {
      errors.push(`Template exceeds 160 characters: ${this.characterCount}`)
    }

    // Check for opt-out message
    if (!this.messageTemplate.toLowerCase().includes('stop')) {
      errors.push('Template should include opt-out instruction (STOP)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Get optimized templates by language
  public static async getOptimizedTemplate(
    templateType: string, 
    languageCode: string = 'en'
  ): Promise<SMSTemplate | null> {
    return await this.query()
      .where('template_type', templateType)
      .where('language_code', languageCode)
      .where('is_active', true)
      .orderBy('character_count', 'asc') // Prefer shorter templates
      .orderBy('version', 'desc')
      .first()
  }
}
```

### Advanced Template Service

```typescript
// backend/app/services/sms_template_service.ts (enhanced)
import SMSTemplate from '#models/sms_template'
import Logger from '@adonisjs/core/logger'

export interface TemplateData {
  patient_name: string
  vaccine_name: string
  due_date: string
  facility_name: string
  appointment_time?: string
  days_overdue?: number
  days_until_due?: number
}

export interface TemplateOptimization {
  originalLength: number
  optimizedLength: number
  optimizations: string[]
  truncated: boolean
}

export default class SMSTemplateService {
  private templateCache: Map<string, SMSTemplate> = new Map()
  private abbreviations: Map<string, string> = new Map()

  constructor() {
    this.initializeAbbreviations()
  }

  /**
   * Render and optimize SMS template
   */
  public async renderOptimizedTemplate(
    templateType: string,
    data: TemplateData,
    languageCode: string = 'en',
    maxLength: number = 160
  ): Promise<{ message: string; optimization: TemplateOptimization }> {
    const template = await this.getTemplate(templateType, languageCode)
    
    if (!template) {
      throw new Error(`SMS template not found: ${templateType}_${languageCode}`)
    }

    // Initial render
    let renderedMessage = this.renderTemplate(template.messageTemplate, data)
    const originalLength = renderedMessage.length

    const optimization: TemplateOptimization = {
      originalLength,
      optimizedLength: originalLength,
      optimizations: [],
      truncated: false
    }

    // Apply optimizations if needed
    if (renderedMessage.length > maxLength) {
      renderedMessage = this.optimizeMessage(renderedMessage, maxLength, optimization)
    }

    optimization.optimizedLength = renderedMessage.length

    Logger.debug(`Template rendered: ${originalLength} -> ${optimization.optimizedLength} chars`)

    return {
      message: renderedMessage,
      optimization
    }
  }

  /**
   * Basic template rendering with placeholder substitution
   */
  private renderTemplate(template: string, data: TemplateData): string {
    let rendered = template

    // Replace all placeholders
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        const placeholder = `{${key}}`
        rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
      }
    }

    // Handle date formatting
    rendered = this.formatDates(rendered)

    return rendered
  }

  /**
   * Optimize message length through various techniques
   */
  private optimizeMessage(
    message: string, 
    maxLength: number, 
    optimization: TemplateOptimization
  ): string {
    let optimized = message

    // 1. Apply abbreviations
    optimized = this.applyAbbreviations(optimized, optimization)

    // 2. Remove extra spaces
    if (optimized.length > maxLength) {
      optimized = this.removeExtraSpaces(optimized, optimization)
    }

    // 3. Shorten facility names
    if (optimized.length > maxLength) {
      optimized = this.shortenFacilityNames(optimized, optimization)
    }

    // 4. Use shorter date format
    if (optimized.length > maxLength) {
      optimized = this.shortenDateFormat(optimized, optimization)
    }

    // 5. Truncate if still too long
    if (optimized.length > maxLength) {
      optimized = this.truncateMessage(optimized, maxLength, optimization)
    }

    return optimized
  }

  /**
   * Apply common abbreviations
   */
  private applyAbbreviations(message: string, optimization: TemplateOptimization): string {
    let abbreviated = message
    let applied = false

    for (const [full, abbrev] of this.abbreviations.entries()) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi')
      if (regex.test(abbreviated)) {
        abbreviated = abbreviated.replace(regex, abbrev)
        applied = true
      }
    }

    if (applied) {
      optimization.optimizations.push('Applied abbreviations')
    }

    return abbreviated
  }

  /**
   * Remove extra spaces
   */
  private removeExtraSpaces(message: string, optimization: TemplateOptimization): string {
    const cleaned = message.replace(/\s+/g, ' ').trim()
    
    if (cleaned.length < message.length) {
      optimization.optimizations.push('Removed extra spaces')
    }

    return cleaned
  }

  /**
   * Shorten facility names
   */
  private shortenFacilityNames(message: string, optimization: TemplateOptimization): string {
    // Common facility name shortenings
    const facilityAbbreviations = {
      'Health Center': 'HC',
      'Medical Center': 'MC',
      'Hospital': 'Hosp',
      'Clinic': 'Clinic', // Keep as is
      'Community Health': 'Comm Health'
    }

    let shortened = message
    let applied = false

    for (const [full, abbrev] of Object.entries(facilityAbbreviations)) {
      const regex = new RegExp(full, 'gi')
      if (regex.test(shortened)) {
        shortened = shortened.replace(regex, abbrev)
        applied = true
      }
    }

    if (applied) {
      optimization.optimizations.push('Shortened facility names')
    }

    return shortened
  }

  /**
   * Use shorter date format
   */
  private shortenDateFormat(message: string, optimization: TemplateOptimization): string {
    // Convert YYYY-MM-DD to MM/DD format
    const dateRegex = /\b\d{4}-(\d{2})-(\d{2})\b/g
    const shortened = message.replace(dateRegex, '$1/$2')

    if (shortened.length < message.length) {
      optimization.optimizations.push('Shortened date format')
    }

    return shortened
  }

  /**
   * Truncate message as last resort
   */
  private truncateMessage(
    message: string, 
    maxLength: number, 
    optimization: TemplateOptimization
  ): string {
    if (message.length <= maxLength) {
      return message
    }

    // Reserve space for "..." and "Reply STOP to opt out"
    const optOutText = ' Reply STOP to opt out'
    const ellipsis = '...'
    const reservedSpace = optOutText.length + ellipsis.length
    const availableSpace = maxLength - reservedSpace

    if (availableSpace < 20) {
      // If too little space, just truncate hard
      optimization.truncated = true
      optimization.optimizations.push('Hard truncated due to length constraints')
      return message.substring(0, maxLength - 3) + '...'
    }

    // Try to truncate at word boundary
    let truncated = message.substring(0, availableSpace)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > availableSpace * 0.8) {
      truncated = truncated.substring(0, lastSpace)
    }

    truncated += ellipsis + optOutText

    optimization.truncated = true
    optimization.optimizations.push('Truncated with preserved opt-out')

    return truncated
  }

  /**
   * Format dates in templates
   */
  private formatDates(message: string): string {
    // This could be enhanced with proper date formatting based on locale
    return message
  }

  /**
   * Initialize common abbreviations
   */
  private initializeAbbreviations(): void {
    this.abbreviations.set('vaccination', 'vaccine')
    this.abbreviations.set('immunization', 'vaccine')
    this.abbreviations.set('appointment', 'appt')
    this.abbreviations.set('reminder', 'reminder') // Keep as is
    this.abbreviations.set('tomorrow', 'tmrw')
    this.abbreviations.set('please', 'pls')
    this.abbreviations.set('visit', 'visit') // Keep as is
    this.abbreviations.set('overdue', 'overdue') // Keep as is
  }

  /**
   * Get template with caching
   */
  public async getTemplate(templateType: string, languageCode: string = 'en'): Promise<SMSTemplate | null> {
    const cacheKey = `${templateType}_${languageCode}`
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!
    }

    const template = await SMSTemplate.getOptimizedTemplate(templateType, languageCode)
    
    if (template) {
      this.templateCache.set(cacheKey, template)
    }

    return template
  }

  /**
   * Preview template with sample data
   */
  public async previewTemplate(
    templateType: string,
    languageCode: string = 'en'
  ): Promise<{ message: string; characterCount: number; isValid: boolean; warnings: string[] }> {
    const sampleData: TemplateData = {
      patient_name: 'John Doe',
      vaccine_name: 'Measles',
      due_date: '2024-03-15',
      facility_name: 'Central Health Center',
      appointment_time: '9:00 AM',
      days_overdue: 3,
      days_until_due: 7
    }

    const result = await this.renderOptimizedTemplate(templateType, sampleData, languageCode)
    
    return {
      message: result.message,
      characterCount: result.message.length,
      isValid: result.message.length <= 160,
      warnings: result.optimization.optimizations
    }
  }

  /**
   * Clear template cache
   */
  public clearCache(): void {
    this.templateCache.clear()
  }
}
```

### Template Management Controller

```typescript
// backend/app/controllers/sms_templates_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import SMSTemplate from '#models/sms_template'
import SMSTemplateService from '#services/sms_template_service'

export default class SMSTemplatesController {
  private templateService: SMSTemplateService

  constructor() {
    this.templateService = new SMSTemplateService()
  }

  /**
   * Get all SMS templates
   */
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const templateType = request.input('type')
    const languageCode = request.input('language', 'en')
    const isActive = request.input('active')

    const query = SMSTemplate.query()

    if (templateType) {
      query.where('template_type', templateType)
    }

    if (languageCode) {
      query.where('language_code', languageCode)
    }

    if (isActive !== undefined) {
      query.where('is_active', isActive === 'true')
    }

    const templates = await query
      .orderBy('template_type')
      .orderBy('language_code')
      .orderBy('version', 'desc')
      .paginate(page, limit)

    return response.json(templates)
  }

  /**
   * Preview template with sample data
   */
  public async preview({ request, response }: HttpContext) {
    const templateType = request.input('type')
    const languageCode = request.input('language', 'en')

    if (!templateType) {
      return response.status(400).json({ error: 'Template type is required' })
    }

    const preview = await this.templateService.previewTemplate(templateType, languageCode)
    
    return response.json(preview)
  }

  /**
   * Validate template
   */
  public async validate({ request, response }: HttpContext) {
    const { messageTemplate, templateType } = request.only(['messageTemplate', 'templateType'])

    if (!messageTemplate || !templateType) {
      return response.status(400).json({ error: 'Message template and type are required' })
    }

    const tempTemplate = new SMSTemplate()
    tempTemplate.messageTemplate = messageTemplate
    tempTemplate.templateType = templateType
    tempTemplate.characterCount = messageTemplate.length

    const validation = tempTemplate.validateTemplate()

    return response.json(validation)
  }
}
```

## Acceptance Criteria

1. **Template Management**: CRUD operations for SMS templates with versioning
2. **Character Optimization**: Intelligent optimization to stay within 160-character limit
3. **Multi-language Support**: Templates support multiple languages with proper encoding
4. **Dynamic Content**: Robust placeholder substitution with validation
5. **Template Validation**: Comprehensive validation of template format and content
6. **Performance Analytics**: Template performance tracking and optimization recommendations
7. **Caching System**: Efficient template caching for performance
8. **Preview Functionality**: Template preview with sample data
9. **API Endpoints**: RESTful API for template management
10. **Error Handling**: Comprehensive error handling and validation

## Implementation Notes

### Character Optimization Strategy
- Apply common abbreviations while maintaining readability
- Use shorter date formats when possible
- Truncate intelligently at word boundaries
- Always preserve opt-out instructions
- Track optimization effectiveness

### Multi-language Considerations
- Support UTF-8 encoding for international characters
- Consider character count differences between languages
- Implement language-specific abbreviations
- Handle right-to-left languages if needed

### Template Performance
- Monitor delivery rates by template
- Track character count distribution
- Analyze optimization frequency
- Provide actionable recommendations

### Security & Validation
- Validate all placeholder usage
- Prevent template injection attacks
- Ensure required elements are present
- Validate character encoding

## Testing Requirements

### Unit Testing
- Test template rendering with various data combinations
- Validate character optimization algorithms
- Test multi-language template handling
- Verify placeholder substitution accuracy

### Integration Testing
- Test template management API endpoints
- Verify database operations and caching
- Test template validation rules
- Validate performance analytics

### Performance Testing
- Test template rendering performance
- Validate caching effectiveness
- Test with large template datasets
- Measure optimization algorithm performance

## Related Documentation

- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)
- **Database Schema**: [`SMS-01-database-schema.md`](SMS-01-database-schema.md)
- **Message Constraints**: [`03-message-constraints.md`](03-message-constraints.md)
- **Enhanced Scheduler**: [`SMS-04-enhanced-scheduler.md`](SMS-04-enhanced-scheduler.md)