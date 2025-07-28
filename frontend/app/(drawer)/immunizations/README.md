# Add Immunization Screen

This screen allows users to add new immunization records for patients.

## Usage

### With Patient ID (from patient details)
```tsx
// Navigate from patient details
router.push('/immunizations/add?patientId=123');
```

### Without Patient ID (select from list)
```tsx
// Navigate to select patient
router.push('/immunizations/add');
```

## Features

- **Form Validation**: Uses zod schema for comprehensive validation
- **Patient Selection**: Shows patient list when no patientId is provided
- **Vaccine Selection**: Integrated VaccineSelector component with modal
- **Date Pickers**: Administered date and optional return date
- **Form Submission**: Uses react-query mutation with loading states
- **Error Handling**: Comprehensive error handling with user feedback
- **Success Feedback**: Alert dialog on successful submission

## Form Fields

- **Patient**: Selected patient (required)
- **Vaccine**: Selected vaccine (required)
- **Administered Date**: Date of vaccination (required)
- **Return Date**: Optional follow-up date
- **Batch Number**: Vaccine batch number (required)
- **Administered By**: Health worker name (required)
- **Notes**: Optional additional notes

## Dependencies

- react-hook-form for form management
- zod for schema validation
- react-query for data fetching and mutations
- expo-router for navigation
- @react-native-community/datetimepicker for date selection

## API Endpoints Used

- GET `/vaccines` - Fetch available vaccines
- GET `/patients` - Fetch patients for selection
- GET `/patients/:id` - Fetch patient details
- POST `/immunization-records` - Create new immunization record