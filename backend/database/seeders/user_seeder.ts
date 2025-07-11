import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // Create an admin user
    await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'administrator'
    })

    // Create a regular user
    await User.create({
      fullName: 'Regular User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    })

    console.log('Users seeded successfully!')
  }
}