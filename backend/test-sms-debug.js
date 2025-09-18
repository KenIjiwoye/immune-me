/**
 * Test script to validate enhanced SMS error logging
 * Run with: node test-sms-debug.js
 */

const { SmsService } = require('./app/services/sms_service.ts')

async function testSmsErrorLogging() {
  console.log('🧪 Testing SMS Service Enhanced Error Logging')
  console.log('=' .repeat(50))
  
  try {
    const smsService = new SmsService()
    
    // Test 1: Check configuration status
    console.log('\n📋 Configuration Status:')
    const configStatus = smsService.getConfigurationStatus()
    console.log(JSON.stringify(configStatus, null, 2))
    
    // Test 2: Test SMS sending with enhanced logging
    console.log('\n📱 Testing SMS Send (this will likely fail but show detailed logs):')
    const testPhone = '+231777123456'
    const testMessage = 'Test message for debugging SMS service'
    
    const result = await smsService.sendSms(testPhone, testMessage, 'TestSender')
    
    console.log('\n📊 SMS Result:')
    console.log(JSON.stringify(result, null, 2))
    
    if (!result.success) {
      console.log('\n❌ SMS Failed (Expected) - Check logs above for detailed error information')
      console.log('Error Code:', result.errorCode)
      console.log('Error Message:', result.error)
    } else {
      console.log('\n✅ SMS Sent Successfully!')
      console.log('Message ID:', result.messageId)
    }
    
  } catch (error) {
    console.error('\n💥 Test Script Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testSmsErrorLogging()
  .then(() => {
    console.log('\n🏁 Test completed. Check the logs above for detailed error information.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })