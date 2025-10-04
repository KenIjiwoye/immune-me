/**
 * Vaccine and Immunization Types
 * Collection-specific types for vaccine and immunization management
 */

import { AppwriteDocument } from '../appwrite';

// =============================================================================
// VACCINE COLLECTION TYPES
// =============================================================================

/**
 * Vaccine document from Appwrite vaccines collection
 * Based on the deployed schema
 */
export interface AppwriteVaccine extends AppwriteDocument {
  name: string;
  manufacturer?: string;
  disease_targeted: string;
  dosage_info?: string;
  storage_requirements?: string;
  route_of_administration?: string;
  age_group?: string;
  contraindications?: string;
  side_effects?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Immunization Record document from Appwrite immunization_records collection
 * Based on the deployed schema
 */
export interface AppwriteImmunizationRecord extends AppwriteDocument {
  patient_id: string;
  vaccine_id: string;
  facility_id: string;
  administered_by: string;
  administration_date: string; // ISO datetime string
  batch_number?: string;
  expiry_date?: string; // ISO datetime string
  site_of_administration?: string;
  dose_number?: number;
  notes?: string;
  adverse_reactions?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Vaccine Schedule document from Appwrite vaccine_schedules collection
 * Based on the deployed schema
 */
export interface AppwriteVaccineSchedule extends AppwriteDocument {
  name: string;
  description?: string;
  target_age_group: string;
  schedule_type: VaccineScheduleType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Vaccine Schedule Item document from Appwrite vaccine_schedule_items collection
 * Based on the deployed schema
 */
export interface AppwriteVaccineScheduleItem extends AppwriteDocument {
  schedule_id: string;
  vaccine_id: string;
  dose_number: number;
  minimum_age_weeks?: number;
  maximum_age_weeks?: number;
  minimum_interval_weeks?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Supplementary Immunization document from Appwrite supplementary_immunizations collection
 * Based on the deployed schema
 */
export interface AppwriteSupplementaryImmunization extends AppwriteDocument {
  campaign_name: string;
  vaccine_id: string;
  target_age_group: string;
  target_population?: string;
  start_date: string; // ISO datetime string
  end_date: string; // ISO datetime string
  facility_id: string;
  target_number?: number;
  achieved_number?: number;
  campaign_status: SupplementaryCampaignStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUMS AND LITERAL TYPES
// =============================================================================

/**
 * Route of administration options
 */
export type RouteOfAdministration = 
  | 'intramuscular'
  | 'subcutaneous'
  | 'intradermal'
  | 'oral'
  | 'nasal'
  | 'intravenous';

/**
 * Site of administration options
 */
export type SiteOfAdministration = 
  | 'left_deltoid'
  | 'right_deltoid'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_buttock'
  | 'right_buttock'
  | 'oral'
  | 'nasal';

/**
 * Age group categories
 */
export type AgeGroup = 
  | 'newborn'
  | 'infant'
  | 'child'
  | 'adolescent'
  | 'adult'
  | 'elderly'
  | 'all_ages';

/**
 * Vaccine schedule types
 */
export type VaccineScheduleType = 
  | 'routine'
  | 'catch_up'
  | 'supplementary'
  | 'outbreak_response'
  | 'travel';

/**
 * Supplementary campaign status
 */
export type SupplementaryCampaignStatus = 
  | 'planned'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'postponed';

/**
 * Adverse reaction severity levels
 */
export type AdverseReactionSeverity = 
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'life_threatening';

// =============================================================================
// STRUCTURED DATA INTERFACES
// =============================================================================

/**
 * Vaccine dosage information structure
 */
export interface VaccineDosageInfo {
  amount: number;
  unit: 'ml' | 'mcg' | 'mg' | 'IU' | 'doses';
  concentration?: string;
  volume_per_dose?: number;
  doses_per_vial?: number;
}

/**
 * Vaccine storage requirements structure
 */
export interface VaccineStorageRequirements {
  temperature_min: number; // Celsius
  temperature_max: number; // Celsius
  light_sensitive: boolean;
  freeze_sensitive: boolean;
  shelf_life_months: number;
  special_instructions?: string;
}

/**
 * Adverse reaction details structure
 */
export interface AdverseReaction {
  reaction_type: string;
  severity: AdverseReactionSeverity;
  onset_time?: string; // Time after administration
  duration?: string;
  treatment_given?: string;
  outcome: 'resolved' | 'ongoing' | 'unknown';
  reported_to_authorities: boolean;
  reporter_name?: string;
  reporter_contact?: string;
}

/**
 * Vaccine contraindication structure
 */
export interface VaccineContraindication {
  condition: string;
  type: 'absolute' | 'relative' | 'precaution';
  description: string;
  alternative_recommendations?: string;
}

// =============================================================================
// ENHANCED VACCINE TYPES
// =============================================================================

/**
 * Enhanced vaccine with parsed structured data
 */
export interface EnhancedVaccine extends Omit<AppwriteVaccine, 'dosage_info' | 'storage_requirements' | 'contraindications' | 'side_effects'> {
  dosage_info?: VaccineDosageInfo;
  storage_requirements?: VaccineStorageRequirements;
  contraindications?: VaccineContraindication[];
  common_side_effects?: string[];
  rare_side_effects?: string[];
  // Computed fields
  is_temperature_sensitive?: boolean;
  requires_cold_chain?: boolean;
  total_doses_in_series?: number;
}

/**
 * Enhanced immunization record with related data
 */
export interface EnhancedImmunizationRecord extends Omit<AppwriteImmunizationRecord, 'administration_date' | 'expiry_date' | 'adverse_reactions'> {
  administration_date: Date;
  expiry_date?: Date;
  adverse_reactions?: AdverseReaction[];
  // Related data
  vaccine?: EnhancedVaccine;
  patient?: {
    $id: string;
    full_name: string;
    date_of_birth: string;
    sex: 'M' | 'F';
  };
  administrator?: {
    $id: string;
    name: string;
    professional_title?: string;
    license_number?: string;
  };
  facility?: {
    $id: string;
    name: string;
    district: string;
  };
  // Computed fields
  is_expired?: boolean;
  days_until_expiry?: number;
  patient_age_at_administration?: number; // in days
  is_valid_dose?: boolean;
}

/**
 * Enhanced vaccine schedule with items
 */
export interface EnhancedVaccineSchedule extends AppwriteVaccineSchedule {
  schedule_items?: EnhancedVaccineScheduleItem[];
  total_vaccines?: number;
  estimated_completion_age_weeks?: number;
}

/**
 * Enhanced vaccine schedule item with vaccine details
 */
export interface EnhancedVaccineScheduleItem extends AppwriteVaccineScheduleItem {
  vaccine?: EnhancedVaccine;
  // Computed fields
  recommended_age_weeks?: number; // Midpoint between min and max
  age_range_display?: string; // e.g., "6-10 weeks"
  interval_display?: string; // e.g., "4 weeks after previous dose"
}

/**
 * Enhanced supplementary immunization campaign
 */
export interface EnhancedSupplementaryImmunization extends Omit<AppwriteSupplementaryImmunization, 'start_date' | 'end_date'> {
  start_date: Date;
  end_date: Date;
  vaccine?: EnhancedVaccine;
  facility?: {
    $id: string;
    name: string;
    district: string;
  };
  // Computed fields
  duration_days?: number;
  is_active?: boolean;
  is_completed?: boolean;
  completion_percentage?: number;
  days_remaining?: number;
  target_achievement_rate?: number;
}

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

/**
 * Vaccine creation form data
 */
export interface CreateVaccineData {
  name: string;
  manufacturer?: string;
  disease_targeted: string;
  dosage_info?: VaccineDosageInfo;
  storage_requirements?: VaccineStorageRequirements;
  route_of_administration?: RouteOfAdministration;
  age_group?: AgeGroup;
  contraindications?: VaccineContraindication[];
  common_side_effects?: string[];
  rare_side_effects?: string[];
  is_active: boolean;
}

/**
 * Vaccine update form data
 */
export interface UpdateVaccineData extends Partial<CreateVaccineData> {
  $id: string;
}

/**
 * Immunization record creation form data
 */
export interface CreateImmunizationRecordData {
  patient_id: string;
  vaccine_id: string;
  facility_id: string;
  administered_by: string;
  administration_date: string;
  batch_number?: string;
  expiry_date?: string;
  site_of_administration?: SiteOfAdministration;
  dose_number?: number;
  notes?: string;
  adverse_reactions?: AdverseReaction[];
}

/**
 * Immunization record update form data
 */
export interface UpdateImmunizationRecordData extends Partial<CreateImmunizationRecordData> {
  $id: string;
}

/**
 * Vaccine schedule creation form data
 */
export interface CreateVaccineScheduleData {
  name: string;
  description?: string;
  target_age_group: string;
  schedule_type: VaccineScheduleType;
  is_active: boolean;
  schedule_items?: CreateVaccineScheduleItemData[];
}

/**
 * Vaccine schedule item creation form data
 */
export interface CreateVaccineScheduleItemData {
  vaccine_id: string;
  dose_number: number;
  minimum_age_weeks?: number;
  maximum_age_weeks?: number;
  minimum_interval_weeks?: number;
  notes?: string;
  is_active: boolean;
}

/**
 * Supplementary immunization campaign creation form data
 */
export interface CreateSupplementaryImmunizationData {
  campaign_name: string;
  vaccine_id: string;
  target_age_group: string;
  target_population?: string;
  start_date: string;
  end_date: string;
  facility_id: string;
  target_number?: number;
  campaign_status: SupplementaryCampaignStatus;
  notes?: string;
}

// =============================================================================
// QUERY AND FILTER TYPES
// =============================================================================

/**
 * Vaccine query parameters
 */
export interface VaccineQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Search and filters
  search?: string; // Search in name and disease_targeted
  manufacturer?: string;
  disease_targeted?: string;
  age_group?: AgeGroup;
  route_of_administration?: RouteOfAdministration;
  is_active?: boolean;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  
  // Sorting
  order_by?: 'name' | 'disease_targeted' | 'created_at' | 'updated_at';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Immunization record query parameters
 */
export interface ImmunizationRecordQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  patient_id?: string;
  vaccine_id?: string;
  facility_id?: string;
  administered_by?: string;
  
