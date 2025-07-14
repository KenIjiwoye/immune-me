curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'


oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg

## Facilities Endpoints:

# Get all facilities
curl -X GET http://localhost:3333/api/facilities \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg"

# Create a new facility
curl -X POST http://localhost:3333/api/facilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg" \
  -d '{
    "name": "Central Hospital",
    "district": "Central",
    "address": "123 Main St",
    "contactPhone": "123-456-7890"
  }'

# Get all vaccines:
curl -X GET http://localhost:3333/api/vaccines \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg"


# Create a new vaccine
curl -X POST http://localhost:3333/api/vaccines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg" \
  -d '{
    "name": "COVID-19 Vaccine",
    "description": "Vaccine against COVID-19",
    "vaccineCode": "COVID19",
    "sequenceNumber": 1,
    "vaccineSeries": "COVID",
    "standardScheduleAge": "18+",
    "isSupplementary": false,
    "isActive": true
  }'

  # Get all notifications
curl -X GET http://localhost:3333/api/notifications \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg"

# Get due notifications
curl -X GET http://localhost:3333/api/notifications/due \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg"

# Update a notification
curl -X PUT http://localhost:3333/api/notifications/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer oat_MQ.R2trS19VQ1VjZFdSZDlFOF82Y25TSTVvcFYxNmVjQW9EVmxvY0d3bjI2NzkzMTgxMzg" \
  -d '{
    "status": "viewed"
  }'