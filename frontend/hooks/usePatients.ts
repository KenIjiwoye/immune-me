import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '../services/api';
import { Patient, PatientWithRelations, PatientListResponse, PatientQueryParams } from '../types/patient';

// Query keys
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientQueryParams) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
};

// Fetch patients with pagination and filtering
const fetchPatients = async (params: PatientQueryParams): Promise<PatientListResponse> => {
  console.log('Fetching patients with params:', params);
  try {
    const response = await api.get('/patients', { params });
    console.log('Patients fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

// Fetch single patient
const fetchPatient = async (id: number): Promise<PatientWithRelations> => {
  console.log('Fetching patient with ID:', id);
  try {
    const response = await api.get(`/patients/${id}`);
    console.log('Patient fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw error;
  }
};

// Create new patient
const createPatient = async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
  console.log('Creating patient with data:', patient);
  try {
    const response = await api.post('/patients', patient);
    console.log('Patient created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating patient:', error);
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

// Hook for patient immunization records
export const usePatientImmunizations = (patientId: number) => {
  return useQuery({
    queryKey: [...patientKeys.detail(patientId), 'immunizations'],
    queryFn: async () => {
      console.log('Fetching immunizations for patient:', patientId);
      try {
        const response = await api.get(`/patients/${patientId}/immunization-records`);
        console.log('Immunizations fetched successfully:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching immunizations:', error);
        throw error;
      }
    },
    enabled: !!patientId,
  });
};
