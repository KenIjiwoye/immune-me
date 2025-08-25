# Generate CSV Export Function

This Appwrite function generates CSV export reports for immunization data with support for multiple report types and streaming capabilities.

## Features

- **Multiple Report Types**: Supports 5 different report types
- **Streaming Support**: Handles large datasets efficiently
- **CSV Formatting**: Proper headers, data validation, and formatting
- **Appwrite Storage**: Automatic file upload with download URLs
- **Flexible Filtering**: Date ranges, facility filters, and custom parameters
- **Error Handling**: Comprehensive validation and error reporting

## Supported Report Types

1. **immunization_coverage**: Coverage rates by vaccine and facility
2. **facility_performance**: Performance metrics for healthcare facilities
3. **due_immunizations**: List of patients with upcoming due immunizations
4. **age_distribution**: Immunization data grouped by age demographics
5. **vaccine_usage**: Usage statistics for vaccines across facilities

## Installation

1. Deploy this function to your Appwrite project
2. Set up the required environment variables
3. Ensure your Appwrite database has the required collections

## Environment Variables

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_STORAGE_BUCKET_ID=your_storage_bucket_id
MAX_RECORDS_PER_BATCH=1000
CSV_CHUNK_SIZE=10000
```

## API Usage

### Request Format
```json
POST /functions/generate-csv-export/executions
Content-Type: application/json

{
  "reportType": "immunization_coverage",
  "filters": {
    "facilityId": "optional_facility_id",
    "vaccineId": "optional_vaccine_id"
  },
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "fileId": "file_unique_id",
    "fileName": "immunization_coverage_report_2024-08-24_12-30-45.csv",
    "downloadUrl": "https://cloud.appwrite.io/v1/storage/buckets/.../download?project=...",
    "fileSize": 1024,
    "recordCount": 150,
    "reportType": "immunization_coverage",
    "generatedAt": "2024-08-24T12:30:45.000Z"
  }
}
```

## Error Handling

The function includes comprehensive error handling for:
- Invalid report types
- Missing required parameters
- Database connection issues
- File upload failures
- Data validation errors

## Testing

Run the test suite:
```bash
npm test
```

## Database Collections Required

- `immunization_records`
- `patients`
- `facilities`
- `vaccines`
- `due_immunizations`

## Performance Notes

- Uses streaming for large datasets
- Batch processing for memory efficiency
- Configurable chunk sizes via environment variables
- Automatic pagination for large result sets