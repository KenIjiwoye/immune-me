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
import AuthMiddleware from '#middleware/auth_middleware'
import ProfileMiddleware from '#middleware/profile_middleware'

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

// Example of role-based route protection
router.group(() => {
  router.get('/users', async ({ response }) => {
    return response.json({ message: 'Admin users list would be here' })
  })
})
  .prefix('/api/admin')
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

// Profile routes
router.group(() => {
  // Get user profile information
  router.get('/user/:userId', '#controllers/profiles_controller.show')
  
  // Patient profile routes
  router.post('/patient', '#controllers/profiles_controller.createPatientProfile')
    .use(AuthMiddleware.profileAware({ roles: ['administrator', 'supervisor', 'doctor'] }))
  
  router.put('/patient/:userId', '#controllers/profiles_controller.updatePatientProfile')
    .use(AuthMiddleware.profileAware())
  
  // Employee profile routes
  router.post('/employee', '#controllers/profiles_controller.createEmployeeProfile')
    .use(AuthMiddleware.profileAware({ roles: ['administrator'] }))
  
  router.put('/employee/:userId', '#controllers/profiles_controller.updateEmployeeProfile')
    .use(AuthMiddleware.profileAware({ roles: ['administrator', 'supervisor'] }))
  
  // Admin profile routes
  router.post('/admin', '#controllers/profiles_controller.createAdminProfile')
    .use(AuthMiddleware.profileAware({ roles: ['administrator'] }))
  
  router.put('/admin/:userId', '#controllers/profiles_controller.updateAdminProfile')
    .use(AuthMiddleware.profileAware({ roles: ['administrator'] }))
  
  // Search and discovery routes
  router.get('/search', '#controllers/profiles_controller.search')
    .use(AuthMiddleware.profileAware({ roles: ['administrator', 'supervisor', 'doctor'] }))
  
  router.get('/facility/:facilityId', '#controllers/profiles_controller.getFacilityProfiles')
    .use(AuthMiddleware.profileAware())
})
  .prefix('/api/profiles')
  .use(middleware.auth())

// Enhanced routes with Profile-aware authentication
router.group(() => {
  // Enhanced patients routes with Profile awareness
  router.get('/', '#controllers/patients_controller.index')
    .use(AuthMiddleware.profileAware())
  
  router.get('/search', '#controllers/patients_controller.search')
    .use(AuthMiddleware.profileAware())
  
  router.get('/:id', '#controllers/patients_controller.show')
    .use(AuthMiddleware.profileAware())
  
  router.post('/', '#controllers/patients_controller.store')
    .use(AuthMiddleware.profileAware({ roles: ['administrator', 'supervisor', 'doctor'] }))
  
  router.put('/:id', '#controllers/patients_controller.update')
    .use(AuthMiddleware.profileAware({ roles: ['administrator', 'supervisor', 'doctor'] }))
  
  router.delete('/:id', '#controllers/patients_controller.destroy')
    .use(AuthMiddleware.profileAware({ roles: ['administrator'] }))
  
  router.get('/:patientId/immunization-records', '#controllers/immunization_records_controller.getPatientRecords')
    .use(AuthMiddleware.profileAware())
})
  .prefix('/api/v2/patients')

// Enhanced immunization records routes with Profile awareness and credential validation
router.group(() => {
  router.get('/', '#controllers/immunization_records_controller.index')
    .use(AuthMiddleware.profileAware())
  
  router.get('/:id', '#controllers/immunization_records_controller.show')
    .use(AuthMiddleware.profileAware())
  
  router.post('/', '#controllers/immunization_records_controller.store')
    .use(AuthMiddleware.medicalOperation({ roles: ['administrator', 'supervisor', 'doctor', 'nurse'] }))
  
  router.put('/:id', '#controllers/immunization_records_controller.update')
    .use(AuthMiddleware.medicalOperation({ roles: ['administrator', 'supervisor', 'doctor', 'nurse'] }))
  
  router.delete('/:id', '#controllers/immunization_records_controller.destroy')
    .use(AuthMiddleware.profileAware({ roles: ['administrator'] }))
})
  .prefix('/api/v2/immunization-records')

// Profile-specific middleware examples
router.group(() => {
  router.get('/dashboard', '#controllers/dashboard_controller.stats')
    .use(ProfileMiddleware.requireStaff())
  
  router.get('/admin-panel', async ({ response }) => {
    return response.json({ message: 'Admin panel access granted' })
  })
    .use(ProfileMiddleware.requireAdmin())
  
  router.get('/medical-operations', async ({ response }) => {
    return response.json({ message: 'Medical operations access granted' })
  })
    .use(ProfileMiddleware.requireEmployee())
    .use(AuthMiddleware.medicalOperation())
})
  .prefix('/api/v2/secure')
