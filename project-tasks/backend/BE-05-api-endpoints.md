# BE-05: Implement Core API Endpoints

## Context
The Immunization Records Management System requires RESTful API endpoints for all core entities. These endpoints will be used by the frontend to interact with the backend data.

## Dependencies
- BE-01: Database configuration completed
- BE-02: Database migrations completed
- BE-03: Authentication system implemented
- BE-04: Core models implemented

## Requirements
Implement RESTful API endpoints for the following entities:
1. Users
2. Facilities
3. Patients
4. Vaccines
5. Immunization Records
6. Notifications

Each entity should have endpoints for:
- List (GET)
- Detail (GET)
- Create (POST)
- Update (PUT)
- Delete (DELETE)

## Code Example

### Users Controller

```typescript
// backend/app/controllers/users_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Hash from '@adonisjs/core/hash'

export default class UsersController {
  /**
   * List all users
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const users = await User.query()
      .preload('facility')
      .paginate(page, limit)
    
    return response.json(users)
  }

  /**
   * Get user by ID
   */
  async show({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await user.load('facility')
    
    return response.json(user)
  }

  /**
   * Create new user
   */
  async store({ request, response }: HttpContext) {
    const data = request.only([
      'username',
      'email',
      'password',
      'fullName',
      'role',
      'facilityId'
    ])
    
    // Hash password
    data.password = await Hash.make(data.password)
    
    const user = await User.create(data)
    
    return response.created(user)
  }

  /**
   * Update user
   */
  async update({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    
    const data = request.only([
      'username',
      'email',
      'fullName',
      'role',
      'facilityId'
    ])
    
    // Update password if provided
    if (request.input('password')) {
      data.password = await Hash.make(request.input('password'))
    }
    
    user.merge(data)
    await user.save()
    
    return response.json(user)
  }

  /**
   * Delete user
   */
  async destroy({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await user.delete()
    
    return response.noContent()
  }
}
```

### Patients Controller

```typescript
// backend/app/controllers/patients_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Patient from '#models/patient'

export default class PatientsController {
  /**
   * List all patients
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const patients = await Patient.query()
      .preload('facility')
      .paginate(page, limit)
    
    return response.json(patients)
  }

  /**
   * Get patient by ID
   */
  async show({ params, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    await patient.load('facility')
    
    return response.json(patient)
  }

  /**
   * Create new patient
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    const data = request.only([
      'fullName',
      'sex',
      'dateOfBirth',
      'motherName',
      'fatherName',
      'district',
      'townVillage',
      'address',
      'contactPhone',
      'healthWorkerId',
      'healthWorkerName',
      'healthWorkerPhone',
      'healthWorkerAddress'
    ])
    
    // Set facility ID from authenticated user
    data.facilityId = user.facilityId
    
    const patient = await Patient.create(data)
    
    return response.created(patient)
  }

  /**
   * Update patient
   */
  async update({ params, request, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    
    const data = request.only([
      'fullName',
      'sex',
      'dateOfBirth',
      'motherName',
      'fatherName',
      'district',
      'townVillage',
      'address',
      'contactPhone',
      'healthWorkerId',
      'healthWorkerName',
      'healthWorkerPhone',
      'healthWorkerAddress',
      'facilityId'
    ])
    
    patient.merge(data)
    await patient.save()
    
    return response.json(patient)
  }

  /**
   * Delete patient
   */
  async destroy({ params, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    await patient.delete()
    
    return response.noContent()
  }

  /**
   * Search patients
   */
  async search({ request, response }: HttpContext) {
    const { query, district, sex } = request.qs()
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const patientsQuery = Patient.query()
    
    if (query) {
      patientsQuery.where(q => {
        q.where('fullName', 'ILIKE', `%${query}%`)
          .orWhere('motherName', 'ILIKE', `%${query}%`)
          .orWhere('fatherName', 'ILIKE', `%${query}%`)
          .orWhere('contactPhone', 'ILIKE', `%${query}%`)
      })
    }
    
    if (district) {
      patientsQuery.where('district', district)
    }
    
    if (sex) {
      patientsQuery.where('sex', sex)
    }
    
    const patients = await patientsQuery.paginate(page, limit)
    
    return response.json(patients)
  }
}
```

### Immunization Records Controller

