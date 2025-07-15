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