import { BaseCommand } from '@adonisjs/core/ace'
import { DateTime } from 'luxon'
import Facility from '#models/facility'
import User from '#models/user'
import Patient from '#models/patient'
import Vaccine from '#models/vaccine'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'

export default class TestNotifications extends BaseCommand {
  static commandName = 'test:notifications'
  static description = 'Test the notification service by creating test data and generating notifications'

  async run() {
    this.logger.info('Creating test data for notification service testing...')

    // Create a facility
    let facility
    try {
      facility = await Facility.firstOrCreate(
        { name: 'Test Notification Facility' },
        {
          name: 'Test Notification Facility',
          district: 'Test District',
          address: '123 Test St',
          contactPhone: '123-456-7890'
        }
      )
      this.logger.info(`Facility: ${facility.name} (ID: ${facility.id})`)
    } catch (error) {
      this.logger.error('Error creating facility:')
      this.logger.error(error)
      return
    }

    // Create a user
    let user
    try {
      user = await User.firstOrCreate(
        { email: 'notification-test@example.com' },
        {
          username: 'notification-test',
          email: 'notification-test@example.com',
          password: 'password123',
          fullName: 'Notification Test User',
          role: 'nurse',
          facilityId: facility.id
        }
      )
      this.logger.info(`User: ${user.fullName} (ID: ${user.id})`)
    } catch (error) {
      this.logger.error('Error creating user:')
      this.logger.error(error)
      return
    }

    // Create a vaccine
    let vaccine
    try {
      vaccine = await Vaccine.firstOrCreate(
        { name: 'Test Notification Vaccine' },
        {
          name: 'Test Notification Vaccine',
          description: 'A test vaccine for notification testing',
          vaccineCode: 'TNV',
          standardScheduleAge: '0-12 months',
          sequenceNumber: 1,
          vaccineSeries: 'Test Series',
          isSupplementary: false,
          isActive: true
        }
      )
      this.logger.info(`Vaccine: ${vaccine.name} (ID: ${vaccine.id})`)
    } catch (error) {
      this.logger.error('Error creating vaccine:')
      this.logger.error(error)
      return
    }

    // Create a patient
    let patient
    try {
      patient = await Patient.firstOrCreate(
        { fullName: 'Notification Test Patient' },
        {
          fullName: 'Notification Test Patient',
          sex: 'M',
          dateOfBirth: DateTime.now().minus({ years: 1 }),
          motherName: 'Test Mother',
          fatherName: 'Test Father',
          district: 'Test District',
          townVillage: 'Test Village',
          address: '456 Test St',
          contactPhone: '987-654-3210',
          healthWorkerId: user.id,
          healthWorkerName: user.fullName,
          healthWorkerPhone: '123-456-7890',
          healthWorkerAddress: '123 Test St',
          facilityId: facility.id
        }
      )
      this.logger.info(`Patient: ${patient.fullName} (ID: ${patient.id})`)
    } catch (error) {
      this.logger.error('Error creating patient:')
      this.logger.error(error)
      return
    }

    // Create immunization records with return dates in the next 7 days
    try {
      // Delete any existing test immunization records for this patient and vaccine
      await ImmunizationRecord.query()
        .where('patientId', patient.id)
        .where('vaccineId', vaccine.id)
        .delete()

      // Create 3 immunization records with different return dates
      const now = DateTime.now()
      
      // Record 1: Return date tomorrow
      const record1 = await ImmunizationRecord.create({
        patientId: patient.id,
        vaccineId: vaccine.id,
        administeredDate: now,
        administeredByUserId: user.id,
        facilityId: facility.id,
        batchNumber: 'BATCH-001',
        healthOfficer: user.fullName,
        isStandardSchedule: true,
        scheduleStatus: 'on_schedule',
        returnDate: now.plus({ days: 1 }),
        notes: 'Test immunization record with return date tomorrow'
      })
      this.logger.info(`Created immunization record 1 with return date: ${record1.returnDate.toFormat('yyyy-MM-dd')}`)

      // Record 2: Return date in 3 days
      const record2 = await ImmunizationRecord.create({
        patientId: patient.id,
        vaccineId: vaccine.id,
        administeredDate: now,
        administeredByUserId: user.id,
        facilityId: facility.id,
        batchNumber: 'BATCH-002',
        healthOfficer: user.fullName,
        isStandardSchedule: true,
        scheduleStatus: 'on_schedule',
        returnDate: now.plus({ days: 3 }),
        notes: 'Test immunization record with return date in 3 days'
      })
      this.logger.info(`Created immunization record 2 with return date: ${record2.returnDate.toFormat('yyyy-MM-dd')}`)

      // Record 3: Return date in 7 days
      const record3 = await ImmunizationRecord.create({
        patientId: patient.id,
        vaccineId: vaccine.id,
        administeredDate: now,
        administeredByUserId: user.id,
        facilityId: facility.id,
        batchNumber: 'BATCH-003',
        healthOfficer: user.fullName,
        isStandardSchedule: true,
        scheduleStatus: 'on_schedule',
        returnDate: now.plus({ days: 7 }),
        notes: 'Test immunization record with return date in 7 days'
      })
      this.logger.info(`Created immunization record 3 with return date: ${record3.returnDate.toFormat('yyyy-MM-dd')}`)

      // Clear any existing notifications for these records
      await Notification.query()
        .where('patientId', patient.id)
        .where('vaccineId', vaccine.id)
        .delete()
      
      this.logger.success('Test data created successfully!')
      this.logger.info('')
      this.logger.info('Next steps:')
      this.logger.info('1. Run the notification generation command:')
      this.logger.info('   node ace notifications:generate')
      this.logger.info('')
      this.logger.info('2. Check if notifications were created:')
      this.logger.info('   node ace test:notifications --check')
    } catch (error) {
      this.logger.error('Error creating immunization records:')
      this.logger.error(error)
    }
  }

