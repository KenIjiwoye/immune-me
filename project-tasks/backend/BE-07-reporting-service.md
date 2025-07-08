# BE-07: Implement Reporting and Analytics Service

## Context
The Immunization Records Management System requires a reporting and analytics service to generate insights from immunization data. This service will provide various reports such as immunization coverage, due immunizations, and facility performance.

## Dependencies
- BE-01: Database configuration completed
- BE-02: Database migrations completed
- BE-04: Core models implemented
- BE-05: API endpoints implemented

## Requirements
1. Create a reporting service that generates various analytics reports
2. Implement endpoints to access these reports
3. Support filtering by date range, facility, and other relevant parameters
4. Implement data aggregation for meaningful insights

## Code Example

### Reporting Service

```typescript
// backend/app/services/reporting_service.ts
import Database from '@adonisjs/lucid/database'
import { DateTime } from 'luxon'

export default class ReportingService {
  /**
   * Get immunization coverage by vaccine type
   */
  public async getImmunizationCoverage(options: {
    startDate?: string
    endDate?: string
    facilityId?: number
  }) {
    const query = Database.from('immunization_records')
      .join('vaccines', 'immunization_records.vaccine_id', 'vaccines.id')
      .select('vaccines.name')
      .count('immunization_records.id as count')
      .groupBy('vaccines.name')
      .orderBy('count', 'desc')
    
    if (options.startDate && options.endDate) {
      query.whereBetween('administered_date', [options.startDate, options.endDate])
    }
    
    if (options.facilityId) {
      query.where('facility_id', options.facilityId)
    }
    
    return query
  }

  /**
   * Get due immunizations report
   */
  public async getDueImmunizations(options: {
    facilityId?: number
    daysAhead?: number
  }) {
    const daysAhead = options.daysAhead || 30
    const endDate = DateTime.now().plus({ days: daysAhead }).toSQL()
    
    const query = Database.from('immunization_records')
      .join('patients', 'immunization_records.patient_id', 'patients.id')
      .join('vaccines', 'immunization_records.vaccine_id', 'vaccines.id')
      .select(
        'patients.id as patientId',
        'patients.full_name as patientName',
        'patients.contact_phone as contactPhone',
        'vaccines.name as vaccineName',
        'immunization_records.return_date as dueDate'
      )
      .whereNotNull('immunization_records.return_date')
      .where('immunization_records.return_date', '<=', endDate)
      .orderBy('immunization_records.return_date', 'asc')
    
    if (options.facilityId) {
      query.where('immunization_records.facility_id', options.facilityId)
    }
    
    return query
  }

  /**
   * Get facility performance metrics
   */
  public async getFacilityPerformance(options: {
    startDate?: string
    endDate?: string
  }) {
    const query = Database.from('immunization_records')
      .join('facilities', 'immunization_records.facility_id', 'facilities.id')
      .select('facilities.id', 'facilities.name')
      .count('immunization_records.id as total_immunizations')
      .countDistinct('immunization_records.patient_id as unique_patients')
      .groupBy('facilities.id', 'facilities.name')
      .orderBy('total_immunizations', 'desc')
    
    if (options.startDate && options.endDate) {
      query.whereBetween('administered_date', [options.startDate, options.endDate])
    }
    
    return query
  }

  /**
   * Get immunization trends over time
   */
  public async getImmunizationTrends(options: {
    facilityId?: number
    interval?: 'day' | 'week' | 'month'
    months?: number
  }) {
    const interval = options.interval || 'month'
    const months = options.months || 12
    const startDate = DateTime.now().minus({ months }).toSQL()
    
    let dateFormat: string
    
    switch (interval) {
      case 'day':
        dateFormat = 'YYYY-MM-DD'
        break
      case 'week':
        dateFormat = 'YYYY-WW'
        break
      case 'month':
      default:
        dateFormat = 'YYYY-MM'
        break
    }
    
    const query = Database.from('immunization_records')
      .select(
        Database.raw(`to_char(administered_date, '${dateFormat}') as time_period`),
        Database.raw('count(*) as count')
      )
      .where('administered_date', '>=', startDate)
      .groupByRaw(`to_char(administered_date, '${dateFormat}')`)
      .orderByRaw(`to_char(administered_date, '${dateFormat}')`)
    
    if (options.facilityId) {
      query.where('facility_id', options.facilityId)
    }
    
    return query
  }

  /**
   * Get age distribution of patients
   */
  public async getAgeDistribution(options: {
    facilityId?: number
  }) {
    const query = Database.from('patients')
      .select(
        Database.raw(`
          CASE
            WHEN date_part('year', age(date_of_birth)) < 1 THEN 'Under 1'
            WHEN date_part('year', age(date_of_birth)) < 5 THEN '1-4'
            WHEN date_part('year', age(date_of_birth)) < 10 THEN '5-9'
            WHEN date_part('year', age(date_of_birth)) < 15 THEN '10-14'
            WHEN date_part('year', age(date_of_birth)) < 20 THEN '15-19'
            ELSE '20+'
          END as age_group
        `),
        Database.raw('count(*) as count')
      )
      .groupByRaw(`
        CASE
          WHEN date_part('year', age(date_of_birth)) < 1 THEN 'Under 1'
          WHEN date_part('year', age(date_of_birth)) < 5 THEN '1-4'
          WHEN date_part('year', age(date_of_birth)) < 10 THEN '5-9'
          WHEN date_part('year', age(date_of_birth)) < 15 THEN '10-14'
          WHEN date_part('year', age(date_of_birth)) < 20 THEN '15-19'
          ELSE '20+'
        END
      `)
      .orderByRaw(`
        CASE
          WHEN age_group = 'Under 1' THEN 1
          WHEN age_group = '1-4' THEN 2
          WHEN age_group = '5-9' THEN 3
          WHEN age_group = '10-14' THEN 4
          WHEN age_group = '15-19' THEN 5
          ELSE 6
        END
      `)
    
    if (options.facilityId) {
      query.where('facility_id', options.facilityId)
    }
    
    return query
  }
}
```

