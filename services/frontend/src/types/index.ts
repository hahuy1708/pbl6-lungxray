export type UserRole = 'DOCTOR' | 'NURSE' | 'ADMIN';

export type EncounterStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ClinicalRiskCategory = string;

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  room_id?: number;
  name_room?: string;
  nameRoom?: string;
  phone?: string;
  is_active: boolean;
  is_available?: boolean;
  must_change_password: boolean;
  temporary_password?: string;
  created_at: string;
}

export interface ClinicRoom {
  id: number;
  room_code: string;
  room_name: string;
  is_active: boolean;
  is_assigned: boolean;
  assigned_doctor_id?: number;
  assigned_doctor_name?: string;
  created_at: string;
}

export interface Patient {
  id: number;
  patient_code: string;
  full_name: string;
  card_number: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  address?: string;
  insurance_number?: string;
  created_at: string;
}

export interface PatientHistoryItem {
  encounter_id: number;
  encounter_code: string;
  date: string;
  completion_time?: string;
  status: EncounterStatus | string;
  clinic_room: string;
  doctor_name: string;
  chief_complaint?: string;
  final_diagnosis?: string;
  treatment_plan?: string;
  follow_up_recommendation?: string;
  xray_images: Array<{
    id: number;
    image_url: string;
    uploaded_at: string;
    ai_result?: {
      predicted_category: string;
      confidence_score: number;
      mask_image_url?: string;
      overlay_image_url?: string;
      doctor_comment?: string;
    };
  }>;
}

export interface PredictionItem {
  id: string; // 'g1' | 'g2' | 'g3'
  name: string; // 'Mass / Nodule', 'Pleural / Air-space findings', 'Other findings'
  conditions?: string[];
  probability: number;
  threshold: number;
  flagged: boolean;
}

export interface AIDiagnosticResult {
  id: number;
  xray_image_id: number;
  mask_image_url: string;
  cropped_image_url: string;
  overlay_image_url?: string;
  predicted_category?: string;
  confidence_score?: number;
  predictions?: PredictionItem[];
  model_version?: string;
  timing_seconds?: any;
  doctor_comment?: string;
  created_at: string;
}

export interface XrayImage {
  id: number;
  encounter_id: number;
  image_url: string;
  uploaded_by: number;
  uploaded_at: string;
  ai_result?: AIDiagnosticResult;
}

export interface ClinicalRecord {
  id: number;
  encounter_id: number;
  chief_complaint?: string;
  present_illness?: string;
  medical_history?: string;
  physical_exam?: string;
  final_diagnosis?: string;
  treatment_plan?: string;
  follow_up_recommendation?: string;
  is_locked: boolean;
  updated_at: string;
}

export interface Encounter {
  id: number;
  encounter_code: string;
  patient_id: number;
  doctor_id?: number;
  nurse_id?: number;
  clinic_room: string;
  queue_number?: number;
  status: EncounterStatus;
  admission_time: string;
  completion_time?: string;
  patient?: Patient;
  doctor?: User;
  nurse?: User;
  clinical_record?: ClinicalRecord;
  xray_images: XrayImage[];
}

export interface RoomQueueStats {
  code: string;
  name: string;
  department_code?: string;
  doctor_name?: string;
  is_available?: boolean;
  total_today: number;
  waiting_count: number;
  in_progress_count: number;
  max_capacity: number;
  is_overloaded: boolean;
  load_percentage: number;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  target_entity: string;
  target_id?: number;
  ip_address?: string;
  details?: any;
  created_at: string;
  user?: User;
}

export interface DoctorTab {
  id: string; // usually `enc-${encounterId}`
  encounterId: number;
  patientCode: string;
  patientName: string;
  activeSubTab: 'consultation' | 'history';
  draftRecord: {
    chief_complaint?: string;
    present_illness?: string;
    medical_history?: string;
    physical_exam?: string;
    final_diagnosis?: string;
    treatment_plan?: string;
    follow_up_recommendation?: string;
  };
  isLocked: boolean;
}
