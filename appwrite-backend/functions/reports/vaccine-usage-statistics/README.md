# Vaccine Usage Statistics Function

This Appwrite serverless function provides comprehensive vaccine usage analytics including inventory tracking, wastage rates, expiry monitoring, and cost analysis.

## Features

- **Vaccine Inventory Tracking**: Real-time stock levels across all facilities
- **Usage Analytics**: Detailed usage by vaccine, facility, and district
- **Wastage Analysis**: Track vaccine wastage rates and identify patterns
- **Expiry Monitoring**: Monitor vaccines approaching expiry dates
- **Reorder Alerts**: Automated alerts for low stock levels
- **Usage Trends**: Historical usage patterns and trend analysis
- **Cost Analysis**: Financial impact analysis including wastage costs
- **Multi-level Reporting**: Facility, district, and regional level insights

## Installation

1. Deploy this function to your Appwrite project
2. Configure the environment variables (see `.env.example`)
3. Ensure all required collections exist in your Appwrite database

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint | `https://cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID | - |
| `APPWRITE_API_KEY` | API key with appropriate permissions | - |
| `DATABASE_ID` | Appwrite database ID | `immune-me` |
| `VACCINES_COLLECTION_ID` | Vaccines collection ID | `vaccines` |
| `VACCINE_INVENTORY_COLLECTION_ID` | Vaccine inventory collection ID | `vaccine_inventory` |
| `IMMUNIZATION_RECORDS_COLLECTION_ID` | Immunization records collection ID | `immunization_records` |
| `FACILITIES_COLLECTION_ID` | Facilities collection ID | `facilities` |
| `DISTRICTS_COLLECTION_ID` | Districts collection ID | `districts` |

## Usage

### Basic Usage

```javascript
// POST request to the function endpoint
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

### Advanced Usage

```javascript
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "facilityId": "facility_123",
  "districtId": "district_456",
  "vaccineId": "vaccine_789",
  "includeTrends": true,
  "includeCostAnalysis": true
}
```

## Response Structure

The function returns a comprehensive analysis object with the following structure:

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalVaccines": 10,
      "totalImmunizations": 1250,
      "totalFacilities": 25,
      "totalDistricts": 5
    },
    "usageByVaccine": [...],
    "usageByFacility": [...],
    "usageByDistrict": [...],
    "inventory": [...],
    "wastage": [...],
    "expiry": [...],
    "reorderAlerts": [...],
    "trends": [...],
    "costAnalysis": {...}
  },
  "meta": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "generatedAt": "2024-01-31 15:30:00"
  }
}
```

## Data Requirements

### Vaccines Collection
- `name`: Vaccine name
- `unitCost`: Cost per dose
- `reorderLevel`: Minimum stock level for alerts
- `reorderQuantity`: Suggested reorder quantity

### Vaccine Inventory Collection
- `vaccineId`: Reference to vaccine
- `batchNumber`: Batch identifier
- `expiryDate`: Expiry date
- `quantityReceived`: Initial quantity received
- `quantityUsed`: Quantity used
- `quantityWasted`: Quantity wasted
- `quantityExpired`: Quantity expired
- `currentStock`: Current stock level
- `unitCost`: Cost per unit
- `supplier`: Supplier name
- `facilityId`: Reference to facility

### Immunization Records Collection
- `vaccineId`: Reference to vaccine
- `facilityId`: Reference to facility
- `patientId`: Reference to patient
- `administeredAt`: Date/time of administration
- `doses`: Number of doses administered

### Facilities Collection
- `name`: Facility name
- `districtId`: Reference to district

### Districts Collection
- `name`: District name

## Error Handling

The function includes comprehensive error handling:
- Database connection errors
- Missing collection errors
- Invalid date format errors
- Permission errors

## Performance Considerations

- Uses efficient database queries with proper indexing
- Implements pagination for large datasets
- Caches frequently accessed data
- Optimizes memory usage for trend calculations

## Testing

Run the included test script to verify functionality:

```bash
npm test
```

## Deployment

1. Zip the function directory
2. Upload to Appwrite Functions
3. Configure environment variables
4. Set appropriate execution permissions
5. Test with sample data

## Security

- Uses Appwrite API keys for authentication
- Implements proper input validation
- Sanitizes all user inputs
- Follows principle of least privilege