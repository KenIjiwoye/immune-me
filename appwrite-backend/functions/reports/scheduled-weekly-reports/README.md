# Scheduled Weekly Reports Function

This Appwrite function automatically generates and distributes comprehensive reports on a scheduled basis (weekly, monthly, or quarterly).

## Features

- **Automated Report Generation**: Generates reports for all major data types
- **Multiple Report Formats**: PDF, Excel, and CSV formats
- **Email Distribution**: Automatic email delivery to configured recipients
- **Configurable Scheduling**: Weekly, monthly, or quarterly report cycles
- **Report Archiving**: Automatic cleanup of old reports
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Error Handling**: Robust error handling with notifications

## Report Types

1. **Due Immunizations Report** - Lists all pending immunizations
2. **Vaccine Usage Statistics** - Tracks vaccine consumption and inventory
3. **Immunization Coverage Report** - Shows completion rates and trends
4. **Age Distribution Analysis** - Patient demographics by age groups
5. **Facility Performance Metrics** - Performance indicators by facility

## Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- Appwrite project credentials
- SMTP email settings
- Report recipients
- Scheduling preferences

### 2. Install Dependencies

```bash
npm install
```

### 3. Appwrite Setup

Create the following collections in your Appwrite database:

#### Report Recipients Collection
- Collection ID: `report-recipients`
- Attributes:
  - `email` (string, required)
  - `name` (string, optional)
  - `active` (boolean, default: true)
  - `reportTypes` (string[], optional)

#### Report Logs Collection
- Collection ID: `report-logs`
- Attributes:
  - `type` (string, required) - weekly/monthly/quarterly
  - `status` (string, required) - completed/failed
  - `reportsGenerated` (integer, optional)
  - `error` (string, optional)
  - `timestamp` (datetime, required)

### 4. Storage Bucket

Create a storage bucket named `reports` (or configure `APPWRITE_STORAGE_BUCKET_ID`).

### 5. Deploy to Appwrite

```bash
# Build and deploy
appwrite functions createDeployment \
  --functionId=scheduled-weekly-reports \
  --entrypoint=src/main.js \
  --code=. \
  --activate=true
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Your project ID | - |
| `APPWRITE_API_KEY` | API key with required permissions | - |
| `APPWRITE_DATABASE_ID` | Database ID | `default` |
| `APPWRITE_STORAGE_BUCKET_ID` | Storage bucket for reports | `reports` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASS` | Email password | - |
| `EMAIL_FROM` | Sender email address | `noreply@immuneme.com` |
| `REPORT_SCHEDULE` | Cron expression for scheduling | `0 9 * * 1` |
| `REPORT_RECIPIENTS` | Comma-separated email list | - |
| `REPORT_FORMATS` | Comma-separated formats | `pdf,excel,csv` |
| `REPORT_RETENTION_DAYS` | Days to keep reports | `90` |
| `SCHEDULE_TYPE` | Report frequency | `weekly` |

### Cron Expressions

The `REPORT_SCHEDULE` uses standard cron format:
- `0 9 * * 1` - Every Monday at 9 AM
- `0 9 1 * *` - First day of every month at 9 AM
- `0 9 1 */3 *` - First day of every quarter at 9 AM

## Usage

### Manual Execution

```bash
# Run once for testing
npm start

# Run with specific schedule type
SCHEDULE_TYPE=monthly npm start
```

### Scheduled Execution

The function runs automatically based on the configured cron schedule when deployed to Appwrite.

### Health Check

```bash
# Check function health
node -e "import('./src/main.js').then(m => m.healthCheck().then(console.log))"
```

## Testing

### Local Testing

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run in development mode
npm run dev
```

### Test Configuration

Create a test environment file:

```bash
cp .env.example .env.test
# Edit .env.test with test values
```

## Monitoring

### Logs

Logs are stored in:
- `logs/combined.log` - All log entries
- `logs/error.log` - Error entries only

### Appwrite Console

Monitor function execution in the Appwrite Console:
- Functions → scheduled-weekly-reports → Logs
- Check execution status and error messages

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Verify SMTP credentials
   - Check firewall settings
   - Ensure recipient emails are valid

2. **Reports not generating**
   - Verify Appwrite API credentials
   - Check collection permissions
   - Ensure storage bucket exists

3. **Permission errors**
   - Ensure API key has read access to all collections
   - Verify storage bucket write permissions

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm start
```

## API Reference

### Exported Functions

- `generateScheduledReports(scheduleType)` - Generate reports manually
- `getRecipients()` - Get current recipient list
- `updateRecipients(newRecipients)` - Update recipient list
- `healthCheck()` - Check system health

## Security Considerations

- API keys should have minimal required permissions
- Use environment variables for sensitive data
- Regularly rotate API keys
- Monitor email sending limits
- Validate recipient email addresses

## Support

For issues or questions:
1. Check the logs in `logs/` directory
2. Review Appwrite function logs
3. Verify all environment variables
4. Ensure all required collections exist