# Immunization Coverage Report Function

This Appwrite function generates comprehensive immunization coverage reports with caching support.

## Features

- **Multi-dimensional Coverage Analysis**: Calculates coverage by vaccine, age group, facility, and monthly trends
- **Caching**: Results are cached for 24 hours to improve performance
- **Flexible Filtering**: Supports filtering by facility, date range, and vaccine type
- **Real-time Calculations**: Dynamically calculates coverage rates based on current data
- **Error Handling**: Comprehensive error handling with meaningful error messages

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see Environment Variables section)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | Yes |
| `APPWRITE_PROJECT_ID` | Appwrite project ID | Yes |
| `APPWRITE_API_KEY` | Appwrite API key with read permissions | Yes |
| `APPWRITE_DATABASE_ID` | Database ID containing collections | Yes |
| `IMMUNIZATION_RECORDS_COLLECTION_ID` | Collection ID for immunization records | Yes |
| `PATIENTS_COLLECTION_ID` | Collection ID for patients | Yes |
| `FACILITIES_COLLECTION_ID` | Collection ID for facilities | Yes |
| `VACCINES_COLLECTION_ID` | Collection ID for vaccines | Yes |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds (default: 86400) | No |

## Usage

### Request Parameters

- `facilityId` (optional): Filter by specific facility
- `startDate` (optional): Start date in ISO format (YYYY-MM-DD)
- `endDate` (optional): End date in ISO format (YYYY-MM-DD)
- `vaccineId` (optional): Filter by specific vaccine

### Example Request

```bash
curl -X GET "https://your-appwrite-endpoint.com/v1/functions/immunization-coverage-report/executions?startDate=2024-01-01&endDate=2024-12-31"
```

### Response Format

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPatients": 1250,
      "totalImmunizations": 3420,
      "totalFacilities": 15,
      "totalVaccines": 8,
      "overallCoverageRate": 78.5
    },
    "coverageByVaccine": [
      {
        "vaccineId": "vaccine123",
        "vaccineName": "BCG",
        "totalAdministered": 1200,
        "targetPopulation": 1250,
        "coverageRate": 96.0,
        "fullyImmunized": 1100
      }
    ],
    "coverageByAgeGroup": [
      {
        "ageGroup": "0-11 months",
        "totalChildren": 200,
        "fullyImmunized": 180,
        "coverageRate": 90.0,
        "vaccines": {
          "vaccine123": {
            "vaccineId": "vaccine123",
            "vaccineName": "BCG",
            "administered": 190,
            "coverageRate": 95.0
          }
        }
      }
    ],
    "coverageByFacility": [
      {
        "facilityId": "facility123",
        "facilityName": "Central Hospital",
        "totalAdministered": 450,
        "targetPopulation": 500,
        "coverageRate": 90.0,
        "fullyImmunized": 420
      }
    ],
    "monthlyTrends": [
      {
        "month": "2024-01",
        "totalAdministered": 280,
        "vaccines": {
          "vaccine123": {
            "vaccineId": "vaccine123",
            "vaccineName": "BCG",
            "count": 95
          }
        }
      }
    ],
    "generatedAt": "2024-01-15T10:30:00.000Z"
  },
  "cached": false
}
```

## Age Groups

The function uses the following age groups for analysis:
- 0-11 months
- 12-23 months
- 24-35 months
- 36-47 months
- 48-59 months
- 5+ years

## Development

### Running Locally

1. Create a `.env` file with the required environment variables
2. Run the function:
```bash
npm run dev
```

### Testing

The function includes basic validation. For comprehensive testing, use the Appwrite console or create test scripts.

## Error Handling

The function handles various error scenarios:
- Missing environment variables
- Invalid collection IDs
- Database connection issues
- Invalid query parameters

All errors return a JSON response with `success: false` and an appropriate error message.

## Performance

- **Caching**: Results are cached for 24 hours by default
- **Pagination**: Uses efficient pagination for large datasets
- **Batch Processing**: Processes records in batches to handle large volumes
- **Memory Management**: Uses Maps and Sets for efficient lookups

## Deployment

Deploy this function using the Appwrite CLI or through the Appwrite console. Ensure all environment variables are properly configured before deployment.