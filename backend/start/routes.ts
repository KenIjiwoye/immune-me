/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// Health check endpoint for Docker
router.get('/health', async () => {
  return {
    status: 'healthy',
  }
})

// Auth routes
const authRoutes = router.group(() => {
  // Public routes
  router.post('/login', '#controllers/auth_controller.login')
  
  // Protected routes
  router.group(() => {
    router.post('/logout', '#controllers/auth_controller.logout')
    router.post('/refresh-token', '#controllers/auth_controller.refreshToken')
    router.get('/me', '#controllers/auth_controller.me')
  }).use(middleware.auth())
})
authRoutes.prefix('/api/auth')

// Facilities routes
const facilitiesRoutes = router.group(() => {
  router.get('/', '#controllers/facilities_controller.index')
  router.get('/:id', '#controllers/facilities_controller.show')
  router.post('/', '#controllers/facilities_controller.store')
  router.put('/:id', '#controllers/facilities_controller.update')
  router.delete('/:id', '#controllers/facilities_controller.destroy')
})
  .prefix('/api/facilities')
  .use(middleware.auth())

// Vaccines routes
const vaccinesRoutes = router.group(() => {
  router.get('/', '#controllers/vaccines_controller.index')
  router.get('/:id', '#controllers/vaccines_controller.show')
  router.post('/', '#controllers/vaccines_controller.store')
  router.put('/:id', '#controllers/vaccines_controller.update')
  router.delete('/:id', '#controllers/vaccines_controller.destroy')
})
  .prefix('/api/vaccines')
  .use(middleware.auth())

// Patients routes
router.group(() => {
  router.get('/', '#controllers/patients_controller.index')
  router.get('/search', '#controllers/patients_controller.search')
  router.get('/:id', '#controllers/patients_controller.show')
  router.post('/', '#controllers/patients_controller.store')
  router.put('/:id', '#controllers/patients_controller.update')
  router.delete('/:id', '#controllers/patients_controller.destroy').use(middleware.auth({ roles: ['administrator'] }))
  router.get('/:patientId/immunization-records', '#controllers/immunization_records_controller.getPatientRecords')
})
  .prefix('/api/patients')
  .use(middleware.auth())

// Immunization records routes
router.group(() => {
  router.get('/', '#controllers/immunization_records_controller.index')
  router.get('/:id', '#controllers/immunization_records_controller.show')
  router.post('/', '#controllers/immunization_records_controller.store')
  router.put('/:id', '#controllers/immunization_records_controller.update')
  router.delete('/:id', '#controllers/immunization_records_controller.destroy').use(middleware.auth({ roles: ['administrator'] }))
})
  .prefix('/api/immunization-records')
  .use(middleware.auth())

// Notifications routes
const notificationsRoutes = router.group(() => {
  router.get('/', '#controllers/notifications_controller.index')
  router.get('/due', '#controllers/notifications_controller.getDueNotifications')
  router.get('/:id', '#controllers/notifications_controller.show')
  router.post('/', '#controllers/notifications_controller.store')
  router.put('/:id', '#controllers/notifications_controller.update')
  router.delete('/:id', '#controllers/notifications_controller.destroy')
  
  // Admin-only route to manually trigger notification generation
  router.post('/generate', '#controllers/notifications_controller.generateNotifications')
    .use(middleware.auth({ roles: ['administrator'] }))
})
  .prefix('/api/notifications')
  .use(middleware.auth())

// Users routes
const usersRoutes = router.group(() => {
  router.get('/', '#controllers/users_controller.index')
  router.get('/:id', '#controllers/users_controller.show')
  router.post('/', '#controllers/users_controller.store')
  router.put('/:id', '#controllers/users_controller.update')
  router.delete('/:id', '#controllers/users_controller.destroy')
})
  .prefix('/api/users')
  .use(middleware.auth({ roles: ['administrator'] }))

// Dashboard routes
router.group(() => {
  router.get('/stats', '#controllers/dashboard_controller.stats')
})
  .prefix('/api/dashboard')
  .use(middleware.auth())

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
