# Appwrite Collections Summary

**Project ID:** 68a6e04b002d20c10020  
**Database ID:** 68beb588001a9f2d71dc  
**Endpoint:** https://fra.cloud.appwrite.io/v1  
**Total Collections:** 20

## Collections Overview

### 1. **facility** (Facility)
- **Document Security:** Disabled
- **Attributes:**
  - `name` (string, required, size: 250)
  - `district` (string, required, size: 250)
  - `address` (string, required, size: 500)
  - `contactPhone` (string, required, size: 20)
  - `contact_phone` (string, optional, size: 20)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `name_index` (key on name)
  - `district_index` (key on district)
  - `name_fulltext` (fulltext on name)

### 2. **patients** (Patients)
- **Document Security:** Disabled
- **Attributes:**
  - `full_name` (string, required, size: 255)
  - `sex` (string, required, size: 1)
  - `date_of_birth` (datetime, required)
  - `mother_name` (string, optional, size: 255)
  - `father_name` (string, optional, size: 255)
  - `district` (string, required, size: 100)
  - `town_village` (string, optional, size: 100)
  - `address` (string, required, size: 500)
  - `contact_phone` (string, optional, size: 20)
  - `health_worker_id` (string, optional, size: 36)
  - `health_worker_name` (string, optional, size: 255)
  - `health_worker_phone` (string, optional, size: 20)
  - `health_worker_address` (string, optional, size: 500)
  - `facility_id` (string, required, size: 36)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `facility_id_index` (key on facility_id)
  - `district_index` (key on district)
  - `full_name_fulltext` (fulltext on full_name)

### 3. **vaccines** (Vaccines)
- **Document Security:** Disabled
- **Attributes:**
  - `name` (string, required, size: 255)
  - `manufacturer` (string, optional, size: 100)
  - `disease_targeted` (string, required, size: 200)
  - `dosage_info` (string, optional, size: 500)
  - `storage_requirements` (string, optional, size: 500)
  - `route_of_administration` (string, optional, size: 50)
  - `age_group` (string, optional, size: 50)
  - `contraindications` (string, optional, size: 1000)
  - `side_effects` (string, optional, size: 1000)
  - `is_active` (boolean, required, default: true)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `name_index` (key on name)
  - `disease_targeted_index` (key on disease_targeted)
  - `is_active_index` (key on is_active)
  - `name_fulltext` (fulltext on name)
  - `disease_fulltext` (fulltext on disease_targeted)

### 4. **notifications** (Notifications)
- **Document Security:** Disabled
- **Attributes:**
  - `type` (string, required, size: 50)
  - `title` (string, required, size: 200)
  - `message` (string, required, size: 1000)
  - `recipient_id` (string, optional, size: 255)
  - `recipient_type` (string, optional, size: 50)
  - `facility_id` (string, optional, size: 255)
  - `priority` (string, required, size: 20, default: "normal")
  - `status` (string, required, size: 20, default: "pending")
  - `is_read` (boolean, required, default: false)
  - `scheduled_for` (datetime, optional)
  - `sent_at` (datetime, optional)
  - `delivery_method` (string, optional, size: 50)
  - `metadata` (string, optional, size: 2000)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `recipient_id_index` (key on recipient_id)
  - `facility_id_index` (key on facility_id)
  - `type_index` (key on type)
  - `status_index` (key on status)
  - `priority_index` (key on priority)
  - `scheduled_for_index` (key on scheduled_for)
  - `recipient_status_compound` (key on recipient_id, status)
  - `facility_status_compound` (key on facility_id, status)
  - `type_status_compound` (key on type, status)

### 5. **supplementary_immunizations** (Supplementary Immunizations)
- **Document Security:** Disabled
- **Attributes:**
  - `campaign_name` (string, required, size: 255)
  - `vaccine_id` (string, required, size: 255)
  - `target_age_group` (string, required, size: 100)
  - `target_population` (string, optional, size: 500)
  - `start_date` (datetime, required)
  - `end_date` (datetime, required)
  - `facility_id` (string, required, size: 255)
  - `target_number` (integer, optional)
  - `achieved_number` (integer, optional, default: 0)
  - `campaign_status` (string, required, size: 50, default: "planned")
  - `notes` (string, optional, size: 1000)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `vaccine_id_index` (key on vaccine_id)
  - `facility_id_index` (key on facility_id)
  - `campaign_status_index` (key on campaign_status)
  - `start_date_index` (key on start_date)
  - `end_date_index` (key on end_date)
  - `campaign_name_fulltext` (fulltext on campaign_name)

