/**
 * Simple script to test the notification service
 * 
 * This script can be run directly in the Docker container:
 * docker-compose exec backend node test-notifications.js
 */

import { NotificationService } from '#services/notification_service'

async function testNotifications() {
  try {
    console.log('Starting notification service test...')
    
    const notificationService = new NotificationService()
    
    console.log('Generating due notifications...')
    const dueResult = await notificationService.generateDueNotifications()
    console.log(`Processed ${dueResult.processed} records, created ${dueResult.created} notifications`)
    
    console.log('Updating overdue notifications...')
    const overdueResult = await notificationService.updateOverdueNotifications()
    console.log(`Updated ${overdueResult.updated} notifications to overdue status`)
    
    console.log('Notification service test completed successfully!')
  } catch (error) {
    console.error('Error testing notification service:')
    console.error(error)
  }
}

// Run the test
testNotifications()