# Report Functions

This directory contains Appwrite Cloud Functions for generating and processing reports.

## Functions

### Coverage Reports
- `immunization-coverage-report` - Generates immunization coverage statistics
- `facility-coverage-analysis` - Analyzes coverage by facility
- `age-group-coverage` - Coverage analysis by age groups

### Due Immunizations
- `due-immunizations-list` - Generates lists of patients with due immunizations
- `overdue-immunizations-alert` - Alerts for overdue immunizations
- `upcoming-immunizations` - Lists upcoming immunizations

### Performance Reports
- `facility-performance-metrics` - Calculates facility performance metrics
- `healthcare-worker-performance` - Individual healthcare worker performance
- `system-performance-dashboard` - Overall system performance metrics

### Statistical Reports
- `age-distribution-analysis` - Patient age distribution statistics
- `vaccine-usage-statistics` - Vaccine usage and consumption reports
- `adverse-events-report` - Adverse events tracking and reporting

### Export Functions
- `generate-pdf-report` - Converts report data to PDF format
- `generate-excel-export` - Exports data to Excel format
- `generate-csv-export` - Exports data to CSV format

## Scheduled Reports

### Daily Reports
- Morning coverage summary
- Due immunizations for the day
- System health check

### Weekly Reports
- Weekly performance summary
- Facility comparison report
- Vaccine inventory status

### Monthly Reports
- Monthly coverage analysis
- Trend analysis report
- Compliance reporting

## Development

Each function should be in its own subdirectory with:
- `src/` - Function source code
- `package.json` - Dependencies and configuration
- `appwrite.json` - Appwrite function configuration
- `README.md` - Function documentation
- `templates/` - Report templates (if applicable)