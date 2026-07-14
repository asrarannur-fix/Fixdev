import { GoogleGenAI } from "@google/genai";
import { logger } from "../../lib/logger.js";

// Supported model — gemini-1.5-flash is the correct identifier
const GEMINI_MODEL = "gemini-1.5-flash";

// Initialize GoogleGenAI client on the server side
let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      logger.warn("GEMINI_API_KEY is not defined. AI features will run in simulation mode.");
      throw new Error(
        "GEMINI_API_KEY is missing. Please set it in your environment variables.",
      );
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export const aiDiagnose = async (req: any, res: any) => {
  const { deviceBrandModel, deviceName, customerComplaints } = req.body;

  if (!deviceName || !customerComplaints) {
    return res
      .status(400)
      .json({ error: "deviceName and customerComplaints are required." });
  }

  try {
    const ai = getAiClient();
    const prompt = `Diagnosa masalah untuk perangkat berikut:\nPerangkat: ${deviceName}\nBrand & Model: ${deviceBrandModel || "Unknown"}\nKeluhan: ${customerComplaints}\n\nBerikan hasil analisis dalam format JSON.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction:
          "You are an expert electronics and gadget diagnostic specialist. Analyze the device and user complaint. Recommend exactly: 1) What is likely the core issue. 2) The estimated cost range (in Indonesian Rupiah IDR). 3) Required spare parts with approximate price. 4) Repair difficulty level. Return a strict JSON object with properties: coreIssue (string), estimatedCostMin (number), estimatedCostMax (number), requiredParts (array of objects with partName and estPrice), difficulty (string: Easy/Medium/Hard/Expert), diagnosticNotes (string). Speak in Indonesian.",
      },
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    res.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "[ai] aiDiagnose error");
    // Graceful simulation fallback if API Key is missing or invalid
    res.json({
      coreIssue: `[Simulasi] Masalah pada sistem kelistrikan / komponen utama pada ${deviceName}`,
      estimatedCostMin: 150000,
      estimatedCostMax: 450000,
      requiredParts: [
        { partName: "IC Regulator / Kapasitor Filter", estPrice: 75000 },
        { partName: "Jasa Perbaikan Standard", estPrice: 100000 },
      ],
      difficulty: "Medium",
      diagnosticNotes: `Analisis simulasi (kunci API tidak aktif): Terindikasi terjadi instabilitas tegangan listrik atau kegagalan fungsi internal pada sirkuit utama ${deviceName}. Disarankan untuk melakukan pengecekan visual pada motherboard terlebih dahulu.`,
      isSimulated: true,
      errorMsg: error.message,
    });
  }
};

export const aiChat = async (req: any, res: any) => {
  const { messages, userRole } = req.body; // array of { role: 'user' | 'model', text: string }

  try {
    const ai = getAiClient();
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: `Anda adalah 'AssistSaaS AI', asisten AI terintegrasi dalam sistem ERP Multi-Tenant SaaS kami. 
        Membantu pengguna dengan peran: ${userRole || "User"}.
        Berikan jawaban yang ringkas, solutif, ramah, dan profesional dalam Bahasa Indonesia terkait operasional POS, servis perangkat, pergudangan, akuntansi jurnal, atau pengelolaan tenant.`,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    logger.error({ err: error.message }, "[ai] aiChat error");
    // Fallback simulation chat
    const lastMessage = messages[messages.length - 1]?.text || "";
    let simulatedResponse =
      "Halo! Saya adalah AssistSaaS AI. Maaf, Gemini API Key belum terkonfigurasi di Secrets. Namun, saya dapat membantu mensimulasikan respons. Anda menanyakan tentang: " +
      lastMessage;
    if (lastMessage.toLowerCase().includes("servis")) {
      simulatedResponse =
        "Untuk mengelola servis, silakan masuk ke tab 'Service Center'. Anda dapat membuat tiket baru, mencetak QR Code, menetapkan teknisi, menginput sparepart, hingga mencatat klaim garansi.";
    } else if (
      lastMessage.toLowerCase().includes("akuntansi") ||
      lastMessage.toLowerCase().includes("ledger")
    ) {
      simulatedResponse =
        "Sistem akuntansi kami menggunakan metode double-entry (debit & kredit seimbang). Jurnal yang sudah diposting tidak dapat diedit dan koreksi hanya dapat dilakukan melalui jurnal pembalik (reversal journal).";
    } else if (
      lastMessage.toLowerCase().includes("pos") ||
      lastMessage.toLowerCase().includes("kasir")
    ) {
      simulatedResponse =
        "Modul POS mendukung kelola kasir cepat, multi-payment, hold transaction, diskon, PPN inclusive/exclusive, shift kasir, dan penutupan kasir (closing) dengan laporan selisih kas.";
    }
    res.json({ text: simulatedResponse, isSimulated: true });
  }
};

export const aiAnalyzeSales = async (req: any, res: any) => {
  const { salesData, inventoryData } = req.body;

  try {
    const ai = getAiClient();
    const prompt = `Analisis data penjualan dan stok gudang berikut:\nData Penjualan (Bulan ini): ${JSON.stringify(salesData)}\nData Stok (Rendah): ${JSON.stringify(inventoryData)}\n\nBerikan analisis komprehensif.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction:
          "You are an expert Business Intelligence & Inventory forecaster. Analyze sales trends and highlight stock risks. Provide a JSON response with exactly: 1) salesGrowthSummary (string), 2) stockAlerts (array of critical alerts), 3) forecastDemandRecommendations (array of recommendations for stock reordering), 4) estimatedMrrGrowth (string). Keep it brief, professional, and in Indonesian language.",
      },
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    res.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "[ai] aiAnalyzeSales error");
    res.json({
      salesGrowthSummary:
        "Pertumbuhan penjualan dalam tren positif stabil. Kategori aksesoris memimpin volume transaksi harian.",
      stockAlerts: [
        {
          itemName: "LCD Screen Replacement Kit",
          reason:
            "Sangat kritis, sisa stok di bawah Reorder Level (sisa 2 unit).",
        },
        {
          itemName: "SSD 512GB HighSpeed",
          reason: "Menjelang minimum level (sisa 4 unit).",
        },
      ],
      forecastDemandRecommendations: [
        {
          itemName: "LCD Screen Replacement Kit",
          quantityToOrder: 15,
          priority: "Tinggi",
          reason: "Rekomendasi pemesanan sebelum lonjakan servis akhir pekan.",
        },
        {
          itemName: "Thermal Paste Arctic",
          quantityToOrder: 10,
          priority: "Sedang",
          reason: "Konsumsi reguler teknisi.",
        },
      ],
      estimatedMrrGrowth:
        "Sinyal positif: MRR diproyeksikan tumbuh +8.4% berdasarkan konversi trial tenant baru.",
      isSimulated: true,
    });
  }
};
