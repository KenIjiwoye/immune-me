# Generate Excel Export Function

This Appwrite function generates professional Excel reports for immunization data with multiple report types and comprehensive formatting.

## Features

- **Multiple Report Types**: Supports 5 different report types
  - Immunization Coverage
  - Facility Performance
  - Due Immunizations
  - Age Distribution
  - Vaccine Usage
- **Professional Formatting**: Headers, styling, data validation, and conditional formatting
- **Multiple Worksheets**: Each report includes relevant data views
- **File Upload**: Automatic upload to Appwrite Storage
- **Download URLs**: Generated for easy access
- **Error Handling**: Comprehensive validation and error handling

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (see `.env.example`)

## Usage

### Request Format

```json
{
  "reportType": "immunization_coverage",
  "filters": {
    "facilityId": "optional_facility_id",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "filename": "optional_custom_filename.xlsx"
}
```

### Report Types

1. **immunization_coverage**: Shows vaccination coverage rates by vaccine
2. **facility_performance**: Displays facility-wise performance metrics
3. **due_immunizations**: Lists patients with upcoming due immunizations
4. **age_distribution**: Breaks down immunization data by age groups
5. **vaccine_usage**: Shows vaccine utilization statistics

### Response Format

```json
{
  "success": true,
  "data": {
    "fileId": "generated_file_id",
    "filename": "report_filename.xlsx",
    "downloadUrl": "https://...",
    "reportType": "immunization_coverage",
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Environment Variables

- `APPWRITE_ENDPOINT`: Appwrite server endpoint
- `APPWRITE_PROJECT_ID`: Your project ID
- `APPWRITE_API_KEY`: API key with appropriate permissions
- `STORAGE_BUCKET_ID`: Storage bucket for reports (default: 'reports')
- `DATABASE_ID`: Database ID (default: 'immunization-db')

## Testing

Run the function locally:
```bash
npm test
```

## Deployment

Deploy to Appwrite Cloud:
```bash
appwrite deploy function
```

## Excel Features

- **Professional Styling**: Headers, borders, colors, and fonts
- **Data Validation**: Ensures data integrity
- **Multiple Worksheets**: Organized data views
- **Formulas**: Calculated fields and summaries
- **Charts**: Visual representations (future enhancement)
- **Conditional Formatting**: Highlights important data

## Error Handling

The function includes comprehensive error handling for:
- Invalid report types
- Missing required parameters
- Database connection issues
- File upload failures
- Storage quota exceeded