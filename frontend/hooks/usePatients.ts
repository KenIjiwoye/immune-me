import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import profileService from '../services/profileService';
import { Patient, PatientWithRelations, PatientListResponse, PatientQueryParams, PatientWithProfile } from '../types/patient';
import { PatientProfile } from '../types/profile';

// Query keys
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  // Ensure the query key explicitly includes page, limit, and trimmed search (plus known filters)
  list: (filters: PatientQueryParams) => {
    const { page, limit, search, district, sex } = filters || {};
    const normalizedSearch = search?.trim();
    return [
      ...patientKeys.lists(),
      {
        page,
        limit,
        search: normalizedSearch || undefined,
        district,
        sex,
      },
    ] as const;
  },
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
};

// Fetch patients with pagination and filtering (Profile-enhanced)
const fetchPatients = async (params: PatientQueryParams): Promise<PatientListResponse> => {
  // Normalize and include only defined query params
  const { page, limit, search, ...otherFilters } = params || {};
  const normalizedSearch = search?.trim();
  const requestParams: Record<string, any> = {
    page,
    limit,
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...otherFilters,
  };

  console.log('Fetching patients with params:', requestParams);
  try {
    const response = await api.get('/patients', { params: requestParams });
    console.log('Patients fetched successfully:', response.data);
    
    // Enhance with Profile data if available
    const enhancedData = await enhancePatientsWithProfiles(response.data);
    return enhancedData;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

// Enhance patients with Profile data
const enhancePatientsWithProfiles = async (patientListResponse: PatientListResponse): Promise<PatientListResponse> => {
  try {
    const enhancedPatients = await Promise.all(
      patientListResponse.data.map(async (patient) => {
        try {
          // Try to get patient profile if patient has user association
          if (patient.id) {
            const profile = await profileService.patient.getByPatientId(patient.id.toString());
            if (profile) {
              const user = await profileService.getUserWithProfile(profile.user_id);
              return {
                ...patient,
                profile,
                user
              } as PatientWithProfile;
            }
          }
        } catch (error) {
          // Profile not found or error - continue with basic patient data
          console.log(`No profile found for patient ${patient.id}:`, error);
        }
        return patient;
      })
    );

    return {
      ...patientListResponse,
      data: enhancedPatients
    };
  } catch (error) {
    console.error('Error enhancing patients with profiles:', error);
    // Return original data if enhancement fails
    return patientListResponse;
  }
};

// Fetch single patient (Profile-enhanced)
const fetchPatient = async (id: number): Promise<PatientWithRelations> => {
  console.log('Fetching patient with ID:', id);
  try {
    const response = await api.get(`/patients/${id}`);
    console.log('Patient fetched successfully:', response.data);
    
    // Try to enhance with Profile data
    try {
      const profile = await profileService.patient.getByPatientId(id.toString());
      if (profile) {
        const user = await profileService.getUserWithProfile(profile.user_id);
        return {
          ...response.data,
          profile,
          user
        } as PatientWithProfile;
      }
    } catch (profileError) {
      console.log(`No profile found for patient ${id}:`, profileError);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw error;
  }
};

// Create new patient (Profile-aware)
const createPatient = async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
  console.log('Creating patient with data:', patient);
  try {
    const response = await api.post('/patients', patient);
    console.log('Patient created successfully:', response.data);
    
    // Note: Profile creation should be handled separately through Profile services
    // This maintains backward compatibility while allowing Profile integration
    
    return response.data;
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
};

// Create patient with Profile (new enhanced method)
const createPatientWithProfile = async (
  patientData: Omit<Patient, 'id'>,
  profileData?: Partial<PatientProfile>,
  userData?: { email: string; password: string; phone?: string }
): Promise<PatientWithProfile> => {
  console.log('Creating patient with profile:', { patientData, profileData, userData });
  try {
    // First create the basic patient record
    const patientResponse = await api.post('/patients', patientData);
    const patient = patientResponse.data;
    
    // If profile data is provided, create user account and profile
    if (profileData && userData) {
      try {
        // Create user account
        const userResponse = await api.post('/auth/register', {
          ...userData,
          name: patientData.fullName,
          labels: ['role:patient', `facility_${patientData.facilityId}`]
        });
        const user = userResponse.data.user;
        
        // Create patient profile
        const profile = await profileService.patient.create({
          user_id: user.$id,
          patient_id: patient.id.toString(),
          facility_id: patientData.facilityId?.toString() || '',
          profile_status: 'active',
          verification_status: 'pending',
          access_permissions: ['view_own_records', 'receive_notifications'],
          ...profileData
        });
        
        return {
          ...patient,
          profile: profile.data,
          user
        } as PatientWithProfile;
      } catch (profileError) {
        console.error('Error creating patient profile:', profileError);
        // Return basic patient if profile creation fails
        return patient;
      }
    }
    
    return patient;
  } catch (error) {
    console.error('Error creating patient with profile:', error);
    throw error;
  }
};

// Update patient
const updatePatient = async ({ id, data }: { id: number; data: Partial<Patient> }): Promise<Patient> => {
  console.log('Updating patient with ID:', id, 'and data:', data);
  try {
    const response = await api.put(`/patients/${id}`, data);
    console.log('Patient updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
};

// Delete patient
const deletePatient = async (id: number): Promise<void> => {
  console.log('Deleting patient with ID:', id);
  try {
    await api.delete(`/patients/${id}`);
    console.log('Patient deleted successfully');
  } catch (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
};

// React Query hooks
export const usePatients = (params: PatientQueryParams, options?: UseQueryOptions<PatientListResponse>) => {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => fetchPatients(params),
    ...options,
  });
};

export const usePatient = (id: number, options?: UseQueryOptions<PatientWithRelations>) => {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => fetchPatient(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPatient,
    onSuccess: (data) => {
      console.log('Create patient mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
    onError: (error) => {
      console.error('Create patient mutation failed:', error);
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updatePatient,
    onSuccess: (data) => {
      console.log('Update patient mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(data.id) });
      }
    },
    onError: (error) => {
      console.error('Update patient mutation failed:', error);
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      console.log('Delete patient mutation succeeded');
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
    onError: (error) => {
      console.error('Delete patient mutation failed:', error);
    },
  });
};

// Hook for patient immunization records (Profile-enhanced)
export const usePatientImmunizations = (patientId: number) => {
  return useQuery({
    queryKey: [...patientKeys.detail(patientId), 'immunizations'],
    queryFn: async () => {
      console.log('Fetching immunizations for patient:', patientId);
      try {
        const response = await api.get(`/patients/${patientId}/immunization-records`);
        console.log('Immunizations fetched successfully:', response.data);
        
        // Enhance immunization records with Profile data for administrators
        const enhancedRecords = await Promise.all(
          response.data.map(async (record: any) => {
            try {
              if (record.administered_by_user_id) {
                const adminUser = await profileService.getUserWithProfile(record.administered_by_user_id);
                if (adminUser.profileType === 'employee' && adminUser.profile) {
                  const employeeProfile = adminUser.profile as any;
                  return {
                    ...record,
                    administeredBy: {
                      ...record.administeredBy,
                      professionalTitle: employeeProfile.professional_title,
                      licenseNumber: employeeProfile.license_number,
                      employeeId: employeeProfile.employee_id,
                      employeeType: employeeProfile.employee_type,
                      department: employeeProfile.department
                    },
                    administeredByProfile: employeeProfile,
                    administeredByUser: adminUser,
                    administeredByDetails: {
                      employee_id: employeeProfile.employee_id,
                      professional_title: employeeProfile.professional_title,
                      license_number: employeeProfile.license_number,
                      facility_id: employeeProfile.primary_facility_id,
                      employee_type: employeeProfile.employee_type,
                      department: employeeProfile.department
                    }
                  };
                }
              }
            } catch (error) {
              console.log('Could not enhance immunization record with profile data:', error);
            }
            return record;
          })
        );
        
        return enhancedRecords;
      } catch (error) {
        console.error('Error fetching immunizations:', error);
        throw error;
      }
    },
    enabled: !!patientId,
  });
};

// New hook for creating patient with Profile
export const useCreatePatientWithProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      patientData,
      profileData,
      userData
    }: {
      patientData: Omit<Patient, 'id'>;
      profileData?: Partial<PatientProfile>;
      userData?: { email: string; password: string; phone?: string }
    }) => createPatientWithProfile(patientData, profileData, userData),
    onSuccess: (data) => {
      console.log('Create patient with profile mutation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      if (data.profile) {
        queryClient.invalidateQueries({ queryKey: ['profiles', 'patient'] });
      }
    },
    onError: (error) => {
      console.error('Create patient with profile mutation failed:', error);
    },
  });
};

// Hook to get patient profile by patient ID
export const usePatientProfile = (patientId: number) => {
  return useQuery({
    queryKey: ['profiles', 'patient', 'byPatientId', patientId],
    queryFn: async () => {
      try {
        return await profileService.patient.getByPatientId(patientId.toString());
      } catch (error) {
        // Return null if no profile found
        return null;
      }
    },
    enabled: !!patientId,
  });
};

// Hook to check if patient has profile
export const usePatientHasProfile = (patientId: number) => {
  const { data: profile, isLoading } = usePatientProfile(patientId);
  
  return {
    hasProfile: !!profile,
    profile,
    isLoading
  };
};
