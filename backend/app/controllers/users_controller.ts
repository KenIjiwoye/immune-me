import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { userStoreValidator } from '#validators/user/store'
import { userUpdateValidator } from '#validators/user/update'

export default class UsersController {
  /**
   * List all users
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const search = request.input('search')
    const role = request.input('role')
    const facilityId = request.input('facility_id')

    let query = User.query().preload('facility')

    if (search) {
      query = query.where((q) => {
        q.where('fullName', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`)
          .orWhere('username', 'like', `%${search}%`)
      })
    }

    if (role) {
      query = query.where('role', role)
    }

    if (facilityId) {
      query = query.where('facilityId', facilityId)
    }

    const users = await query.paginate(page, limit)

    return response.json(users)
  }

  /**
   * Get user by ID
   */
  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await user.load('facility')

    return response.json(user)
  }

  /**
   * Create new user
   */
  async store({ request, response }: HttpContext) {
    // Validate request data
    const data = await request.validateUsing(userStoreValidator)

    const user = await User.create(data)

    return response.created(user)
  }

  /**
   * Update user
   */
  async update({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    // Validate request data
    const data = await request.validateUsing(userUpdateValidator)

    // Check uniqueness for username if provided
    if (data.username) {
      const existingUser = await User.query()
        .where('username', data.username)
        .whereNot('id', params.id)
        .first()
      if (existingUser) {
        return response.badRequest({ message: 'Username already exists' })
      }
    }

    // Check uniqueness for email if provided
    if (data.email) {
      const existingUser = await User.query()
        .where('email', data.email)
        .whereNot('id', params.id)
        .first()
      if (existingUser) {
        return response.badRequest({ message: 'Email already exists' })
      }
    }

    user.merge(data)
    await user.save()

    return response.json(user)
  }

  /**
   * Delete user
   */
  async destroy({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await user.delete()

    return response.noContent()
  }
}