### 6. **vaccine_schedules** (Vaccine Schedules)
- **Document Security:** Disabled
- **Attributes:**
  - `name` (string, required, size: 255)
  - `description` (string, optional, size: 1000)
  - `target_age_group` (string, required, size: 100)
  - `schedule_type` (string, required, size: 50)
  - `is_active` (boolean, required, default: true)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `name_index` (key on name)
  - `schedule_type_index` (key on schedule_type)
  - `is_active_index` (key on is_active)
  - `name_fulltext` (fulltext on name)

### 7. **vaccine_schedule_items** (Vaccine Schedule Items)
- **Document Security:** Disabled
- **Attributes:**
  - `schedule_id` (string, required, size: 255)
  - `vaccine_id` (string, required, size: 255)
  - `dose_number` (integer, required)
  - `minimum_age_weeks` (integer, optional)
  - `maximum_age_weeks` (integer, optional)
  - `minimum_interval_weeks` (integer, optional)
  - `notes` (string, optional, size: 500)
  - `is_active` (boolean, required, default: true)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `schedule_id_index` (key on schedule_id)
  - `vaccine_id_index` (key on vaccine_id)
  - `dose_number_index` (key on dose_number)
  - `is_active_index` (key on is_active)
  - `schedule_vaccine_compound` (key on schedule_id, vaccine_id)
  - `schedule_dose_compound` (key on schedule_id, dose_number)

### 8. **admin_profiles** (Admin Profiles)
- **Document Security:** Enabled
- **Attributes:**
  - `user_id` (string, required, size: 255)
  - `admin_level` (string, required, size: 50)
  - `system_permissions` (string, optional, array, size: 100)
  - `facility_access_scope` (string, required, size: 50)
  - `accessible_facilities` (string, optional, array, size: 255)
  - `data_access_level` (string, required, size: 50)
  - `can_manage_users` (boolean, required, default: false)
  - `can_manage_facilities` (boolean, required, default: false)
  - `can_manage_vaccines` (boolean, required, default: false)
  - `can_generate_reports` (boolean, required, default: false)
  - `can_manage_system_settings` (boolean, required, default: false)
  - `emergency_access` (boolean, required, default: false)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:** None

### 9. **access_audit_log** (Access Audit Log)
- **Document Security:** Enabled
- **Attributes:**
  - `user_id` (string, required, size: 255)
  - `profile_id` (string, optional, size: 255)
  - `profile_type` (string, optional, size: 50)
  - `action_type` (string, required, size: 100)
  - `resource_type` (string, required, size: 100)
  - `resource_id` (string, optional, size: 255)
  - `facility_context` (string, optional, size: 255)
  - `ip_address` (string, optional, size: 45)
  - `user_agent` (string, optional, size: 500)
  - `session_id` (string, optional, size: 255)
  - `success` (boolean, required)
  - `failure_reason` (string, optional, size: 500)
  - `additional_data` (string, optional, size: 2000)
  - `created_at` (datetime, required)
- **Indexes:**
  - `user_id_index` (key on user_id)
  - `profile_id_index` (key on profile_id)
  - `action_type_index` (key on action_type)
  - `resource_type_index` (key on resource_type)
  - `facility_context_index` (key on facility_context)
  - `success_index` (key on success)
  - `created_at_index` (key on created_at)
  - `user_action_compound` (key on user_id, action_type)
  - `resource_action_compound` (key on resource_type, action_type)
  - `facility_action_compound` (key on facility_context, action_type)
  - `user_created_compound` (key on user_id, created_at)