### Reports Controller

```typescript
// backend/app/controllers/reports_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ReportingService from '#services/reporting_service'

export default class ReportsController {
  /**
   * Get immunization coverage report
   */
  async immunizationCoverage({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const { startDate, endDate, facilityId } = request.qs()
    
    // If user is not an administrator, restrict to their facility
    const reportFacilityId = user.role === 'administrator' ? facilityId : user.facilityId
    
    const reportingService = new ReportingService()
    const results = await reportingService.getImmunizationCoverage({
      startDate,
      endDate,
      facilityId: reportFacilityId
    })
    
    return response.json(results)
  }

  /**
   * Get due immunizations report
   */
  async dueImmunizations({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const { daysAhead, facilityId } = request.qs()
    
    // If user is not an administrator, restrict to their facility
    const reportFacilityId = user.role === 'administrator' ? facilityId : user.facilityId
    
    const reportingService = new ReportingService()
    const results = await reportingService.getDueImmunizations({
      facilityId: reportFacilityId,
      daysAhead: daysAhead ? parseInt(daysAhead) : undefined
    })
    
    return response.json(results)
  }

  /**
   * Get facility performance report
   */
  async facilityPerformance({ request, response, auth }: HttpContext) {
    // Only administrators and supervisors can access this report
    if (!['administrator', 'supervisor'].includes(auth.user!.role)) {
      return response.forbidden({ error: 'Access denied' })
    }
    
    const { startDate, endDate } = request.qs()
    
    const reportingService = new ReportingService()
    const results = await reportingService.getFacilityPerformance({
      startDate,
      endDate
    })
    
    return response.json(results)
  }

  /**
   * Get immunization trends report
   */
  async immunizationTrends({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const { interval, months, facilityId } = request.qs()
    
    // If user is not an administrator, restrict to their facility
    const reportFacilityId = user.role === 'administrator' ? facilityId : user.facilityId
    
    const reportingService = new ReportingService()
    const results = await reportingService.getImmunizationTrends({
      facilityId: reportFacilityId,
      interval: interval as 'day' | 'week' | 'month',
      months: months ? parseInt(months) : undefined
    })
    
    return response.json(results)
  }

  /**
   * Get age distribution report
   */
  async ageDistribution({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const { facilityId } = request.qs()
    
    // If user is not an administrator, restrict to their facility
    const reportFacilityId = user.role === 'administrator' ? facilityId : user.facilityId
    
    const reportingService = new ReportingService()
    const results = await reportingService.getAgeDistribution({
      facilityId: reportFacilityId
    })
    
    return response.json(results)
  }
}
```

### Routes Configuration

```typescript
// Add to backend/start/routes.ts
// Reports routes
router.group(() => {
  router.get('/immunization-coverage', '#controllers/reports_controller.immunizationCoverage')
  router.get('/due-immunizations', '#controllers/reports_controller.dueImmunizations')
  router.get('/facility-performance', '#controllers/reports_controller.facilityPerformance')
    .use(middleware.auth({ roles: ['administrator', 'supervisor'] }))
  router.get('/immunization-trends', '#controllers/reports_controller.immunizationTrends')
  router.get('/age-distribution', '#controllers/reports_controller.ageDistribution')
})
  .prefix('/api/reports')
  .use(middleware.auth({ roles: ['doctor', 'administrator', 'supervisor'] }))
```

## Expected Outcome
- Reporting service that generates various analytics reports
- API endpoints to access these reports with proper authorization
- Support for filtering and customizing reports
- Data aggregation for meaningful insights

## Testing
Test the reporting endpoints using a tool like Postman or curl:

```bash
# Login to get token (as administrator or doctor)
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Get immunization coverage report
curl -X GET "http://localhost:3333/api/reports/immunization-coverage?startDate=2023-01-01&endDate=2023-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get due immunizations report
curl -X GET "http://localhost:3333/api/reports/due-immunizations?daysAhead=30" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get facility performance report (admin only)
curl -X GET "http://localhost:3333/api/reports/facility-performance?startDate=2023-01-01&endDate=2023-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get immunization trends
curl -X GET "http://localhost:3333/api/reports/immunization-trends?interval=month&months=12" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
