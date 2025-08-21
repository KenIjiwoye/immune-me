# Notification Functions

This directory contains Appwrite Cloud Functions related to notification management and delivery.

## Functions

### Notification Triggers
- `due-immunization-reminders` - Sends reminders for due immunizations
- `missed-appointment-alerts` - Alerts for missed appointments
- `system-notifications` - General system notifications

### Delivery Functions
- `email-sender` - Handles email notification delivery
- `sms-sender` - Handles SMS notification delivery
- `push-notification-sender` - Handles mobile push notifications

### Scheduling Functions
- `schedule-notifications` - Schedules future notifications
- `process-notification-queue` - Processes queued notifications
- `cleanup-old-notifications` - Cleans up old notification records

## Development

Each function should be in its own subdirectory with:
- `src/` - Function source code
- `package.json` - Dependencies and configuration
- `appwrite.json` - Appwrite function configuration
- `README.md` - Function documentation