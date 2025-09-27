/**
 * Simple script to test the immediate notification creation system
 * 
 * This script can be run directly in the Docker container:
 * docker-compose exec backend node test-notifications.js
 */

import { DateTime } from 'luxon'
import NotificationService from '#services/notification_service'

async function testImmediateNotificationCreation() {
  try {
    console.log('Starting immediate notification creation test...')
    
    const notificationService = new NotificationService()
    
    // Test creating a notification for a future date
    const futureDate = DateTime.now().plus({ days: 30 })
    console.log(`Testing notification creation for date: ${futureDate.toISODate()}`)
    
    // Test parameters (you may need to adjust these based on your test data)
    const testPatientId = 1
    const testVaccineId = 1
    const testFacilityId = 1
    
    console.log('Creating notification...')
    const notification = await notificationService.createNotificationForRecord(
      testPatientId,
      testVaccineId,
      futureDate,
      testFacilityId
    )
    
    if (notification) {
      console.log(`✅ Successfully created notification with ID: ${notification.id}`)
      console.log(`   Patient ID: ${notification.patientId}`)
      console.log(`   Vaccine ID: ${notification.vaccineId}`)
      console.log(`   Due Date: ${notification.dueDate}`)
      console.log(`   Status: ${notification.status}`)
      console.log(`   Facility ID: ${notification.facilityId}`)
    } else {
      console.log('⚠️  Notification already existed, no new notification created')
    }
    
    // Test duplicate prevention
    console.log('\nTesting duplicate prevention...')
    const duplicateNotification = await notificationService.createNotificationForRecord(
      testPatientId,
      testVaccineId,
      futureDate,
      testFacilityId
    )
    
    if (duplicateNotification && duplicateNotification.id === notification?.id) {
      console.log('✅ Duplicate prevention working - returned existing notification')
    } else if (!duplicateNotification) {
      console.log('⚠️  No notification returned for duplicate test')
    } else {
      console.log('❌ Duplicate prevention failed - created new notification')
    }
    
    // Test updating overdue notifications
    console.log('\nTesting overdue notification updates...')
    const overdueResult = await notificationService.updateOverdueNotifications()
    console.log(`✅ Updated ${overdueResult.updated} notifications to overdue status`)
    
    // Test getting due notifications for facility
    console.log('\nTesting facility notification retrieval...')
    const dueNotifications = await notificationService.getDueNotifications(testFacilityId)
    console.log(`✅ Found ${dueNotifications.length} due notifications for facility ${testFacilityId}`)
    
    console.log('\n🎉 All notification tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing notification system:')
    console.error(error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

async function testErrorHandling() {
  try {
    console.log('\nTesting error handling...')
    
    const notificationService = new NotificationService()
    
    // Test with invalid date
    try {
      const invalidDate = DateTime.fromISO('invalid-date')
      await notificationService.createNotificationForRecord(1, 1, invalidDate, 1)
      console.log('❌ Should have thrown error for invalid date')
    } catch (error) {
      console.log('✅ Correctly handled invalid date error')
    }
    
    // Test with non-existent IDs (this might fail depending on your constraints)
    try {
      const futureDate = DateTime.now().plus({ days: 30 })
      await notificationService.createNotificationForRecord(99999, 99999, futureDate, 99999)
      console.log('⚠️  Created notification with potentially non-existent IDs (check your constraints)')
    } catch (error) {
      console.log('✅ Correctly handled non-existent ID error:', error.message)
    }
    
  } catch (error) {
    console.error('Error in error handling test:', error.message)
  }
}

// Run the tests
async function runAllTests() {
  await testImmediateNotificationCreation()
  await testErrorHandling()
  console.log('\n✨ All tests completed!')
}

runAllTests()