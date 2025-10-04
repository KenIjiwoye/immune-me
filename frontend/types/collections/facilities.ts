/**
 * Facility Management Types
 * Collection-specific types for facility management
 */

import { AppwriteDocument } from '../appwrite';

// =============================================================================
// FACILITY COLLECTION TYPES
// =============================================================================

/**
 * Facility document from Appwrite facility collection (legacy)
 * Based on the deployed schema
 */
export interface AppwriteFacility extends AppwriteDocument {
  name: string;
  district: string;
  address: string;
  contactPhone: string;
  contact_phone?: string; // Duplicate field in legacy schema
  created_at: string;
  updated_at: string;
}

/**
 * Facilities document from Appwrite facilities collection (newer version)
 * Based on the deployed schema
 */
export interface AppwriteFacilities extends AppwriteDocument {
  name: string;
  district: string;
  address: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUMS AND LITERAL TYPES
// =============================================================================

/**
 * Facility types based on healthcare system hierarchy
 */
export type FacilityType = 
  | 'hospital'
  | 'health_center'
  | 'clinic'
  | 'dispensary'
  | 'mobile_unit'
  | 'outreach_post'
  | 'community_health_unit';

/**
 * Facility ownership types
 */
export type FacilityOwnership = 
  | 'public'
  | 'private'
  | 'ngo'
  | 'faith_based'
  | 'military'
  | 'corporate';

/**
 * Facility operational status
 */
export type FacilityStatus = 
  | 'active'
  | 'inactive'
  | 'temporarily_closed'
  | 'under_renovation'
  | 'permanently_closed';

/**
 * Service availability status
 */
export type ServiceStatus = 
  | 'available'
  | 'limited'
  | 'unavailable'
  | 'seasonal';

/**
 * Equipment status
 */
export type EquipmentStatus = 
  | 'functional'
  | 'needs_maintenance'
  | 'broken'
  | 'missing';

// =============================================================================
// STRUCTURED DATA INTERFACES
// =============================================================================

/**
 * Facility contact information structure
 */
export interface FacilityContactInfo {
  primary_phone?: string;
  secondary_phone?: string;
  email?: string;
  fax?: string;
  website?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    role: string;
  };
}

/**
 * Facility location details structure
 */
export interface FacilityLocation {
  address: string;
  district: string;
  region?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  directions?: string;
  accessibility_notes?: string;
}

/**
 * Facility services offered structure
 */
export interface FacilityServices {
  immunization: ServiceStatus;
  maternal_health: ServiceStatus;
  child_health: ServiceStatus;
  family_planning: ServiceStatus;
  hiv_testing: ServiceStatus;
  tuberculosis_treatment: ServiceStatus;
  malaria_treatment: ServiceStatus;
  emergency_services: ServiceStatus;
  laboratory_services: ServiceStatus;
  pharmacy_services: ServiceStatus;
  outpatient_services: ServiceStatus;
  inpatient_services: ServiceStatus;
  specialized_clinics?: string[];
  operating_hours?: {
    monday?: { open: string; close: string; };
    tuesday?: { open: string; close: string; };
    wednesday?: { open: string; close: string; };
    thursday?: { open: string; close: string; };
    friday?: { open: string; close: string; };
    saturday?: { open: string; close: string; };
    sunday?: { open: string; close: string; };
    public_holidays?: boolean;
    emergency_24_7?: boolean;
  };
}

/**
 * Facility infrastructure details structure
 */
export interface FacilityInfrastructure {
  total_beds?: number;
  consultation_rooms?: number;
  waiting_area_capacity?: number;
  parking_spaces?: number;
  has_electricity: boolean;
  has_running_water: boolean;
  has_generator: boolean;
  has_solar_power: boolean;
  has_internet: boolean;
  has_cold_chain: boolean;
  cold_chain_capacity?: number; // in liters
  waste_management_system: boolean;
  accessibility_features?: string[];
}

/**
 * Facility equipment inventory structure
 */
export interface FacilityEquipment {
  refrigerators?: Array<{
    id: string;
    type: 'vaccine' | 'medicine' | 'general';
    capacity_liters: number;
    status: EquipmentStatus;
    last_maintenance?: string;
    temperature_monitoring: boolean;
  }>;
  computers?: Array<{
    id: string;
    type: 'desktop' | 'laptop' | 'tablet';
    status: EquipmentStatus;
    last_maintenance?: string;
    internet_access: boolean;
  }>;
  medical_equipment?: Array<{
    id: string;
    name: string;
    type: string;
    status: EquipmentStatus;
    last_maintenance?: string;
    calibration_due?: string;
  }>;
  vehicles?: Array<{
    id: string;
    type: 'ambulance' | 'motorcycle' | 'car' | 'bicycle';
    status: EquipmentStatus;
    last_maintenance?: string;
    fuel_type?: string;
  }>;
}

