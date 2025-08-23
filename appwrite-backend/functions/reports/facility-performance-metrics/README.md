# Facility Performance Metrics Function

An Appwrite function that calculates comprehensive facility performance metrics including immunization rates, notification response rates, and staff performance tracking.

## Features

- **Immunization Metrics**: Calculate immunization coverage rates, vaccine-specific rates, and age group analysis
- **Notification Performance**: Track notification delivery, read, and response rates
- **Staff Performance**: Monitor individual staff member performance and engagement
- **Period Comparison**: Compare current performance with previous periods
- **Overall Performance Score**: Weighted scoring system across all metrics
- **Actionable Insights**: Generate recommendations based on performance gaps

## Installation

1. Copy the function to your Appwrite functions directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (see `.env.example`)

## Usage

### Request Format

```json
{
  "facilityId": "facility-id-here",
  "periodDays": 30,
  "compareWithPrevious": true
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "facility": {
      "id": "facility-id",
      "name": "Facility Name",
      "type": "health_center",
      "location": "Location"
    },
    "period": {
      "days": 30,
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "metrics": {
      "immunization": {
        "totalPatients": 1000,
        "totalImmunizations": 850,
        "uniqueImmunizedPatients": 720,
        "immunizationRate": 72.0,
        "vaccineRates": [...],
        "ageGroupRates": {...},
        "previousPeriod": {...}
      },
      "notifications": {
        "totalNotifications": 500,
        "deliveryRate": 95.0,
        "readRate": 80.0,
        "responseRate": 65.0,
        "typeRates": [...],
        "previousPeriod": {...}
      },
      "staff": {
        "totalStaff": 15,
        "avgImmunizationsPerStaff": 56.67,
        "avgResponseRate": 78.5,
        "staffPerformance": [...],
        "previousPeriod": {...}
      },
      "overallScore": {
        "score": 75.2,
        "breakdown": {
          "immunization": 72.0,
          "notifications": 65.0,
          "staff": 78.5
        }
      }
    },
    "summary": {
      "level": "Good",
      "description": "Facility is performing well...",
      "strengths": [...],
      "improvements": [...],
      "recommendations": [...]
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID | - |
| `APPWRITE_API_KEY` | Your Appwrite API key | - |
| `DATABASE_ID` | Database ID | `immune-me` |
| `IMMUNIZATION_RECORDS_COLLECTION` | Immunization records collection | `immunization-records` |
| `NOTIFICATIONS_COLLECTION` | Notifications collection | `notifications` |
| `USERS_COLLECTION` | Users collection | `users` |
| `PATIENTS_COLLECTION` | Patients collection | `patients` |
| `FACILITIES_COLLECTION` | Facilities collection | `facilities` |
| `TIMEZONE` | Timezone for date calculations | `Africa/Monrovia` |

## Performance Metrics

### Immunization Metrics
- **Overall immunization rate**: Percentage of registered patients who have received immunizations
- **Vaccine-specific rates**: Breakdown by vaccine type
- **Age group analysis**: Immunization rates by age groups (0-1, 1-5, 5-15, 15+)
- **Period comparison**: Changes from previous period

### Notification Metrics
- **Delivery rate**: Percentage of notifications successfully delivered
- **Read rate**: Percentage of delivered notifications that were read
- **Response rate**: Percentage of delivered notifications that received responses
- **Type analysis**: Performance by notification type (reminders, alerts, etc.)

### Staff Performance
- **Immunizations per staff**: Average immunizations administered per staff member
- **Response rate**: Average response rate for notifications sent by staff
- **Individual performance**: Detailed metrics for each staff member
- **Engagement tracking**: Last active timestamps

### Overall Score
Weighted scoring system:
- Immunization rate: 40%
- Notification response rate: 30%
- Staff performance: 30%

## Error Handling

The function includes comprehensive error handling:
- Missing facilityId returns 400 Bad Request
- Database errors return 500 Internal Server Error
- All errors include descriptive messages

## Testing

Create a test file to validate the function:

```javascript
// test/test.js
import { mockRequest, mockResponse } from './test-utils.js';

const test = async () => {
  const req = mockRequest({
    facilityId: 'test-facility-id',
    periodDays: 30,
    compareWithPrevious: true
  });
  
  const res = mockResponse();
  
  const main = (await import('../src/main.js')).default;
  await main({ req, res, log: console.log, error: console.error });
  
  console.log('Response:', res.json());
};

test();
```

## Deployment

1. Deploy to Appwrite Functions
2. Set environment variables
3. Configure execution permissions
4. Test with sample requests