  // Date filters
  administration_date_from?: string;
  administration_date_to?: string;
  created_after?: string;
  created_before?: string;
  
  // Other filters
  dose_number?: number;
  has_adverse_reactions?: boolean;
  is_expired?: boolean;
  
  // Sorting
  order_by?: 'administration_date' | 'created_at' | 'updated_at';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Vaccine schedule query parameters
 */
export interface VaccineScheduleQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  schedule_type?: VaccineScheduleType;
  target_age_group?: string;
  is_active?: boolean;
  
  // Search
  search?: string; // Search in name and description
  
  // Sorting
  order_by?: 'name' | 'schedule_type' | 'created_at';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Supplementary immunization query parameters
 */
export interface SupplementaryImmunizationQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  vaccine_id?: string;
  facility_id?: string;
  campaign_status?: SupplementaryCampaignStatus;
  target_age_group?: string;
  
  // Date filters
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  
  // Search
  search?: string; // Search in campaign_name
  
  // Sorting
  order_by?: 'campaign_name' | 'start_date' | 'end_date' | 'created_at';
  order_direction?: 'ASC' | 'DESC';
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Vaccine list response
 */
export interface VaccineListResponse {
  documents: AppwriteVaccine[];
  total: number;
}

/**
 * Enhanced vaccine list response
 */
export interface EnhancedVaccineListResponse {
  documents: EnhancedVaccine[];
  total: number;
}

/**
 * Immunization record list response
 */
export interface ImmunizationRecordListResponse {
  documents: AppwriteImmunizationRecord[];
  total: number;
}

/**
 * Enhanced immunization record list response
 */
export interface EnhancedImmunizationRecordListResponse {
  documents: EnhancedImmunizationRecord[];
  total: number;
}

/**
 * Vaccine schedule list response
 */
export interface VaccineScheduleListResponse {
  documents: AppwriteVaccineSchedule[];
  total: number;
}

/**
 * Supplementary immunization list response
 */
export interface SupplementaryImmunizationListResponse {
  documents: AppwriteSupplementaryImmunization[];
  total: number;
}

// =============================================================================
// UTILITY AND ANALYTICS TYPES
// =============================================================================

/**
 * Vaccine coverage statistics
 */
export interface VaccineCoverageStats {
  vaccine_id: string;
  vaccine_name: string;
  total_eligible: number;
  total_vaccinated: number;
  coverage_percentage: number;
  by_age_group: Array<{
    age_group: string;
    eligible: number;
    vaccinated: number;
    coverage_percentage: number;
  }>;
  by_district: Array<{
    district: string;
    eligible: number;
    vaccinated: number;
    coverage_percentage: number;
  }>;
}

/**
 * Immunization schedule compliance
 */
export interface ImmunizationScheduleCompliance {
  patient_id: string;
  schedule_id: string;
  total_doses_required: number;
  doses_completed: number;
  compliance_percentage: number;
  overdue_doses: Array<{
    vaccine_name: string;
    dose_number: number;
    due_date: string;
    days_overdue: number;
  }>;
  upcoming_doses: Array<{
    vaccine_name: string;
    dose_number: number;
    due_date: string;
    days_until_due: number;
  }>;
}

/**
 * Adverse event summary
 */
export interface AdverseEventSummary {
  vaccine_id: string;
  vaccine_name: string;
  total_doses_administered: number;
  total_adverse_events: number;
  adverse_event_rate: number;
  by_severity: Array<{
    severity: AdverseReactionSeverity;
    count: number;
    rate: number;
  }>;
  common_reactions: Array<{
    reaction_type: string;
    count: number;
    percentage: number;
  }>;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Vaccine validation constraints
 */
export const VaccineValidationRules = {
  name: {
    min_length: 2,
    max_length: 255,
    required: true
  },
  disease_targeted: {
    min_length: 2,
    max_length: 200,
    required: true
  },
  manufacturer: {
    max_length: 100
  },
  age_group: {
    max_length: 50
  },
  route_of_administration: {
    max_length: 50
  }
} as const;

/**
 * Immunization record validation constraints
 */
export const ImmunizationRecordValidationRules = {
  patient_id: {
    required: true,
    format: 'uuid'
  },
  vaccine_id: {
    required: true,
    format: 'uuid'
  },
  facility_id: {
    required: true,
    format: 'uuid'
  },
  administered_by: {
    required: true,
    format: 'uuid'
  },
  administration_date: {
    required: true,
    max_date: new Date() // Cannot be in the future
  },
  batch_number: {
    max_length: 100
  },
  dose_number: {
    min: 1,
    max: 10 // Reasonable maximum
  }
} as const;