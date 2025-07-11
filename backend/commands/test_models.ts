import { BaseCommand } from '@adonisjs/core/ace'
import { DateTime } from 'luxon'
import Facility from '#models/facility'
import User from '#models/user'
import Patient from '#models/patient'
import Vaccine from '#models/vaccine'

export default class TestModels extends BaseCommand {
  static commandName = 'test:models'
  static description = 'Test the models'

  async run() {
    // Create a facility
    const facility = await Facility.create({
      name: 'Test Hospital',
      district: 'Test District',
      address: '123 Test St',
      contactPhone: '123-456-7890'
    })

    this.logger.info(`Created facility: ${facility.name}`)

    // Create a user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'nurse',
      facilityId: facility.id
    })

    this.logger.info(`Created user: ${user.fullName}`)

    // Load relationship
    await user.load('facility')
    this.logger.info(`User belongs to facility: ${user.facility.name}`)

    // Create a vaccine
    const vaccine = await Vaccine.create({
      name: 'Test Vaccine',
      description: 'A test vaccine',
      vaccineCode: 'TST',
      standardScheduleAge: '0-12 months',
      sequenceNumber: 1,
      vaccineSeries: 'Test Series',
      isSupplementary: false,
      isActive: true
    })

    this.logger.info(`Created vaccine: ${vaccine.name}`)

    // Create a patient
    const patient = await Patient.create({
      fullName: 'Test Patient',
      sex: 'M',
      dateOfBirth: DateTime.now(),
      motherName: 'Mother Name',
      fatherName: 'Father Name',
      district: 'Test District',
      townVillage: 'Test Village',
      address: '456 Test St',
      contactPhone: '987-654-3210',
      healthWorkerId: user.id,
      healthWorkerName: user.fullName,
      healthWorkerPhone: '123-456-7890',
      healthWorkerAddress: '123 Test St',
      facilityId: facility.id
    })

    this.logger.info(`Created patient: ${patient.fullName}`)

    // Load relationships
    await patient.load('facility')
    await patient.load('healthWorker')
    this.logger.info(`Patient belongs to facility: ${patient.facility.name}`)
    this.logger.info(`Patient's health worker: ${patient.healthWorker.fullName}`)

    this.logger.success('All models tested successfully!')
  }
}
