# Generate PDF Report Function

This Appwrite function generates professional PDF reports for immunization data with support for multiple report types.

## Features

- **Multiple Report Types**: Supports immunization coverage, facility performance, and due immunizations reports
- **Professional Formatting**: Includes headers, footers, branding, and professional styling
- **Data Visualization**: Tables with alternating row colors and clear data presentation
- **File Upload**: Automatically uploads generated PDFs to Appwrite Storage
- **Download URLs**: Provides secure download links for generated reports
- **Flexible Filtering**: Supports date ranges, facility filtering, and custom parameters

## Report Types

### 1. Immunization Coverage Report
- **Purpose**: Analyze immunization coverage across different vaccines
- **Data**: Shows total, completed, pending, and percentage coverage for each vaccine
- **Collection**: immunization_records

### 2. Facility Performance Report
- **Purpose**: Evaluate performance metrics for healthcare facilities
- **Data**: Displays patient counts, immunization totals, and performance scores
- **Collection**: facilities (with related patient and immunization data)

### 3. Due Immunizations Report
- **Purpose**: List patients with upcoming or overdue immunizations
- **Data**: Shows patient details, vaccine names, due dates, and overdue status
- **Collection**: vaccine_schedules

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

### Request Format
```json
{
  "reportType": "immunization_coverage",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "facilityId": "optional_facility_id"
  }
}
```

### Response Format
```json
{
  "success": true,
  "fileId": "generated_file_id",
  "downloadUrl": "https://storage.appwrite.io/v1/buckets/...",
  "filename": "immunization_coverage_20241231120000.pdf",
  "reportType": "immunization_coverage",
  "generatedAt": "2024-12-31T12:00:00.000Z"
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | Yes |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID | Yes |
| `APPWRITE_API_KEY` | API key with appropriate permissions | Yes |
| `APPWRITE_DATABASE_ID` | Database ID containing collections | Yes |
| `APPWRITE_STORAGE_BUCKET_ID` | Storage bucket for PDF uploads | Yes |
| `REPORT_LOGO_URL` | URL for report logo | No |
| `REPORT_FOOTER_TEXT` | Custom footer text | No |
| `REPORT_PRIMARY_COLOR` | Primary color for branding | No |
| `REPORT_SECONDARY_COLOR` | Secondary color for styling | No |

## API Endpoints

### Collections Used
- `immunization_records`: For immunization coverage reports
- `facilities`: For facility performance reports
- `patients`: For patient data in facility and due immunizations reports
- `vaccine_schedules`: For due immunizations reports

### Required Permissions
- Database read access to relevant collections
- Storage write access to upload PDFs
- Storage read access to generate download URLs

## Development

### Local Testing
Set `NODE_ENV=development` to enable local testing mode.

### Customization
- Modify `REPORT_CONFIGS` object to add new report types
- Update PDF styling in the `PDFReportGenerator` class
- Add new data visualization methods as needed

## Error Handling

The function includes comprehensive error handling for:
- Invalid report types
- Missing required parameters
- Database connection issues
- File upload failures
- PDF generation errors

## Dependencies

- `node-appwrite`: Appwrite SDK for Node.js
- `pdfkit`: PDF generation library
- `moment`: Date/time manipulation