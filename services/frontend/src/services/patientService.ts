import api from './api';
import { Patient, PatientHistoryItem } from '../types';

export const patientService = {
  getPatients: async (query?: string): Promise<Patient[]> => {
    const params = query ? { query } : {};
    const response = await api.get('/patients', { params });
    return response.data;
  },

  getPatientById: async (id: number): Promise<Patient> => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  createPatient: async (data: Partial<Patient>): Promise<Patient> => {
    const response = await api.post('/patients', data);
    return response.data;
  },

  updatePatient: async (id: number, data: Partial<Patient>): Promise<Patient> => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
  },

  getPatientHistory: async (id: number): Promise<PatientHistoryItem[]> => {
    const response = await api.get(`/patients/${id}/history`);
    return response.data;
  }
};
