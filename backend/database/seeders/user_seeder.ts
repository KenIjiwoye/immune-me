import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Facility from '#models/facility'

export default class extends BaseSeeder {
  async run() {
    // Create test facilities first
    const facility1 = await Facility.create({
      name: 'Central Health Center',
      district: 'Monrovia',
      address: '123 Main Street, Monrovia',
      contactPhone: '+231-555-0001'
    })

    const facility2 = await Facility.create({
      name: 'Community Clinic',
      district: 'Paynesville',
      address: '456 Community Road, Paynesville',
      contactPhone: '+231-555-0002'
    })

    // Create an admin user with facility assignment
    await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'administrator',
      facilityId: facility1.id
    })

    // Create a regular user with facility assignment
    await User.create({
      fullName: 'Regular User',
      email: 'user@example.com',
      password: 'password123',
      role: 'nurse',
      facilityId: facility2.id
    })

    console.log('Facilities and users seeded successfully!')
  }
}