### 10. **audit_collections** (Audit Collections)
- **Document Security:** Enabled
- **Attributes:**
  - `collection_name` (string, required, size: 100)
  - `document_id` (string, required, size: 255)
  - `action_type` (string, required, size: 50)
  - `user_id` (string, required, size: 255)
  - `profile_id` (string, optional, size: 255)
  - `profile_type` (string, optional, size: 50)
  - `facility_context` (string, optional, size: 255)
  - `old_data` (string, optional, size: 10000)
  - `new_data` (string, optional, size: 10000)
  - `changes_summary` (string, optional, size: 2000)
  - `ip_address` (string, optional, size: 45)
  - `user_agent` (string, optional, size: 500)
  - `created_at` (datetime, required)
- **Indexes:**
  - `collection_name_index` (key on collection_name)
  - `document_id_index` (key on document_id)
  - `action_type_index` (key on action_type)
  - `user_id_index` (key on user_id)
  - `profile_id_index` (key on profile_id)
  - `facility_context_index` (key on facility_context)
  - `created_at_index` (key on created_at)
  - `collection_document_compound` (key on collection_name, document_id)
  - `collection_action_compound` (key on collection_name, action_type)
  - `user_action_compound` (key on user_id, action_type)
  - `facility_action_compound` (key on facility_context, action_type)

### 11. **role_change_log** (Role Change Log)
- **Document Security:** Enabled
- **Attributes:**
  - `target_user_id` (string, required, size: 255)
  - `target_profile_id` (string, optional, size: 255)
  - `target_profile_type` (string, optional, size: 50)
  - `assigned_by_user_id` (string, required, size: 255)
  - `assigned_by_profile_id` (string, optional, size: 255)
  - `role_change_type` (string, required, size: 100)
  - `old_role_data` (string, optional, size: 2000)
  - `new_role_data` (string, required, size: 2000)
  - `facility_context` (string, optional, size: 255)
  - `change_reason` (string, optional, size: 1000)
  - `effective_date` (datetime, required)
  - `expiry_date` (datetime, optional)
  - `status` (string, required, size: 50, default: "active")
  - `approval_required` (boolean, required, default: false)
  - `approved_by_user_id` (string, optional, size: 255)
  - `approved_at` (datetime, optional)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `target_user_id_index` (key on target_user_id)
  - `target_profile_id_index` (key on target_profile_id)
  - `target_profile_type_index` (key on target_profile_type)
  - `assigned_by_user_id_index` (key on assigned_by_user_id)
  - `assigned_by_profile_id_index` (key on assigned_by_profile_id)
  - `role_change_type_index` (key on role_change_type)
  - `facility_context_index` (key on facility_context)
  - `effective_date_index` (key on effective_date)
  - `status_index` (key on status)
  - `approval_required_index` (key on approval_required)
  - `target_effective_compound` (key on target_user_id, effective_date)
  - `facility_effective_compound` (key on facility_context, effective_date)
  - `type_status_compound` (key on role_change_type, status)

### 12. **profile_verification_workflow** (Profile Verification Workflow)
- **Document Security:** Disabled
- **Attributes:**
  - `profile_id` (string, required, size: 36)
  - `profile_type` (string, required, size: 20)
  - `user_id` (string, required, size: 36)
  - `verification_type` (string, required, size: 30)
  - `verification_method` (string, required, size: 50)
  - `status` (string, required, size: 20)
  - `initiated_by_user_id` (string, required, size: 36)
  - `assigned_to_user_id` (string, optional, size: 36)
  - `facility_id` (string, required, size: 36)
  - `verification_data` (string, optional, size: 2000)
  - `documents_required` (string, optional, array, size: 100)
  - `documents_submitted` (string, optional, array, size: 100)
  - `verification_notes` (string, optional, size: 1000)
  - `rejection_reason` (string, optional, size: 500)
  - `priority` (string, required, size: 10)
  - `due_date` (datetime, optional)
  - `completed_at` (datetime, optional)
  - `completed_by_user_id` (string, optional, size: 36)
  - `workflow_steps` (string, optional, size: 2000)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:**
  - `profile_id_index` (key on profile_id)
  - `profile_type_index` (key on profile_type)
  - `user_id_index` (key on user_id)
  - `verification_type_index` (key on verification_type)
  - `status_index` (key on status)
  - `assigned_to_user_id_index` (key on assigned_to_user_id)
  - `facility_id_index` (key on facility_id)
  - `priority_index` (key on priority)
  - `due_date_index` (key on due_date)
  - `completed_by_user_id_index` (key on completed_by_user_id)
  - `facility_status_compound` (key on facility_id, status)
  - `type_status_compound` (key on verification_type, status)
  - `profile_type_status_compound` (key on profile_type, status)
  - `assigned_priority_compound` (key on assigned_to_user_id, priority)
  - `due_date_priority_compound` (key on due_date, priority)

