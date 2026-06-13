import * as fs from "fs/promises";
import * as path from "path";
import { DatabaseSchema, Patient, Medication, LabReport, DoctorNote, InteractionFlag, User } from "./types.js";

const DB_FILE_PATH = path.join(process.cwd(), "carecircle_db.json");

// Default seeded database to show nice visual details immediately
const DEFAULT_DB: DatabaseSchema = {
  users: {
    "demo@carecircle.org": {
      id: "demo-user-id",
      email: "demo@carecircle.org",
      name: "Sarah Pendragon (Caregiver)",
      passwordHash: "demo123" // Simple hash for demo
    }
  },
  patients: {
    "arthur-pendragon": {
      id: "arthur-pendragon",
      owner_user_id: "demo-user-id",
      name: "Arthur Pendragon",
      age: 74,
      gender: "Male",
      conditions: ["Hypertension", "Type 2 Diabetes", "Mild Renal Impairment"],
      allergies: ["Penicillin", "Sulfa Drugs"],
      created_at: new Date("2026-01-10T10:00:00.000Z").toISOString()
    }
  },
  medications: {
    "med-lisinopril": {
      id: "med-lisinopril",
      patient_id: "arthur-pendragon",
      drug_name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily in the morning",
      prescribing_doctor: "Dr. Elizabeth Meriwether",
      date_prescribed: "2026-02-15",
      status: "active",
      created_at: new Date("2026-02-15T09:00:00.000Z").toISOString()
    },
    "med-metformin": {
      id: "med-metformin",
      patient_id: "arthur-pendragon",
      drug_name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily with meals",
      prescribing_doctor: "Dr. Marcus Vance",
      date_prescribed: "2026-03-10",
      status: "active",
      created_at: new Date("2026-03-10T14:30:00.000Z").toISOString()
    },
    "med-ibuprofen": {
      id: "med-ibuprofen",
      patient_id: "arthur-pendragon",
      drug_name: "Ibuprofen",
      dosage: "400mg",
      frequency: "Every 6 hours as needed for back pain",
      prescribing_doctor: "Self-prescribed (OTC)",
      date_prescribed: "2026-05-01",
      status: "discontinued",
      created_at: new Date("2026-05-01T11:15:00.000Z").toISOString()
    }
  },
  lab_reports: {
    "lab-cmp-1": {
      id: "lab-cmp-1",
      patient_id: "arthur-pendragon",
      test_name: "Comprehensive Metabolic Panel (CMP)",
      date: "2026-05-12",
      values: [
        { marker: "HbA1c", value: "6.9%", status: "high" },
        { marker: "eGFR", value: "52 mL/min", status: "low" },
        { marker: "Potassium", value: "4.8 mEq/L", status: "normal" },
        { marker: "Serum Creatinine", value: "1.4 mg/dL", status: "high" }
      ],
      notes: "HbA1c is slightly elevated but stable. Renal functions (eGFR and Creatinine) indicate Stage 3a Chronic Kidney Disease. Monitor closely.",
      created_at: new Date("2026-05-12T16:00:00.000Z").toISOString()
    }
  },
  doctor_notes: {
    "note-1": {
      id: "note-1",
      patient_id: "arthur-pendragon",
      doctor_name: "Dr. Elizabeth Meriwether (Primary Care)",
      date: "2026-05-14",
      note_text: "Arthur was brought in by his daughter Sarah. BP measured today is 128/82. Arthur reports occasional mild dizziness upon standing. Reviewed medications. Checked renal status from recent labs. Instructed him to avoid OTC NSAIDs like ibuprofen as they could exacerbate his kidney impairment.",
      created_at: new Date("2026-05-14T15:20:00.000Z").toISOString()
    }
  },
  interaction_flags: {
    "flag-lisinopril-renal": {
      id: "flag-lisinopril-renal",
      patient_id: "arthur-pendragon",
      severity: "moderate",
      summary: "ACE Inhibitor & Renal Impairment Risk",
      explanation: "Lisinopril is an ACE Inhibitor. While it treats hypertension and protects the kidneys in diabetic patients, its use in patients with pre-existing mild to moderate renal impairment (e.g. eGFR of 52) can occasionally lead to acute kidney injury or hyperkalemia. Kidney parameters and potassium levels must be closely monitored.",
      related_medications: ["Lisinopril"],
      created_at: new Date("2026-05-13T08:00:00.000Z").toISOString(),
      resolved: false,
      sources: [
        { title: "Lisinopril and Kidney Impairment - National Institutes of Health", url: "https://pubmed.ncbi.nlm.nih.gov/" },
        { title: "ACE Inhibitors Use in Renal Dysfunction - Mayo Clinic Proceedings", url: "https://www.mayoclinicproceedings.org/" }
      ]
    },
    "flag-ibuprofen-contra": {
      id: "flag-ibuprofen-contra",
      patient_id: "arthur-pendragon",
      severity: "high",
      summary: "Ibuprofen & Renal Contraindication",
      explanation: "NSAIDs such as Ibuprofen are strictly contraindicated or should be highly restricted in patients with renal impairment and those taking ACE inhibitors (Lisinopril). Combining Ibuprofen and Lisinopril can cause severe acute kidney injury by disrupting renal hemodynamics. This medication has been marked as discontinued, which resolves the active threat.",
      related_medications: ["Lisinopril", "Ibuprofen"],
      created_at: new Date("2026-05-13T08:05:00.000Z").toISOString(),
      resolved: true,
      sources: [
        { title: "Triple Whammy: NSAIDs + ACE inhibitors + Diuretics - FDA Warning", url: "https://www.fda.gov/" }
      ]
    }
  }
};