  // Define options for the command
  static options = {
    check: {
      description: 'Check if notifications were created',
      type: 'boolean',
      alias: 'c',
    }
  }

  // Override the run method to handle the --check option
  async handle() {
    // @ts-ignore - options is defined in BaseCommand
    if (this.options.check) {
      await this.checkNotifications()
    } else {
      await this.run()
    }
  }

  // Method to check if notifications were created
  async checkNotifications() {
    this.logger.info('Checking if notifications were created...')

    try {
      // Find the test patient
      const patient = await Patient.findBy('fullName', 'Notification Test Patient')
      if (!patient) {
        this.logger.error('Test patient not found. Run the command without --check first.')
        return
      }

      // Find the test vaccine
      const vaccine = await Vaccine.findBy('name', 'Test Notification Vaccine')
      if (!vaccine) {
        this.logger.error('Test vaccine not found. Run the command without --check first.')
        return
      }

      // Find notifications for the test patient and vaccine
      const notifications = await Notification.query()
        .where('patientId', patient.id)
        .where('vaccineId', vaccine.id)
        .orderBy('dueDate', 'asc')

      if (notifications.length === 0) {
        this.logger.error('No notifications found for the test patient and vaccine.')
        this.logger.info('Make sure you ran the notification generation command:')
        this.logger.info('node ace notifications:generate')
        return
      }

      this.logger.success(`Found ${notifications.length} notifications:`)
      
      // Load relationships
      for (const notification of notifications) {
        await notification.load('patient')
        await notification.load('vaccine')
        
        this.logger.info(`- Notification ID: ${notification.id}`)
        this.logger.info(`  Patient: ${notification.patient.fullName}`)
        this.logger.info(`  Vaccine: ${notification.vaccine.name}`)
        this.logger.info(`  Due Date: ${notification.dueDate.toFormat('yyyy-MM-dd')}`)
        this.logger.info(`  Status: ${notification.status}`)
        this.logger.info('')
      }

      this.logger.success('Notification service test completed successfully!')
    } catch (error) {
      this.logger.error('Error checking notifications:')
      this.logger.error(error)
    }
  }
}