### 13. **sync_collections** (Sync Collections)
- **Document Security:** Disabled
- **Attributes:** None
- **Indexes:** None

### 14. **facilities** (facilities)
- **Document Security:** Enabled
- **Attributes:**
  - `name` (string, required, size: 255)
  - `district` (string, required, size: 100)
  - `address` (string, required, size: 500)
  - `contact_phone` (string, optional, size: 20)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:** None

### 15. **employee_profiles** (Employee Profiles)
- **Document Security:** Enabled
- **Attributes:**
  - `user_id` (string, required, size: 255)
  - `employee_id` (string, required, size: 50)
  - `employee_type` (string, required, size: 50)
  - `professional_title` (string, required, size: 100)
  - `license_number` (string, optional, size: 50)
  - `license_expiry_date` (datetime, optional)
  - `specializations` (string, optional, array, size: 1000)
  - `primary_facility_id` (string, required, size: 255)
  - `assigned_facilities` (string, optional, array, size: 255)
  - `department` (string, optional, size: 100)
  - `employment_status` (string, required, size: 50)
  - `hire_date` (datetime, optional)
  - `contact_information` (string, optional, size: 2000)
  - `work_schedule` (string, optional, size: 1000)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:** None

### 16. **patient_profiles** (Patient Profiles)
- **Document Security:** Enabled
- **Attributes:**
  - `user_id` (string, required, size: 255)
  - `patient_id` (string, optional, size: 50)
  - `profile_status` (string, required, size: 50)
  - `verification_status` (string, required, size: 50)
  - `verification_method` (string, optional, size: 50)
  - `access_permissions` (string, optional, array, size: 100)
  - `notification_preferences` (string, optional, size: 2000)
  - `emergency_contact` (string, optional, size: 1000)
  - `facility_id` (string, required, size: 255)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:** None

### 17. **immunization_records** (Immunization Records)
- **Document Security:** Enabled
- **Attributes:**
  - `patient_id` (string, required, size: 255)
  - `vaccine_id` (string, required, size: 255)
  - `facility_id` (string, required, size: 255)
  - `administered_by` (string, required, size: 255)
  - `administration_date` (datetime, required)
  - `batch_number` (string, optional, size: 100)
  - `expiry_date` (datetime, optional)
  - `site_of_administration` (string, optional, size: 100)
  - `dose_number` (integer, optional)
  - `notes` (string, optional, size: 1000)
  - `adverse_reactions` (string, optional, size: 1000)
  - `created_at` (datetime, required)
  - `updated_at` (datetime, required)
- **Indexes:** None

## Collections with Missing Indexes

Several collections are missing important indexes that would improve query performance:

### Collections needing indexes:
- **facilities** (newer version)
- **employee_profiles**
- **patient_profiles** 
- **immunization_records** (newer version)

### Recommended indexes to add:
- **facilities**: name_index, district_index, name_fulltext
- **employee_profiles**: user_id_index, employee_id_index, primary_facility_id_index
- **patient_profiles**: user_id_index, facility_id_index, verification_status_index
- **immunization_records**: patient_id_index, facility_id_index, vaccine_id_index, administration_date_index

## Summary

The Appwrite database is well-populated with 20 collections covering all major aspects of the immunization management system:

- **Core Data**: Facilities, Patients, Vaccines, Immunization Records
- **User Management**: Admin Profiles, Employee Profiles, Patient Profiles
- **Workflow**: Profile Verification Workflow, Role Change Log
- **Scheduling**: Vaccine Schedules, Vaccine Schedule Items, Supplementary Immunizations
- **Communication**: Notifications
- **Auditing**: Access Audit Log, Audit Collections
- **Synchronization**: Sync Collections

Most collections have appropriate indexes for performance, though some newer collections may benefit from additional indexing. The schema supports comprehensive role-based access control, audit trails, and workflow management essential for a healthcare system.