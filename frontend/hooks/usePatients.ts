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
  const response = await api.get('/patients', { params });
  return response.data;
};

// Fetch single patient
const fetchPatient = async (id: number): Promise<PatientWithRelations> => {
  const response = await api.get(`/patients/${id}`);
  return response.data;
};

// Create new patient
const createPatient = async (patient: Omit<Patient, 'id'>): Promise<Patient> => {
  const response = await api.post('/patients', patient);
  return response.data;
};

// Update patient
const updatePatient = async ({ id, data }: { id: number; data: Partial<Patient> }): Promise<Patient> => {
  const response = await api.put(`/patients/${id}`, data);
  return response.data;
};

// Delete patient
const deletePatient = async (id: number): Promise<void> => {
  await api.delete(`/patients/${id}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updatePatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(data.id) });
      }
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
};

// Hook for patient immunization records
export const usePatientImmunizations = (patientId: number) => {
  return useQuery({
    queryKey: [...patientKeys.detail(patientId), 'immunizations'],
    queryFn: async () => {
      const response = await api.get(`/patients/${patientId}/immunization-records`);
      return response.data;
    },
    enabled: !!patientId,
  });
};