export class CareCircleLocalDB {
  private dataCache: DatabaseSchema | null = null;
  private isLoaded = false;

  private async load(): Promise<DatabaseSchema> {
    if (this.isLoaded && this.dataCache) {
      return this.dataCache;
    }

    try {
      const fileData = await fs.readFile(DB_FILE_PATH, "utf-8");
      this.dataCache = JSON.parse(fileData);
      this.isLoaded = true;
      return this.dataCache!;
    } catch (e) {
      // File doesn't exist, create it with default preseeded db
      this.dataCache = JSON.parse(JSON.stringify(DEFAULT_DB));
      await this.save(this.dataCache!);
      this.isLoaded = true;
      return this.dataCache!;
    }
  }

  private async save(data: DatabaseSchema): Promise<void> {
    this.dataCache = data;
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  // Auth queries
  public async getUser(email: string): Promise<(User & { passwordHash: string }) | null> {
    const db = await this.load();
    const lEmail = email.toLowerCase().trim();
    return db.users[lEmail] || null;
  }

  public async getUserById(id: string): Promise<User | null> {
    const db = await this.load();
    const found = Object.values(db.users).find((u) => u.id === id);
    if (!found) return null;
    return { id: found.id, email: found.email, name: found.name };
  }

  public async createUser(email: string, name: string, passwordHash: string): Promise<User> {
    const db = await this.load();
    const lEmail = email.toLowerCase().trim();
    if (db.users[lEmail]) {
      throw new Error("A user with this email already exists.");
    }
    const newUser = {
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      email: lEmail,
      name,
      passwordHash
    };
    db.users[lEmail] = newUser;
    await this.save(db);
    return { id: newUser.id, email: newUser.email, name: newUser.name };
  }

  // Patient queries
  public async getPatients(userId: string): Promise<Patient[]> {
    const db = await this.load();
    return Object.values(db.patients).filter((p) => p.owner_user_id === userId);
  }

  public async getPatient(userId: string, patientId: string): Promise<Patient | null> {
    const db = await this.load();
    const patient = db.patients[patientId];
    if (!patient || patient.owner_user_id !== userId) return null;
    return patient;
  }

  public async createPatient(userId: string, patient: Omit<Patient, "id" | "owner_user_id">): Promise<Patient> {
    const db = await this.load();
    const newId = `pat-${Math.random().toString(36).substr(2, 9)}`;
    const newPatient: Patient = {
      ...patient,
      id: newId,
      owner_user_id: userId,
      created_at: new Date().toISOString()
    };
    db.patients[newId] = newPatient;
    await this.save(db);
    return newPatient;
  }

  public async updatePatient(userId: string, patientId: string, updates: Partial<Omit<Patient, "id" | "owner_user_id">>): Promise<Patient> {
    const db = await this.load();
    const patient = db.patients[patientId];
    if (!patient || patient.owner_user_id !== userId) {
      throw new Error("Patient not found or access denied.");
    }
    const updated = { ...patient, ...updates };
    db.patients[patientId] = updated;
    await this.save(db);
    return updated;
  }

  public async deletePatient(userId: string, patientId: string): Promise<void> {
    const db = await this.load();
    const patient = db.patients[patientId];
    if (!patient || patient.owner_user_id !== userId) {
      throw new Error("Patient not found or access denied.");
    }
    delete db.patients[patientId];

    // Cascade delete other child entities
    for (const id of Object.keys(db.medications)) {
      if (db.medications[id].patient_id === patientId) delete db.medications[id];
    }
    for (const id of Object.keys(db.lab_reports)) {
      if (db.lab_reports[id].patient_id === patientId) delete db.lab_reports[id];
    }
    for (const id of Object.keys(db.doctor_notes)) {
      if (db.doctor_notes[id].patient_id === patientId) delete db.doctor_notes[id];
    }
    for (const id of Object.keys(db.interaction_flags)) {
      if (db.interaction_flags[id].patient_id === patientId) delete db.interaction_flags[id];
    }

    await this.save(db);
  }

  // Medication queries
  public async getMedications(userId: string, patientId: string): Promise<Medication[]> {
    // Check owner access
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    return Object.values(db.medications).filter((m) => m.patient_id === patientId);
  }

  public async createMedication(userId: string, patientId: string, medication: Omit<Medication, "id" | "patient_id">): Promise<Medication> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const newId = `med-${Math.random().toString(36).substr(2, 9)}`;
    const newMed: Medication = {
      ...medication,
      id: newId,
      patient_id: patientId,
      created_at: new Date().toISOString()
    };
    db.medications[newId] = newMed;
    await this.save(db);
    return newMed;
  }

