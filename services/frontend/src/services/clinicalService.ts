import api from './api';
import { ClinicalRecord } from '../types';

export const clinicalService = {
  getClinicalRecord: async (encounter_id: number): Promise<ClinicalRecord> => {
    const response = await api.get(`/encounters/${encounter_id}/clinical-record`);
    return response.data;
  },

  saveClinicalDraft: async (encounter_id: number, data: Partial<ClinicalRecord>): Promise<ClinicalRecord> => {
    const response = await api.put(`/encounters/${encounter_id}/clinical-record`, data);
    return response.data;
  }
};
