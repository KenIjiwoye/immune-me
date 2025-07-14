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

// Notifications routes
const notificationsRoutes = router.group(() => {
  router.get('/', '#controllers/notifications_controller.index')
  router.get('/due', '#controllers/notifications_controller.getDueNotifications')
  router.get('/:id', '#controllers/notifications_controller.show')
  router.post('/', '#controllers/notifications_controller.store')
  router.put('/:id', '#controllers/notifications_controller.update')
  router.delete('/:id', '#controllers/notifications_controller.destroy')
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
