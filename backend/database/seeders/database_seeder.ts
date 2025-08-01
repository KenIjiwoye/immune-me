import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    console.log('Running seeders in sequence...')
    
    // Note: In AdonisJS, seeders are typically run individually via command line
    // or using the db:seed command which runs all seeders in alphabetical order
    console.log('User and vaccine seeders will be run automatically')
    console.log('Use: node ace db:seed to run all seeders')
  }
}
