import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class DashboardController {
  /**
   * Get dashboard statistics
   */
  async stats({ response, auth }: HttpContext) {
    const user = auth.user!
    
    try {
      // Base queries for stats
      let patientsQuery = db.from('patients')
      let immunizationsQuery = db.from('immunization_records')
      
      // Apply facility restriction for non-administrators
      if (user.role !== 'administrator') {
        patientsQuery = patientsQuery.where('facility_id', user.facilityId)
        immunizationsQuery = immunizationsQuery.where('facility_id', user.facilityId)
      }
      
      // Get total patients
      const totalPatientsResult = await patientsQuery.clone().count('* as count').first()
      const totalPatients = totalPatientsResult?.count || 0
      
      // Get total immunizations
      const totalImmunizationsResult = await immunizationsQuery.clone().count('* as count').first()
      const totalImmunizations = totalImmunizationsResult?.count || 0
      
      // Get pending immunizations (due in the future)
      const pendingImmunizationsResult = await immunizationsQuery.clone()
        .whereNotNull('return_date')
        .where('return_date', '>', DateTime.now().toSQL())
        .count('* as count')
        .first()
      const pendingImmunizations = pendingImmunizationsResult?.count || 0
      
      // Get overdue immunizations (due in the past and not completed)
      const overdueImmunizationsResult = await immunizationsQuery.clone()
        .whereNotNull('return_date')
        .where('return_date', '<', DateTime.now().toSQL())
        .whereNull('administered_date') // Not yet administered
        .count('* as count')
        .first()
      const overdueImmunizations = overdueImmunizationsResult?.count || 0
      
      return response.json({
        totalPatients: Number(totalPatients),
        totalImmunizations: Number(totalImmunizations),
        pendingImmunizations: Number(pendingImmunizations),
        overdueImmunizations: Number(overdueImmunizations)
      })
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return response.status(500).json({
        error: 'Failed to fetch dashboard statistics'
      })
    }
  }
}