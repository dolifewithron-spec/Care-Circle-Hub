import express from "express";
import * as path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { dbInstance } from "./src/serverDB.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body size limit increased to handle base64 image file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Google GenAI SDK to avoid crashing if API key is not set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY is not configured in Secrets. Please add your key in the Secrets panel in AI Studio settings."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Session parser middleware
async function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "Empty authorization token" });
  }

  try {
    const user = await dbInstance.getUserById(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid caregiver session" });
    }
    req.userId = user.id;
    req.user = user;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Auth APIs
app.post("/api/auth/register", async (req: any, res: any) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: "Email, name, and password are required" });
  }
  try {
    const existing = await dbInstance.getUser(email);
    if (existing) {
      return res.status(400).json({ error: "A caregiver with this email is already registered." });
    }
    const user = await dbInstance.createUser(email, name, password); // uses raw for simple demo storage
    res.status(201).json({ user, token: user.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const userWithHash = await dbInstance.getUser(email);
    if (!userWithHash || userWithHash.passwordHash !== password) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const user = { id: userWithHash.id, email: userWithHash.email, name: userWithHash.name };
    res.json({ user, token: user.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req: any, res: any) => {
  res.json({ user: req.user });
});

// Patients APIs
app.get("/api/patients", authMiddleware, async (req: any, res: any) => {
  try {
    const patients = await dbInstance.getPatients(req.userId);
    res.json(patients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/patients", authMiddleware, async (req: any, res: any) => {
  const { name, age, gender, conditions, allergies } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Patient name is required" });
  }
  try {
    const patient = await dbInstance.createPatient(req.userId, {
      name,
      age: Number(age) || 0,
      gender: gender || "Other",
      conditions: Array.isArray(conditions) ? conditions : [],
      allergies: Array.isArray(allergies) ? allergies : []
    });
    res.status(201).json(patient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/patients/:id", authMiddleware, async (req: any, res: any) => {
  const { name, age, gender, conditions, allergies } = req.body;
  try {
    const updated = await dbInstance.updatePatient(req.userId, req.params.id, {
      name,
      age: Number(age),
      gender,
      conditions,
      allergies
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/patients/:id", authMiddleware, async (req: any, res: any) => {
  try {
    await dbInstance.deletePatient(req.userId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Medications APIs
app.get("/api/patients/:patientId/medications", authMiddleware, async (req: any, res: any) => {
  try {
    const meds = await dbInstance.getMedications(req.userId, req.params.patientId);
    res.json(meds);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/patients/:patientId/medications", authMiddleware, async (req: any, res: any) => {
  const { drug_name, dosage, frequency, prescribing_doctor, date_prescribed, status } = req.body;
  if (!drug_name) {
    return res.status(400).json({ error: "Drug name is required" });
  }
  try {
    const med = await dbInstance.createMedication(req.userId, req.params.patientId, {
      drug_name,
      dosage: dosage || "",
      frequency: frequency || "",
      prescribing_doctor: prescribing_doctor || "",
      date_prescribed: date_prescribed || new Date().toISOString().split("T")[0],
      status: status === "discontinued" ? "discontinued" : "active"
    });
    res.status(201).json(med);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/patients/:patientId/medications/:id", authMiddleware, async (req: any, res: any) => {
  const { drug_name, dosage, frequency, prescribing_doctor, date_prescribed, status } = req.body;
  try {
    const updated = await dbInstance.updateMedication(req.userId, req.params.patientId, req.params.id, {
      drug_name,
      dosage,
      frequency,
      prescribing_doctor,
      date_prescribed,
      status
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/patients/:patientId/medications/:id", authMiddleware, async (req: any, res: any) => {
  try {
    await dbInstance.deleteMedication(req.userId, req.params.patientId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Lab Reports APIs
app.get("/api/patients/:patientId/labs", authMiddleware, async (req: any, res: any) => {
  try {
    const labs = await dbInstance.getLabReports(req.userId, req.params.patientId);
    res.json(labs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/patients/:patientId/labs", authMiddleware, async (req: any, res: any) => {
  const { test_name, date, values, notes, file_url } = req.body;
  if (!test_name || !date) {
    return res.status(400).json({ error: "Test name and date are required" });
  }
  try {
    const report = await dbInstance.createLabReport(req.userId, req.params.patientId, {
      test_name,
      date,
      values: Array.isArray(values) ? values : [],
      notes: notes || "",
      file_url: file_url || ""
    });
    res.status(201).json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/patients/:patientId/labs/:id", authMiddleware, async (req: any, res: any) => {
  try {
    await dbInstance.deleteLabReport(req.userId, req.params.patientId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Doctor notes APIs
app.get("/api/patients/:patientId/notes", authMiddleware, async (req: any, res: any) => {
  try {
    const notes = await dbInstance.getDoctorNotes(req.userId, req.params.patientId);
    res.json(notes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/patients/:patientId/notes", authMiddleware, async (req: any, res: any) => {
  const { doctor_name, date, note_text } = req.body;
  if (!note_text || !date) {
    return res.status(400).json({ error: "Note text and date are required" });
  }
  try {
    const createdNote = await dbInstance.createDoctorNote(req.userId, req.params.patientId, {
      doctor_name: doctor_name || "Unknown Doctor",
      date,
      note_text
    });
    res.status(201).json(createdNote);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/patients/:patientId/notes/:id", authMiddleware, async (req: any, res: any) => {
  try {
    await dbInstance.deleteDoctorNote(req.userId, req.params.patientId, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Getting active interaction flags
app.get("/api/patients/:patientId/flags", authMiddleware, async (req: any, res: any) => {
  try {
    const flags = await dbInstance.getInteractionFlags(req.userId, req.params.patientId);
    res.json(flags);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/patients/:patientId/flags/:id/resolve", authMiddleware, async (req: any, res: any) => {
  try {
    const resolvedFlag = await dbInstance.resolveInteractionFlag(req.userId, req.params.patientId, req.params.id);
    res.json(resolvedFlag);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Gemini Vision Document Extraction Endpoint
// -------------------------------------------------------------
app.post("/api/gemini/extract", authMiddleware, async (req: any, res: any) => {
  const { fileData, mimeType } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "File data base64 string is required" });
  }

  try {
    let base64Data = fileData;
    let cleanedMimeType = mimeType || "image/png";

    if (fileData.startsWith("data:")) {
      const parts = fileData.split(";base64,");
      if (parts.length === 2) {
        const header = parts[0];
        cleanedMimeType = header.replace("data:", "").split(";")[0];
        base64Data = parts[1];
      }
    }

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: cleanedMimeType,
      },
    };

    const textPart = {
      text: `Identify if the uploaded health record document is a 'prescription' or a 'lab_report'.
Extract all applicable medical details into the structured fields provided by the schema.
For prescriptions:
- drug_name (exact brand or chemical name mentioned)
- dosage (e.g. '500mg', '10mL')
- frequency (e.g. 'Once daily', 'Every 8 hours')
- prescribing_doctor (if present, else empty/unknown)
- date_prescribed (use YYYY-MM-DD formatting if found)

For lab reports:
- test_name (e.g. 'Blood Panel', 'CMP', 'Thyroid Test')
- date (use YYYY-MM-DD formatting if found)
- key_values: list of markers, values, and status. Marker example: 'Potassium', 'Glucose'. Status must be either 'normal', 'high', or 'low' compared to standard ranges.
- notes (general notes/commentary on the lab report)

Return your response strictly adhering to the JSON schema specified.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            docType: {
              type: Type.STRING,
              description: "Must be either 'prescription' or 'lab_report' or 'unknown'",
            },
            prescription: {
              type: Type.OBJECT,
              properties: {
                drug_name: { type: Type.STRING },
                dosage: { type: Type.STRING },
                frequency: { type: Type.STRING },
                prescribing_doctor: { type: Type.STRING },
                date_prescribed: { type: Type.STRING },
              },
            },
            lab_report: {
              type: Type.OBJECT,
              properties: {
                test_name: { type: Type.STRING },
                date: { type: Type.STRING },
                key_values: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      marker: { type: Type.STRING },
                      value: { type: Type.STRING },
                      status: { type: Type.STRING, description: "normal, high, or low" },
                    },
                    required: ["marker", "value"],
                  },
                },
                notes: { type: Type.STRING },
              },
            },
          },
          required: ["docType"],
        },
      },
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Vision extract error:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Gemini Drug Interaction Flagging with Google Search Grounding Check
// -------------------------------------------------------------
app.post("/api/patients/:patientId/interactions/check", authMiddleware, async (req: any, res: any) => {
  const patientId = req.params.patientId;
  try {
    const patient = await dbInstance.getPatient(req.userId, patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const meds = await dbInstance.getMedications(req.userId, patientId);
    const activeMeds = meds.filter((m) => m.status === "active");

    const conditionsList = patient.conditions && patient.conditions.length > 0 ? patient.conditions.join(", ") : "None";
    const allergiesList = patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None";

    const medsText = activeMeds
      .map((m) => `- ${m.drug_name} (Dosage: ${m.dosage}, Frequency: ${m.frequency})`)
      .join("\n");

    if (activeMeds.length === 0) {
      return res.json({
        severity: "none",
        summary: "No active medications to evaluate.",
        explanation: "Please add active medications to scan for interactions and contraindications.",
        related_medications: [],
        sources: []
      });
    }

    const prompt = `You are an expert clinical pharmacy and pharmacology advisor.
Please conduct a thorough validation of drug-drug interactions and drug-disease/condition contraindications for the following caregiver-managed patient:

PATIENT CLINICAL PROFILE:
- Name: ${patient.name}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Existing Health Conditions: [${conditionsList}]
- Drug Allergies: [${allergiesList}]

ACTIVE PRESCRIPTIONS TODAY:
${medsText}

YOUR MANDATES:
1. Identify all high/moderate/low concern interactions between the active medications.
2. Cross-reference the active medications against the patient's existing health conditions (e.g., kidney failure, diabetes, asthma, hypertension) to detect drug-disease contraindications.
3. Cross-reference the active medications against the patient's known allergies.
4. Respond in comforting, clear, non-jargon, compassionate language suitable for a caregiver who is NOT a doctor.
5. Detail EXACTLY which drugs are involved in the "related_medications" field.
6. MANDATORY: Ground your query in Google Search medical findings to ensure clinical authenticity. Do NOT hallucinate.
7. Always advise the caregiver to consult the prescribing physician before taking any action. This screening tool does not constitute medical advice.

At the very end of your response, output a single JSON code block representing the flagging data:
\`\`\`json
{
  "severity": "high" | "moderate" | "low" | "none",
  "summary": "1-sentence summaries of the main clinical concern",
  "explanation": "Clear plain-language caregiver explanation (Markdown) explaining what the interaction is, why it is a concern, what they should look out for, and a strong reminder to talk to Dr. Elizabeth Meriwether or their respective doctors.",
  "related_medications": ["Drug Name A", "Drug Name B"]
}
\`\`\`

Only output high or moderate if there is a well-documented medical danger present. If everything looks safe, output "none" for severity.`;

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || "";

    // Parse the JSON block out of the generated feedback
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*?\}/);
    let flagData = {
      severity: "none",
      summary: "Screening complete.",
      explanation: responseText,
      related_medications: [] as string[]
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        flagData = {
          severity: parsed.severity || "none",
          summary: parsed.summary || "Interaction assessment.",
          explanation: parsed.explanation || responseText,
          related_medications: parsed.related_medications || []
        };
      } catch (e) {
        console.warn("Could not parse returned JSON block. Falling back to structured parsing.", e);
      }
    }

    // Extract search grounding URLs as sources
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = chunks
      ?.map((chunk) => ({
        title: chunk.web?.title || "Medical Safety Resource",
        url: chunk.web?.uri || "",
      }))
      .filter((s) => s.url) || [];

    // Save flag inside the database for persistent reference
    const savedFlag = await dbInstance.createInteractionFlag(req.userId, patientId, {
      severity: flagData.severity as any,
      summary: flagData.summary,
      explanation: flagData.explanation,
      related_medications: flagData.related_medications,
      resolved: false,
      sources
    });

    res.json(savedFlag);
  } catch (error: any) {
    console.error("Interactions check error:", error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Vite Express Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CareCircle Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
