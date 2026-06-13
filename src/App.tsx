import React, { useState, useEffect } from "react";
import {
  User,
  Patient,
  Medication,
  LabReport,
  DoctorNote,
  InteractionFlag,
} from "./types.js";
import {
  Activity,
  UserCheck,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  Upload,
  Clock,
  Heart,
  Briefcase,
  CheckCircle,
  FileWarning,
  ExternalLink,
  ChevronRight,
  LogOut,
  Sparkles,
  Info,
  Calendar,
  AlertCircle,
  User as UserIcon,
  Shield,
  Search,
} from "lucide-react";

export default function App() {
  // Session / Authorization state
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("carecircle_token")
  );
  const [user, setUser] = useState<User | null>(null);

  // Auth form states
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // App data states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [labs, setLabs] = useState<LabReport[]>([]);
  const [notes, setNotes] = useState<DoctorNote[]>([]);
  const [flags, setFlags] = useState<InteractionFlag[]>([]);

  // Navigation UI states
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "medications" | "labs" | "notes"
  >("dashboard");
  const [notification, setNotification] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Modal control states
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showAddLab, setShowAddLab] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  // Add Patient Form State
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [patientConditionsInput, setPatientConditionsInput] = useState("");
  const [patientAllergiesInput, setPatientAllergiesInput] = useState("");

  // Add Medication Form State
  const [medDrugName, setMedDrugName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDoctor, setMedDoctor] = useState("");
  const [medDate, setMedDate] = useState("");
  const [medStatus, setMedStatus] = useState<"active" | "discontinued">("active");

  // Add Lab Report Form State
  const [labTestName, setLabTestName] = useState("");
  const [labDate, setLabDate] = useState("");
  const [labNotes, setLabNotes] = useState("");
  const [labMarkers, setLabMarkers] = useState<
    { marker: string; value: string; status: "normal" | "high" | "low" }[]
  >([{ marker: "", value: "", status: "normal" }]);

  // Add Doctor Note Form State
  const [noteDoctorName, setNoteDoctorName] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [noteText, setNoteText] = useState("");

  // Gemini loading states
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);

  // Load user session on startup
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      // Auto register/login to demo account for instant viewing if needed
      setToken("demo-user-id");
      localStorage.setItem("carecircle_token", "demo-user-id");
      fetchCurrentUser("demo-user-id");
    }
  }, [token]);

  // Sync patient data on selector change
  useEffect(() => {
    if (user && selectedPatient) {
      fetchPatientDetails(selectedPatient.id);
    }
  }, [selectedPatient, user]);

  const showNotification = (
    text: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const fetchCurrentUser = async (customToken?: string) => {
    const activeToken = customToken || token;
    if (!activeToken) return;

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        fetchPatients(activeToken);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
      showNotification("Error connecting to server. Local playground mode active.", "error");
    }
  };

  const fetchPatients = async (activeToken: string) => {
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const list = await res.json();
        setPatients(list);
        if (list.length > 0) {
          // Default to first patient if none selected
          setSelectedPatient((prev) => {
            const stillExists = list.find((p: any) => p.id === prev?.id);
            return stillExists || list[0];
          });
        } else {
          setSelectedPatient(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientDetails = async (patientId: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [medsRes, labsRes, notesRes, flagsRes] = await Promise.all([
        fetch(`/api/patients/${patientId}/medications`, { headers }),
        fetch(`/api/patients/${patientId}/labs`, { headers }),
        fetch(`/api/patients/${patientId}/notes`, { headers }),
        fetch(`/api/patients/${patientId}/flags`, { headers }),
      ]);

      if (medsRes.ok) setMedications(await medsRes.json());
      if (labsRes.ok) setLabs(await labsRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
      if (flagsRes.ok) setFlags(await flagsRes.json());
    } catch (e) {
      console.error("Error fetching patient details:", e);
    }
  };

  // Auth handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const url = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister
      ? { email: authEmail, name: authName, password: authPassword }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed.");
      } else {
        localStorage.setItem("carecircle_token", data.token);
        setToken(data.token);
        setUser(data.user);
        showNotification(
          isRegister
            ? "Account created successfully!"
            : `Welcome back, ${data.user.name}!`,
          "success"
        );
        // Clear fields
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
      }
    } catch (error) {
      setAuthError("Could not connect to auth services.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("carecircle_token");
    setToken(null);
    setUser(null);
    setPatients([]);
    setSelectedPatient(null);
    setMedications([]);
    setLabs([]);
    setNotes([]);
    setFlags([]);
    showNotification("Logged out successfully.", "info");
  };

  const handleSkipToDemo = () => {
    setToken("demo-user-id");
    localStorage.setItem("carecircle_token", "demo-user-id");
    fetchCurrentUser("demo-user-id");
    showNotification("Accessing Arthur Pendragon's demo space", "success");
  };

  // Add Patient Submit
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName) return;

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: patientName,
          age: patientAge,
          gender: patientGender,
          conditions: patientConditionsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          allergies: patientAllergiesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        const newPat = await res.json();
        setPatients((prev) => [...prev, newPat]);
        setSelectedPatient(newPat);
        setShowAddPatient(false);
        showNotification(`Patient "${patientName}" added successfully.`, "success");

        // Clear fields
        setPatientName("");
        setPatientAge("");
        setPatientGender("Male");
        setPatientConditionsInput("");
        setPatientAllergiesInput("");
      } else {
        showNotification("Failed to add patient record.", "error");
      }
    } catch (error) {
      showNotification("Error connecting to server.", "error");
    }
  };

  // Delete Patient
  const handleDeletePatient = async (patientId: string) => {
    if (
      !confirm(
        "Are you absolutely sure you want to delete this patient profile? All medications, labs, and history will be permanently erased."
      )
    )
      return;

    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showNotification("Patient profile deleted.", "info");
        fetchPatients(token!);
      }
    } catch (err) {
      showNotification("Error deleting profile.", "error");
    }
  };

  // Manual Add Medication
  const handleAddMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medDrugName || !selectedPatient) return;

    try {
      const res = await fetch(`/api/patients/${selectedPatient.id}/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          drug_name: medDrugName,
          dosage: medDosage,
          frequency: medFrequency,
          prescribing_doctor: medDoctor,
          date_prescribed: medDate || new Date().toISOString().split("T")[0],
          status: medStatus,
        }),
      });

      if (res.ok) {
        const newMed = await res.json();
        setMedications((prev) => [...prev, newMed]);
        setShowAddMed(false);
        showNotification(`Medication ${medDrugName} added to list.`, "success");

        // Reset inputs
        setMedDrugName("");
        setMedDosage("");
        setMedFrequency("");
        setMedDoctor("");
        setMedDate("");
        setMedStatus("active");

        // Run interaction check automatically
        triggerInteractionCheck();
      }
    } catch (err) {
      showNotification("Error adding medication.", "error");
    }
  };

  // Toggle Medication Status (Active <-> Discontinued)
  const toggleMedStatus = async (med: Medication) => {
    const newStatus = med.status === "active" ? "discontinued" : "active";
    try {
      const res = await fetch(
        `/api/patients/${selectedPatient!.id}/medications/${med.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...med, status: newStatus }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setMedications((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
        showNotification(
          `Medication marked as ${newStatus}.`,
          newStatus === "active" ? "success" : "info"
        );
        triggerInteractionCheck();
      }
    } catch (err) {
      showNotification("Error shifting status.", "error");
    }
  };

  // Delete Medication
  const handleDeleteMed = async (medId: string) => {
    try {
      const res = await fetch(
        `/api/patients/${selectedPatient!.id}/medications/${medId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setMedications((prev) => prev.filter((m) => m.id !== medId));
        showNotification("Medication removed.", "info");
        triggerInteractionCheck();
      }
    } catch (err) {
      showNotification("Error deleting medication.", "error");
    }
  };

  // Add Lab Submit
  const handleAddLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labTestName || !labDate || !selectedPatient) return;

    try {
      const res = await fetch(`/api/patients/${selectedPatient.id}/labs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_name: labTestName,
          date: labDate,
          values: labMarkers.filter((m) => m.marker && m.value),
          notes: labNotes,
        }),
      });

      if (res.ok) {
        const newLab = await res.json();
        setLabs((prev) => [newLab, ...prev]);
        setShowAddLab(false);
        showNotification(`Lab report "${labTestName}" archived.`, "success");

        // Reset lab fields
        setLabTestName("");
        setLabDate("");
        setLabNotes("");
        setLabMarkers([{ marker: "", value: "", status: "normal" }]);
      }
    } catch (e) {
      showNotification("Error logging report.", "error");
    }
  };

  // Doctor note submit
  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText || !selectedPatient) return;

    try {
      const res = await fetch(`/api/patients/${selectedPatient.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctor_name: noteDoctorName,
          date: noteDate || new Date().toISOString().split("T")[0],
          note_text: noteText,
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes((prev) => [newNote, ...prev]);
        setShowAddNote(false);
        showNotification(`Doctor note filed successfully.`, "success");

        setNoteDoctorName("");
        setNoteDate("");
        setNoteText("");
      }
    } catch (e) {
      showNotification("Error archiving notes.", "error");
    }
  };

  // Delete Labs or Notes
  const deleteLabReport = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${selectedPatient!.id}/labs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLabs((prev) => prev.filter((l) => l.id !== id));
        showNotification("Lab report deleted.", "info");
      }
    } catch (e) {
      showNotification("Error deleting report.", "error");
    }
  };

  const deleteDoctorNote = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${selectedPatient!.id}/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        showNotification("Doctor feedback deleted.", "info");
      }
    } catch (e) {
      showNotification("Error deleting note.", "error");
    }
  };

  // Resolve Flag
  const resolveFlag = async (flagId: string) => {
    try {
      const res = await fetch(
        `/api/patients/${selectedPatient!.id}/flags/${flagId}/resolve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setFlags((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        showNotification("Safety concern marked as reviewed.", "success");
      }
    } catch (err) {
      showNotification("Error resolving flag.", "error");
    }
  };

  // Trigger Gemini interaction check with Search Grounding!
  const triggerInteractionCheck = async () => {
    if (!selectedPatient) return;
    setIsCheckingInteractions(true);
    showNotification("Gemini is vetting drugs & patient profile against medical grounding...", "info");

    try {
      const res = await fetch(
        `/api/patients/${selectedPatient.id}/interactions/check`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const newFlag = await res.json();
        setFlags((prev) => [newFlag, ...prev]);
        showNotification(
          `AI Audit done! Found severity status: "${newFlag.severity.toUpperCase()}"`,
          newFlag.severity === "high" ? "error" : "success"
        );
      } else {
        const errorData = await res.json();
        showNotification(errorData.error || "Verification completed with issues.", "error");
      }
    } catch (err) {
      showNotification("Could not contact clinical grounding engine.", "error");
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  // File OCR Extraction for pre-filling Medication Form
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "med" | "lab"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    showNotification(`Gemini Vision reading document. Extracting parameters...`, "info");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      try {
        const res = await fetch("/api/gemini/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileData: base64String,
            mimeType: file.type,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          showNotification("Successfully extracted parameters! Review the form.", "success");

          if (data.docType === "prescription" && data.prescription) {
            setMedDrugName(data.prescription.drug_name || "");
            setMedDosage(data.prescription.dosage || "");
            setMedFrequency(data.prescription.frequency || "");
            setMedDoctor(data.prescription.prescribing_doctor || "");
            setMedDate(data.prescription.date_prescribed || "");
            if (type === "med") setShowAddMed(true);
          } else if (data.docType === "lab_report" && data.lab_report) {
            setLabTestName(data.lab_report.test_name || "");
            setLabDate(
              data.lab_report.date || new Date().toISOString().split("T")[0]
            );
            setLabNotes(data.lab_report.notes || "");
            if (data.lab_report.key_values) {
              setLabMarkers(
                data.lab_report.key_values.map((kv: any) => ({
                  marker: kv.marker || "",
                  value: kv.value || "",
                  status: kv.status || "normal",
                }))
              );
            }
            if (type === "lab") setShowAddLab(true);
          } else {
            showNotification(
              "Unrecognized format. Pre-filling with detected text.",
              "info"
            );
          }
        } else {
          showNotification("Data extraction service unavailable.", "error");
        }
      } catch (err) {
        showNotification("Failed to upload and analyze document.", "error");
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Hardcode preloaded simulators to easily test OCR features!
  const simulateDocumentReceipt = (docType: "prescription" | "lab") => {
    setIsExtracting(true);
    showNotification("Simulating document analysis using standard records...", "info");

    setTimeout(() => {
      setIsExtracting(false);
      showNotification("Mock extraction complete! Values populated successfully.", "success");
      if (docType === "prescription") {
        setMedDrugName("Spironolactone");
        setMedDosage("25mg");
        setMedFrequency("Once daily with food");
        setMedDoctor("Dr. Alistair Finch");
        setMedDate(new Date().toISOString().split("T")[0]);
        setShowAddMed(true);
      } else {
        setLabTestName("Thyroid Stimulating Hormone (TSH)");
        setLabDate(new Date().toISOString().split("T")[0]);
        setLabNotes("Elevated TSH levels suggesting mild hypothyroidism.");
        setLabMarkers([
          { marker: "TSH Reflex", value: "5.8 uIU/mL", status: "high" },
          { marker: "Free T4", value: "1.1 ng/dL", status: "normal" },
        ]);
        setShowAddLab(true);
      }
    }, 1800);
  };

  const activeFlags = flags.filter((f) => !f.resolved);
  const resolvedFlags = flags.filter((f) => f.resolved);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] font-sans text-[#33332D]">
      {/* Dynamic Alert Banner */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-0 text-white text-sm max-w-sm border ${
            notification.type === "success"
              ? "bg-[#5A5A40] border-[#5A5A40]"
              : notification.type === "error"
              ? "bg-[#D05C46] border-[#D05C46]"
              : "bg-[#7A766A] border-[#E5E2DA]"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-white" />
          ) : notification.type === "error" ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-white" />
          ) : (
            <Info className="h-5 w-5 shrink-0 text-white" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-[#F5F2ED] border-b border-[#E5E2DA] shadow-xs px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#5A5A40] flex items-center justify-center shadow-md">
            <Heart className="text-white h-5 bg-[#5A5A40] p-0" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-semibold tracking-tight text-[#5A5A40] flex items-center gap-2">
              Caregiver Portal
              <span className="text-xs bg-white text-[#5A5A40] font-semibold px-2 py-0.5 rounded-full border border-[#E5E2DA]">
                MVP Portal
              </span>
            </h1>
            <p className="text-xs text-[#7A766A]">
              Cooperative medication and health monitoring with safety check
            </p>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-[#A8A496] font-bold uppercase tracking-wider">
                Active Caregiver
              </span>
              <span className="text-sm font-semibold text-[#2C2C28] flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-[#5A5A40]" />
                {user.name}
              </span>
            </div>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-semibold border border-[#E5E2DA] bg-white text-[#7A766A] hover:bg-[#FDFBF7] hover:text-[#D05C46] rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <span className="text-xs font-mono text-[#A8A496]">
            Unauthenticated Mode
          </span>
        )}
      </header>

      {/* Main app grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Unauthenticated State */}
        {!user ? (
          <div className="md:col-span-4 max-w-2xl mx-auto w-full py-10">
            <div className="bg-[#F5F2ED] rounded-2xl border border-[#E5E2DA] p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="h-14 w-14 rounded-2xl bg-white text-[#5A5A40] flex items-center justify-center mx-auto mb-4 border border-[#E5E2DA] shadow-xs">
                  <Shield className="h-7 w-7 text-[#5A5A40]" />
                </div>
                <h2 className="text-3xl font-serif font-medium text-[#2C2C28] tracking-tight">
                  Welcome to Caregiver Portal
                </h2>
                <p className="text-[#7A766A] mt-2 max-w-md mx-auto text-sm">
                  A high-fidelity dashboard for caregivers to prevent adverse drug events and track accurate lab timelines for their families.
                </p>
              </div>

              {/* Form panel tab switcher */}
              <div className="flex border-[#E5E2DA] border-b mb-6 justify-center">
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setAuthError("");
                  }}
                  className={`py-2 px-6 font-semibold text-sm transition-all border-b-2 ${
                    !isRegister
                      ? "border-[#5A5A40] text-[#5A5A40] font-bold"
                      : "border-transparent text-[#7A766A] hover:text-[#5A5A40]"
                  }`}
                >
                  Caregiver Sign In
                </button>
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setAuthError("");
                  }}
                  className={`py-2 px-6 font-semibold text-sm transition-all border-b-2 ${
                    isRegister
                      ? "border-[#5A5A40] text-[#5A5A40] font-bold"
                      : "border-transparent text-[#7A766A] hover:text-[#5A5A40]"
                  }`}
                >
                  Create Portal Account
                </button>
              </div>

              {/* Error messages */}
              {authError && (
                <div className="mb-4 bg-[#FEF4F1] border-l-4 border-[#D05C46] p-3 rounded-r-lg text-xs flex items-center gap-2 text-[#8C3D2E]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                      Caregiver Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#E5E2DA] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#33332D] focus:bg-white bg-white"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="sarah@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E5E2DA] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#33332D] focus:bg-white bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#E5E2DA] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A5A40] text-[#33332D] focus:bg-white bg-white"
                    required
                  />
                </div>

                <button
                  id="auth-submit-btn"
                  type="submit"
                  className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-lg text-sm font-semibold transition shadow-md shadow-[#5A5A40]/10"
                  disabled={authLoading}
                >
                  {authLoading
                    ? "Processing..."
                    : isRegister
                    ? "Register & Create Sandbox"
                    : "Sign In"}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-[#E5E2DA] text-center">
                <span className="text-xs text-[#7A766A]">Skip authentication? </span>
                <button
                  id="skip-auth-btn"
                  onClick={handleSkipToDemo}
                  className="text-xs text-[#5A5A40] font-bold hover:underline transition"
                >
                  Open Arthur Jenkins's preseeded workspace
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* COLUMN 1: Patients list sidebar */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-[#F5F2ED] rounded-2xl border border-[#E5E2DA] p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E2DA]">
                  <h3 className="text-[10px] uppercase tracking-widest text-[#A8A496] font-bold">
                    Your Loved Ones
                  </h3>
                  <button
                    id="add-patient-btn"
                    onClick={() => setShowAddPatient(true)}
                    className="p-1 px-1.5 text-[#5A5A40] hover:bg-white border border-transparent hover:border-[#E5E2DA] rounded-lg transition-all flex items-center justify-center"
                    title="Add new patient profile"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {patients.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-[#7A766A]">
                        No patient profiles created yet.
                      </p>
                      <button
                        onClick={() => setShowAddPatient(true)}
                        className="mt-2 text-xs font-bold text-[#5A5A40] hover:underline"
                      >
                        Create profile now
                      </button>
                    </div>
                  ) : (
                    patients.map((pat) => (
                      <div
                        id={`patient-card-${pat.id}`}
                        key={pat.id}
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedPatient?.id === pat.id
                            ? "border-[#5A5A40] bg-white shadow-sm"
                            : "border-[#E5E2DA] hover:border-[#D1CDC2] bg-[#FDFBF7]/40 hover:bg-[#FDFBF7]/80"
                        }`}
                        onClick={() => setSelectedPatient(pat)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#2C2C28] truncate">
                            {pat.name}
                          </p>
                          <p className="text-xs text-[#7A766A]">
                            {pat.gender}, {pat.age} yrs old
                          </p>
                        </div>
                        <button
                          id={`delete-patient-${pat.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePatient(pat.id);
                          }}
                          className="p-1.5 text-[#A8A496] hover:text-[#D05C46] rounded-lg hover:bg-[#EAE7DC]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SIMULATE UPLOADS PANEL */}
              <div className="bg-[#5A5A40] rounded-2xl p-4 text-white shadow-md space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAE7DC] flex items-center gap-1.5 font-serif">
                  <Sparkles className="h-3.5 w-3.5" />
                  Extract Simulators
                </h4>
                <p className="text-xs text-[#F5F2ED] leading-relaxed">
                  Test Gemini's visual data parsing with these clinical document templates:
                </p>
                <div className="space-y-2">
                  <button
                    id="simulate-prescription-btn"
                    onClick={() => simulateDocumentReceipt("prescription")}
                    className="w-full text-left px-3 py-2 bg-[#4E4E37] hover:bg-[#43432F] text-xs rounded-lg flex items-center justify-between transition border border-[#5A5A40]"
                  >
                    <span className="truncate">Sample Prescription Form</span>
                    <ChevronRight className="h-3 w-3 text-[#EAE7DC] shrink-0" />
                  </button>
                  <button
                    id="simulate-lab-btn"
                    onClick={() => simulateDocumentReceipt("lab")}
                    className="w-full text-left px-3 py-2 bg-[#4E4E37] hover:bg-[#43432F] text-xs rounded-lg flex items-center justify-between transition border border-[#5A5A40]"
                  >
                    <span className="truncate">Sample Lab Test Plate</span>
                    <ChevronRight className="h-3 w-3 text-[#EAE7DC] shrink-0" />
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 2-4: Main Records & Active patient panel */}
            <div className="md:col-span-3 space-y-6">
              {selectedPatient ? (
                <>
                  {/* PATIENT HEADER & VERIFY BUTTON */}
                  <div className="p-6 bg-white rounded-2xl border border-[#E5E2DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                    <div>
                      <h2 className="text-2xl font-serif font-medium text-[#2C2C28]">
                        {selectedPatient.name}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <span className="text-xs bg-[#F5F2ED] text-[#7A766A] px-2.5 py-0.5 rounded-full font-medium">
                          {selectedPatient.gender}, {selectedPatient.age} years old
                        </span>
                        {selectedPatient.conditions.map((c, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white text-[#5A5A40] px-2.5 py-0.5 rounded-full font-medium border border-[#E5E2DA]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      id="check-interactions-btn"
                      onClick={triggerInteractionCheck}
                      disabled={isCheckingInteractions}
                      className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#5A5A40]/15 transition border border-[#5A5A40]"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isCheckingInteractions
                        ? "Consulting Grounded AI..."
                        : "Verify Drug Safety"}
                    </button>
                  </div>

                  {/* ACTIVE DRUG INTERACTION FLAGS AT FIRST */}
                  {activeFlags.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <AlertTriangle className="h-5 w-5 text-[#D05C46]" />
                        <h3 className="font-serif font-semibold text-[#2C2C28] text-base">
                          Medical Safety Warnings ({activeFlags.length})
                        </h3>
                      </div>

                      {activeFlags.map((flag) => {
                        const isHighRisk = flag.severity === "high" || flag.severity === "moderate";
                        return (
                          <div
                            id={`flag-alert-${flag.id}`}
                            key={flag.id}
                            className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden transition-all ${
                              flag.severity === "high"
                                ? "bg-[#FEF4F1] border-[#F5D8D0]"
                                : flag.severity === "moderate"
                                ? "bg-[#FEF9F1] border-[#F5ECD0]"
                                : "bg-[#FDFBF7] border-[#E5E2DA]"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className={`p-2 rounded-full shrink-0 mt-0.5 text-white ${
                                  flag.severity === "high"
                                    ? "bg-[#D05C46]"
                                    : flag.severity === "moderate"
                                    ? "bg-[#D4A373]"
                                    : "bg-[#5A5A40]"
                                }`}
                              >
                                <FileWarning className="h-5 w-5" />
                              </div>

                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h4 className={`font-serif font-semibold text-base ${isHighRisk ? "text-[#8C3D2E]" : "text-[#2C2C28]"}`}>
                                    {flag.summary}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest text-white shrink-0 ${
                                        flag.severity === "high"
                                          ? "bg-[#D05C46]"
                                          : flag.severity === "moderate"
                                          ? "bg-[#D4A373]"
                                          : "bg-[#5A5A40]"
                                      }`}
                                    >
                                      {flag.severity} RISK
                                    </span>

                                    <button
                                      id={`resolve-flag-${flag.id}`}
                                      onClick={() => resolveFlag(flag.id)}
                                      className="px-3 py-1 bg-white border border-[#E5E2DA] text-[#7A766A] hover:text-[#D05C46] hover:bg-[#FEF4F1] hover:border-[#F5D8D0] rounded-md text-xs font-semibold transition"
                                    >
                                      Acknowledge
                                    </button>
                                  </div>
                                </div>

                                <p className={`text-sm leading-relaxed whitespace-pre-wrap whitespace-pre-line ${isHighRisk ? "text-[#8C3D2E] opacity-90" : "text-[#33332D]"}`}>
                                  {flag.explanation}
                                </p>

                                {flag.related_medications && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="text-xs font-semibold text-[#7A766A]">
                                      Meds Involved:
                                    </span>
                                    {flag.related_medications.map((m, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs font-bold text-[#5A5A40] bg-white border border-[#E5E2DA] rounded-md px-2 py-0.5"
                                      >
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {flag.sources && flag.sources.length > 0 && (
                                  <div className="pt-2.5 border-t border-[#E5E2DA]/40 flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-[#A8A496] uppercase tracking-wider">
                                      Google Search Grounding sources:
                                    </span>
                                    <div className="flex flex-wrap gap-3">
                                      {flag.sources.map((src, i) => (
                                        <a
                                          key={i}
                                          href={src.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-[#5A5A40] hover:text-[#3C3C2A] hover:underline flex items-center gap-1 font-semibold"
                                        >
                                          <ExternalLink className="h-3 w-3 text-[#5A5A40]" />
                                          {src.title}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Global Clinical Disclaimer */}
                      <p className="text-xs text-[#7A766A] leading-relaxed italic bg-white p-4 rounded-xl border border-[#E5E2DA] flex items-start gap-2.5">
                        <Info className="h-4.5 w-4.5 text-[#5A5A40] shrink-0 mt-0.5" />
                        Disclaimer: The drug interaction scanner relies upon search grounding models for clinical screening and should never be used as a substitute for professional clinical medical advice of the prescribing physicians.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E5E2DA] text-[#5A5A40] px-5 py-4 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
                      <CheckCircle className="h-4.5 w-4.5 text-[#5A5A40] shrink-0" />
                      <span className="font-medium">
                        No safety interaction warnings loaded. Tap "Verify Drug Safety" to trigger an AI-grounded scan.
                      </span>
                    </div>
                  )}

                  {/* NAV TABS */}
                  <div className="flex border border-[#E5E2DA] bg-[#F5F2ED] rounded-2xl p-1.5 gap-1.5">
                    <button
                      id="tab-dashboard"
                      onClick={() => setActiveTab("dashboard")}
                      className={`py-2 px-4 font-bold text-xs transition-all rounded-xl ${
                        activeTab === "dashboard"
                          ? "bg-white text-[#5A5A40] shadow-xs"
                          : "text-[#7A766A] hover:text-[#5A5A40]"
                      }`}
                    >
                      Summary Dashboard
                    </button>
                    <button
                      id="tab-meds"
                      onClick={() => setActiveTab("medications")}
                      className={`py-2 px-4 font-bold text-xs transition-all rounded-xl ${
                        activeTab === "medications"
                          ? "bg-white text-[#5A5A40] shadow-xs"
                          : "text-[#7A766A] hover:text-[#5A5A40]"
                      }`}
                    >
                      Active Medications
                    </button>
                    <button
                      id="tab-labs"
                      onClick={() => setActiveTab("labs")}
                      className={`py-2 px-4 font-bold text-xs transition-all rounded-xl ${
                        activeTab === "labs"
                          ? "bg-white text-[#5A5A40] shadow-xs"
                          : "text-[#7A766A] hover:text-[#5A5A40]"
                      }`}
                    >
                      Lab Reports
                    </button>
                    <button
                      id="tab-notes"
                      onClick={() => setActiveTab("notes")}
                      className={`py-2 px-4 font-bold text-xs transition-all rounded-xl ${
                        activeTab === "notes"
                          ? "bg-white text-[#5A5A40] shadow-xs"
                          : "text-[#7A766A] hover:text-[#5A5A40]"
                      }`}
                    >
                      Doctor Notes
                    </button>
                  </div>

                  {/* ACTIVE TAB STAGE */}
                  <div>
                    {activeTab === "dashboard" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Allergies and Profile */}
                        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DA] space-y-3 shadow-xs">
                          <h3 className="font-bold text-[10px] text-[#A8A496] uppercase tracking-wider">
                            Patient Allergies & Warnings
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPatient.allergies.length === 0 ? (
                              <span className="text-xs text-[#7A766A]">
                                No allergies logged.
                              </span>
                            ) : (
                              selectedPatient.allergies.map((a, i) => (
                                <span
                                  key={i}
                                  className="text-xs font-bold text-white bg-[#D05C46] px-3.5 py-1 rounded-full shadow-xs"
                                >
                                  {a}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Prescriber contacts */}
                        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DA] space-y-3 shadow-xs">
                          <h3 className="font-bold text-[10px] text-[#A8A496] uppercase tracking-wider">
                            Recent Doctor Feedbacks
                          </h3>
                          {notes.length === 0 ? (
                            <span className="text-xs text-[#7A766A]">
                              No doctor notes saved.
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-[#2C2C28]">
                                {notes[0].doctor_name}
                              </span>
                              <p className="text-xs text-[#7A766A] italic leading-relaxed">
                                "{notes[0].note_text}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Medications status Summary */}
                        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DA] shadow-xs md:col-span-2 space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-[10px] text-[#A8A496] uppercase tracking-wider">
                              Recent Medications ({medications.filter((m) => m.status === "active").length} active)
                            </h3>
                            <button
                              onClick={() => {
                                setActiveTab("medications");
                                setShowAddMed(true);
                              }}
                              className="text-xs text-[#5A5A40] font-bold hover:underline"
                            >
                              Add Medication
                            </button>
                          </div>
                          <div className="divide-y divide-[#E5E2DA]/55">
                            {medications.length === 0 ? (
                              <p className="text-xs text-[#7A766A] py-3 text-center">
                                No medications logged for this loved one.
                              </p>
                            ) : (
                              medications.slice(0, 4).map((med) => (
                                <div
                                  key={med.id}
                                  className="flex items-center justify-between py-2.5"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-[#2C2C28]">
                                      {med.drug_name}
                                    </p>
                                    <span className="text-xs text-[#7A766A]">
                                      {med.dosage} — {med.frequency}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                      med.status === "active"
                                        ? "bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2DA]"
                                        : "bg-[#F5F2ED]/50 text-[#A8A496] border border-[#E5E2DA]/40"
                                    }`}
                                  >
                                    {med.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Lab Metrics Dashboard */}
                        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DA] shadow-xs md:col-span-2 space-y-3">
                          <h3 className="font-bold text-[10px] text-[#A8A496] uppercase tracking-wider">
                            Archived Lab Report Results
                          </h3>
                          {labs.length === 0 ? (
                            <p className="text-xs text-[#7A766A]">
                              No clinic lab results saved. File a PDF report or use the form.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {labs.slice(0, 2).map((report) => (
                                <div key={report.id} className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-[#2C2C28]">
                                      {report.test_name}
                                    </span>
                                    <span className="text-xs text-[#A8A496]">
                                      {report.date}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {report.values.map((v, i) => (
                                      <div
                                        key={i}
                                        className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                                          v.status === "high"
                                            ? "border-[#F5D8D0] bg-[#FEF4F1] text-[#8C3D2E]"
                                            : v.status === "low"
                                            ? "border-[#F5ECD0] bg-[#FEF9F1] text-[#B87C37]"
                                            : "border-[#E5E2DA] bg-[#F5F2ED] text-[#5A5A40]"
                                        }`}
                                      >
                                        <span className="font-medium">
                                          {v.marker}:
                                        </span>
                                        <span className="font-bold">
                                          {v.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "medications" && (
                      <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-serif font-medium text-[#2C2C28]">
                              Active & Discontinued Medications
                            </h3>
                            <p className="text-xs text-[#7A766A]">
                              Document prescriptions below either manually or with Vision pre-fill.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {/* File Upload Trigger */}
                            <label className="px-4 py-2 bg-[#F5F2ED] hover:bg-[#EAE7DC] text-[#5A5A40] rounded-xl text-xs font-semibold text-center cursor-pointer transition border border-[#E5E2DA] flex items-center justify-center gap-1.5 shadow-xs">
                              <Upload className="h-4 w-4" />
                              {isExtracting ? "Extracting..." : "Upload Presc (Vision)"}
                              <input
                                id="vision-med-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, "med")}
                                className="hidden"
                                disabled={isExtracting}
                              />
                            </label>

                            <button
                              id="add-med-btn"
                              onClick={() => setShowAddMed(true)}
                              className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#5A5A40]/10 transition border border-[#5A5A40]"
                            >
                              <Plus className="h-4 w-4" />
                              Add Medication
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {medications.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-[#E5E2DA] rounded-xl bg-[#FDFBF7]/50">
                              <p className="text-sm text-[#7A766A]">
                                Medication logs are empty. Pre-fill with a blueprint sheet above!
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-[#E5E2DA]/55">
                              {medications.map((med) => (
                                <div
                                  key={med.id}
                                  className="py-4 flex items-center justify-between"
                                >
                                  <div>
                                    <div className="flex items-center gap-3">
                                      <p className="font-serif font-semibold text-base text-[#2C2C28]">
                                        {med.drug_name}
                                      </p>
                                      <span
                                        className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                          med.status === "active"
                                            ? "bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2DA]"
                                            : "bg-[#FDFBF7] text-[#A8A496] border border-[#E5E2DA]/50"
                                        }`}
                                      >
                                        {med.status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#7A766A] mt-1">
                                      Dosage: <span className="font-medium text-[#2C2C28]">{med.dosage || "Not set"}</span> | Frequency: <span className="font-medium text-[#2C2C28]">{med.frequency || "Not set"}</span>
                                    </p>
                                    <p className="text-[11px] text-[#A8A496] mt-0.5 mt-1">
                                      Dr. {med.prescribing_doctor || "Unknown Dr"} | Prescribed {med.date_prescribed}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      id={`toggle-status-${med.id}`}
                                      onClick={() => toggleMedStatus(med)}
                                      className="px-3 py-1.5 bg-[#F5F2ED] hover:bg-[#EAE7DC] border border-[#E5E2DA] text-[#5A5A40] rounded-lg text-xs font-bold transition hover:border-[#D1CDC2]"
                                    >
                                      {med.status === "active"
                                        ? "Discontinue"
                                        : "Mark Active"}
                                    </button>
                                    <button
                                      id={`delete-med-${med.id}`}
                                      onClick={() => handleDeleteMed(med.id)}
                                      className="p-2 text-[#A8A496] hover:text-[#D05C46] hover:bg-[#FEF4F1] rounded-lg transition"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "labs" && (
                      <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-serif font-medium text-[#2C2C28]">
                              Clinical Lab Records
                            </h3>
                            <p className="text-xs text-[#7A766A]">
                              Log markers and blood chemical plates with Gemini Document Vision assistance.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {/* Vision Upload */}
                            <label className="px-4 py-2 bg-[#F5F2ED] hover:bg-[#EAE7DC] text-[#5A5A40] rounded-xl text-xs font-semibold text-center cursor-pointer border border-[#E5E2DA] transition flex items-center justify-center gap-1.5 shadow-xs">
                              <Upload className="h-4 w-4" />
                              {isExtracting ? "Extracting..." : "Scan Lab Sheet (Vision)"}
                              <input
                                id="vision-lab-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, "lab")}
                                className="hidden"
                                disabled={isExtracting}
                              />
                            </label>

                            <button
                              id="add-lab-btn"
                              onClick={() => setShowAddLab(true)}
                              className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#5A5A40]/10 transition border border-[#5A5A40]"
                            >
                              <Plus className="h-4 w-4" />
                              Archive Lab
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {labs.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-[#E5E2DA] rounded-xl bg-[#FDFBF7]/50">
                              <p className="text-sm text-[#7A766A]">
                                No lab findings filed. Use "Scan Lab Sheet" to simulate!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {labs.map((report) => (
                                <div
                                  id={`lab-card-${report.id}`}
                                  key={report.id}
                                  className="p-5 border border-[#E5E2DA] bg-[#FDFBF7]/30 rounded-xl space-y-3 shadow-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-serif font-semibold text-base text-[#2C2C28]">
                                        {report.test_name}
                                      </p>
                                      <p className="text-xs text-[#7A766A]">
                                        Date Taken: {report.date}
                                      </p>
                                    </div>
                                    <button
                                      id={`delete-lab-${report.id}`}
                                      onClick={() => deleteLabReport(report.id)}
                                      className="p-2 text-[#A8A496] hover:text-[#D05C46] rounded-lg hover:bg-[#FEF4F1] transition"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap gap-2.5">
                                    {report.values.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                                          item.status === "high"
                                            ? "border-[#F5D8D0] bg-[#FEF4F1] text-[#8C3D2E]"
                                            : item.status === "low"
                                            ? "border-[#F5ECD0] bg-[#FEF9F1] text-[#B87C37]"
                                            : "border-[#E5E2DA] bg-[#F5F2ED] text-[#5A5A40]"
                                        }`}
                                      >
                                        <span className="font-medium text-[#7A766A]">
                                          {item.marker}
                                        </span>
                                        <span className="font-bold text-[#2C2C28]">
                                          {item.value}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold uppercase tracking-widest ${
                                            item.status === "high"
                                              ? "text-[#D05C46]"
                                              : item.status === "low"
                                              ? "text-[#D4A373]"
                                              : "text-[#A8A496]"
                                          }`}
                                        >
                                          {item.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {report.notes && (
                                    <p className="text-xs text-[#7A766A] italic bg-[#F5F2ED]/60 p-2.5 rounded-lg border border-[#E5E2DA]/40">
                                      Notes: {report.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "notes" && (
                      <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-serif font-medium text-[#2C2C28]">
                              Clinical Doctor Timelines
                            </h3>
                            <p className="text-xs text-[#7A766A]">
                              Keep track of instructions, modifications, and doctor summaries.
                            </p>
                          </div>
                          <button
                            id="add-note-btn"
                            onClick={() => setShowAddNote(true)}
                            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#5A5A40]/10 transition border border-[#5A5A40] shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                            Log Notes
                          </button>
                        </div>

                        <div className="space-y-4">
                          {notes.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-[#E5E2DA] rounded-xl bg-[#FDFBF7]/50">
                              <p className="text-sm text-[#7A766A]">
                                No clinical instructions filed yet. Record feedbacks using "Log Notes".
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {notes.map((elem) => (
                                <div
                                  id={`note-timeline-${elem.id}`}
                                  key={elem.id}
                                  className="p-5 border border-[#E5E2DA] bg-[#FDFBF7]/30 rounded-xl space-y-2.5 shadow-xs"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-[#F5F2ED] text-[#5A5A40] border border-[#E5E2DA]/60 rounded-lg">
                                        <Briefcase className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-serif font-semibold text-base text-[#2C2C28]">
                                          {elem.doctor_name}
                                        </p>
                                        <p className="text-[11px] text-[#A8A496]">
                                          Archived Calendar: {elem.date}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      id={`delete-note-${elem.id}`}
                                      onClick={() => deleteDoctorNote(elem.id)}
                                      className="p-2 text-[#A8A496] hover:text-[#D05C46] rounded-lg hover:bg-[#FEF4F1] transition"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-[#5A5A40] leading-relaxed whitespace-pre-wrap whitespace-pre-line bg-white p-3 rounded-lg border border-[#E5E2DA]">
                                    {elem.note_text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E2DA] p-8 shadow-xs">
                  <h3 className="text-base font-serif font-medium text-[#2C2C28]">
                    No Loved One Profile Selected
                  </h3>
                  <p className="text-sm text-[#7A766A] max-w-sm mx-auto mt-2">
                    Create patient metrics or click one on the sidebar to inspect active drug interactions!
                  </p>
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="mt-4 px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-semibold rounded-xl border border-[#5A5A40] shadow-md shadow-[#5A5A40]/10 transition"
                  >
                    Add Loved One Profile +
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ----------------- MODALS DIALOGS ----------------- */}

      {/* 1. Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-[#2C2C28]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-serif font-semibold text-[#2C2C28]">
              Create Loved One Metrics
            </h3>

            <form onSubmit={handleAddPatientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  id="patient-name"
                  type="text"
                  placeholder="e.g. Grandma Pendragon"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input
                    id="patient-age"
                    type="number"
                    placeholder="75"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    id="patient-gender"
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] bg-white focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Known Conditions (comma separated)
                </label>
                <input
                  id="patient-conditions"
                  type="text"
                  placeholder="e.g. Asthma, Hypertension, Diabetes"
                  value={patientConditionsInput}
                  onChange={(e) => setPatientConditionsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Allergies (comma separated)
                </label>
                <input
                  id="patient-allergies"
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, Peanuts"
                  value={patientAllergiesInput}
                  onChange={(e) => setPatientAllergiesInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPatient(false)}
                  className="px-4 py-2 border border-[#E5E2DA] text-[#7A766A] hover:bg-[#FDFBF7] text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="patient-submit"
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-semibold rounded-lg transition shadow-md shadow-[#5A5A40]/10 border border-[#5A5A40]"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Medication Modal */}
      {showAddMed && (
        <div className="fixed inset-0 bg-[#2C2C28]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-serif font-semibold text-[#2C2C28]">
              Add Prescription / Medication
            </h3>

            <form onSubmit={handleAddMedSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Drug Name
                </label>
                <input
                  id="med-name-input"
                  type="text"
                  placeholder="e.g. Metformin"
                  value={medDrugName}
                  onChange={(e) => setMedDrugName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Dosage
                  </label>
                  <input
                    id="med-dosage-input"
                    type="text"
                    placeholder="e.g. 500mg"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Frequency
                  </label>
                  <input
                    id="med-frequency-input"
                    type="text"
                    placeholder="e.g. Once daily"
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Prescribing Doctor
                  </label>
                  <input
                    id="med-doctor-input"
                    type="text"
                    placeholder="Dr. Meriwether"
                    value={medDoctor}
                    onChange={(e) => setMedDoctor(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Date Prescribed
                  </label>
                  <input
                    id="med-date-input"
                    type="date"
                    value={medDate}
                    onChange={(e) => setMedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Active Status
                </label>
                <select
                  id="med-status-input"
                  value={medStatus}
                  onChange={(e) => setMedStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] bg-white focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all"
                >
                  <option value="active">Active (Taking Regularly)</option>
                  <option value="discontinued">Discontinued (Stopped)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMed(false)}
                  className="px-4 py-2 border border-[#E5E2DA] text-[#7A766A] hover:bg-[#FDFBF7] text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="med-submit-button"
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-semibold rounded-lg transition border border-[#5A5A40] shadow-md shadow-[#5A5A40]/10"
                >
                  Confirm & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Lab Report Modal */}
      {showAddLab && (
        <div className="fixed inset-0 bg-[#2C2C28]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-serif font-semibold text-[#2C2C28]">
              Log Clinic Lab Activity
            </h3>

            <form onSubmit={handleAddLabSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Lab Panel / Test Name
                  </label>
                  <input
                    id="lab-name-input"
                    type="text"
                    placeholder="e.g. Metabolic Blood Plate"
                    value={labTestName}
                    onChange={(e) => setLabTestName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Date Taken
                  </label>
                  <input
                    id="lab-date-input"
                    type="date"
                    value={labDate}
                    onChange={(e) => setLabDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Key Values array */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider">
                    Markers & Values
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLabMarkers((prev) => [
                        ...prev,
                        { marker: "", value: "", status: "normal" },
                      ])
                    }
                    className="text-xs text-[#5A5A40] font-bold hover:text-[#4E4E37] flex items-center gap-1 transition"
                  >
                    Add Marker +
                  </button>
                </div>

                {labMarkers.map((marker, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="e.g. Glucose"
                      value={marker.marker}
                      onChange={(e) => {
                        const next = [...labMarkers];
                        next[index].marker = e.target.value;
                        setLabMarkers(next);
                      }}
                      className="flex-1 px-3 py-1.5 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:outline-none placeholder-[#A8A496]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="e.g. 95 mg/dL"
                      value={marker.value}
                      onChange={(e) => {
                        const next = [...labMarkers];
                        next[index].value = e.target.value;
                        setLabMarkers(next);
                      }}
                      className="w-28 px-3 py-1.5 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:outline-none placeholder-[#A8A496]"
                      required
                    />
                    <select
                      value={marker.status}
                      onChange={(e) => {
                        const next = [...labMarkers];
                        next[index].status = e.target.value as any;
                        setLabMarkers(next);
                      }}
                      className="w-24 px-2 py-1.5 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] bg-white focus:border-[#5A5A40] focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                    {labMarkers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setLabMarkers((prev) =>
                            prev.filter((_, idx) => idx !== index)
                          )
                        }
                        className="p-1.5 text-[#A8A496] hover:text-[#D05C46] hover:bg-[#FEF4F1] rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Overall Lab summary/Notes
                </label>
                <textarea
                  id="lab-notes-input"
                  rows={2}
                  placeholder="Record summary feedback..."
                  value={labNotes}
                  onChange={(e) => setLabNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLab(false)}
                  className="px-4 py-2 border border-[#E5E2DA] text-[#7A766A] hover:bg-[#FDFBF7] text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="lab-submit-button"
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-semibold rounded-lg transition border border-[#5A5A40] shadow-md shadow-[#5A5A40]/10"
                >
                  Archive Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Doctor Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-[#2C2C28]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#E5E2DA] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-serif font-semibold text-[#2C2C28]">
              Log Doctor Notes
            </h3>

            <form onSubmit={handleAddNoteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Physician / Doctor Name
                  </label>
                  <input
                    id="note-doctor-input"
                    type="text"
                    placeholder="e.g. Dr. Meriwether"
                    value={noteDoctorName}
                    onChange={(e) => setNoteDoctorName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                    Date of Visit
                  </label>
                  <input
                    id="note-date-input"
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A766A] uppercase tracking-wider mb-1">
                  Timeline summary/Feedback text
                </label>
                <textarea
                  id="note-text-input"
                  rows={4}
                  placeholder="Insert the feedback text here..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E2DA] rounded-lg text-sm text-[#2C2C28] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 focus:outline-none transition-all placeholder-[#A8A496]"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNote(false)}
                  className="px-4 py-2 border border-[#E5E2DA] text-[#7A766A] hover:bg-[#FDFBF7] text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  id="note-submit-button"
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white text-xs font-semibold rounded-lg transition border border-[#5A5A40] shadow-md shadow-[#5A5A40]/10"
                >
                  Archive note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
