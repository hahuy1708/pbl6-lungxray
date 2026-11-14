import api from './api';
import { XrayImage, AIDiagnosticResult } from '../types';

export const xrayService = {
  uploadXray: async (encounter_id: number, file: File): Promise<XrayImage> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/encounters/${encounter_id}/xray`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  triggerAIDiagnosis: async (xray_id: number): Promise<AIDiagnosticResult> => {
    const response = await api.post(`/xray/${xray_id}/run-ai`);
    return response.data;
  },

  updateDoctorComment: async (result_id: number, doctor_comment: string): Promise<AIDiagnosticResult> => {
    const response = await api.put(`/ai-results/${result_id}/comment`, { doctor_comment });
    return response.data;
  }
};
