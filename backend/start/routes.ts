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

// Example of role-based route protection
router.group(() => {
  router.get('/users', async ({ response }) => {
    return response.json({ message: 'Admin users list would be here' })
  })
})
  .prefix('/api/admin')
  .use(middleware.auth({ roles: ['administrator'] }))
