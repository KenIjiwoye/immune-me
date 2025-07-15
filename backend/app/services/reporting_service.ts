import db from '@adonisjs/lucid/services/db'
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
    const query = db.from('immunization_records')
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
    
    const query = db.from('immunization_records')
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
    const query = db.from('immunization_records')
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
    
    const query = db.from('immunization_records')
      .select(
        db.raw(`to_char(administered_date, '${dateFormat}') as time_period`),
        db.raw('count(*) as count')
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
    const query = db.from('patients')
      .select(
        db.raw(`
          CASE
            WHEN date_part('year', age(date_of_birth)) < 1 THEN 'Under 1'
            WHEN date_part('year', age(date_of_birth)) < 5 THEN '1-4'
            WHEN date_part('year', age(date_of_birth)) < 10 THEN '5-9'
            WHEN date_part('year', age(date_of_birth)) < 15 THEN '10-14'
            WHEN date_part('year', age(date_of_birth)) < 20 THEN '15-19'
            ELSE '20+'
          END as age_group
        `),
        db.raw('count(*) as count')
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