  public async updateMedication(userId: string, patientId: string, medicationId: string, updates: Partial<Omit<Medication, "id" | "patient_id">>): Promise<Medication> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const med = db.medications[medicationId];
    if (!med || med.patient_id !== patientId) {
      throw new Error("Medication not found.");
    }
    const updated = { ...med, ...updates };
    db.medications[medicationId] = updated;
    await this.save(db);
    return updated;
  }

  public async deleteMedication(userId: string, patientId: string, medicationId: string): Promise<void> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const med = db.medications[medicationId];
    if (!med || med.patient_id !== patientId) {
      throw new Error("Medication not found.");
    }
    delete db.medications[medicationId];
    await this.save(db);
  }

  // Lab Report queries
  public async getLabReports(userId: string, patientId: string): Promise<LabReport[]> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    return Object.values(db.lab_reports).filter((l) => l.patient_id === patientId);
  }

  public async createLabReport(userId: string, patientId: string, report: Omit<LabReport, "id" | "patient_id">): Promise<LabReport> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const newId = `lab-${Math.random().toString(36).substr(2, 9)}`;
    const newReport: LabReport = {
      ...report,
      id: newId,
      patient_id: patientId,
      created_at: new Date().toISOString()
    };
    db.lab_reports[newId] = newReport;
    await this.save(db);
    return newReport;
  }

  public async deleteLabReport(userId: string, patientId: string, reportId: string): Promise<void> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const report = db.lab_reports[reportId];
    if (!report || report.patient_id !== patientId) {
      throw new Error("Lab report not found.");
    }
    delete db.lab_reports[reportId];
    await this.save(db);
  }

  // Doctor note queries
  public async getDoctorNotes(userId: string, patientId: string): Promise<DoctorNote[]> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    return Object.values(db.doctor_notes).filter((n) => n.patient_id === patientId);
  }

  public async createDoctorNote(userId: string, patientId: string, note: Omit<DoctorNote, "id" | "patient_id">): Promise<DoctorNote> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const newId = `note-${Math.random().toString(36).substr(2, 9)}`;
    const newNote: DoctorNote = {
      ...note,
      id: newId,
      patient_id: patientId,
      created_at: new Date().toISOString()
    };
    db.doctor_notes[newId] = newNote;
    await this.save(db);
    return newNote;
  }

  public async deleteDoctorNote(userId: string, patientId: string, noteId: string): Promise<void> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const note = db.doctor_notes[noteId];
    if (!note || note.patient_id !== patientId) {
      throw new Error("Doctor note not found.");
    }
    delete db.doctor_notes[noteId];
    await this.save(db);
  }

  // Interaction flags queries
  public async getInteractionFlags(userId: string, patientId: string): Promise<InteractionFlag[]> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    return Object.values(db.interaction_flags).filter((f) => f.patient_id === patientId);
  }

  public async createInteractionFlag(userId: string, patientId: string, flag: Omit<InteractionFlag, "id" | "patient_id" | "created_at">): Promise<InteractionFlag> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const newId = `flag-${Math.random().toString(36).substr(2, 9)}`;
    const newFlag: InteractionFlag = {
      ...flag,
      id: newId,
      patient_id: patientId,
      created_at: new Date().toISOString()
    };
    db.interaction_flags[newId] = newFlag;
    await this.save(db);
    return newFlag;
  }

  public async resolveInteractionFlag(userId: string, patientId: string, flagId: string): Promise<InteractionFlag> {
    const patient = await this.getPatient(userId, patientId);
    if (!patient) throw new Error("Access denied.");
    const db = await this.load();
    const flag = db.interaction_flags[flagId];
    if (!flag || flag.patient_id !== patientId) {
      throw new Error("Interaction flag not found.");
    }
    flag.resolved = true;
    db.interaction_flags[flagId] = flag;
    await this.save(db);
    return flag;
  }
}

export const dbInstance = new CareCircleLocalDB();