```typescript
// backend/app/controllers/immunization_records_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ImmunizationRecord from '#models/immunization_record'

export default class ImmunizationRecordsController {
  /**
   * List all immunization records
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const records = await ImmunizationRecord.query()
      .preload('patient')
      .preload('vaccine')
      .preload('administeredBy')
      .preload('facility')
      .paginate(page, limit)
    
    return response.json(records)
  }

  /**
   * Get immunization record by ID
   */
  async show({ params, response }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    await record.load('patient')
    await record.load('vaccine')
    await record.load('administeredBy')
    await record.load('facility')
    
    return response.json(record)
  }

  /**
   * Create new immunization record
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    const data = request.only([
      'patientId',
      'vaccineId',
      'administeredDate',
      'batchNumber',
      'returnDate',
      'notes'
    ])
    
    // Set administered by user ID and facility ID from authenticated user
    data.administeredByUserId = user.id
    data.facilityId = user.facilityId
    
    const record = await ImmunizationRecord.create(data)
    
    return response.created(record)
  }

  /**
   * Update immunization record
   */
  async update({ params, request, response }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    
    const data = request.only([
      'patientId',
      'vaccineId',
      'administeredDate',
      'administeredByUserId',
      'facilityId',
      'batchNumber',
      'returnDate',
      'notes'
    ])
    
    record.merge(data)
    await record.save()
    
    return response.json(record)
  }

  /**
   * Delete immunization record
   */
  async destroy({ params, response }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    await record.delete()
    
    return response.noContent()
  }

  /**
   * Get immunization records for a patient
   */
  async getPatientRecords({ params, response }: HttpContext) {
    const records = await ImmunizationRecord.query()
      .where('patientId', params.patientId)
      .preload('vaccine')
      .preload('administeredBy')
      .preload('facility')
    
    return response.json(records)
  }
}
```

### Routes Configuration

```typescript
// backend/start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Auth routes
router.post('/api/auth/login', '#controllers/auth_controller.login')
router.post('/api/auth/logout', '#controllers/auth_controller.logout').use(middleware.auth())
router.post('/api/auth/refresh-token', '#controllers/auth_controller.refreshToken').use(middleware.auth())

// Users routes
router.group(() => {
  router.get('/', '#controllers/users_controller.index')
  router.get('/:id', '#controllers/users_controller.show')
  router.post('/', '#controllers/users_controller.store')
  router.put('/:id', '#controllers/users_controller.update')
  router.delete('/:id', '#controllers/users_controller.destroy')
})
  .prefix('/api/users')
  .use(middleware.auth({ roles: ['administrator'] }))

// Facilities routes
router.group(() => {
  router.get('/', '#controllers/facilities_controller.index')
  router.get('/:id', '#controllers/facilities_controller.show')
  router.post('/', '#controllers/facilities_controller.store').use(middleware.auth({ roles: ['administrator'] }))
  router.put('/:id', '#controllers/facilities_controller.update').use(middleware.auth({ roles: ['administrator'] }))
  router.delete('/:id', '#controllers/facilities_controller.destroy').use(middleware.auth({ roles: ['administrator'] }))
})
  .prefix('/api/facilities')
  .use(middleware.auth())

// Patients routes
router.group(() => {
  router.get('/', '#controllers/patients_controller.index')
  router.get('/search', '#controllers/patients_controller.search')
  router.get('/:id', '#controllers/patients_controller.show')
  router.post('/', '#controllers/patients_controller.store')
  router.put('/:id', '#controllers/patients_controller.update')
  router.delete('/:id', '#controllers/patients_controller.destroy').use(middleware.auth({ roles: ['administrator'] }))
  router.get('/:patientId/immunization-records', '#controllers/immunization_records_controller.getPatientRecords')
})
  .prefix('/api/patients')
  .use(middleware.auth())

// Vaccines routes
router.group(() => {
  router.get('/', '#controllers/vaccines_controller.index')
  router.get('/:id', '#controllers/vaccines_controller.show')
  router.post('/', '#controllers/vaccines_controller.store').use(middleware.auth({ roles: ['administrator'] }))
  router.put('/:id', '#controllers/vaccines_controller.update').use(middleware.auth({ roles: ['administrator'] }))
  router.delete('/:id', '#controllers/vaccines_controller.destroy').use(middleware.auth({ roles: ['administrator'] }))
})
  .prefix('/api/vaccines')
  .use(middleware.auth())

// Immunization records routes
router.group(() => {
  router.get('/', '#controllers/immunization_records_controller.index')
  router.get('/:id', '#controllers/immunization_records_controller.show')
  router.post('/', '#controllers/immunization_records_controller.store')
  router.put('/:id', '#controllers/immunization_records_controller.update')
  router.delete('/:id', '#controllers/immunization_records_controller.destroy').use(middleware.auth({ roles: ['administrator'] }))
})
  .prefix('/api/immunization-records')
  .use(middleware.auth())

// Notifications routes
router.group(() => {
  router.get('/', '#controllers/notifications_controller.index')
  router.get('/due', '#controllers/notifications_controller.getDueNotifications')
  router.get('/:id', '#controllers/notifications_controller.show')
  router.put('/:id', '#controllers/notifications_controller.update')
})
  .prefix('/api/notifications')
  .use(middleware.auth())
```

## Expected Outcome
- All required API endpoints implemented
- Endpoints follow RESTful conventions
- Proper authentication and authorization for each endpoint
- Endpoints return appropriate HTTP status codes and JSON responses

## Testing
Test the API endpoints using a tool like Postman or curl:

```bash
# Login to get token
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Use token to access protected endpoints
curl -X GET http://localhost:3333/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create a new patient
curl -X POST http://localhost:3333/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "fullName": "John Doe",
    "sex": "M",
    "dateOfBirth": "2020-01-01",
    "district": "Central",
    "contactPhone": "123-456-7890"
  }'
