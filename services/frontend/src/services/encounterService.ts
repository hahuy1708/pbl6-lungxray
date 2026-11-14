import api from './api';
import { Encounter, RoomQueueStats } from '../types';

export const encounterService = {
  getRoomsStatus: async (): Promise<RoomQueueStats[]> => {
    const response = await api.get('/encounters/rooms-status');
    return response.data;
  },

  getRoomQueue: async (clinic_room?: string, status_filter?: string): Promise<Encounter[]> => {
    const params: any = {};
    if (clinic_room) params.clinic_room = clinic_room;
    if (status_filter) params.status_filter = status_filter;
    const response = await api.get('/encounters/queue', { params });
    return response.data;
  },

  createEncounter: async (patient_id: number, clinic_room?: string): Promise<Encounter> => {
    const response = await api.post('/encounters', { patient_id, clinic_room });
    return response.data;
  },

  assignQueue: async (encounter_id: number, clinic_room: string): Promise<Encounter> => {
    const response = await api.post(`/encounters/${encounter_id}/assign-queue`, { clinic_room });
    return response.data;
  },

  startExam: async (encounter_id: number): Promise<Encounter> => {
    const response = await api.patch(`/encounters/${encounter_id}/start-exam`);
    return response.data;
  },

  closeEncounter: async (encounter_id: number, data: { final_diagnosis: string; treatment_plan: string; follow_up_recommendation?: string }): Promise<Encounter> => {
    const response = await api.put(`/encounters/${encounter_id}/close`, data);
    return response.data;
  },

  getEncounterDetail: async (encounter_id: number): Promise<Encounter> => {
    const response = await api.get(`/encounters/${encounter_id}`);
    return response.data;
  },

  exportPdfUrl: (encounter_id: number): string => {
    return `/api/v1/encounters/${encounter_id}/export-pdf`;
  }
};
