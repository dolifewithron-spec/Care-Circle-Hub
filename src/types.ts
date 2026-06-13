export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Patient {
  id: string;
  owner_user_id: string;
  name: string;
  age: number;
  gender: string;
  conditions: string[];
  allergies: string[];
  created_at?: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  prescribing_doctor: string;
  date_prescribed: string;
  status: "active" | "discontinued";
  created_at?: string;
}

export interface LabReport {
  id: string;
  patient_id: string;
  test_name: string;
  date: string;
  values: { marker: string; value: string; status?: "normal" | "high" | "low" }[];
  notes: string;
  file_url?: string;
  created_at?: string;
}

export interface DoctorNote {
  id: string;
  patient_id: string;
  doctor_name: string;
  date: string;
  note_text: string;
  created_at?: string;
}

export interface InteractionFlag {
  id: string;
  patient_id: string;
  severity: "high" | "moderate" | "low" | "none";
  summary: string;
  explanation: string;
  related_medications: string[];
  created_at: string;
  resolved: boolean;
  sources?: { title: string; url: string }[];
}

export interface DatabaseSchema {
  users: Record<string, User & { passwordHash: string }>;
  patients: Record<string, Patient>;
  medications: Record<string, Medication>;
  lab_reports: Record<string, LabReport>;
  doctor_notes: Record<string, DoctorNote>;
  interaction_flags: Record<string, InteractionFlag>;
}
