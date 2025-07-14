# Manual Testing Instructions for Notification Service

This document provides step-by-step instructions for manually testing the notification service implementation.

## 1. Create Test Data

### Option 1: Using the API (if the server is running)

1. **Create a test facility**:
   ```
   POST /api/facilities
   {
     "name": "Test Notification Facility",
     "district": "Test District",
     "address": "123 Test St",
     "contactPhone": "123-456-7890"
   }
   ```
   Note the `id` of the created facility.

2. **Create a test patient**:
   ```
   POST /api/patients
   {
     "fullName": "Notification Test Patient",
     "sex": "M",
     "dateOfBirth": "2024-07-14",
     "motherName": "Test Mother",
     "fatherName": "Test Father",
     "district": "Test District",
     "townVillage": "Test Village",
     "address": "456 Test St",
     "contactPhone": "987-654-3210",
     "facilityId": [facility_id_from_step_1]
   }
   ```
   Note the `id` of the created patient.

3. **Create a test vaccine**:
   ```
   POST /api/vaccines
   {
     "name": "Test Notification Vaccine",
     "description": "A test vaccine for notification testing",
     "vaccineCode": "TNV",
     "standardScheduleAge": "0-12 months",
     "sequenceNumber": 1,
     "vaccineSeries": "Test Series",
     "isSupplementary": false,
     "isActive": true
   }
   ```
   Note the `id` of the created vaccine.

4. **Create immunization records with return dates in the next 7 days**:
   ```
   POST /api/immunization-records
   {
     "patientId": [patient_id_from_step_2],
     "vaccineId": [vaccine_id_from_step_3],
     "administeredDate": "2025-07-14",
     "administeredByUserId": 1,
     "facilityId": [facility_id_from_step_1],
     "batchNumber": "BATCH-001",
     "healthOfficer": "Test Health Officer",
     "isStandardSchedule": true,
     "scheduleStatus": "on_schedule",
     "returnDate": "2025-07-15",
     "notes": "Test immunization record with return date tomorrow"
   }
   ```

   Create two more records with return dates 3 and 7 days from today.

### Option 2: Using Direct Database Queries

If you have direct access to the database, you can run these SQL queries:

```sql
-- Insert a facility
INSERT INTO facilities (name, district, address, contact_phone) 
VALUES ('Test Notification Facility', 'Test District', '123 Test St', '123-456-7890');

-- Get the facility ID
SET @facility_id = LAST_INSERT_ID();

-- Insert a patient
INSERT INTO patients (full_name, sex, date_of_birth, mother_name, father_name, 
                     district, town_village, address, contact_phone, facility_id)
VALUES ('Notification Test Patient', 'M', CURDATE() - INTERVAL 1 YEAR, 'Test Mother', 'Test Father',
       'Test District', 'Test Village', '456 Test St', '987-654-3210', @facility_id);

-- Get the patient ID
SET @patient_id = LAST_INSERT_ID();

-- Insert a vaccine
INSERT INTO vaccines (name, description, vaccine_code, is_supplementary, is_active)
VALUES ('Test Notification Vaccine', 'A test vaccine for notification testing', 'TNV', 0, 1);

-- Get the vaccine ID
SET @vaccine_id = LAST_INSERT_ID();

-- Insert immunization records with return dates in the next 7 days
INSERT INTO immunization_records (patient_id, vaccine_id, administered_date, 
                                administered_by_user_id, facility_id, batch_number,
                                is_standard_schedule, return_date)
VALUES (@patient_id, @vaccine_id, CURDATE(), 1, @facility_id, 'BATCH-001', 1, CURDATE() + INTERVAL 1 DAY);

INSERT INTO immunization_records (patient_id, vaccine_id, administered_date, 
                                administered_by_user_id, facility_id, batch_number,
                                is_standard_schedule, return_date)
VALUES (@patient_id, @vaccine_id, CURDATE(), 1, @facility_id, 'BATCH-002', 1, CURDATE() + INTERVAL 3 DAY);

INSERT INTO immunization_records (patient_id, vaccine_id, administered_date, 
                                administered_by_user_id, facility_id, batch_number,
                                is_standard_schedule, return_date)
VALUES (@patient_id, @vaccine_id, CURDATE(), 1, @facility_id, 'BATCH-003', 1, CURDATE() + INTERVAL 7 DAY);
```

## 2. Run the Notification Generation Command

Run the following command to generate notifications:

```
docker-compose exec backend node ace notifications:generate
```

This command will:
1. Find immunization records with return dates in the next 7 days
2. Create notifications for each record if they don't already exist
3. Update the status of overdue notifications

## 3. Verify Notifications Were Created

### Option 1: Using the API (if the server is running)

```
GET /api/notifications?facilityId=[facility_id_from_step_1]
```

### Option 2: Using Direct Database Queries

```sql
SELECT n.*, p.full_name as patient_name, v.name as vaccine_name
FROM notifications n
JOIN patients p ON n.patient_id = p.id
JOIN vaccines v ON n.vaccine_id = v.id
WHERE n.facility_id = [facility_id_from_step_1];
```

## 4. Expected Results

You should see:
- Three notifications created for the test patient and vaccine
- Each notification should have a due date matching the return date of the corresponding immunization record
- All notifications should have a status of 'pending' (since they're due in the future)

## 5. Test Overdue Notifications

To test the overdue notification functionality:

1. Insert an immunization record with a return date in the past:

```sql
INSERT INTO immunization_records (patient_id, vaccine_id, administered_date, 
                                administered_by_user_id, facility_id, batch_number,
                                is_standard_schedule, return_date)
VALUES (@patient_id, @vaccine_id, CURDATE() - INTERVAL 10 DAY, 1, @facility_id, 'BATCH-004', 1, CURDATE() - INTERVAL 3 DAY);
```

2. Run the notification generation command again:

```
docker-compose exec backend node ace notifications:generate
```

3. Verify that a notification was created with 'overdue' status:

```sql
SELECT * FROM notifications 
WHERE patient_id = [patient_id] 
AND vaccine_id = [vaccine_id] 
AND status = 'overdue';
```

## 6. Document Results

Record the following information:
- Number of immunization records processed
- Number of notifications created
- Status of each notification
- Whether the notifications have the correct data (patient, vaccine, due date)

This documentation will help verify that the notification service is working correctly.