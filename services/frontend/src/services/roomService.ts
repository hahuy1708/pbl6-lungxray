import api from './api';
import { ClinicRoom } from '../types';

export const roomService = {
  /** Lấy toàn bộ danh sách phòng khám kèm trạng thái gán bác sĩ */
  getRooms: async (): Promise<ClinicRoom[]> => {
    const response = await api.get('/rooms');
    return response.data;
  },

  /** Lấy danh sách các phòng còn trống (chưa có bác sĩ nào nhận) */
  getAvailableRooms: async (): Promise<ClinicRoom[]> => {
    const response = await api.get('/rooms/available');
    return response.data;
  },

  /** Lấy trạng thái hoạt động phòng của bác sĩ hiện tại */
  getMyRoomStatus: async (): Promise<{ room_id: number | null; room_name: string | null; is_active: boolean }> => {
    const response = await api.get('/rooms/my-status');
    return response.data;
  },

  /** Bác sĩ bật/tắt trạng thái hoạt động phòng khám */
  toggleMyRoomStatus: async (is_active: boolean): Promise<ClinicRoom> => {
    const response = await api.patch('/rooms/my-status', null, { params: { is_active } });
    return response.data;
  },
};

