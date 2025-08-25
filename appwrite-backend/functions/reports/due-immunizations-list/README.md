# Due Immunizations Report Function

This Appwrite serverless function generates comprehensive reports for due immunizations, including overdue, upcoming, and priority-categorized immunizations for patients.

## Features

- **Overdue Immunizations Tracking**: Identifies immunizations that are past their due date
- **Upcoming Immunizations**: Lists immunizations due within the next 30 days (configurable)
- **Priority-Based Categorization**: Classifies immunizations as high, medium, or low priority
- **Facility-Based Filtering**: Filter reports by specific healthcare facilities
- **Patient Contact Information**: Includes contact details for notification purposes
- **Vaccine Schedule Validation**: Validates immunization schedules against standard protocols
- **Comprehensive Reporting**: Provides detailed statistics and summaries

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (see `.env.example`)

3. Deploy to Appwrite:
```bash
appwrite deploy function
```

## Usage

### Basic Usage
```javascript
// Get all due immunizations
GET /functions/due-immunizations-list/executions

// With facility filter
GET /functions/due-immunizations-list/executions?facilityId=12345

// With priority filter
GET /functions/due-immunizations-list/executions?priority=high

// With status filter
GET /functions/due-immunizations-list/executions?status=overdue

// With custom days ahead
GET /functions/due-immunizations-list/executions?daysAhead=60
```

### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `facilityId` | string | Filter by facility ID | All facilities |
| `priority` | string | Filter by priority level (`high`, `medium`, `low`) | All priorities |
| `status` | string | Filter by status (`overdue`, `upcoming`, `due_soon`) | All statuses |
| `daysAhead` | number | Number of days to look ahead for upcoming immunizations | 30 |

### Response Format

```json
{
  "success": true,
  "data": {
    "immunizations": [
      {
        "patient_id": "patient123",
        "patient_name": "John Doe",
        "patient_email": "john@example.com",
        "patient_phone": "+1234567890",
        "patient_date_of_birth": "2020-01-15",
        "patient_age": 4,
        "facility_id": "facility123",
        "facility_name": "Central Health Center",
        "vaccine_id": "vaccine456",
        "vaccine_name": "Measles, Mumps, Rubella",
        "vaccine_code": "MMR",
        "dose_number": 1,
        "due_date": "2024-09-15",
        "status": "overdue",
        "priority": "high",
        "days_overdue": 15,
        "days_until_due": 0,
        "last_dose_date": null,
        "notes": "First dose of MMR vaccine"
      }
    ],
    "summary": {
      "total_due": 150,
      "overdue": 25,
      "upcoming": 100,
      "due_soon": 25,
      "high_priority": 45,
      "medium_priority": 70,
      "low_priority": 35,
      "by_vaccine": {
        "MMR": 30,
        "DTP": 25,
        "Polio": 20
      },
      "by_facility": {
        "Central Health Center": 50,
        "North Clinic": 40,
        "South Hospital": 60
      }
    },
    "generated_at": "2024-09-30 14:30:00",
    "filters": {
      "facilityId": null,
      "priority": null,
      "status": null,
      "daysAhead": 30
    }
  }
}
```

## Data Collections Required

This function expects the following Appwrite collections to be configured:

### 1. Patients Collection
- `first_name` (string)
- `last_name` (string)
- `date_of_birth` (string, ISO date)
- `email` (string, optional)
- `phone` (string, optional)
- `facility_id` (string)

### 2. Immunization Records Collection
- `patient_id` (string)
- `vaccine_id` (string)
- `administration_date` (string, ISO date)
- `dose_number` (number)

### 3. Vaccine Schedules Collection
- `vaccine_id` (string)
- `dose_number` (number)
- `age_value` (number)
- `age_unit` (string: days, weeks, months, years)
- `min_interval_days` (number, optional)
- `notes` (string, optional)

### 4. Vaccines Collection
- `name` (string)
- `code` (string)

### 5. Facilities Collection
- `name` (string)

## Environment Variables

See `.env.example` for required environment variables.

## Error Handling

The function includes comprehensive error handling:
- Validates required environment variables
- Handles database connection errors
- Provides detailed error messages in responses
- Logs errors for debugging

## Testing

Run the test structure to verify the function:
```bash
npm test
```

## Deployment

1. Ensure all environment variables are set in Appwrite
2. Deploy the function:
```bash
appwrite deploy function
```

3. Test the deployment:
```bash
appwrite functions createExecution --functionId=due-immunizations-list
```

## Performance Considerations

- Uses pagination for large datasets
- Implements efficient database queries
- Caches vaccine schedules and vaccines for better performance
- Limits concurrent patient processing

## Security

- Uses Appwrite API keys for authentication
- Validates all input parameters
- Sanitizes database queries
- Follows Appwrite security best practices