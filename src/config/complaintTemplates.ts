export interface ComplaintTemplate {
  id: string;
  label: string;
  value: string;
  category?: string;
  deviceType?: string[]; // Specific device types this template applies to
  isActive?: boolean;
}

// Default templates by device type
export const DEFAULT_COMPLAINT_TEMPLATES: Record<string, ComplaintTemplate[]> = {
  smartphone: [
    {
      id: "smartphone-layar",
      label: "Layar / Touchscreen",
      value: "Layar retak/touchscreen tidak responsif. Sentuhan tidak berfungsi atau area layar tidak bisa disentuh.",
      category: "hardware",
      deviceType: ["smartphone", "tablet"],
      isActive: true
    },
    {
      id: "smartphone-baterai",
      label: "Baterai / Charging",
      value: "Baterai lemah/cepat habis. Tidak bisa di-charge atau charging lambat.",
      category: "hardware",
      deviceType: ["smartphone", "tablet"],
      isActive: true
    },
    {
      id: "smartphone-kamera",
      label: "Kamera / Lens",
      value: "Kamera kabur/tidak bisa focus. Hasil foto buram atau tidak bisa mengambil foto.",
      category: "hardware",
      deviceType: ["smartphone", "tablet"],
      isActive: true
    },
    {
      id: "smartphone-software",
      label: "Software / Sistem",
      value: "iPhone stuck di logo/Hang/Crash aplikasi. Sistem operasi macet atau bootloop.",
      category: "software",
      deviceType: ["smartphone", "tablet"],
      isActive: true
    },
    {
      id: "smartphone-konektor",
      label: "Port / Konektor",
      value: "Port charging kotor/lemah/tidak bisa charge. Jack audio tidak terdeteksi.",
      category: "hardware",
      deviceType: ["smartphone", "tablet"],
      isActive: true
    },
    {
      id: "smartphone-bodi",
      label: "Bodi / Casing",
      value: "Bodi penyok/lecet. Casing terdistorsi, tombol macet.",
      category: "hardware",
      deviceType: ["smartphone", "tablet"],
      isActive: true
    }
  ],
  laptop: [
    {
      id: "laptop-layar",
      label: "Layar / Display",
      value: "Layar laptop mati/retak/vertical line. Backlight tidak menyala atau gambar buffering.",
      category: "hardware",
      deviceType: ["laptop"],
      isActive: true
    },
    {
      id: "laptop-keyboard",
      label: "Keyboard / Input",
      value: "Keyboard tidak bisa diketik/tombol macet. Touchpad tidak responsif atau klik tidak berfungsi.",
      category: "hardware",
      deviceType: ["laptop"],
      isActive: true
    },
    {
      id: "laptop-baterai",
      label: "Baterai / Power",
      value: "Baterai laptop tidak bisa di-charge/cepat habis. Adapter tidak terdeteksi atau laptop mati total.",
      category: "hardware",
      deviceType: ["laptop"],
      isActive: true
    },
    {
      id: "laptop-software",
      label: "Software / OS",
      value: "Windows/Laptop hang/blue screen/slow boot. Virus/malware atau sistem operasi corrupt.",
      category: "software",
      deviceType: ["laptop"],
      isActive: true
    },
    {
      id: "laptop-upgrade",
      label: "Upgrade / Sparepart",
      value: "Upgrade RAM/SSD/HDD. Pergantian komponen internal untuk meningkatkan performa.",
      category: "repair",
      deviceType: ["laptop"],
      isActive: true
    },
    {
      id: "laptop-fan",
      label: "Fan / Overheat",
      value: "Kipas berputar keras/laptop panas berlebih. Thermal throttling atau shutdown karena suhu tinggi.",
      category: "hardware",
      deviceType: ["laptop"],
      isActive: true
    }
  ],
  printer: [
    {
      id: "printer-kertas",
      label: "Kertas / Paper Jam",
      value: "Paper jam/kertas macet. Tidak bisa masuk kertas atau output tidak keluar.",
      category: "hardware",
      deviceType: ["printer"],
      isActive: true
    },
    {
      id: "printer-tinta",
      label: "Tinta / Toner",
      value: "Tinta habis/printfuzzy. Head clogged atau warna tidak keluar sempurna.",
      category: "hardware",
      deviceType: ["printer"],
      isActive: true
    },
    {
      id: "printer-software",
      label: "Driver / Software",
      value: "Printer tidak terdeteksi di komputer. Driver error atau koneksi USB/WiFi gagal.",
      category: "software",
      deviceType: ["printer"],
      isActive: true
    },
    {
      id: "printer-roller",
      label: "Roller / Pickup",
      value: "Roller pickup rusak/macet. Kertas tidak masuk atau lebih dari 1 sheet.",
      category: "hardware",
      deviceType: ["printer"],
      isActive: true
    }
  ],
  audio: [
    {
      id: "audio-speaker",
      label: "Speaker / Sound",
      value: "Speaker tidak ada suara/suara pecah. Bluetooth tidak connect atau bass tidak keluar.",
      category: "hardware",
      deviceType: ["audio"],
      isActive: true
    },
    {
      id: "audio-battery",
      label: "Baterai / Charging",
      value: "Baterai headphone/earphone cepat habis. Case charging tidak bisa nyalakan.",
      category: "hardware",
      deviceType: ["audio"],
      isActive: true
    },
    {
      id: "audio-button",
      label: "Tombol / Controls",
      value: "Tombol play/pause/volume macet. Touch controls tidak responsif.",
      category: "hardware",
      deviceType: ["audio"],
      isActive: true
    }
  ],
  general: [
    {
      id: "general-kerusakan",
      label: "Kerusakan Umum",
      value: "Device tidak bisa menyalai/tidak berfungsi sama sekali. Diperiksa teknisi untuk diagnosa lebih lanjut.",
      category: "hardware",
      deviceType: ["smartphone", "tablet", "laptop", "desktop", "printer", "audio", "smartwatch", "lainnya"],
      isActive: true
    },
    {
      id: "general-cek",
      label: "Cek & Diagnose",
      value: "Pemeriksaan umum untuk mengetahui kerusakan. Tanpa perbaikan, hanya diagnostik.",
      category: "repair",
      deviceType: ["smartphone", "tablet", "laptop", "desktop", "printer", "audio", "smartwatch", "lainnya"],
      isActive: true
    }
  ]
};

// Get templates filtered by device type and category
export const getTemplatesForDevice = (deviceType: string): ComplaintTemplate[] => {
  const normalizedType = deviceType.toLowerCase();
  let templates: ComplaintTemplate[] = [];
  
  // Get templates specific to this device type
  Object.entries(DEFAULT_COMPLAINT_TEMPLATES).forEach(([type, deviceTemplates]) => {
    if (type === normalizedType || deviceTemplates.some(t => t.deviceType?.includes(normalizedType))) {
      templates = [...templates, ...deviceTemplates];
    }
  });
  
  // If no specific templates found, use general templates
  if (templates.length === 0) {
    templates = DEFAULT_COMPLAINT_TEMPLATES.general || [];
  }
  
  return templates.filter(t => t.isActive !== false);
};

export const getActiveTemplates = (): ComplaintTemplate[] => {
  const allTemplates = Object.values(DEFAULT_COMPLAINT_TEMPLATES).flat();
  return allTemplates.filter(t => t.isActive !== false);
};

export const getTemplatesByCategory = (category: string): ComplaintTemplate[] => {
  const allTemplates = Object.values(DEFAULT_COMPLAINT_TEMPLATES).flat();
  return allTemplates.filter(t => t.category === category && t.isActive !== false);
};