/**
 * Facility staffing information structure
 */
export interface FacilityStaffing {
  total_staff: number;
  doctors?: number;
  nurses?: number;
  midwives?: number;
  laboratory_technicians?: number;
  pharmacists?: number;
  data_clerks?: number;
  support_staff?: number;
  volunteers?: number;
  staff_shortage_areas?: string[];
  training_needs?: string[];
}

/**
 * Facility performance metrics structure
 */
export interface FacilityPerformanceMetrics {
  monthly_patient_visits?: number;
  immunization_coverage_rate?: number;
  stock_out_incidents?: number;
  equipment_downtime_hours?: number;
  staff_attendance_rate?: number;
  patient_satisfaction_score?: number;
  data_quality_score?: number;
  last_supervision_visit?: string;
  supervision_score?: number;
  improvement_areas?: string[];
}

// =============================================================================
// ENHANCED FACILITY TYPES
// =============================================================================

/**
 * Enhanced facility with structured data and computed fields
 */
export interface EnhancedFacility extends Omit<AppwriteFacilities, 'address' | 'contact_phone'> {
  // Structured data
  contact_info: FacilityContactInfo;
  location: FacilityLocation;
  services?: FacilityServices;
  infrastructure?: FacilityInfrastructure;
  equipment?: FacilityEquipment;
  staffing?: FacilityStaffing;
  performance_metrics?: FacilityPerformanceMetrics;
  
  // Additional metadata
  facility_type?: FacilityType;
  ownership?: FacilityOwnership;
  status: FacilityStatus;
  license_number?: string;
  accreditation_status?: string;
  accreditation_expiry?: string;
  
  // Computed fields
  is_operational?: boolean;
  has_immunization_services?: boolean;
  cold_chain_functional?: boolean;
  staff_patient_ratio?: number;
  distance_from_main_road?: number; // in kilometers
  catchment_population?: number;
  
  // Related data counts
  total_patients?: number;
  total_staff?: number;
  total_immunizations_this_month?: number;
  active_campaigns?: number;
}

/**
 * Facility with related statistics
 */
export interface FacilityWithStats extends EnhancedFacility {
  statistics: {
    patients: {
      total: number;
      new_this_month: number;
      by_age_group: Array<{
        age_group: string;
        count: number;
      }>;
      by_sex: {
        male: number;
        female: number;
      };
    };
    immunizations: {
      total_this_month: number;
      total_this_year: number;
      by_vaccine: Array<{
        vaccine_name: string;
        count: number;
      }>;
      coverage_rates: Array<{
        vaccine_name: string;
        coverage_percentage: number;
      }>;
    };
    staff: {
      total: number;
      present_today: number;
      on_leave: number;
      training: number;
    };
    equipment: {
      total: number;
      functional: number;
      needs_maintenance: number;
      broken: number;
    };
  };
}

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

/**
 * Facility creation form data
 */
export interface CreateFacilityData {
  name: string;
  district: string;
  location: FacilityLocation;
  contact_info: FacilityContactInfo;
  facility_type?: FacilityType;
  ownership?: FacilityOwnership;
  status: FacilityStatus;
  license_number?: string;
  services?: FacilityServices;
  infrastructure?: FacilityInfrastructure;
  staffing?: FacilityStaffing;
}

/**
 * Facility update form data
 */
export interface UpdateFacilityData extends Partial<CreateFacilityData> {
  $id: string;
}

/**
 * Facility equipment update form data
 */
export interface UpdateFacilityEquipmentData {
  facility_id: string;
  equipment: FacilityEquipment;
}

/**
 * Facility services update form data
 */
export interface UpdateFacilityServicesData {
  facility_id: string;
  services: FacilityServices;
}

/**
 * Facility performance metrics update form data
 */
export interface UpdateFacilityPerformanceData {
  facility_id: string;
  performance_metrics: FacilityPerformanceMetrics;
  reporting_period: string; // YYYY-MM format
}

// =============================================================================
// QUERY AND FILTER TYPES
// =============================================================================

/**
 * Facility query parameters
 */
export interface FacilityQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Search and filters
  search?: string; // Search in name and district
  district?: string;
  facility_type?: FacilityType;
  ownership?: FacilityOwnership;
  status?: FacilityStatus;
  
  // Service filters
  has_immunization_services?: boolean;
  has_cold_chain?: boolean;
  has_internet?: boolean;
  has_electricity?: boolean;
  
  // Location filters
  region?: string;
  within_radius?: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };
  
  // Performance filters
  min_immunization_coverage?: number;
  max_stock_outs?: number;
  min_staff_count?: number;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  last_supervision_after?: string;
  
  // Sorting
  order_by?: 'name' | 'district' | 'created_at' | 'updated_at' | 'total_patients';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Facility performance query parameters
 */
export interface FacilityPerformanceQueryParams {
  facility_ids?: string[];
  district?: string;
  reporting_period_from?: string; // YYYY-MM
  reporting_period_to?: string; // YYYY-MM
  metrics?: Array<keyof FacilityPerformanceMetrics>;
  min_coverage_rate?: number;
  max_stock_outs?: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Facility list response
 */
export interface FacilityListResponse {
  documents: AppwriteFacilities[];
  total: number;
}

/**
 * Enhanced facility list response
 */
export interface EnhancedFacilityListResponse {
  documents: EnhancedFacility[];
  total: number;
}

/**
 * Facility with stats list response
 */
export interface FacilityWithStatsListResponse {
  documents: FacilityWithStats[];
  total: number;
}

/**
 * Single facility response
 */
export interface FacilityResponse {
  data: AppwriteFacilities;
  message?: string;
}

/**
 * Enhanced single facility response
 */
export interface EnhancedFacilityResponse {
  data: EnhancedFacility;
  message?: string;
}

// =============================================================================
// ANALYTICS AND REPORTING TYPES
// =============================================================================

/**
 * District facility summary
 */
export interface DistrictFacilitySummary {
  district: string;
  total_facilities: number;
  by_type: Array<{
    facility_type: FacilityType;
    count: number;
  }>;
  by_status: Array<{
    status: FacilityStatus;
    count: number;
  }>;
  by_ownership: Array<{
    ownership: FacilityOwnership;
    count: number;
  }>;
  service_availability: {
    immunization: number;
    maternal_health: number;
    child_health: number;
    emergency_services: number;
  };
  infrastructure_summary: {
    with_electricity: number;
    with_running_water: number;
    with_cold_chain: number;
    with_internet: number;
  };
  average_performance: {
    immunization_coverage: number;
    patient_satisfaction: number;
    data_quality: number;
  };
}

/**
 * Facility capacity analysis
 */
export interface FacilityCapacityAnalysis {
  facility_id: string;
  facility_name: string;
  current_capacity: {
    beds: number;
    consultation_rooms: number;
    staff: number;
    cold_chain_liters: number;
  };
  utilization_rates: {
    bed_occupancy: number;
    consultation_room_usage: number;
    cold_chain_usage: number;
    staff_workload: number;
  };
  capacity_gaps: {
    additional_beds_needed: number;
    additional_staff_needed: number;
    additional_cold_chain_needed: number;
  };
  recommendations: string[];
}

/**
 * Facility network analysis
 */
export interface FacilityNetworkAnalysis {
  total_facilities: number;
  coverage_gaps: Array<{
    area: string;
    population: number;
    nearest_facility_distance: number;
    recommended_facility_type: FacilityType;
  }>;
  redundancy_areas: Array<{
    area: string;
    facility_count: number;
    population_per_facility: number;
    recommendation: string;
  }>;
  referral_patterns: Array<{
    from_facility: string;
    to_facility: string;
    referral_count: number;
    common_reasons: string[];
  }>;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Facility validation constraints
 */
export const FacilityValidationRules = {
  name: {
    min_length: 2,
    max_length: 255,
    required: true
  },
  district: {
    min_length: 1,
    max_length: 100,
    required: true
  },
  address: {
    min_length: 5,
    max_length: 500,
    required: true
  },
  contact_phone: {
    min_length: 5,
    max_length: 20,
    pattern: /^\+?[0-9\s\-\(\)]+$/
  },
  license_number: {
    max_length: 50
  },
  latitude: {
    min: -90,
    max: 90
  },
  longitude: {
    min: -180,
    max: 180
  }
} as const;

/**
 * Facility equipment validation constraints
 */
export const FacilityEquipmentValidationRules = {
  refrigerator_capacity: {
    min: 0,
    max: 10000 // liters
  },
  total_beds: {
    min: 0,
    max: 10000
  },
  consultation_rooms: {
    min: 0,
    max: 100
  },
  staff_count: {
    min: 0,
    max: 1000
  }
} as const;

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Facility distance calculation result
 */
export interface FacilityDistance {
  facility_id: string;
  facility_name: string;
  distance_km: number;
  travel_time_minutes?: number;
  directions?: string;
}

/**
 * Facility comparison result
 */
export interface FacilityComparison {
  facilities: Array<{
    facility_id: string;
    facility_name: string;
    scores: {
      infrastructure: number;
      services: number;
      performance: number;
      accessibility: number;
      overall: number;
    };
  }>;
  comparison_criteria: string[];
  recommendations: string[];
}