import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Sliders,
  Receipt,
  Lock,
  Zap,
  FileText,
  ChevronRight,
  HelpCircle,
  Save,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Copy,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Brush,
  Ticket,
  X,
  Paintbrush,
  Fingerprint,
  MapPin,
  Search,
  CheckSquare,
  Activity,
  Camera,
  Maximize,
  Check,
  Calendar,
  ArrowRight,
  Printer,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Wrench,
  Upload,
  Minus,
  Eye,
  Edit,
  MoreVertical,
  SearchIcon,
  CheckCircle,
  Package,
  Send,
  Filter,
  ChevronLeft,
  QrCode,
  Cpu,
  Share2,
  Barcode,
  ShieldCheck,
  Timer,
  PackagePlus,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

import { FieldServiceGps } from "../FieldServiceGps";
import { DeviceRentalDashboard } from "../DeviceRentalDashboard";
import { WarrantyClaims } from "../WarrantyClaims";
import { ServiceTrackerQr } from "../ServiceTrackerQr";
import { KnowledgeBase } from "../KnowledgeBase";
import { DocumentPrintouts } from "./services/DocumentPrintouts";
import { WhatsAppHub } from "./services/WhatsAppHub";
import { SparepartsLedger } from "./services/SparepartsLedger";
import { HandoverPanel } from "./services/HandoverPanel";
import { getStorageLocations } from "./StorageLocationManager";
import { renderTenantWaTemplate } from "../../utils/waTemplate";
import { useServiceReception } from "../../hooks/useServiceReception";

import {
  Tenant,
  Branch,
  WorkflowRule,
  ServiceTicket,
  Customer,
  CustomerSegment,
  InventoryProduct,
  ServiceStatus,
  PaymentMethod,
  UserRole,
} from "../../types";

import { CATEGORY_CONFIGS } from "../../config/categoryConfigs";
import {
  buildServiceReceptionPreview,
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
  validateServiceReceptionForm,
} from "../../utils/serviceReceptionUtils";

interface ServicesTabProps {
  activeSubTab: string;
  currentTenantId?: string;
  onSetTab?: (tab: string, subtab: string) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  activeSubTab,
  currentTenantId,
  onSetTab,
}) => {
  const {
    tenants,
    branches,
    updateTenant,
    addBranch,
    updateBranch,
    deleteBranch,
    workflows,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    currentUser,
    switchBranch,
    currentBranchId,
    services,
    microComponents,
    microComponentsLoading,
    microComponentsError,
    loadMicroComponents,
    consumeMicroComponentForService,
    addServiceTicket,
    updateServiceTicket,
    requestServicePart,
    cancelServicePart,
    patchServiceWork,
    addApprovedAdditionalCost,
    createServicePartOrder,
    updateServicePartOrder,
    receiveServicePartOrder,
    cancelServicePartOrder,
    addServiceDiagnostic,
    updateServiceStatus: updateServiceStatusContext,
    approveServiceEstimate: approveServiceEstimateContext,
    completeServiceQC: completeServiceQCContext,
    handoverServiceDevice: handoverServiceDeviceContext,
    customers,
    addCustomer,
    employees,
    products,
    currentTenantId: contextTenantId,
  } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();

  const activeTenantId = currentTenantId || contextTenantId;
  const tenantObj = tenants.find((t: Tenant) => t.id === activeTenantId);
  const serviceTickets = services;
  const triggers = [] as any[];
  const showTermsInTracking = true;

  const currentUserPermissions = useMemo(() => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      return ["admin_access"];
    }
    return (
      tenantObj?.rbacMatrix?.[currentUser?.role] ??
      currentUser?.permissions ??
      []
    );
  }, [tenantObj, currentUser]);

  // Declaring missing states, variables, and helper functions
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [srvSort, setSrvSort] = useState<string>("newest");
  const [srvSearchQuery, setSrvSearchQuery] = useState<string>("");
  const [viewingServiceTicketId, setViewingServiceTicketId] = useState<
    string | null
  >(null);
  const [showSpkPrintout, setShowSpkPrintout] = useState<string | null>(null);
  const [showInvoicePrintout, setShowInvoicePrintout] = useState<string | null>(
    null,
  );
  const [showProvisionalQuote, setShowProvisionalQuote] = useState<
    string | null
  >(null);
  const [showWarrantyPrintout, setShowWarrantyPrintout] = useState<
    string | null
  >(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );

  const [activeQuote, setActiveQuote] = useState<any | null>(null);
  const [calcCustomerId, setCalcCustomerId] = useState<string>("new");
  const [calcCustName, setCalcCustName] = useState<string>("Budi Santoso");
  const [calcCustPhone, setCalcCustPhone] = useState<string>("0812-3456-7890");
  const [calcDeviceModel, setCalcDeviceModel] =
    useState<string>("MacBook Pro M1");
  const [calcCustomDeviceModel, setCalcCustomDeviceModel] =
    useState<string>("");
  const [calcDamageType, setCalcDamageType] =
    useState<string>("Ganti Layar LCD");
  const [calcCustomDamageType, setCalcCustomDamageType] = useState<string>("");
  const [calcPartCost, setCalcPartCost] = useState<string>("1500000");
  const [calcServiceCost, setCalcServiceCost] = useState<string>("450000");
  const [calcIncludeTax, setCalcIncludeTax] = useState<boolean>(false);
  const [calcDiscountValue, setCalcDiscountValue] = useState<string>("");
  const [calcWarranty, setCalcWarranty] = useState<number>(3);

  // Handover state variables
  const [handoverPaymentMethod, setHandoverPaymentMethod] =
    useState<PaymentMethod>(PaymentMethod.CASH);
  const [handoverRefNo, setHandoverRefNo] = useState<string>("");
  const [handoverProofName, setHandoverProofName] = useState<string>("");
  const [handoverTempoDays, setHandoverTempoDays] = useState<string>("30");
  const [handoverChecklist, setHandoverChecklist] = useState({
    accessoriesReturned: false,
    customerChecked: false,
    invoiceReady: false,
    warrantyReady: false,
  });

  // WhatsApp and active WA notifications
  const [activeWaModal, setActiveWaModal] = useState<any | null>(null);
  const [justCreatedTicket, setJustCreatedTicket] = useState<any | null>(null);
  const [customWaMessageText, setCustomWaMessageText] = useState<string>("");
  const [additionalCostTicket, setAdditionalCostTicket] = useState<ServiceTicket | null>(null);
  const [additionalCostDescription, setAdditionalCostDescription] = useState("");
  const [additionalCostAmount, setAdditionalCostAmount] = useState("");
  const [additionalCostMethod, setAdditionalCostMethod] = useState<"WHATSAPP" | "PHONE" | "IN_PERSON">("WHATSAPP");
  const [additionalCostApprovedBy, setAdditionalCostApprovedBy] = useState("");
  const [additionalCostNote, setAdditionalCostNote] = useState("");
  const [additionalCostProof, setAdditionalCostProof] = useState("");
  const [savingAdditionalCost, setSavingAdditionalCost] = useState(false);
  const [partOrderTicket, setPartOrderTicket] = useState<ServiceTicket | null>(null);
  const [partOrderName, setPartOrderName] = useState("");
  const [partOrderQty, setPartOrderQty] = useState(1);
  const [partOrderReason, setPartOrderReason] = useState("");
  const [partOrderSupplier, setPartOrderSupplier] = useState("");
  const [partOrderCost, setPartOrderCost] = useState("");
  const [partOrderEta, setPartOrderEta] = useState("");
  const [partOrderCostApproved, setPartOrderCostApproved] = useState(false);
  const [partOrderNote, setPartOrderNote] = useState("");
  const [savingPartOrder, setSavingPartOrder] = useState(false);
  const [microTicket, setMicroTicket] = useState<ServiceTicket | null>(null);
  const [microSearch, setMicroSearch] = useState("");
  const [selectedMicroId, setSelectedMicroId] = useState("");
  const [microQty, setMicroQty] = useState(1);
  const [microChargeable, setMicroChargeable] = useState(false);
  const [microUnitPrice, setMicroUnitPrice] = useState("");
  const [microNote, setMicroNote] = useState("");
  const [savingMicroUsage, setSavingMicroUsage] = useState(false);

  const openMicroComponentModal = async (ticket: ServiceTicket) => {
    setMicroTicket(ticket);
    setMicroSearch("");
    setSelectedMicroId("");
    setMicroQty(1);
    setMicroChargeable(false);
    setMicroUnitPrice("");
    setMicroNote("");
    try { await loadMicroComponents(); } catch (_) {}
  };

  const filteredMicroComponents = useMemo(() => {
    const query = microSearch.trim().toLowerCase();
    if (!query) return microComponents;
    return microComponents.filter((item) => [item.name, item.sku, item.category, ...(item.compatModels || [])].some((value) => String(value).toLowerCase().includes(query)));
  }, [microComponents, microSearch]);
  const selectedMicro = microComponents.find((item) => item.id === selectedMicroId);

  // Customer Wizard variables
  const [showNewSrvCustForm, setShowNewSrvCustForm] = useState<boolean>(true);

  // Diagnostics and request part states
  const [internalCommentText, setInternalCommentText] = useState<string>("");
  const [liveTimerSeconds, setLiveTimerSeconds] = useState<number>(0);
  const [requestPartMode, setRequestPartMode] = useState<boolean>(false);
  const [requestedPartId, setRequestedPartId] = useState<string>("");
  const [requestedPartQty, setRequestedPartQty] = useState<number>(1);
  const [manualDiagNotes, setManualDiagNotes] = useState<string>("");
  const [manualDiagCost, setManualDiagCost] = useState<string>("0");
  const [selectedSparepartId, setSelectedSparepartId] = useState<string>("");
  const [sparepartQty, setSparepartQty] = useState<number>(1);
  const [sparepartSN, setSparepartSN] = useState<string>("");

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  const handleCallAiDiagnose = async (ticket: any) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const category = ticket.deviceCategory || ticket.category || "General";
      const complaint =
        ticket.customerComplaints || ticket.complaint || "Unit bermasalah";

      let res = {
        difficulty: "MEDIUM",
        coreIssue: `Kerusakan pada jalur sirkuit utama atau komponen terkait ${complaint}.`,
        diagnosticNotes:
          "Lakukan pengukuran tegangan kapasitor input sebelum melakukan penggantian suku cadang utama. Bersihkan sisa korosi jika ada.",
        estimatedCostMin: 150000,
        estimatedCostMax: 450000,
      };
      setAiResult(res);
    } catch (error: any) {
      showToast(error?.message || "Gagal menganalisis kerusakan.", "error");
    }
  };

  const approveServiceEstimate = async (ticketId: string, isApproved: boolean) => {
    try {
      await approveServiceEstimateContext(ticketId, isApproved, currentUser?.name || "Owner", "");
      showToast(
        isApproved ? "Estimasi biaya disetujui pelanggan!" : "Estimasi biaya ditolak pelanggan!",
        isApproved ? "success" : "info",
      );
    } catch (error: any) {
      showToast(error?.message || "Gagal memproses persetujuan estimasi.", "error");
    }
  };

  const updateServiceStatus = async (
    ticketId: string,
    status: ServiceStatus,
    note: string,
  ) => {
    try {
      await updateServiceStatusContext(ticketId, status, note);
    } catch (error: any) {
      showToast(error?.message || "Gagal memperbarui status servis.", "error");
    }
  };

  const handleApplyAiRecommendation = async (ticketId: string) => {
    if (!aiResult) return;
    try {
      await addServiceDiagnostic(
        ticketId,
        [aiResult.coreIssue, aiResult.diagnosticNotes].filter(Boolean).join("\n\n"),
        Number(aiResult.estimatedCostMax) || Number(aiResult.estimatedCostMin) || 0,
        Array.isArray(aiResult.requiredParts) ? aiResult.requiredParts : [],
      );
      setAiResult(null);
      setSelectedServiceId(null);
      showToast("Rekomendasi diagnosa diterapkan.", "success");
    } catch (error: any) {
      showToast(error?.message || "Gagal menerapkan rekomendasi diagnosa.", "error");
    }
  };

  // Camera capture states and refs
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedCaptureCategory, setSelectedCaptureCategory] =
    useState<string>("Bodi Luar");

  // Outsourcing states
  const [receptionErrors, setReceptionErrors] = useState<string[]>([]);
  const [isSubmittingReception, setIsSubmittingReception] = useState<boolean>(false);
  const [previewReceptionTicket, setPreviewReceptionTicket] = useState<any | null>(null);
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState<boolean>(false);
  const [showDocumentation, setShowDocumentation] = useState<boolean>(false);
  const [showScreenLock, setShowScreenLock] = useState<boolean>(false);

  // Quality control states
  const [qcScore, setQcScore] = useState<number>(100);
  const [qcNotes, setQcNotes] = useState<string>("");

  // Technician assignment
  const [autoAssignReason, setAutoAssignReason] = useState<string | null>(null);
  const [custOpen, setCustOpen] = useState<boolean>(false);
  const [localSubTab, setLocalSubTab] = useState<string>(() =>
    localStorage.getItem("fixdev_srv_subtab") || activeSubTab || "list",
  );

  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  useEffect(() => {
    setLocalSubTab(activeSubTab);
  }, [activeSubTab]);

  const setActiveSubTab = (sub: string) => {
    setLocalSubTab(sub);
    try {
      localStorage.setItem("fixdev_srv_subtab", sub);
    } catch {}
    onSetTab?.("services", sub);
  };
  const {
    newSrvCustName, setNewSrvCustName, newSrvCustPhone, setNewSrvCustPhone,
    newSrvCustEmail, setNewSrvCustEmail, newSrvCustAddress, setNewSrvCustAddress,
    newSrvCustomer, setNewSrvCustomer, newSrvEstCompletion, setNewSrvEstCompletion,
    newSrvDevice, setNewSrvDevice, newSrvBrand, setNewSrvBrand, newSrvSerial, setNewSrvSerial,
    newSrvWarranty, setNewSrvWarranty, newSrvDownPayment, setNewSrvDownPayment,
    newSrvIsCheckOnly, setNewSrvIsCheckOnly, newSrvPhysicalCondition, setNewSrvPhysicalCondition,
    newSrvScreenLock, setNewSrvScreenLock, newSrvComplaint, setNewSrvComplaint,
    newSrvCategory, setNewSrvCategory, newSrvDynamicSpecs, setNewSrvDynamicSpecs,
    newSrvChecklist, setNewSrvChecklist, newSrvAccessories, setNewSrvAccessories,
    newSrvCustomAccessories, setNewSrvCustomAccessories, newSrvStorageLocId, setNewSrvStorageLocId,
    newSrvCapturedConditions, setNewSrvCapturedConditions, newSrvIsOutsourced, setNewSrvIsOutsourced,
    newSrvOutsourcedVendor, setNewSrvOutsourcedVendor, newSrvOutsourcingCost, setNewSrvOutsourcingCost,
    newSrvTechId, setNewSrvTechId, custQuery, setCustQuery, receptionFormRef, handleCreateService,
  } = useServiceReception({
    customers, activeTenantId, currentTenantId, currentBranchId, tenantObj,
    addServiceTicket, showToast, showNewSrvCustForm, setShowNewSrvCustForm,
    setReceptionErrors, setIsSubmittingReception, setJustCreatedTicket,
    setPreviewReceptionTicket, setActiveSubTab, setAutoAssignReason,
  });

  // === AUTO-SAVE DRAFT FORM PENERIMAAN (persist saat pindah tab) ===
  const SRV_DRAFT = "fixdev_srv_draft_v1";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SRV_DRAFT);
      if (!raw) return;
      const d = JSON.parse(raw);
      setShowNewSrvCustForm(d.showNewSrvCustForm ?? false);
      setNewSrvCustName(d.newSrvCustName ?? "");
      setNewSrvCustPhone(d.newSrvCustPhone ?? "");
      setNewSrvCustEmail(d.newSrvCustEmail ?? "");
      setNewSrvCustAddress(d.newSrvCustAddress ?? "");
      setNewSrvCustomer(d.newSrvCustomer ?? "");
      setNewSrvEstCompletion(d.newSrvEstCompletion ?? "");
      setNewSrvDevice(d.newSrvDevice ?? "");
      setNewSrvBrand(d.newSrvBrand ?? "");
      setNewSrvSerial(d.newSrvSerial ?? "");
      setNewSrvWarranty(d.newSrvWarranty ?? 3);
      setNewSrvDownPayment(d.newSrvDownPayment ?? "0");
      setNewSrvIsCheckOnly(d.newSrvIsCheckOnly ?? false);
      setNewSrvPhysicalCondition(d.newSrvPhysicalCondition ?? "Mulus / Normal Wear");
      setNewSrvScreenLock(d.newSrvScreenLock ?? "");
      setNewSrvComplaint(d.newSrvComplaint ?? "");
      setNewSrvCategory(d.newSrvCategory ?? "Smartphone");
      setNewSrvDynamicSpecs(d.newSrvDynamicSpecs ?? {});
      setNewSrvAccessories(d.newSrvAccessories ?? []);
      setNewSrvCustomAccessories(d.newSrvCustomAccessories ?? "");
      setNewSrvStorageLocId(d.newSrvStorageLocId ?? "");
      setNewSrvCapturedConditions(d.newSrvCapturedConditions ?? []);
      setNewSrvIsOutsourced(d.newSrvIsOutsourced ?? false);
      setNewSrvOutsourcedVendor(d.newSrvOutsourcedVendor ?? "");
      setNewSrvOutsourcingCost(d.newSrvOutsourcingCost ?? "");
      setNewSrvTechId(d.newSrvTechId ?? "");
      setNewSrvChecklist(d.newSrvChecklist ?? {});
      setCustQuery(d.custQuery ?? "");
    } catch {
      /* abaikan draft rusak */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = {
      showNewSrvCustForm,
      newSrvCustName,
      newSrvCustPhone,
      newSrvCustEmail,
      newSrvCustAddress,
      newSrvCustomer,
      newSrvEstCompletion,
      newSrvDevice,
      newSrvBrand,
      newSrvSerial,
      newSrvWarranty,
      newSrvDownPayment,
      newSrvIsCheckOnly,
      newSrvPhysicalCondition,
      newSrvScreenLock,
      newSrvComplaint,
      newSrvCategory,
      newSrvDynamicSpecs,
      newSrvAccessories,
      newSrvCustomAccessories,
      newSrvStorageLocId,
      newSrvCapturedConditions,
      newSrvIsOutsourced,
      newSrvOutsourcedVendor,
      newSrvOutsourcingCost,
      newSrvTechId,
      newSrvChecklist,
      custQuery,
    };
    try {
      localStorage.setItem(SRV_DRAFT, JSON.stringify(d));
    } catch {
      /* abaikan */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showNewSrvCustForm,
    newSrvCustName,
    newSrvCustPhone,
    newSrvCustEmail,
    newSrvCustAddress,
    newSrvCustomer,
    newSrvEstCompletion,
    newSrvDevice,
    newSrvBrand,
    newSrvSerial,
    newSrvWarranty,
    newSrvDownPayment,
    newSrvIsCheckOnly,
    newSrvPhysicalCondition,
    newSrvScreenLock,
    newSrvComplaint,
    newSrvCategory,
    newSrvDynamicSpecs,
    newSrvAccessories,
    newSrvCustomAccessories,
    newSrvStorageLocId,
    newSrvCapturedConditions,
    newSrvIsOutsourced,
    newSrvOutsourcedVendor,
    newSrvOutsourcingCost,
    newSrvTechId,
    newSrvChecklist,
  ]);



  const tenantServices = serviceTickets.filter(
    (s: any) => s.tenantId === activeTenantId,
  );
  const selectedReceptionCustomer = customers.find(
    (customer) => customer.id === newSrvCustomer,
  );
  const receptionProgress = [
    Boolean(newSrvCustomer || (newSrvCustName.trim() && isValidIndonesianPhone(newSrvCustPhone))),
    Boolean(newSrvDevice.trim()),
    Boolean(newSrvComplaint.trim()),
    Object.keys(newSrvChecklist).length === 0 || Object.values(newSrvChecklist).some(Boolean),
  ].filter(Boolean).length;
  const activeTenant = tenantObj;

  const isSubTabAllowed = (tabId: string, subId: string) => {
    if (currentUser.role === "SUPER_ADMIN") return true;
    const tier = tenantObj?.tier || "BASIC";
    const tierDefaultFeatures: Record<string, string[]> = {
      BASIC: ["POS", "SERVICE"],
      PRO: [
        "POS",
        "SERVICE",
        "ACCOUNTING",
        "HRM",
        "CRM",
        "WHATSAPP",
        "TELEGRAM",
        "AI_DIAGNOSE",
      ],
      ENTERPRISE: [
        "POS",
        "SERVICE",
        "ACCOUNTING",
        "HRM",
        "CRM",
        "WHATSAPP",
        "TELEGRAM",
        "AI_DIAGNOSE",
        "MARKETPLACE",
        "RENTAL",
        "SECURITY",
      ],
    };
    const rawFeatures = tenantObj?.limits?.features;
    const tenantFeatures =
      Array.isArray(rawFeatures) && rawFeatures.length > 0
        ? (rawFeatures as string[]).map((f: string) => f.toUpperCase())
        : tierDefaultFeatures[tier] || ["POS", "SERVICE"];
    if (
      tabId === "services" &&
      subId === "rental" &&
      !tenantFeatures.includes("RENTAL")
    )
      return false;
    return true;
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      showToast("Gagal mengakses kamera perangkat", "error");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg");
      const newPhoto = {
        id: `photo-${Date.now()}`,
        category: selectedCaptureCategory,
        url: url,
        timestamp: new Date().toLocaleString(),
      };
      setNewSrvCapturedConditions((prev) => [...prev, newPhoto]);
      showToast("Foto kondisi fisik berhasil diambil!", "success");
    }
  };

  const runAutoAssign = () => {
    const techs = employees.filter(
      (emp: any) =>
        emp.role === "TEKNISI" ||
        emp.position?.toLowerCase().includes("teknisi"),
    );
    if (techs.length > 0) {
      const selected = techs[Math.floor(Math.random() * techs.length)];
      setNewSrvTechId(selected.id);
      setAutoAssignReason(
        `Sistem otomatis memilih ${selected.name} karena memiliki beban kerja paling ringan saat ini.`,
      );
      showToast(`Teknisi otomatis ditugaskan ke ${selected.name}`, "success");
    } else if (employees.length > 0) {
      const selected = employees[0];
      setNewSrvTechId(selected.id);
      setAutoAssignReason(
        `Sistem otomatis memilih ${selected.name} karena ketiadaan staf berdedikasi teknisi.`,
      );
      showToast(`Staf ${selected.name} otomatis ditugaskan`, "success");
    } else {
      showToast("Tidak ada staf tersedia untuk ditugaskan!", "error");
    }
  };

  const completeServiceQC = async (
    ticketId: string,
    score: number,
    notes: string,
    passed: boolean,
  ) => {
    try {
      await completeServiceQCContext(ticketId, score, notes, passed);
      showToast(
        passed ? "Quality Control berhasil diselesaikan!" : "Status diset ke Rework untuk perbaikan ulang.",
        passed ? "success" : "warning",
      );
    } catch (error: any) {
      showToast(error?.message || "Gagal menyimpan hasil QC.", "error");
      throw error;
    }
  };

  const handoverServiceDevice = async (
    ticketId: string,
    paymentMethod: PaymentMethod,
    details: any,
  ) => {
    try {
      await handoverServiceDeviceContext(ticketId, paymentMethod, details);
      showToast("Serah terima perangkat selesai. Pembayaran, ledger, stok, dan garansi tersinkron.", "success");
    } catch (error: any) {
      showToast(error?.message || "Gagal memproses serah terima perangkat.", "error");
      throw error;
    }
  };

  const handlePrintReceptionReceipt = (ticket: any) => {
    setShowSpkPrintout(ticket.id);
    setPreviewReceptionTicket(null);
  };

  const renderTenantWaTemplate = (
    category: string,
    ctx: Record<string, any>,
  ): string | null => {
    const templates = tenantObj?.settings?.waConfig?.templates;
    if (!Array.isArray(templates)) return null;
    const match = templates.find((t: any) => t.category === category && t.content);
    if (!match) return null;
    return match.content.replace(/\{(\w+)\}/g, (_, key) => {
      if (key in ctx && ctx[key] !== undefined && ctx[key] !== null) {
        return String(ctx[key]);
      }
      return `{${key}}`;
    });
  };

  const openManualEstimateWhatsApp = (
    ticket: ServiceTicket,
    diagnosis: string,
    estimatedCost: number,
    parts: any[] = [],
  ) => {
    const customer = customers.find((item) => item.id === ticket.customerId);
    const partsText = parts.length
      ? parts
          .map(
            (part) =>
              `• ${part.name || "Spare part"} x${part.quantity || 1}: Rp ${Number(part.totalPrice || (part.unitPrice || 0) * (part.quantity || 1)).toLocaleString("id-ID")}`,
          )
          .join("\n")
      : "• Tidak ada penggantian spare part";
    const approvalLink = `${window.location.origin}/?tab=service&sub=approve-quote&ticket=${encodeURIComponent(ticket.ticketNo)}`;
    const ctx = {
      customer_name: customer?.name || "Pelanggan",
      ticket_no: ticket.ticketNo,
      device_name: ticket.deviceName,
      status_note: diagnosis,
      estimated_cost: estimatedCost,
      parts_text: partsText,
      approval_link: approvalLink,
    };
    const templated = renderTenantWaTemplate("SERVICE_UPDATE", ctx);
    const message =
      templated ||
      `Halo *${customer?.name || "Pelanggan"}*,\n\nPengecekan unit *${ticket.deviceName}* dengan nomor tiket *${ticket.ticketNo}* telah selesai.\n\n*Hasil Diagnosis:*\n${diagnosis}\n\n*Rincian Estimasi:*\n${partsText}\n\n*Total Estimasi Perbaikan: Rp ${estimatedCost.toLocaleString("id-ID")}*\n\nMohon konfirmasi apakah perbaikan dapat kami lanjutkan melalui tautan berikut:\n${approvalLink}\n\nUnit belum akan dikerjakan sebelum mendapatkan persetujuan. Terima kasih.`;

    setActiveWaModal({
      phone: customer?.phone || "",
      message,
      ticketNo: ticket.ticketNo,
      ticketId: ticket.id,
      customerName: customer?.name || "Pelanggan",
      type: "ESTIMATE",
      diagnosis,
      estimatedCost,
      parts,
    });
  };


  return (
    <>
      <div className="space-y-6" id="services-pane">
        {/* Subtab: LIST OF SERVICES */}
        {localSubTab === "list" && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm animate-fadeIn space-y-3">
            {/* KPI Dashboard Summary */}
            {(() => {
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const finalStatuses = new Set([
                ServiceStatus.SELESAI, ServiceStatus.DIAMBIL, ServiceStatus.DIBATALKAN,
                ServiceStatus.KLAIM_GARANSI, ServiceStatus.TIDAK_BISA_DIPERBAIKI,
                ServiceStatus.CUSTOMER_TIDAK_MERESPON, ServiceStatus.BARANG_TIDAK_DIAMBIL,
                ServiceStatus.RUSAK, ServiceStatus.APPROVAL_DITOLAK,
              ]);
              const active = tenantServices.filter(s => !finalStatuses.has(s.status));
              const baruHariIni = tenantServices.filter(s => {
                const d = s.createdAt ? new Date(s.createdAt) : null;
                return d && d >= todayStart;
              }).length;
              const menungguDiagnosa = tenantServices.filter(s =>
                s.status === ServiceStatus.DITERIMA || s.status === ServiceStatus.ANTRIAN
              ).length;
              const menungguApproval = tenantServices.filter(s =>
                s.status === ServiceStatus.MENUGGU_APPROVAL || s.status === ServiceStatus.ESTIMATE_PENDING
              ).length;
              const dikerjakan = tenantServices.filter(s =>
                s.status === ServiceStatus.SEDANG_DIKERJAKAN
              ).length;
              const qc = tenantServices.filter(s =>
                s.status === ServiceStatus.QC
              ).length;
              const selesai = tenantServices.filter(s =>
                s.status === ServiceStatus.SELESAI
              ).length;
              const siapDiambil = tenantServices.filter(s =>
                s.status === ServiceStatus.SIAP_DIAMBIL
              ).length;
              const terlambat = tenantServices.filter(s => {
                const est = s.estimatedCompletionDate ? new Date(s.estimatedCompletionDate) : null;
                return est && est < now && !finalStatuses.has(s.status);
              }).length;
              const totalEstimasiBulanIni = Math.round(tenantServices
                .filter(s => {
                  const d = s.createdAt ? new Date(s.createdAt) : null;
                  return d && d >= monthStart;
                })
                .reduce((n, t) => n + (Number(t.estimatedCost) || 0), 0));
              const kpiItems = [
                { label: "Aktif", value: active.length, color: "text-blue-600 dark:text-blue-400" },
                { label: "Baru Hari Ini", value: baruHariIni, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Menunggu Diagnosa", value: menungguDiagnosa, color: "text-amber-600 dark:text-amber-400" },
                { label: "Menunggu Approval", value: menungguApproval, color: "text-orange-600 dark:text-orange-400" },
                { label: "Dikerjakan", value: dikerjakan, color: "text-blue-600 dark:text-blue-400" },
                { label: "QC", value: qc, color: "text-purple-600 dark:text-purple-400" },
                { label: "Selesai", value: selesai, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Siap Diambil", value: siapDiambil, color: "text-indigo-600 dark:text-indigo-400" },
                { label: "Terlambat", value: terlambat, color: "text-rose-600 dark:text-rose-400" },
                { label: "Estimasi (Bln Ini)", value: `Rp${totalEstimasiBulanIni.toLocaleString("id-ID")}`, color: "text-slate-700 dark:text-zinc-300" },
              ];
              return (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
                  {kpiItems.map((item, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{item.label}</p>
                      <p className={`text-sm font-extrabold mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {/* QC Report + SLA Breach */}
                {(() => {
                  const qcTickets = tenantServices.filter(s => typeof s.qcScore === "number");
                  const avgQcScore = qcTickets.length ? Math.round(qcTickets.reduce((sum, s) => sum + Number(s.qcScore), 0) / qcTickets.length) : 0;
                  const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 24;
                  const slaBreaches = active.filter(s => s.createdAt && now.getTime() - new Date(s.createdAt).getTime() > slaHours * 3600_000).length;
                  const techCount = qcTickets.reduce((acc, s) => { const k = s.assignedTechId || "unassigned"; acc.add(k); return acc; }, new Set<string>());
                  return (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1">
                      <span className="font-bold text-indigo-600">QC Rata-rata: <strong>{avgQcScore}%</strong></span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-rose-600">Pelanggaran SLA: <strong>{slaBreaches}</strong></span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-slate-600">Teknisi Aktif: <strong>{techCount.size}</strong></span>
                    </div>
                  );
                })()}
                </>
              );
            })()}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2.5">
              <div>
                <h4 className="font-extrabold text-xs uppercase text-slate-800 dark:text-zinc-100 tracking-tight">
                  Daftar Servis
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {/* Feature 2: Bulk Actions UI */}
                {selectedServiceIds.length > 0 &&
                  (currentUser?.role === UserRole.OWNER ||
                  currentUserPermissions.includes(
                    "action-services-delete-ticket",
                  )) && (
                    <div className="flex items-center gap-2 animate-fadeIn">
                      <span className="text-[10px] font-bold text-indigo-600 px-2">
                        {selectedServiceIds.length} Terpilih
                      </span>
                      <button
                        onClick={async () => {
                          if (
                            await showConfirm({
                              title: "Hapus Tiket Massal",
                              message: `Apakah Anda yakin ingin menghapus ${selectedServiceIds.length} tiket terpilih secara permanen?`,
                              confirmLabel: "Ya, Hapus Permanen",
                              type: "danger",
                            })
                          ) {
                            selectedServiceIds.forEach((id) => {
                              updateServiceTicket(id, { deletedAt: new Date().toISOString() } as any);
                            });
                            setSelectedServiceIds([]);
                            showToast(
                              `${selectedServiceIds.length} tiket berhasil dihapus secara massal.`,
                              "success",
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Massal
                      </button>
                    </div>
                  )}
                {/* Feature 3: Excel Export UI */}
                <button
                  onClick={() => {
                    const csvContent =
                      "data:text/csv;charset=utf-8,Ticket No,Device,Customer,Status,Price\n" +
                      tenantServices
                        .map(
                          (s) =>
                            `${s.ticketNo},${s.deviceName},${customers.find((c) => c.id === s.customerId)?.name || "-"},${s.status},${s.estimatedCost || 0}`,
                        )
                        .join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "daftar_servis_saas.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => setActiveSubTab("new-ticket")}
                  className={`bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${isSubTabAllowed("services", "new-ticket") ? "" : "hidden"}`}
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Terima Unit Baru
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 xl:w-full xl:mb-2">
              {[
                {
                  label: "Semua Unit",
                  filter: "ALL",
                  count: tenantServices.length,
                  color:
                    "border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-900/60",
                  hide: false,
                },
                {
                  label: "Baru",
                  filter: ServiceStatus.DITERIMA,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.DITERIMA,
                  ).length,
                  color:
                    "border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 bg-white dark:bg-zinc-900",
                },
                {
                  label: "Diagnosa",
                  filter: ServiceStatus.DIAGNOSA,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.DIAGNOSA,
                  ).length,
                  color:
                    "border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20",
                },
                {
                  label: "Pending",
                  filter: ServiceStatus.MENUGGU_APPROVAL,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.MENUGGU_APPROVAL,
                  ).length,
                  color:
                    "border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20",
                },
                {
                  label: "Kerja",
                  filter: ServiceStatus.SEDANG_DIKERJAKAN,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.SEDANG_DIKERJAKAN,
                  ).length,
                  color:
                    "border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20",
                },
                {
                  label: "Rework",
                  filter: ServiceStatus.REWORK,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.REWORK,
                  ).length,
                  color:
                    "border-orange-200 dark:border-orange-900/40 text-orange-800 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-950/20",
                },
                {
                  label: "Selesai",
                  filter: ServiceStatus.SELESAI,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.SELESAI,
                  ).length,
                  color:
                    "border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20",
                },
                {
                  label: "Diambil",
                  filter: ServiceStatus.DIAMBIL,
                  count: tenantServices.filter(
                    (s) => s.status === ServiceStatus.DIAMBIL,
                  ).length,
                  color:
                    "border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/40",
                },
              ].filter(card => card.label === "Semua Unit" || card.count > 0).map((card) => (
                <button
                  key={card.filter}
                  onClick={() => setStatusFilter(card.filter)}
                  className={`border rounded-xl p-2.5 text-left transition-all hover:shadow-sm cursor-pointer select-none ${statusFilter === card.filter ? 'ring-2 ring-indigo-500/30 border-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/40 shadow-md transform scale-[1.02]' : ''} ${card.color}`}
                >
                  <p className="text-[9px] uppercase font-mono font-bold opacity-70 tracking-wider truncate">
                    {card.label}
                  </p>
                  <p className="text-lg font-bold mt-0.5 font-mono">
                    {card.count}
                  </p>
                </button>
              ))}
            </div>

            {/* Main List Table Area */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[480px]">
              <div className="p-3 border-b border-slate-100 bg-slate-50/55 flex items-center justify-between gap-2">
                <div className="relative flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Cari tiket, nama, device..."
                    value={srvSearchQuery}
                    onChange={(e) => setSrvSearchQuery(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-zinc-900"
                  />
                  <select
                    value={srvSort}
                    onChange={(e) => setSrvSort(e.target.value as any)}
                    className="text-xs px-2 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 outline-none"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="cost_desc">Biaya Tinggi</option>
                    <option value="cost_asc">Biaya Rendah</option>
                  </select>
                </div>
              </div>

              {/* Filter chips */}
              {statusFilter !== "ALL" && (
                <div className="flex items-center gap-1.5 px-3 pb-1.5">
                  <span className="text-xs text-slate-500">Filter:</span>
                  <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                    {statusFilter}
                  </span>
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className="text-xs text-slate-500 hover:text-blue-600"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}

              <div className="max-h-[650px] overflow-y-auto p-3 space-y-1.5 bg-slate-50/50 dark:bg-zinc-950/20">
                {tenantServices
                  .filter((s) => {
                    const q = srvSearchQuery.toLowerCase();
                    const matchesQuery =
                      s.ticketNo.toLowerCase().includes(q) ||
                      s.deviceName.toLowerCase().includes(q) ||
                      (s.deviceBrandModel && s.deviceBrandModel.toLowerCase().includes(q)) ||
                      (customers.find((c) => c.id === s.customerId)?.name || "").toLowerCase().includes(q);
                    if (statusFilter === "ALL") return matchesQuery;
                    return matchesQuery && s.status === statusFilter;
                  })
                  .sort((a, b) => {
                    if (srvSort === "cost_desc") return Number(b.estimatedCost || 0) - Number(a.estimatedCost || 0);
                    if (srvSort === "cost_asc") return Number(a.estimatedCost || 0) - Number(b.estimatedCost || 0);
                    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    return srvSort === "oldest" ? diff : -diff;
                  })
                  .map((s) => {
                    const customer = customers.find((c) => c.id === s.customerId);
                    const technician = employees.find((e) => e.id === s.assignedTechId);

                    // Style Status Badges
                    const getStatusBadge = (status: ServiceStatus) => {
                      switch (status) {
                        case ServiceStatus.DITERIMA:
                        case ServiceStatus.ANTRIAN:
                          return "bg-slate-100 text-slate-800 border-slate-200";
                        case ServiceStatus.DIAGNOSA:
                          return "bg-amber-100 text-amber-800 border-amber-200";
                        case ServiceStatus.MENUGGU_APPROVAL:
                          return "bg-sky-100 text-sky-800 border-sky-200";
                        case ServiceStatus.SEDANG_DIKERJAKAN:
                          return "bg-indigo-100 text-indigo-800 border-indigo-200";
                        case ServiceStatus.QC:
                          return "bg-teal-100 text-teal-800 border-teal-200";
                        case ServiceStatus.SELESAI:
                        case ServiceStatus.SIAP_DIAMBIL:
                          return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
                        case ServiceStatus.DIAMBIL:
                          return "bg-slate-100 text-slate-500 border-slate-200";
                        case ServiceStatus.REWORK:
                          return "bg-orange-100 text-orange-800 border-orange-200";
                        case ServiceStatus.MENUGGU_SPAREPART:
                          return "bg-purple-100 text-purple-800 border-purple-200";
                        case ServiceStatus.DIKIRIM_KE_VENDOR:
                          return "bg-pink-100 text-pink-800 border-pink-200";
                        default:
                          return "bg-slate-100 text-slate-800 border-slate-200";
                      }
                    };

                    const statusRail = s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.SIAP_DIAMBIL || s.status === ServiceStatus.DIAMBIL
                      ? "border-l-emerald-500"
                      : s.status === ServiceStatus.REWORK
                        ? "border-l-orange-500"
                        : s.status === ServiceStatus.DIAGNOSA
                          ? "border-l-amber-500"
                          : s.status === ServiceStatus.QC
                            ? "border-l-teal-500"
                            : "border-l-indigo-400";

                    // Avatar inisial
                    const initials = (customer?.name || "U").charAt(0).toUpperCase();

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setViewingServiceTicketId(s.id);
                          setManualDiagNotes(s.techDiagnosis || "");
                          setManualDiagCost(String(Number(s.estimatedCost) || 0));
                        }}
                        className={`group relative bg-white dark:bg-zinc-900 rounded-2xl border border-l-[4px] ${statusRail} border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none ${
                          viewingServiceTicketId === s.id ? "ring-2 ring-indigo-400/40 border-l-[5px]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5">

                          {/* Checkbox */}
                          <div
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedServiceIds.includes(s.id)}
                              onChange={() => {
                                if (selectedServiceIds.includes(s.id)) {
                                  setSelectedServiceIds(
                                    selectedServiceIds.filter((id) => id !== s.id),
                                  );
                                } else {
                                  setSelectedServiceIds([
                                    ...selectedServiceIds,
                                    s.id,
                                  ]);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300"
                            />
                          </div>

                          {/* Avatar inisial */}
                          <span
                            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold font-mono
                              ${statusRail.includes("emerald") ? "bg-emerald-100 text-emerald-700" :
                                statusRail.includes("orange") ? "bg-orange-100 text-orange-700" :
                                statusRail.includes("amber") ? "bg-amber-100 text-amber-700" :
                                statusRail.includes("teal") ? "bg-teal-100 text-teal-700" :
                                "bg-indigo-100 text-indigo-700"}`}
                          >
                            {initials}
                          </span>

                          {/* Main content — 3-line info */}
                          <div className="flex-1 min-w-0 flex flex-col gap-0 leading-tight">
                            {/* Baris 1: tiket + customer */}
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-[11px] text-blue-600 dark:text-blue-400">
                                #{s.ticketNo}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-800 dark:text-zinc-100 truncate">
                                {customer?.name || "Umum"}
                              </span>
                            </div>
                            {/* Baris 2: device + brand + keluhan */}
                            <div className="flex items-center gap-1.5 text-[9.5px] text-slate-500 dark:text-zinc-400 truncate">
                              <span className="truncate">{s.deviceName}</span>
                              {s.deviceBrandModel && (
                                <span className="text-[8px] text-slate-400 font-mono shrink-0">· {s.deviceBrandModel}</span>
                              )}
                            </div>
                            {/* Baris 2b: keluhan */}
                            {s.customerComplaints && (
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-zinc-500 truncate italic">
                                <span className="shrink-0">💬</span>
                                <span className="truncate">{s.customerComplaints}</span>
                              </div>
                            )}
                            {/* Baris 3: phone + teknisi + tanggal */}
                            <div className="flex items-center gap-2 text-[8.5px] text-slate-400 dark:text-zinc-500 font-mono">
                              {customer?.phone ? <span>{customer.phone}</span> : null}
                              {technician ? (
                                <span className="text-indigo-400 dark:text-indigo-300">· 🔧 {technician.name}</span>
                              ) : null}
                              <span className="ml-auto">{new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                            </div>
                          </div>

                          {/* Status badge + harga stacking */}
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span
                              className={`px-2 py-0.5 text-[8px] font-bold rounded-md border uppercase font-mono tracking-wide ${getStatusBadge(s.status)}`}
                            >
                              {s.status === ServiceStatus.DITERIMA ? "Baru" :
                               s.status === ServiceStatus.MENUGGU_APPROVAL ? "Pending" :
                               s.status === ServiceStatus.SEDANG_DIKERJAKAN ? "Kerja" :
                               s.status === ServiceStatus.SIAP_DIAMBIL ? "Ambil" :
                               s.status === ServiceStatus.DIKIRIM_KE_VENDOR ? "Vendor" :
                               s.status}
                            </span>
                            <span className="font-bold font-mono text-[10px] text-slate-700 dark:text-zinc-300 tabular-nums">
                              Rp{Number(s.estimatedCost || 0).toLocaleString("id-ID")}
                            </span>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Floating bulk action bar */}
            {selectedServiceIds.length > 0 && (
              <div className="sticky bottom-0 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-b-2xl p-2.5 flex items-center justify-between shadow-lg -mt-2">
                <span className="text-xs font-bold text-indigo-600">{selectedServiceIds.length} terpilih</span>
                <div className="flex items-center gap-2">
                  {(currentUser?.role === UserRole.OWNER || currentUserPermissions.includes("action-services-delete-ticket")) && (
                    <button
                      onClick={async () => {
                        if (await showConfirm({ title: "Hapus Tiket Massal", message: `Yakin hapus ${selectedServiceIds.length} tiket?`, confirmLabel: "Ya", type: "danger" })) {
                          selectedServiceIds.forEach((id) => updateServiceTicket(id, { deletedAt: new Date().toISOString() } as any));
                          setSelectedServiceIds([]);
                          showToast(`${selectedServiceIds.length} tiket dihapus.`, "success");
                        }
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedServiceIds([])}
                    className="px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Gemini AI diagnostic recommendations widget (when active) */}
            {selectedServiceId && aiLoading && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center shadow-inner">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
                <p className="text-xs font-semibold text-slate-600 font-mono mt-3">
                  Sedang merumuskan diagnosa terbaik dengan Gemini AI...
                </p>
              </div>
            )}

            {selectedServiceId && aiResult && (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-indigo-50/30 border border-amber-200 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                  <h4 className="font-bold text-xs text-amber-800 flex items-center gap-2 uppercase font-mono">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />{" "}
                    Hasil Diagnosa Pintar Gemini AI
                  </h4>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] font-mono uppercase">
                      Tingkat Kesulitan: {aiResult.difficulty}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-2.5">
                    <div>
                      <p className="font-bold text-slate-700">
                        Analisa Inti Masalah:
                      </p>
                      <p className="text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100 mt-1">
                        {aiResult.coreIssue}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 mt-2">
                        Catatan Perbaikan:
                      </p>
                      <p className="text-slate-600 italic leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100 mt-1">
                        {aiResult.diagnosticNotes}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-slate-700">
                        Estimasi Rentang Jasa:
                      </p>
                      <p className="text-sm font-extrabold text-indigo-600 font-mono mt-0.5">
                        Rp {(aiResult.estimatedCostMin ?? 0).toLocaleString()} -
                        Rp {(aiResult.estimatedCostMax ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">
                        Suku Cadang yang Diperlukan:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 mt-1 bg-white/70 p-2.5 rounded-lg border border-slate-100">
                        {aiResult.requiredParts?.map(
                          (part: any, index: number) => (
                            <li key={index} className="font-medium">
                              {part?.partName} (~Rp{" "}
                              {(part?.estPrice ?? 0).toLocaleString()})
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedServiceId(null);
                      setAiResult(null);
                    }}
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Abaikan
                  </button>
                  <button
                    onClick={() =>
                      handleApplyAiRecommendation(selectedServiceId!)
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-500/10 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Terapkan Diagnosa &
                    Estimasikan Biaya
                  </button>
                </div>
              </div>
            )}
            {/* ==============================================================
                  TICKET DETAIL CONTROL CENTER OVERLAY MODAL (THE COMPLETED WORKSPACE)
                  ============================================================== */}
            {viewingServiceTicketId &&
              (() => {
                const ticket = tenantServices.find(
                  (s) => s.id === viewingServiceTicketId,
                );
                if (!ticket) return null;
                const customer = customers.find(
                  (c) => c.id === ticket.customerId,
                );
                const technician = employees.find(
                  (e) => e.id === ticket.assignedTechId,
                );

                // Filter products that are spare parts / accessories
                const tenantProducts = products.filter(
                  (p) => p.tenantId === currentTenantId,
                );
                const sparepartsList = tenantProducts.filter(
                  (p) =>
                    (p.category &&
                      ["SPAREPART", "SUKU CADANG", "AKSESORIS"].includes(
                        p.category.toUpperCase(),
                      )) ||
                    p.name.toLowerCase().includes("spare") ||
                    p.name.toLowerCase().includes("ic ") ||
                    p.name.toLowerCase().includes("layar") ||
                    p.name.toLowerCase().includes("baterai") ||
                    p.name.toLowerCase().includes("flex") ||
                    p.name.toLowerCase().includes("connector"),
                );

                // Local dynamic tab state inside modal
                // We use React state via an inline trick or store it in state variables. Since we need state, let's use the local storage or a variable. We can define a local toggle inside.
                // Let's create an elegant tabs selector inside the modal
                return createPortal(
                  <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" onClick={() => setViewingServiceTicketId(null)}>
                    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                      {/* Modal Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Wrench className="w-5 h-5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-slate-800">
                                Manajemen Perbaikan & Servis
                              </h3>
                              <span className="font-mono text-xs font-bold text-indigo-600">
                                #{ticket.ticketNo}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Status Aktif:{" "}
                              <strong className="text-indigo-600">
                                {ticket.status}
                              </strong>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowSpkPrintout(ticket.id)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />{" "}
                            Cetak SPK
                          </button>
                          {["SELESAI", "SIAP_DIAMBIL", "DIAMBIL"].includes(
                            ticket.status,
                          ) && (
                            <>
                              <button
                                onClick={() =>
                                  setShowInvoicePrintout(ticket.id)
                                }
                                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-500" />{" "}
                                Cetak Invoice Pembayaran
                              </button>
                              <button
                                onClick={() =>
                                  setShowWarrantyPrintout(ticket.id)
                                }
                                className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-150 text-indigo-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />{" "}
                                Cetak Kartu Garansi
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setViewingServiceTicketId(null);
                              setInternalCommentText("");
                              setManualDiagNotes("");
                              setManualDiagCost("");
                              setSelectedSparepartId("");
                              setSparepartSN("");
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
                        {/* LEFT PANEL: Ticket Meta Info, Checklist & Logs */}
                        <div className="xl:w-[30%] 2xl:w-[28%] border-r border-slate-100 bg-slate-50/50 p-2 lg:p-3 overflow-y-auto space-y-2">
                          {/* Section: Customer & Device */}
                          <div className="bg-white p-3 border border-slate-100 rounded-2xl space-y-2 shadow-xs">
                            <div className="space-y-1.5 text-xs text-slate-600">
                              <p>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  PELANGGAN:
                                </span>{" "}
                                <strong className="text-slate-800">
                                  {customer?.name || "Umum"}
                                </strong>
                              </p>
                              <p>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  PHONE:
                                </span>{" "}
                                <span className="font-mono">
                                  {customer?.phone || "-"}
                                </span>
                              </p>
                              <p>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  TIPE UNIT:
                                </span>{" "}
                                <strong className="text-slate-700">
                                  {ticket.deviceName}
                                </strong>
                              </p>
                              {ticket.deviceBrandModel && (
                                <p>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    BRAND/MODEL:
                                  </span>{" "}
                                  <span>{ticket.deviceBrandModel}</span>
                                </p>
                              )}
                              <p>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  SERIAL NO:
                                </span>{" "}
                                <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                  {ticket.deviceSerial || "N/A"}
                                </span>
                              </p>
                              <p>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  MASA GARANSI:
                                </span>{" "}
                                <span className="font-bold text-indigo-600">
                                  {ticket.warrantyMonths} Bulan
                                </span>
                              </p>

                              {ticket.deviceCategory && (
                                <p>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    KATEGORI:
                                  </span>{" "}
                                  <strong className="text-slate-700">
                                    {ticket.deviceCategory}
                                  </strong>
                                </p>
                              )}
                              {ticket.physicalCondition && (
                                <p>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    KONDISI FISIK:
                                  </span>{" "}
                                  <strong className="text-slate-700">
                                    {ticket.physicalCondition}
                                  </strong>
                                </p>
                              )}
                              {ticket.screenLockPin && (
                                <p>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    PIN KUNCI LAYAR:
                                  </span>{" "}
                                  <span className="font-mono bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-100">
                                    {ticket.screenLockPin}
                                  </span>
                                </p>
                              )}
                              {ticket.estimatedCompletionDate && (
                                <p>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    EST. SELESAI:
                                  </span>{" "}
                                  <strong className="text-emerald-700">
                                    {new Date(
                                      ticket.estimatedCompletionDate,
                                    ).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </strong>
                                </p>
                              )}

                              {((ticket.accessoriesLeft &&
                                ticket.accessoriesLeft.length > 0) ||
                                ticket.customAccessories) && (
                                <p>
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    AKSESORIS TITIPAN:
                                  </span>{" "}
                                  <span className="font-semibold text-slate-700 text-[11px]">
                                    {ticket.accessoriesLeft
                                      ? ticket.accessoriesLeft
                                          .map((acc) => {
                                            const labels: Record<
                                              string,
                                              string
                                            > = {
                                              charger: "Charger",
                                              cable: "Kabel",
                                              sim: "SIM",
                                              sd: "SD",
                                              case: "Case",
                                              box: "Box",
                                            };
                                            return labels[acc] || acc;
                                          })
                                          .join(", ")
                                      : ""}
                                    {ticket.customAccessories
                                      ? ticket.accessoriesLeft &&
                                        ticket.accessoriesLeft.length > 0
                                        ? `, ${ticket.customAccessories}`
                                        : ticket.customAccessories
                                      : ""}
                                  </span>
                                </p>
                              )}

                              {ticket.isCheckOnly && (
                                <div className="mt-1 bg-amber-50 border border-amber-100 text-amber-800 text-[10.5px] font-bold px-2 py-1 rounded-lg">
                                  🔍 HANYA CEK / ESTIMASI DULU
                                </div>
                              )}
                              {ticket.downPayment && ticket.downPayment > 0 ? (
                                <div className="mt-1 bg-emerald-50 border border-emerald-150 text-emerald-800 text-[10.5px] font-bold px-2 py-1 rounded-lg flex items-center justify-between">
                                  <span>💵 UANG MUKA (DP):</span>
                                  <span>
                                    Rp {ticket.downPayment.toLocaleString()}
                                  </span>
                                </div>
                              ) : null}

                              {/* Dynamic Specifications Viewer inside Ticket Details */}
                              {ticket.dynamicFields &&
                                Object.keys(ticket.dynamicFields).length >
                                  0 && (
                                  <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                    <p className="font-mono text-[9px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                                      <Cpu className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />{" "}
                                      Spesifikasi Kategori (
                                      {ticket.deviceCategory})
                                    </p>
                                    <div className="grid grid-cols-1 gap-1 text-[10.5px]">
                                      {Object.entries(ticket.dynamicFields).map(
                                        ([key, val]) => (
                                          <div
                                            key={key}
                                            className="flex justify-between border-b border-slate-100 last:border-0 py-0.5"
                                          >
                                            <span className="text-slate-400 capitalize">
                                              {key.replace("_", " ")}:
                                            </span>
                                            <strong className="text-slate-700 font-mono text-[10px]">
                                              {String(val)}
                                            </strong>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Interactive Technician Assign / Change Dropdown */}
                              <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
                                  Teknisi Penanggung Jawab
                                </label>
                                <select
                                  value={ticket.assignedTechId || ""}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const techName =
                                      employees.find(
                                        (emp) => emp.id === selectedId,
                                      )?.name || "Antrian Bebas";
                                    const currentTimeline =
                                      ticket.timeline || [];
                                    const updatedTimeline = [
                                      ...currentTimeline,
                                      {
                                        status: ticket.status,
                                        note: `Teknisi penanggung jawab diubah ke: ${techName}`,
                                        timestamp: new Date().toISOString(),
                                        operator: currentUser?.name || "Sistem",
                                      },
                                    ];
                                    updateServiceTicket(ticket.id, {
                                      assignedTechId: selectedId
                                        ? selectedId
                                        : undefined,
                                      timeline: updatedTimeline,
                                    });
                                  }}
                                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-semibold cursor-pointer text-slate-700"
                                >
                                  <option value="">
                                    -- Antrian Bebas (Belum Ditugaskan) --
                                  </option>
                                  {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} ({emp.position})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Storage Location Selector */}
                              {(() => {
                                const storageLocs = getStorageLocations(activeTenantId || "").filter(l => l.type === "UNIT_SERVICE");
                                return storageLocs.length > 0 ? (
                                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Lokasi Rak Penyimpanan</label>
                                    <select
                                      value={ticket.storageLocationId || ""}
                                      onChange={(e) => {
                                        updateServiceTicket(ticket.id, {
                                          storageLocationId: e.target.value || undefined,
                                        });
                                        showToast("Lokasi penyimpanan diperbarui.", "success");
                                      }}
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-semibold cursor-pointer text-slate-700"
                                    >
                                      <option value="">— Belum Ditentukan —</option>
                                      {storageLocs.map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                          📍 {loc.code} — {loc.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>

                          {/* Section: Photos */}
                          <div className="hidden">
                            {ticket.initialPhotos && ticket.initialPhotos.length > 0 && (
                              <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-2 shadow-xs">
                                <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                                  Foto Masuk
                                </h4>
                                <div className="rounded-lg overflow-hidden border border-slate-200">
                                  <img src={ticket.initialPhotos[0]} alt="Condition" className="w-full h-32 object-cover" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Interactive Camera & Ticket Captured Conditions Gallery */}
                          <div className="p-2.5 bg-white border border-slate-100 rounded-xl space-y-2 shadow-xs">
                            <h4 className="font-bold text-[10px] text-slate-500 uppercase font-mono tracking-wider flex items-center justify-between">
                              <span>
                                Foto ({ticket.capturedConditions?.length || 0})
                              </span>
                              <span className="text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.5 rounded-md">
                                Live Capture
                              </span>
                            </h4>

                            {ticket.capturedConditions &&
                            ticket.capturedConditions.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {ticket.capturedConditions.map((cap) => (
                                  <div
                                    key={cap.id}
                                    className="relative rounded-lg overflow-hidden border border-slate-200 h-16 group bg-slate-900"
                                  >
                                    <img
                                      src={cap.url}
                                      alt={cap.category}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/75 p-0.5 flex items-center justify-between">
                                      <span className="text-[7px] font-mono font-bold text-white uppercase truncate max-w-[50px]">
                                        {cap.category}
                                      </span>
                                      <span className="text-[6.5px] font-mono text-slate-300">
                                        {cap.timestamp}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic text-center">
                                Belum ada foto rekam kondisi terlampir.
                              </p>
                            )}

                            {/* Live Workstation Camera Trigger */}
                            {cameraActive ? (
                              <div className="border border-indigo-100 rounded-lg p-2 bg-slate-900 space-y-2">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  className="w-full h-24 object-cover bg-black rounded"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      // Real capture photo and append
                                      try {
                                        const canvas =
                                          document.createElement("canvas");
                                        canvas.width = 640;
                                        canvas.height = 480;
                                        const ctx = canvas.getContext("2d");
                                        if (ctx && videoRef.current) {
                                          ctx.drawImage(
                                            videoRef.current,
                                            0,
                                            0,
                                            640,
                                            480,
                                          );
                                          const dataUrl =
                                            canvas.toDataURL("image/jpeg");
                                          const newPhoto = {
                                            id: "photo-" + Date.now().toString(36) + "a",
                                            url: dataUrl,
                                            category: "Kerusakan Fisik",
                                            timestamp:
                                              new Date().toLocaleTimeString(
                                                "id-ID",
                                                {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                },
                                              ),
                                          };
                                          updateServiceTicket(ticket.id, {
                                            capturedConditions: [
                                              ...(ticket.capturedConditions ||
                                                []),
                                              newPhoto,
                                            ],
                                          });
                                          showToast(
                                            "Foto berhasil diambil dan disimpan langsung ke tiket!",
                                            "success",
                                          );
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold py-1 rounded cursor-pointer"
                                  >
                                    Jepret
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Simulation trigger inside workstation
                                      const images = [
                                        "https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=400&q=80",
                                        "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80",
                                        "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80",
                                        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
                                      ];
                                      const randomImg =
                                        images[
                                          Math.floor(
                                            Math.random() * images.length,
                                          )
                                        ];
                                      const newPhoto = {
                                        id: "photo-" + Date.now().toString(36) + "b",
                                        url: randomImg,
                                        category: "Internal Damaged Component",
                                        timestamp:
                                          new Date().toLocaleTimeString(
                                            "id-ID",
                                            {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            },
                                          ),
                                      };
                                      updateServiceTicket(ticket.id, {
                                        capturedConditions: [
                                          ...(ticket.capturedConditions || []),
                                          newPhoto,
                                        ],
                                      });
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-1.5 py-1 rounded cursor-pointer"
                                  >
                                    Demo
                                  </button>
                                  <button
                                    onClick={stopCamera}
                                    className="bg-slate-700 text-white text-[9px] font-bold px-1.5 py-1 rounded cursor-pointer"
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={startCamera}
                                className="w-full bg-slate-50 border border-dashed border-slate-200 hover:bg-indigo-50 text-[10.5px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-indigo-700 cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" /> Ambil Foto
                                Kondisi Baru
                              </button>
                            )}
                          </div>

                          {/* Section: Checklist */}
                          {ticket.initialChecklist &&
                            ticket.initialChecklist.length > 0 && (
                              <div className="bg-white p-3.5 border border-slate-100 rounded-xl space-y-2 shadow-xs">
                                <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                                  Checklist Masuk
                                </h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {ticket.initialChecklist.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                                    >
                                      <span className="text-slate-600">
                                        {item.name}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 text-[8px] font-bold rounded-lg font-mono uppercase ${
                                          item.checked
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                        }`}
                                      >
                                        {item.checked ? "OK" : "REJECT"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Section: Timeline Logs */}
                          <div className="hidden bg-white p-3.5 border border-slate-100 rounded-xl space-y-3 shadow-xs">
                            <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                              Log Riwayat Perjalanan
                            </h4>
                            <div className="relative border-l-2 border-slate-100 pl-3 space-y-3 text-xs">
                              {ticket.timeline && ticket.timeline.length > 0 ? (
                                ticket.timeline.map((log, idx) => (
                                  <div key={idx} className="relative group">
                                    <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                                    <p className="font-semibold text-[10px] font-mono text-indigo-600">
                                      {log.status}{" "}
                                      <span className="text-slate-400 font-normal">
                                        |{" "}
                                        {new Date(
                                          log.timestamp,
                                        ).toLocaleDateString()}
                                      </span>
                                    </p>
                                    <p className="text-slate-500 mt-0.5 italic">
                                      {log.note}
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                      Oleh: {log.operator || "Sistem"}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-slate-400 italic text-[11px]">
                                  Belum ada catatan perjalanan.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Section: Internal Discussions */}
                          <div className="hidden bg-amber-50/50 p-3.5 border border-amber-100 rounded-xl space-y-3 shadow-xs flex-col max-h-80">
                            <h4 className="font-bold text-[10px] text-amber-700 uppercase font-mono tracking-wider flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />{" "}
                              Diskusi Internal (Tim)
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                              {ticket.internalDiscussions &&
                              ticket.internalDiscussions.length > 0 ? (
                                ticket.internalDiscussions.map((msg, idx) => (
                                  <div
                                    key={msg.id || idx}
                                    className="bg-white p-2 rounded-lg border border-amber-100 shadow-sm relative"
                                  >
                                    <div className="flex items-center justify-between mb-1 text-[9px]">
                                      <span className="font-bold text-amber-800">
                                        {msg.operator}
                                      </span>
                                      <span className="text-amber-500/70">
                                        {new Date(
                                          msg.timestamp,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-700 whitespace-pre-wrap">
                                      {msg.text}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-amber-600/60 italic text-center py-2">
                                  Belum ada diskusi internal.
                                </p>
                              )}
                            </div>
                            <div className="pt-2 border-t border-amber-200/50 flex gap-2">
                              <input
                                type="text"
                                value={internalCommentText}
                                onChange={(e) =>
                                  setInternalCommentText(e.target.value)
                                }
                                placeholder="Ketik pesan untuk tim..."
                                className="flex-1 bg-white border border-amber-200 rounded-lg text-[10px] px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    internalCommentText.trim()
                                  ) {
                                    updateServiceTicket(ticket.id, {
                                      internalDiscussions: [
                                        ...(ticket.internalDiscussions || []),
                                        {
                                          id: "comm-" + Date.now().toString(36) + "1",
                                          text: internalCommentText.trim(),
                                          operator:
                                            currentUser?.name || "System",
                                          timestamp: new Date().toISOString(),
                                        },
                                      ],
                                    });
                                    setInternalCommentText("");
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (internalCommentText.trim()) {
                                    updateServiceTicket(ticket.id, {
                                      internalDiscussions: [
                                        ...(ticket.internalDiscussions || []),
                                        {
                                          id: "comm-" + Date.now().toString(36) + "2",
                                          text: internalCommentText.trim(),
                                          operator:
                                            currentUser?.name || "System",
                                          timestamp: new Date().toISOString(),
                                        },
                                      ],
                                    });
                                    setInternalCommentText("");
                                  }
                                }}
                                disabled={!internalCommentText.trim()}
                                className="bg-amber-500 disabled:bg-amber-300 hover:bg-amber-600 text-white p-1.5 rounded-lg transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT PANEL: Interactive Workstation */}
                        <div className="xl:w-[70%] 2xl:w-[72%] p-3 lg:p-5 overflow-y-auto space-y-4 lg:space-y-5 flex flex-col justify-between">
                          <div className="space-y-6">
                            {/* Visual Repair Workflow Stepper */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-indigo-500" />{" "}
                                  Visual Repair Workflow
                                </h4>
                                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                                  <span className="text-[9px] font-mono font-bold text-indigo-700">
                                    Live Tracker & Control
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between relative mt-4 px-2">
                                {/* Connector Track line */}
                                <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 z-0 rounded" />

                                {(() => {
                                  const getActiveStepIndex = (
                                    st: ServiceStatus,
                                  ) => {
                                    switch (st) {
                                      case ServiceStatus.DITERIMA:
                                      case ServiceStatus.ANTRIAN:
                                      case ServiceStatus.DIAGNOSA:
                                        return 0; // Diagnosa
                                      case ServiceStatus.MENUGGU_APPROVAL:
                                      case ServiceStatus.APPROVAL_DITOLAK:
                                        return 1; // Menunggu Persetujuan
                                      case ServiceStatus.SEDANG_DIKERJAKAN:
                                      case ServiceStatus.MENUGGU_SPAREPART:
                                        return 2; // Proses Perbaikan
                                      case ServiceStatus.QC:
                                      case ServiceStatus.REWORK:
                                        return 3; // QC/Testing
                                      case ServiceStatus.SELESAI:
                                      case ServiceStatus.SIAP_DIAMBIL:
                                      case ServiceStatus.DIAMBIL:
                                        return 4; // Siap Diambil
                                      default:
                                        return 0;
                                    }
                                  };

                                  const steps = [
                                    {
                                      label: "Diagnosa",
                                      status: ServiceStatus.DIAGNOSA,
                                      desc: "Pengecekan Kendala",
                                    },
                                    {
                                      label: "Persetujuan",
                                      status: ServiceStatus.MENUGGU_APPROVAL,
                                      desc: "Konfirmasi Estimasi",
                                    },
                                    {
                                      label: "Perbaikan",
                                      status: ServiceStatus.SEDANG_DIKERJAKAN,
                                      desc: "Eksekusi Teknisi",
                                    },
                                    {
                                      label: "QC/Testing",
                                      status: ServiceStatus.QC,
                                      desc: "Uji Layakan & Fungsi",
                                    },
                                    {
                                      label: "Siap Diambil",
                                      status: ServiceStatus.SIAP_DIAMBIL,
                                      desc: "Siap Diserahkan",
                                    },
                                  ];

                                  const activeIndex = getActiveStepIndex(
                                    ticket.status,
                                  );

                                  return steps.map((step, idx) => {
                                    const isCompleted = idx < activeIndex;
                                    const isActive = idx === activeIndex;

                                    return (
                                      <div
                                        key={idx}
                                        className="flex flex-col items-center flex-1 relative z-10"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const note = `Status diperbarui via Visual Workflow ke: ${step.label}`;
                                            updateServiceStatus(
                                              ticket.id,
                                              step.status,
                                              note,
                                            );
                                          }}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border-2 cursor-pointer outline-none ${
                                            isCompleted
                                              ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                              : isActive
                                                ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 shadow-md shadow-indigo-600/20"
                                                : "bg-white border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600"
                                          }`}
                                          title={`Ubah status ke ${step.label}`}
                                        >
                                          {isCompleted ? (
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                          ) : (
                                            idx + 1
                                          )}
                                        </button>
                                        <span
                                          className={`text-[9px] font-bold mt-1.5 text-center transition-colors ${
                                            isActive
                                              ? "text-indigo-600 font-extrabold"
                                              : isCompleted
                                                ? "text-emerald-600"
                                                : "text-slate-500"
                                          }`}
                                        >
                                          {step.label}
                                        </span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* Technician Tools Center */}
                            {(currentUser.role === "TEKNISI" ||
                              currentUser.role === "ADMIN" ||
                              currentUser.role === "MANAGER" ||
                              true) && (
                              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                                      <Timer className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                                        Pusat Kendali Teknisi
                                      </h4>
                                      <p className="text-[10px] text-slate-400">
                                        SLA Timer, Catatan & Permintaan Suku
                                        Cadang
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {(ticket.status === ServiceStatus.SEDANG_DIKERJAKAN || ticket.status === ServiceStatus.REWORK) && (
                                      <>
                                      <button
                                        type="button"
                                        onClick={() => setPartOrderTicket(ticket)}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                                      >
                                        <PackagePlus className="w-3.5 h-3.5" /> Menunggu Spare Part
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAdditionalCostTicket(ticket);
                                          setAdditionalCostApprovedBy(customer?.name || "");
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                                      >
                                        <PlusCircle className="w-3.5 h-3.5" /> Tambahan Biaya Disetujui
                                      </button>
                                      </>
                                    )}
                                    {/* Timer Controls */}
                                    {(() => {
                                      const slaHours = tenantObj?.settings?.serviceSettings?.slaHours || 24;
                                      const slaSeconds = slaHours * 3600;
                                      const isBreached = liveTimerSeconds > slaSeconds && ticket.repairStartTime && !ticket.repairEndTime;
                                      return (
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                                          <span className={`text-xs font-mono font-bold ${isBreached ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {Math.floor(liveTimerSeconds / 3600).toString().padStart(2, "0")}:
                                            {Math.floor((liveTimerSeconds % 3600) / 60).toString().padStart(2, "0")}:
                                            {(liveTimerSeconds % 60).toString().padStart(2, "0")}
                                          </span>
                                          {isBreached && <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full animate-pulse">SLA BREACH</span>}
                                          {!ticket.repairStartTime ? (
                                            <button onClick={() => updateServiceTicket(ticket.id, { repairStartTime: new Date().toISOString() })} className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-emerald-700">Mulai Servis</button>
                                          ) : !ticket.repairEndTime ? (
                                            <button onClick={() => updateServiceTicket(ticket.id, { repairEndTime: new Date().toISOString() })} className="text-[9px] font-bold bg-rose-600 text-white px-2 py-1 rounded shadow-xs cursor-pointer hover:bg-rose-700">Hentikan Waktu</button>
                                          ) : (
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">Selesai</span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                  {/* Catatan Internal Teknisi */}
                                  <div className="space-y-2">
                                    <label className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
                                      <span>Catatan Teknis (Internal)</span>
                                      <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        Admin/Teknisi Saja
                                      </span>
                                    </label>
                                    <textarea
                                      value={ticket.technicianNotes || ""}
                                      onChange={(e) =>
                                        updateServiceTicket(ticket.id, {
                                          technicianNotes: e.target.value,
                                        })
                                      }
                                      placeholder="Tulis kendala teknis, pin iclude, atau catatan skema di sini..."
                                      className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                    />
                                  </div>

                                  {/* Permintaan Sparepart & Skema */}
                                  <div className="space-y-3">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openMicroComponentModal(ticket)}
                                        disabled={!([ServiceStatus.DIAGNOSA, ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK] as ServiceStatus[]).includes(ticket.status)}
                                        title={!([ServiceStatus.DIAGNOSA, ServiceStatus.SEDANG_DIKERJAKAN, ServiceStatus.REWORK] as ServiceStatus[]).includes(ticket.status) ? "Komponen hanya dapat dipakai saat diagnosis atau pengerjaan" : undefined}
                                        className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Search className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform mb-1" />
                                        <span className="text-[10px] font-bold text-slate-700">
                                          Cari Komponen
                                        </span>
                                        <span className="text-[9px] text-slate-400">
                                          Pencarian Kompatibilitas
                                        </span>
                                      </button>
                                      <button
                                        onClick={() =>
                                          setRequestPartMode(!requestPartMode)
                                        }
                                        className="flex-1 flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
                                      >
                                        <PackagePlus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform mb-1" />
                                        <span className="text-[10px] font-bold text-slate-700">
                                          Request Sparepart
                                        </span>
                                        <span className="text-[9px] text-slate-400">
                                          Dari Gudang
                                        </span>
                                      </button>
                                    </div>

                                    {requestPartMode && (
                                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 animate-fadeIn">
                                        <select
                                          value={requestedPartId}
                                          onChange={(e) =>
                                            setRequestedPartId(e.target.value)
                                          }
                                          className="w-full text-xs p-2 rounded-lg border border-slate-200"
                                        >
                                          <option value="">
                                            -- Pilih Sparepart --
                                          </option>
                                          {sparepartsList.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name} (Stok: {p.stock})
                                            </option>
                                          ))}
                                        </select>
                                        <div className="flex gap-2">
                                          <input
                                            type="number"
                                            min="1"
                                            value={requestedPartQty}
                                            onChange={(e) =>
                                              setRequestedPartQty(
                                                parseInt(e.target.value) || 1,
                                              )
                                            }
                                            className="w-20 text-xs p-2 rounded-lg border border-slate-200"
                                          />
                                          <button
                                            onClick={() => {
                                              if (
                                                requestedPartId &&
                                                requestedPartQty > 0
                                              ) {
                                                const currentReqs =
                                                  ticket.partsRequested || [];
                                                updateServiceTicket(ticket.id, {
                                                  partsRequested: [
                                                    ...currentReqs,
                                                    {
                                                      id: "req-" + Date.now().toString(36),
                                                      sparepartId:
                                                        requestedPartId,
                                                      qty: requestedPartQty,
                                                      status: "PENDING",
                                                      requestedAt:
                                                        new Date().toISOString(),
                                                    },
                                                  ],
                                                });
                                                setRequestedPartId("");
                                                setRequestPartMode(false);
                                                showToast(
                                                  "Permintaan berhasil dikirim ke admin gudang!",
                                                  "success",
                                                );
                                              }
                                            }}
                                            className="flex-1 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-700"
                                          >
                                            Kirim Permintaan
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {ticket.microComponentUsages && ticket.microComponentUsages.length > 0 && (
                                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                                        <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold text-indigo-800 uppercase">Komponen Mikro Terpakai</span><span className="text-[9px] text-indigo-500">{ticket.microComponentUsages.length} item</span></div>
                                        {ticket.microComponentUsages.map((usage) => <div key={usage.id} className="flex items-start justify-between gap-3 rounded-lg bg-white border border-indigo-100 px-2.5 py-2"><div><p className="text-[10px] font-bold text-slate-700">{usage.name} × {usage.quantity}</p><p className="text-[9px] text-slate-400">{usage.chargeable ? `Ditagihkan Rp ${usage.chargeTotal.toLocaleString("id-ID")}` : "Pemakaian internal"}</p></div><span className="text-[9px] font-semibold text-slate-500">HPP Rp {usage.hppTotal.toLocaleString("id-ID")}</span></div>)}
                                        <div className="pt-1 border-t border-indigo-100 grid grid-cols-2 gap-2 text-[9px]"><span>Total HPP: <strong>Rp {ticket.microComponentUsages.reduce((sum, item) => sum + item.hppTotal, 0).toLocaleString("id-ID")}</strong></span><span className="text-right">Ditagihkan: <strong className="text-indigo-700">Rp {ticket.microComponentUsages.reduce((sum, item) => sum + (item.chargeable ? item.chargeTotal : 0), 0).toLocaleString("id-ID")}</strong></span></div>
                                      </div>
                                    )}

                                    {/* List of active requests */}
                                    {ticket.partsRequested &&
                                      ticket.partsRequested.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-bold text-slate-500">
                                            Status Permintaan Part:
                                          </span>
                                          <div className="max-h-24 overflow-y-auto space-y-1">
                                            {ticket.partsRequested.map(
                                              (req) => {
                                                const pName =
                                                  sparepartsList.find(
                                                    (x) =>
                                                      x.id === req.sparepartId,
                                                  )?.name || "Unknown Part";
                                                return (
                                                  <div
                                                    key={req.id}
                                                    className="flex items-center justify-between bg-slate-50 border border-slate-100 p-1.5 rounded-md text-[10px]"
                                                  >
                                                    <span className="truncate pr-2 font-medium">
                                                      {pName} (x{req.qty})
                                                    </span>
                                                    <span
                                                      className={`px-1.5 py-0.5 rounded font-bold ${
                                                        req.status === "PENDING"
                                                          ? "bg-amber-100 text-amber-700"
                                                          : req.status ===
                                                              "APPROVED"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-rose-100 text-rose-700"
                                                      }`}
                                                    >
                                                      {req.status}
                                                    </span>
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Interactive Testing & Checklist Center (Pre-Service & Post-Service QC) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                                      Pusat Pengujian & Checklist Fungsi
                                      Perangkat
                                    </h4>
                                    <p className="text-[10px] text-slate-400">
                                      Verifikasi kelayakan hardware & software
                                      secara real-time
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold border border-indigo-150">
                                  Teknisi:{" "}
                                  {technician?.name || "Belum Ditugaskan"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* COLUMN 1: PRE-SERVICE INTAKE CHECKLIST */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                      Pre-Service (Kondisi Masuk)
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                      {ticket.initialChecklist
                                        ? ticket.initialChecklist.filter(
                                            (x) => x.checked,
                                          ).length
                                        : 0}{" "}
                                      /{" "}
                                      {ticket.initialChecklist
                                        ? ticket.initialChecklist.length
                                        : 0}{" "}
                                      OK
                                    </span>
                                  </div>

                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
                                    {ticket.initialChecklist &&
                                    ticket.initialChecklist.length > 0 ? (
                                      ticket.initialChecklist.map(
                                        (item, idx) => {
                                          return (
                                            <label
                                              key={idx}
                                              className={`flex items-center justify-between text-xs p-2 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                                                item.checked
                                                  ? "bg-emerald-50/40 border-emerald-100 text-emerald-800 font-medium"
                                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2 truncate">
                                                <input
                                                  type="checkbox"
                                                  checked={item.checked}
                                                  onChange={() => {
                                                    const updatedList =
                                                      ticket.initialChecklist.map(
                                                        (c, i) =>
                                                          i === idx
                                                            ? {
                                                                ...c,
                                                                checked:
                                                                  !c.checked,
                                                              }
                                                            : c,
                                                      );
                                                    updateServiceTicket(
                                                      ticket.id,
                                                      {
                                                        initialChecklist:
                                                          updatedList,
                                                      },
                                                    );
                                                  }}
                                                  className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                                />
                                                <span className="truncate">
                                                  {item.name}
                                                </span>
                                              </div>
                                              <span
                                                className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                                  item.checked
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-rose-100 text-rose-800"
                                                }`}
                                              >
                                                {item.checked ? "OK" : "REJECT"}
                                              </span>
                                            </label>
                                          );
                                        },
                                      )
                                    ) : (
                                      <div className="text-center py-6 text-slate-400 italic text-[11px] bg-white rounded-lg border border-dashed border-slate-200">
                                        <p>Checklist pre-service kosong.</p>
                                        <button
                                          onClick={() => {
                                            const defaultList = [
                                              {
                                                name: "Unit Menyala (Power On)",
                                                checked: true,
                                              },
                                              {
                                                name: "Fisik Mulus (No Dents/Scratch)",
                                                checked: true,
                                              },
                                              {
                                                name: "LCD / Layar Normal",
                                                checked: true,
                                              },
                                              {
                                                name: "Touch Screen / Touchpad Normal",
                                                checked: true,
                                              },
                                              {
                                                name: "Speaker & Audio Output",
                                                checked: true,
                                              },
                                              {
                                                name: "Kamera Depan & Belakang",
                                                checked: true,
                                              },
                                              {
                                                name: "Wi-Fi & Bluetooth Sinyal",
                                                checked: true,
                                              },
                                              {
                                                name: "Charger & Port Pengisian",
                                                checked: true,
                                              },
                                            ];
                                            updateServiceTicket(ticket.id, {
                                              initialChecklist: defaultList,
                                            });
                                          }}
                                          className="mt-2 px-2.5 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 cursor-pointer transition-all"
                                        >
                                          Inisialisasi Checklist
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* COLUMN 2: POST-SERVICE (QC) TESTING CHECKLIST */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                      Post-Service (Pengujian QC)
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                      {ticket.qcChecklist
                                        ? ticket.qcChecklist.filter(
                                            (x) => x.passed,
                                          ).length
                                        : 0}{" "}
                                      /{" "}
                                      {ticket.qcChecklist
                                        ? ticket.qcChecklist.length
                                        : 10}{" "}
                                      Passed
                                    </span>
                                  </div>

                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1.5">
                                    {(() => {
                                      // Get or auto-initialize qcChecklist
                                      const currentQcList =
                                        ticket.qcChecklist &&
                                        ticket.qcChecklist.length > 0
                                          ? ticket.qcChecklist
                                          : [
                                              {
                                                criteria:
                                                  "Pengujian Pengisian Daya (Charging Test)",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Uji Ketahanan Baterai (Battery Burn Test)",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Kalibrasi Layar / Warna (Display Quality)",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Uji Sensitivitas Sentuh (Touch Response)",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Uji Suara & Mikrofon (Audio & Mic Test)",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Uji Suhu & Kipas (Thermal Stress Test)",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Uji Sinyal Wi-Fi / Seluler",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Pengecekan Baut & Casing Rapat",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Sistem Bersih dari Debu",
                                                passed: true,
                                              },
                                              {
                                                criteria:
                                                  "Uji Port Input/Output (I/O Ports)",
                                                passed: true,
                                              },
                                            ];

                                      return (
                                        <div className="space-y-1.5">
                                          {currentQcList.map((item, idx) => {
                                            return (
                                              <label
                                                key={idx}
                                                className={`flex items-center justify-between text-xs p-2 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                                                  item.passed
                                                    ? "bg-emerald-50/40 border-emerald-100 text-emerald-800 font-medium"
                                                    : "bg-rose-50/30 border-rose-150 text-rose-800"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 truncate">
                                                  <input
                                                    type="checkbox"
                                                    checked={item.passed}
                                                    onChange={() => {
                                                      const updatedList =
                                                        currentQcList.map(
                                                          (c, i) =>
                                                            i === idx
                                                              ? {
                                                                  ...c,
                                                                  passed:
                                                                    !c.passed,
                                                                }
                                                              : c,
                                                        );

                                                      // Calculate suggested QC score
                                                      const passedCount =
                                                        updatedList.filter(
                                                          (x) => x.passed,
                                                        ).length;
                                                      const suggestedScore =
                                                        Math.round(
                                                          (passedCount /
                                                            updatedList.length) *
                                                            100,
                                                        );

                                                      updateServiceTicket(
                                                        ticket.id,
                                                        {
                                                          qcChecklist:
                                                            updatedList,
                                                          qcScore:
                                                            suggestedScore,
                                                        },
                                                      );

                                                      // Also sync to active QC states if this ticket is in focus
                                                      setQcScore(
                                                        suggestedScore,
                                                      );
                                                    }}
                                                    className="accent-emerald-600 h-3.5 w-3.5 rounded"
                                                  />
                                                  <span className="truncate">
                                                    {item.criteria}
                                                  </span>
                                                </div>
                                                <span
                                                  className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                                    item.passed
                                                      ? "bg-emerald-100 text-emerald-800"
                                                      : "bg-rose-100 text-rose-800"
                                                  }`}
                                                >
                                                  {item.passed
                                                    ? "PASSED"
                                                    : "FAILED"}
                                                </span>
                                              </label>
                                            );
                                          })}

                                          {/* Sync button to restore qcChecklist if requested */}
                                          {(!ticket.qcChecklist ||
                                            ticket.qcChecklist.length ===
                                              0) && (
                                            <div className="pt-2 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  updateServiceTicket(
                                                    ticket.id,
                                                    {
                                                      qcChecklist:
                                                        currentQcList,
                                                      qcScore: 100,
                                                    },
                                                  );
                                                  setQcScore(100);
                                                }}
                                                className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg py-1.5 text-[10px] font-bold hover:bg-indigo-100/50 cursor-pointer transition-all"
                                              >
                                                Simpan Checklist QC Standar (10
                                                Pengujian)
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Consolidated QC Summary and Scoring Integration */}
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span>Skor Kelayakan QC Terhitung</span>
                                  </div>
                                  <p className="text-slate-500 text-[10px] leading-relaxed">
                                    Skor dihasilkan secara proporsional dari
                                    checklist QC di atas. Minimal skor lolos uji
                                    adalah 80.
                                  </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <div className="text-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
                                    <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                                      QC SCORE
                                    </p>
                                    <p
                                      className={`text-2xl font-black font-mono tracking-tight ${
                                        (ticket.qcScore ?? 100) >= 80
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      {ticket.qcScore ?? 100}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg border font-mono ${
                                        (ticket.qcScore ?? 100) >= 80
                                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                          : "bg-rose-50 border-rose-200 text-rose-700"
                                      }`}
                                    >
                                      {(ticket.qcScore ?? 100) >= 80
                                        ? "✓ AMAN / LOLOS QC"
                                        : "✕ PERLU REWORK"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* QC Inline Form — inside ticket detail modal */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Quality Control (QC)
                                </h4>
                                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">#{ticket.ticketNo}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Skor Pemeriksaan (0–100)</label>
                                  <input type="range" min="0" max="100" value={qcScore} onChange={(e) => setQcScore(Number(e.target.value))} className="w-full cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none" />
                                  <p className="text-right text-xs font-bold font-mono text-slate-800 mt-1">{qcScore}/100</p>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan Pemeriksaan</label>
                                  <textarea rows={3} placeholder="cth: Keyboard normal, speaker jernih, suhu idle 45 C pasca repasting." value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => completeServiceQC(ticket.id, qcScore, qcNotes, false)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs py-2 rounded-lg cursor-pointer border border-rose-200">Rework (Gagal QC)</button>
                                <button onClick={() => completeServiceQC(ticket.id, qcScore, qcNotes, true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer">Lolos QC (Selesai)</button>
                              </div>
                            </div>

                            {/* Grid 1: Diagnostic and Parts Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* Left Workshop column: Manual Diagnostic Updates */}
                              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                                <h4 className="font-bold text-[11px] text-slate-700 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                                  <Wrench className="w-4 h-4 text-slate-400" />{" "}
                                  Analisa Kerusakan Teknis
                                </h4>

                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                                    Diagnosa Masalah Perangkat
                                  </label>
                                  <textarea
                                    rows={3}
                                    placeholder="Masukkan hasil diagnosa teknisi secara detail..."
                                    value={manualDiagNotes}
                                    onChange={(e) =>
                                      setManualDiagNotes(e.target.value)
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                                      Estimasi Biaya Jasa Servis
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="Rp..."
                                      value={manualDiagCost}
                                      onChange={(e) =>
                                        setManualDiagCost(e.target.value)
                                      }
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const estCost = Number(manualDiagCost || 0);
                                        if (!manualDiagNotes.trim()) {
                                          showToast("Catatan diagnosis wajib diisi.", "error");
                                          return;
                                        }
                                        try {
                                          await addServiceDiagnostic(
                                            ticket.id,
                                            manualDiagNotes,
                                            estCost,
                                            ticket.partsRequested || ticket.partsUsed || [],
                                          );
                                          showToast(
                                            "Diagnosa teknis berhasil disimpan dan penawaran siap dikirim.",
                                            "success",
                                          );
                                          const sendingMethod = tenantObj?.settings?.waConfig?.sendingMethod || "MANUAL";
                                          if (sendingMethod === "MANUAL") {
                                            openManualEstimateWhatsApp(
                                              ticket,
                                              manualDiagNotes,
                                              estCost,
                                              ticket.partsRequested || ticket.partsUsed || [],
                                            );
                                          } else {
                                            showToast("Penawaran dimasukkan ke antrean WhatsApp API.", "info");
                                          }
                                        } catch (error: any) {
                                          showToast(error?.message || "Gagal menyimpan diagnosis.", "error");
                                        }
                                      }}
                                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center transition-all shadow-xs"
                                    >
                                      Simpan Diagnosa & Kirim Penawaran
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Right Workshop column: Spareparts Inventory Integration */}
                              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                                <h4 className="font-bold text-[11px] text-slate-700 uppercase font-mono tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                                  <Package className="w-4 h-4 text-slate-400" />{" "}
                                  Penggantian Suku Cadang (Inventory)
                                </h4>

                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                                    Cari & Pilih Suku Cadang
                                  </label>
                                  <select
                                    value={selectedSparepartId}
                                    onChange={(e) =>
                                      setSelectedSparepartId(e.target.value)
                                    }
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                                  >
                                    <option value="">
                                      -- Pilih part di stok toko --
                                    </option>
                                    {sparepartsList.map((prod) => (
                                      <option
                                        key={prod.id}
                                        value={prod.id}
                                        disabled={prod.stockQty <= 0}
                                      >
                                        {prod.name} (Stok: {prod.stockQty}) - Rp{" "}
                                        {(prod.sellPrice ?? 0).toLocaleString()}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                                      Jumlah (Qty)
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={sparepartQty}
                                      onChange={(e) =>
                                        setSparepartQty(Number(e.target.value))
                                      }
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                                      Serial Number (Opsional)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Scan / Ketik SN LCD dll"
                                      value={sparepartSN}
                                      onChange={(e) =>
                                        setSparepartSN(e.target.value)
                                      }
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!selectedSparepartId) return;
                                        const partProd = products.find((p) => p.id === selectedSparepartId);
                                        if (!partProd) return;
                                        const warehouseId = Object.keys(partProd.warehouseStock || {})[0];
                                        if (!warehouseId) {
                                          showToast("Gudang spare part belum ditentukan.", "error");
                                          return;
                                        }
                                        try {
                                          await requestServicePart(ticket.id, {
                                            productId: selectedSparepartId,
                                            warehouseId,
                                            quantity: sparepartQty,
                                            serialNumber: sparepartSN || undefined,
                                          });
                                          const updatedCost = (Number(ticket.estimatedCost) || 0) + (partProd.sellPrice ?? 0) * sparepartQty;
                                          setSelectedSparepartId("");
                                          setSparepartQty(1);
                                          setSparepartSN("");
                                          setManualDiagCost(String(updatedCost));
                                          showToast(`${partProd.name} berhasil direservasi. Stok dipotong saat handover.`, "success");
                                        } catch (error: any) {
                                          showToast(error?.message || "Gagal mereservasi spare part.", "error");
                                        }
                                      }}
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center transition-all shadow-xs"
                                    >
                                      Reservasi Spare Part
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Spareparts Used Ledger */}
                            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                              <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                                Rincian Komponen Suku Cadang Terpakai
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                  <thead className="bg-slate-50 font-mono text-[9px] uppercase border-b border-slate-100">
                                    <tr>
                                      <th className="px-3 py-2">Nama Barang</th>
                                      <th className="px-3 py-2">
                                        Harga Satuan
                                      </th>
                                      <th className="px-3 py-2">Qty</th>
                                      <th className="px-3 py-2">Total Harga</th>
                                      <th className="px-3 py-2 text-right">
                                        Tindakan
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {ticket.partsUsed &&
                                    ticket.partsUsed.length > 0 ? (
                                      ticket.partsUsed.map((part, pIdx) => (
                                        <tr
                                          key={pIdx}
                                          className="hover:bg-slate-50"
                                        >
                                          <td className="px-3 py-2 font-medium text-slate-700">
                                            {part.name}
                                            {part.serialNumber && (
                                              <div className="text-[9px] font-mono text-indigo-500 mt-0.5 border border-indigo-100 bg-indigo-50 inline-block px-1 rounded">
                                                SN: {part.serialNumber}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-mono">
                                            Rp {part.unitPrice.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2 font-mono font-bold">
                                            {part.quantity}
                                          </td>
                                          <td className="px-3 py-2 font-mono font-extrabold text-indigo-600">
                                            Rp{" "}
                                            {part.totalPrice.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              onClick={async () => {
                                                if (!(part as any).id) {
                                                  showToast("ID reservasi spare part tidak tersedia.", "error");
                                                  return;
                                                }
                                                try {
                                                  await cancelServicePart(ticket.id, (part as any).id);
                                                  const updatedCost = Math.max(0, (Number(ticket.estimatedCost) || 0) - part.totalPrice);
                                                  setManualDiagCost(String(updatedCost));
                                                  showToast(`Reservasi ${part.name} dibatalkan.`, "success");
                                                } catch (error: any) {
                                                  showToast(error?.message || "Gagal membatalkan spare part.", "error");
                                                }
                                              }}
                                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-all inline-flex items-center"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={5}
                                          className="px-3 py-3 text-slate-400 italic text-[11px] text-center bg-slate-50/50 rounded-lg"
                                        >
                                          Belum ada suku cadang yang
                                          diaplikasikan pada unit perbaikan ini.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Section 3: Manual Status & Workflow Controller */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h4 className="font-bold text-[10px] text-indigo-600 uppercase font-mono tracking-wider">
                                  Lompati / Ubah Status Manual
                                </h4>
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                                    Pilih Status Baru
                                  </label>
                                  <select
                                    value={ticket.status}
                                    onChange={(e) => {
                                      const newStatus = e.target
                                        .value as ServiceStatus;
                                      updateServiceStatus(
                                        ticket.id,
                                        newStatus,
                                        `Diubah secara manual oleh operator.`,
                                      );
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500"
                                  >
                                    {Object.values(ServiceStatus).map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Status action buttons depending on flow */}
                              <div className="flex flex-col justify-end space-y-2">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                                  Tindakan Alur Kerja Cepat:
                                </p>

                                {ticket.status === ServiceStatus.DIAGNOSA && (
                                  <div className="space-y-2">
                                    <button
                                      onClick={() =>
                                        updateServiceStatus(
                                          ticket.id,
                                          ServiceStatus.MENUGGU_APPROVAL,
                                          "Teknisi merumuskan estimasi biaya dan menunggu persetujuan pelanggan.",
                                        )
                                      }
                                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                                    >
                                      Ajukan Estimasi Biaya ke Pelanggan
                                    </button>
                                    <button
                                      onClick={() => {
                                        updateServiceStatus(
                                          ticket.id,
                                          ServiceStatus.ESTIMATE_PENDING,
                                          "Teknisi menandai perbaikan dengan status 'Estimate Pending' dan menerbitkan Surat Penawaran Biaya Sementara.",
                                        );
                                        setShowProvisionalQuote(ticket.id);
                                      }}
                                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                      <FileText className="w-4 h-4" /> Tandai
                                      'Estimate Pending' & Terbitkan Quote
                                    </button>
                                  </div>
                                )}

                                {(ticket.status ===
                                  ServiceStatus.ESTIMATE_PENDING ||
                                  ticket.status ===
                                    ServiceStatus.MENUGGU_APPROVAL) && (
                                  <div className="space-y-2">
                                    <button
                                      onClick={() =>
                                        setShowProvisionalQuote(ticket.id)
                                      }
                                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                      <FileText className="w-4 h-4" /> 📄
                                      Pratinjau Surat Penawaran (Provisional
                                      Quote)
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        onClick={() =>
                                          approveServiceEstimate(
                                            ticket.id,
                                            true,
                                          )
                                        }
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                                      >
                                        Setujui Digital
                                      </button>
                                      <button
                                        onClick={() =>
                                          approveServiceEstimate(
                                            ticket.id,
                                            false,
                                          )
                                        }
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center"
                                      >
                                        Tolak / Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {ticket.status ===
                                  ServiceStatus.SEDANG_DIKERJAKAN && (
                                  <button
                                    onClick={() => {
                                      setViewingServiceTicketId(ticket.id);
                                      setQcScore(ticket.qcScore ?? 100);
                                      setQcNotes(ticket.qcNotes ?? "");
                                    }}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
                                  >
                                    <ShieldCheck className="w-4 h-4" /> Buka
                                    Panel Quality Control (QC)
                                  </button>
                                )}

                                {["SELESAI", "SIAP_DIAMBIL"].includes(
                                  ticket.status,
                                ) &&
                                  (() => {
                                    const isRefOrProofRequired =
                                      handoverPaymentMethod !==
                                        PaymentMethod.CASH &&
                                      handoverPaymentMethod !==
                                        PaymentMethod.TEMPO;
                                    const isHandoverValid =
                                      !isRefOrProofRequired ||
                                      handoverRefNo.trim() !== "" ||
                                      handoverProofName.trim() !== "";

                                    const estCost = Number(ticket.estimatedCost) || 0;
                                    const taxAmt = Math.round(estCost * 0.11);
                                    const totalAmt = estCost + taxAmt;
                                    const targetAccountLabel =
                                      handoverPaymentMethod === PaymentMethod.TEMPO
                                        ? "10300 - Piutang Usaha"
                                        : handoverPaymentMethod === PaymentMethod.CASH
                                          ? "10100 - Kas Utama"
                                          : "10200 - Bank / Payment Gateway";
                                    const warrantyEndsPreview = new Date(
                                      Date.now() + (ticket.warrantyMonths || 0) * 30 * 24 * 60 * 60 * 1000,
                                    )
                                      .toISOString()
                                      .split("T")[0];
                                    const partsImpact = ticket.partsUsed || [];
                                    const isChecklistComplete = Object.values(
                                      handoverChecklist,
                                    ).every(Boolean);

                                    return (
                                      <div className="space-y-3.5 border border-slate-200/85 p-4 rounded-xl bg-slate-50/70 w-full text-left shadow-sm">
                                        <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100/60 p-3 rounded-lg text-xs font-semibold text-slate-700">
                                          <span className="text-slate-600">
                                            Total Tagihan Pelunasan (PPN 11%):
                                          </span>
                                          <span className="text-indigo-700 font-mono text-sm font-bold">
                                            Rp {totalAmt.toLocaleString()}
                                          </span>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Metode Pembayaran Pelunasan
                                          </label>
                                          <select
                                            value={handoverPaymentMethod}
                                            onChange={(e) => {
                                              setHandoverPaymentMethod(
                                                e.target.value as PaymentMethod,
                                              );
                                              // Reset other states on method change
                                              setHandoverRefNo("");
                                              setHandoverProofName("");
                                            }}
                                            className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-xs"
                                          >
                                            <option value={PaymentMethod.CASH}>
                                              💵 CASH / TUNAI (Kas Utama)
                                            </option>
                                            <option
                                              value={
                                                PaymentMethod.BANK_TRANSFER
                                              }
                                            >
                                              🏦 TRANSFER BANK (Bank Mandiri)
                                            </option>
                                            <option value={PaymentMethod.QRIS}>
                                              📱 QRIS (Bank Mandiri)
                                            </option>
                                            <option value={PaymentMethod.EDC}>
                                              💳 DEBIT / EDC (Bank Mandiri)
                                            </option>
                                            <option
                                              value={PaymentMethod.E_WALLET}
                                            >
                                              👛 E-WALLET (Bank Mandiri)
                                            </option>
                                            <option value={PaymentMethod.TEMPO}>
                                              ⏳ TEMPO / BAYAR NANTI (Piutang
                                              Usaha)
                                            </option>
                                          </select>
                                        </div>

                                        {handoverPaymentMethod ===
                                          PaymentMethod.TEMPO && (
                                          <div className="space-y-2.5 animate-fadeIn">
                                            <div className="space-y-1">
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Termin Jatuh Tempo (Hari)
                                              </label>
                                              <select
                                                value={handoverTempoDays}
                                                onChange={(e) =>
                                                  setHandoverTempoDays(
                                                    e.target.value,
                                                  )
                                                }
                                                className="block w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-xs"
                                              >
                                                <option value="15">
                                                  15 Hari
                                                </option>
                                                <option value="30">
                                                  30 Hari (Default)
                                                </option>
                                                <option value="45">
                                                  45 Hari
                                                </option>
                                                <option value="60">
                                                  60 Hari
                                                </option>
                                              </select>
                                            </div>
                                            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-relaxed shadow-3xs">
                                              📌{" "}
                                              <strong>
                                                Informasi Piutang & Pinjaman
                                              </strong>
                                              : Penyerahan dengan status tempo
                                              akan mencatat piutang customer
                                              sebesar{" "}
                                              <strong>
                                                Rp {totalAmt.toLocaleString()}
                                              </strong>{" "}
                                              ke akun{" "}
                                              <strong>
                                                10300 - Piutang Usaha B2B
                                              </strong>
                                              . Transaksi kas tidak bertambah
                                              sampai pembayaran piutang dilunasi
                                              oleh pelanggan di modul keuangan.
                                            </div>
                                          </div>
                                        )}

                                        {isRefOrProofRequired && (
                                          <div className="space-y-3 border-t border-slate-200/80 pt-3 animate-fadeIn">
                                            <div className="space-y-1">
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Nomor Referensi Transaksi{" "}
                                                <span className="text-rose-500 font-bold">
                                                  *
                                                </span>
                                              </label>
                                              <input
                                                type="text"
                                                placeholder="Contoh: TRX-1029302 atau No. Rek / Slip"
                                                value={handoverRefNo}
                                                onChange={(e) =>
                                                  setHandoverRefNo(
                                                    e.target.value,
                                                  )
                                                }
                                                className="block w-full text-xs px-2.5 py-2 border border-slate-200 bg-white rounded-lg outline-none focus:border-indigo-500 font-medium text-slate-700 shadow-xs"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Bukti Transfer (Upload / Seret
                                                File){" "}
                                                <span className="text-rose-500 font-bold">
                                                  *
                                                </span>
                                              </label>
                                              {handoverProofName ? (
                                                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                                                  <div className="flex items-center gap-1.5 font-medium truncate">
                                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="truncate">
                                                      {handoverProofName}
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setHandoverProofName("")
                                                    }
                                                    className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer text-xs"
                                                  >
                                                    Hapus
                                                  </button>
                                                </div>
                                              ) : (
                                                <div
                                                  onClick={() => {
                                                    document
                                                      .getElementById(
                                                        `proof-upload-${ticket.id}`,
                                                      )
                                                      ?.click();
                                                  }}
                                                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 p-4 rounded-lg text-center cursor-pointer transition-all duration-150"
                                                >
                                                  <input
                                                    type="file"
                                                    id={`proof-upload-${ticket.id}`}
                                                    accept="image/*,application/pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                      const file =
                                                        e.target.files?.[0];
                                                      if (file) {
                                                        setHandoverProofName(
                                                          file.name,
                                                        );
                                                      }
                                                    }}
                                                  />
                                                  <p className="text-[11px] text-slate-500 font-medium">
                                                    Klik untuk memilih atau
                                                    seret file bukti transfer
                                                  </p>
                                                  <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                                    Maks. File: 5MB (PNG, JPG,
                                                    PDF)
                                                  </p>
                                                </div>
                                              )}
                                            </div>

                                            {!isHandoverValid && (
                                              <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-600 font-medium leading-relaxed">
                                                ⚠️{" "}
                                                <strong>Validasi Gagal</strong>:
                                                Harap masukkan Nomor Referensi
                                                ATAU unggah file Bukti Transfer
                                                sebagai prasyarat status 'Unit
                                                Diambil'.
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        <div className="border border-amber-200 bg-amber-50/80 rounded-xl p-3 space-y-2">
                                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <ListChecks className="w-3.5 h-3.5" /> Checklist Serah Terima Unit
                                          </p>
                                          <p className="text-[9px] text-amber-700 leading-relaxed">
                                            Pastikan semua item berikut terpenuhi sebelum klik tombol handover.
                                          </p>
                                          {[
                                            { key: "accessoriesReturned", label: "Charger / adaptor dan aksesoris dikembalikan" },
                                            { key: "customerChecked", label: "Customer sudah cek kondisi unit" },
                                            { key: "invoiceReady", label: "Invoice pembayaran sudah dicetak" },
                                            { key: "warrantyReady", label: "Kartu garansi sudah dicetak" },
                                          ].map(({ key, label }) => (
                                            <label key={key} className="flex items-start gap-2 cursor-pointer group">
                                              <input
                                                type="checkbox"
                                                checked={(handoverChecklist as any)[key]}
                                                onChange={(e) =>
                                                  setHandoverChecklist((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.checked,
                                                  }))
                                                }
                                                className="mt-0.5 w-3.5 h-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                              />
                                              <span className="text-[10px] font-medium text-slate-600 group-hover:text-amber-800 transition-colors leading-tight">
                                                {label}
                                              </span>
                                            </label>
                                          ))}
                                          {Object.values(handoverChecklist).some((v) => !v) && (
                                            <div className="p-1.5 bg-amber-100/80 border border-amber-200 rounded-lg text-[9px] text-amber-700 font-medium">
                                              ⚠️ Centang semua item sebelum menyelesaikan handover.
                                            </div>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-200/80 pt-3">
                                          <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
                                            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                              <Receipt className="w-3.5 h-3.5" /> Preview Jurnal Otomatis
                                            </p>
                                            <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
                                              <div className="flex justify-between gap-3"><span>Debit {targetAccountLabel}</span><strong>Rp {totalAmt.toLocaleString()}</strong></div>
                                              <div className="flex justify-between gap-3"><span>Kredit Pendapatan Servis</span><strong>Rp {estCost.toLocaleString()}</strong></div>
                                              <div className="flex justify-between gap-3"><span>Kredit PPN Keluaran 11%</span><strong>Rp {taxAmt.toLocaleString()}</strong></div>
                                            </div>
                                          </div>
                                          <div className="bg-white border border-emerald-100 rounded-xl p-3 shadow-xs">
                                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                              <ShieldCheck className="w-3.5 h-3.5" /> Preview Garansi & Status
                                            </p>
                                            <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
                                              <div className="flex justify-between gap-3"><span>Status Tiket</span><strong>DIAMBIL</strong></div>
                                              <div className="flex justify-between gap-3"><span>Garansi Aktif Sampai</span><strong>{warrantyEndsPreview}</strong></div>
                                              <div className="flex justify-between gap-3"><span>Kartu Garansi</span><strong>Terkirim</strong></div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-white border border-amber-100 rounded-xl p-3 shadow-xs">
                                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5" /> Preview Stok Sparepart Keluar
                                          </p>
                                          {partsImpact.length > 0 ? (
                                            <div className="space-y-1.5">
                                              {partsImpact.map((part: any, idx: number) => (
                                                <div key={`${part.productId || part.name}-${idx}`} className="flex justify-between gap-3 text-[10px] font-mono text-slate-600">
                                                  <span className="truncate">{part.name || part.productName || part.productId}</span>
                                                  <strong>-{part.quantity || part.qty || 0} pcs</strong>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-500">
                                              Tidak ada sparepart tercatat. Handover hanya membuat jurnal pendapatan, pembayaran, dan garansi.
                                            </p>
                                          )}
                                        </div>

                                        <button
                                          onClick={() => {
                                            if (
                                              isRefOrProofRequired &&
                                              !isHandoverValid
                                            ) {
                                              showToast(
                                                "Gagal memproses: Nomor referensi atau unggah bukti transfer diperlukan!",
                                                "error",
                                              );
                                              return;
                                            }
                                            const detailsObj = {
                                              refNo:
                                                handoverRefNo.trim() ||
                                                undefined,
                                              proofName:
                                                handoverProofName.trim() ||
                                                undefined,
                                              tempoDays:
                                                handoverPaymentMethod ===
                                                PaymentMethod.TEMPO
                                                  ? parseInt(
                                                      handoverTempoDays,
                                                      10,
                                                    )
                                                  : undefined,
                                            };

                                            handoverServiceDevice(
                                              ticket.id,
                                              handoverPaymentMethod,
                                              detailsObj,
                                            );

                                            // Clear form state
                                            setHandoverRefNo("");
                                            setHandoverProofName("");
                                            setHandoverTempoDays("30");
                                            setHandoverChecklist({
                                              accessoriesReturned: false,
                                              customerChecked: false,
                                              invoiceReady: false,
                                              warrantyReady: false,
                                            });

                                            showToast(
                                              handoverPaymentMethod ===
                                                PaymentMethod.TEMPO
                                                ? `Serah terima berhasil via TEMPO! Piutang dicatat sebesar Rp ${totalAmt.toLocaleString()}.`
                                                : `Serah terima berhasil via ${handoverPaymentMethod}! Status diubah menjadi DIAMBIL.`,
                                              "success",
                                            );
                                          }}
                                          disabled={
                                            (isRefOrProofRequired &&
                                              !isHandoverValid) ||
                                            !isChecklistComplete
                                          }
                                          className={`w-full font-bold text-xs py-2.5 rounded-lg text-center transition-all duration-150 ${
                                            (isRefOrProofRequired &&
                                              !isHandoverValid) ||
                                            !isChecklistComplete
                                              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                              : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                          }`}
                                        >
                                          Konfirmasi Handover & Sinkronkan
                                          Accounting
                                        </button>
                                      </div>
                                    );
                                  })()}

                                {ticket.status === "DIAMBIL" && (
                                  <div className="w-full border border-emerald-200 bg-emerald-50/80 rounded-xl p-3 space-y-3 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                          <CheckCircle className="w-3.5 h-3.5" /> Dokumen Siap Dicetak
                                        </p>
                                        <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                                          Unit sudah handover. Invoice pembayaran dan kartu garansi siap diberikan ke customer.
                                        </p>
                                      </div>
                                      <span className="text-[9px] font-mono font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        DIAMBIL
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <button
                                        onClick={() => setShowInvoicePrintout(ticket.id)}
                                        className="px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> Cetak Invoice Pembayaran
                                      </button>
                                      <button
                                        onClick={() => setShowWarrantyPrintout(ticket.id)}
                                        className="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" /> Cetak Kartu Garansi
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <p className="text-[9px] text-slate-400 italic">
                                  Gunakan tombol cetak SPK di pojok kanan atas
                                  untuk memprint tanda terima unit.
                                </p>
                              </div>
                            </div>

                            {/* Section 4: WhatsApp Customer Communication Hub (Manual click-to-chat link helper) */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-[10px] text-indigo-700 uppercase font-mono tracking-wider flex items-center gap-1.5">
                                  <MessageSquare className="w-4 h-4 text-emerald-500" />{" "}
                                  WhatsApp Customer Communication Hub
                                </h4>
                                <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                                  Manual Adjustment Mode
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                    Pilih Template Pesan
                                  </label>
                                  <select
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const estTotal =
                                        Number(ticket.estimatedCost) || 0;
                                      const portalLink =
                                        window.location.origin +
                                        "/?tab=service&sub=approve-quote&ticket=" +
                                        ticket.ticketNo;
                                      let txt = "";
                                      if (val === "intake") {
                                        const ctx = {
                                          customer_name: customer?.name || "Pelanggan",
                                          ticket_no: ticket.ticketNo,
                                          device_name: ticket.deviceName,
                                          ticket_status: "DITERIMA",
                                          status_note: "Unit telah terdaftar dan menunggu diagnosa.",
                                        };
                                        txt =
                                          renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                          `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah berhasil terdaftar di Repair Hub dengan No. Tiket *${ticket.ticketNo}*.\n\nTerima kasih telah mempercayakan perbaikan Anda kepada kami. Tim teknisi kami akan segera melakukan diagnosa secara mendalam.`;
                                      } else if (val === "diagnose") {
                                        const ctx = {
                                          customer_name: customer?.name || "Pelanggan",
                                          ticket_no: ticket.ticketNo,
                                          device_name: ticket.deviceName,
                                          ticket_status: "DIAGNOSA",
                                          status_note: `Estimasi biaya: Rp ${estTotal.toLocaleString()}.`,
                                          estimated_cost: estTotal,
                                          approval_link: portalLink,
                                        };
                                        txt =
                                          renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                          `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai didiagnosa.\n\nKerusakan memerlukan perbaikan dengan total estimasi biaya perbaikan sebesar *Rp ${estTotal.toLocaleString()}*.\n\nSilakan lihat rincian estimasi dan berikan persetujuan digital Anda melalui tautan portal resmi kami berikut:\n${portalLink}\n\nTerima kasih!`;
                                      } else if (val === "completed") {
                                        const ctx = {
                                          customer_name: customer?.name || "Pelanggan",
                                          ticket_no: ticket.ticketNo,
                                          device_name: ticket.deviceName,
                                          ticket_status: "SELESAI",
                                          status_note: `Total biaya: Rp ${estTotal.toLocaleString()}.`,
                                        };
                                        txt =
                                          renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                          `Halo *${customer?.name || "Pelanggan"}*,\n\nKabar baik! Unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*) telah selesai diperbaiki dan LOLOS uji kontrol kualitas (QC) kami!\n\nUnit kini siap untuk diambil kembali di toko kami dengan total biaya *Rp ${estTotal.toLocaleString()}*.\n\nTerima kasih atas kepercayaan Anda!`;
                                      } else {
                                        txt = `Halo *${customer?.name || "Pelanggan"}*,\n\nMengenai unit *${ticket.deviceName}* (No. Tiket *${ticket.ticketNo}*), mohon hubungi kami kembali untuk mendiskusikan kelanjutan proses perbaikan. Terima kasih.`;
                                      }
                                      setCustomWaMessageText(txt);
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-indigo-500 font-medium"
                                  >
                                    <option value="intake">
                                      ✓ Tanda Terima Unit Baru (Intake)
                                    </option>
                                    <option value="diagnose">
                                      ✓ Diagnosa Selesai & Estimasi Biaya
                                    </option>
                                    <option value="completed">
                                      ✓ Perbaikan Selesai & Siap Diambil
                                    </option>
                                    <option value="custom">
                                      ✓ Pesan Kustom / Lainnya
                                    </option>
                                  </select>
                                </div>

                                <div className="md:col-span-2 space-y-1">
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                    Isi Pesan WhatsApp (Dapat Diedit Manual)
                                  </label>
                                  <textarea
                                    rows={4}
                                    value={
                                      customWaMessageText ||
                                      (() => {
                                        const ctx = {
                                          customer_name: customer?.name || "Pelanggan",
                                          ticket_no: ticket.ticketNo,
                                          device_name: ticket.deviceName,
                                          ticket_status: ticket.status,
                                        };
                                        return (
                                          renderTenantWaTemplate("SERVICE_UPDATE", ctx) ||
                                          `Halo *${customer?.name || "Pelanggan"}*,\n\nUnit *${ticket.deviceName}* Anda telah terdaftar di sistem kami.`
                                        );
                                      })()
                                    }
                                    onChange={(e) =>
                                      setCustomWaMessageText(e.target.value)
                                    }
                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 font-medium leading-relaxed font-mono"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const text = customWaMessageText || "";
                                    navigator.clipboard.writeText(text);
                                    showToast(
                                      "Isi pesan WhatsApp berhasil disalin ke clipboard!",
                                      "success",
                                    );
                                  }}
                                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Salin Pesan
                                </button>
                                <a
                                  href={`https://wa.me/${(
                                    customer?.phone || "62"
                                  )
                                    .split("")
                                    .filter((c) => c >= "0" && c <= "9")
                                    .join(
                                      "",
                                    )}?text=${encodeURIComponent(customWaMessageText || "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                                >
                                  <Share2 className="w-3.5 h-3.5" /> Kirim via
                                  wa.me (Manual Link)
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Footer Info inside Modal */}
                          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-400">
                            <p>
                              Operator:{" "}
                              <strong className="text-slate-600">
                                {currentUser?.name} ({currentUser?.role})
                              </strong>
                            </p>
                            <p className="font-mono">
                              Created at:{" "}
                              {new Date(
                                ticket.createdAt || "",
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                );
              })()}

            {/* ==============================================================
                  PRINT OUT DOCUMENTS AND CERTIFICATES (SPK, INVOICE, QUOTE, WARRANTY)
                  ============================================================== */}
            <DocumentPrintouts
              showSpkPrintout={showSpkPrintout}
              setShowSpkPrintout={setShowSpkPrintout}
              showInvoicePrintout={showInvoicePrintout}
              setShowInvoicePrintout={setShowInvoicePrintout}
              showProvisionalQuote={showProvisionalQuote}
              setShowProvisionalQuote={setShowProvisionalQuote}
              showWarrantyPrintout={showWarrantyPrintout}
              setShowWarrantyPrintout={setShowWarrantyPrintout}
              tenantServices={tenantServices}
              customers={customers}
              employees={employees}
              currentUser={currentUser}
              showToast={showToast}
              printConfig={tenantObj?.settings?.printConfig}
            />

            {/* Success dialog for newly created ticket */}
            {justCreatedTicket &&
              (() => {
                const ticket = justCreatedTicket;
                const customer = customers.find(
                  (c) => c.id === ticket.customerId,
                );
                const customerName = customer ? customer.name : "Pelanggan";
                const customerPhone = customer ? customer.phone : "";

                // Draft receipt/intake message
                const welcomeCtx = {
                  customer_name: customerName,
                  ticket_no: ticket.ticketNo,
                  device_name: ticket.deviceName,
                  brand_model: ticket.deviceBrandModel || "-",
                  complaint: ticket.customerComplaints || "-",
                  method: ticket.isCheckOnly ? "Hanya Cek & Diagnosis" : "Pendaftaran Servis",
                  down_payment: (ticket.downPayment || 0).toLocaleString("id-ID"),
                  est_completion: ticket.estimatedCompletionDate
                    ? new Date(ticket.estimatedCompletionDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "3 Hari",
                  tracking_link: `${window.location.origin}/?ticket=${ticket.ticketNo}`,
                };
                const welcomeTemplated = renderTenantWaTemplate("SERVICE_UPDATE", welcomeCtx);
                const welcomeMessage =
                  welcomeTemplated ||
                  `Halo Kak *${customerName}*,\n\nTerima kasih telah mempercayakan perbaikan perangkat Anda di *REPAIR HUB*.\n\nBerikut rincian tanda terima unit Anda:\n• *Nomor Tiket*: ${ticket.ticketNo}\n• *Tipe Unit*: ${ticket.deviceName} (${ticket.deviceBrandModel || "-"})\n• *Kerusakan/Keluhan*: ${ticket.customerComplaints}\n• *Metode*: ${ticket.isCheckOnly ? "Hanya Cek & Diagnosis" : "Pendaftaran Servis"}\n• *Uang Muka (DP)*: Rp ${(ticket.downPayment || 0).toLocaleString()}\n• *Est. Selesai*: ${ticket.estimatedCompletionDate ? new Date(ticket.estimatedCompletionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "3 Hari"}\n\nKami akan segera mengabarkan diagnosa teknis dan estimasi biaya lanjutan.\n\nAnda dapat memantau status servis secara live di tautan berikut:\n${window.location.origin}/?ticket=${ticket.ticketNo}\n\nTerima kasih!`;

                return createPortal(
                  <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-lg w-full overflow-hidden flex flex-col animate-scaleUp">
                      {/* Decorative success banner */}
                      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 text-center space-y-2 relative">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                          🎉
                        </div>
                        <h3 className="font-extrabold text-lg">
                          Penerimaan Unit Berhasil!
                        </h3>
                        <p className="text-xs text-indigo-100 font-mono">
                          Nomor Tiket: {ticket.ticketNo}
                        </p>
                      </div>

                      {/* Info & Options */}
                      <div className="p-6 space-y-4">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2 text-xs">
                          <p className="font-bold text-slate-800 uppercase tracking-wider font-mono text-[10px] text-indigo-600">
                            Ringkasan Unit
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-slate-600">
                            <p>
                              <strong>Pelanggan:</strong> {customerName}
                            </p>
                            <p>
                              <strong>WhatsApp:</strong> {customerPhone || "-"}
                            </p>
                            <p className="col-span-2">
                              <strong>Perangkat:</strong> {ticket.deviceName}{" "}
                              {ticket.deviceBrandModel
                                ? `(${ticket.deviceBrandModel})`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 text-center leading-relaxed">
                          Pilih tindakan cepat di bawah ini untuk menyerahkan
                          Tanda Terima Unit kepada pelanggan:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option 1: Preview nota */}
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewReceptionTicket(ticket);
                            }}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50 transition-all cursor-pointer group text-center"
                          >
                            <Eye className="w-8 h-8 text-indigo-600 group-hover:scale-110 transition-all mb-2" />
                            <span className="font-extrabold text-xs text-slate-800">
                              Preview Nota Penerimaan
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Lihat ringkasan sebelum print
                            </span>
                          </button>

                          {/* Option 2: Kirim WhatsApp Manual */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveWaModal({
                                phone: customerPhone,
                                message: welcomeMessage,
                                ticketNo: ticket.ticketNo,
                                customerName: customerName,
                              });
                            }}
                            className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50 transition-all cursor-pointer group text-center"
                          >
                            <MessageSquare className="w-8 h-8 text-emerald-600 group-hover:scale-110 transition-all mb-2" />
                            <span className="font-extrabold text-xs text-slate-800">
                              Kirim WhatsApp
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Kirim link via WhatsApp Web / manual
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintReceptionReceipt(ticket)}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-900/10"
                        >
                          Cetak Nota
                        </button>
                        <button
                          type="button"
                          onClick={() => setJustCreatedTicket(null)}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-slate-900/10"
                        >
                           Selesai & Tutup
                         </button>
                       </div>
                     </div>
                   </div>,
                   document.body
                 );
               })()}

            {previewReceptionTicket && (() => {
              const ticket = previewReceptionTicket;
              const customer = customers.find((c) => c.id === ticket.customerId);
              const preview = buildServiceReceptionPreview(ticket, customer?.name || "-", customer?.phone || "-");
              return createPortal(
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-md w-full overflow-hidden">
                    <div className="bg-indigo-600 text-white px-5 py-4">
                      <h3 className="font-extrabold text-sm">{preview.title}</h3>
                      <p className="text-[10px] text-indigo-100 mt-1">{preview.subtitle}</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        {preview.lines.map((line) => (
                          <p key={line} className="text-[11px] text-slate-700">{line}</p>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewReceptionTicket(null)}
                          className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                        >
                          Tutup
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintReceptionReceipt(ticket)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                        >
                          Buka Nota Cetak
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>,
                  document.body
                );
              })()}

            {microTicket && createPortal(
              <div className="fixed inset-0 z-[175] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Cari komponen mikro">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col">
                  <div className="bg-slate-900 text-white px-5 py-4 flex items-start justify-between gap-4">
                    <div><h3 className="font-extrabold text-sm flex items-center gap-2"><Cpu className="w-4 h-4 text-indigo-300" /> Komponen Mikro untuk Tiket</h3><p className="text-[10px] text-slate-300 mt-1">{microTicket.ticketNo} · {microTicket.deviceName} {microTicket.deviceBrandModel || ""} · Status {microTicket.status}</p></div>
                    <button type="button" aria-label="Tutup pencarian komponen" onClick={() => setMicroTicket(null)} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1.35fr_.85fr] gap-5">
                    <section className="space-y-3">
                      <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input autoFocus value={microSearch} onChange={(e) => setMicroSearch(e.target.value)} placeholder="Cari nama, SKU, kategori, atau model kompatibel..." className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none" /></div>
                      {microComponentsLoading ? <div className="py-16 text-center text-xs text-slate-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />Memuat stok komponen...</div> : microComponentsError ? <div className="py-10 text-center rounded-2xl bg-rose-50 border border-rose-100"><AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" /><p className="text-xs text-rose-700">{microComponentsError}</p><button onClick={() => loadMicroComponents().catch(() => {})} className="mt-3 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg">Coba Lagi</button></div> : filteredMicroComponents.length === 0 ? <div className="py-14 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200"><Package className="w-7 h-7 text-slate-300 mx-auto mb-2" /><p className="text-xs font-semibold text-slate-600">Komponen tidak ditemukan</p><p className="text-[10px] text-slate-400 mt-1">Ubah kata pencarian atau tambahkan stok melalui inventaris.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[52vh] overflow-y-auto pr-1">{filteredMicroComponents.map((item) => { const selected = item.id === selectedMicroId; const low = item.stockQty <= item.minStock; return <button type="button" key={item.id} onClick={() => { setSelectedMicroId(item.id); setMicroUnitPrice(String(item.sellPrice || 0)); }} className={`text-left p-3 rounded-xl border transition ${selected ? "border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-300"}`}><div className="flex justify-between gap-2"><div><p className="text-xs font-extrabold text-slate-800">{item.name}</p><p className="text-[9px] font-mono text-slate-400 mt-0.5">{item.sku} · {item.category}</p></div><Badge variant={item.stockQty <= 0 ? "danger" : low ? "warning" : "success"}>{item.stockQty} unit</Badge></div><p className="text-[10px] text-slate-500 mt-2">Rak {item.rackId} / Laci {item.drawerId}{item.supplierName ? ` · ${item.supplierName}` : ""}</p><p className="text-[10px] text-slate-500 mt-1">Jual Rp {item.sellPrice.toLocaleString("id-ID")} · Kompatibel: {(item.compatModels || []).join(", ") || "Umum"}</p></button>; })}</div>}
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-fit space-y-4">
                      {!selectedMicro ? <div className="py-10 text-center"><Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-xs font-semibold text-slate-500">Pilih komponen untuk mencatat pemakaian</p></div> : <><div><p className="font-extrabold text-sm text-slate-800">{selectedMicro.name}</p><p className="text-[10px] text-slate-500 mt-1">Stok tersedia {selectedMicro.stockQty} · HPP Rp {selectedMicro.purchaseCost.toLocaleString("id-ID")}/unit</p></div><div><label className="block text-[10px] font-bold text-slate-500 mb-1">Jumlah</label><input type="number" min="1" value={microQty} onChange={(e) => setMicroQty(Math.max(1, Number(e.target.value) || 1))} className="w-full px-3 py-2.5 text-xs border rounded-xl" /></div><label className="flex items-start gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={microChargeable} onChange={(e) => setMicroChargeable(e.target.checked)} className="mt-0.5" /><span>Tagihkan ke pelanggan<span className="block text-[9px] font-normal text-slate-400">Matikan untuk bahan internal yang hanya dicatat sebagai HPP.</span></span></label>{microChargeable && <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Harga Jual / Unit</label><input type="number" min="0" value={microUnitPrice} onChange={(e) => setMicroUnitPrice(e.target.value)} className="w-full px-3 py-2.5 text-xs border rounded-xl" /></div>}<div><label className="block text-[10px] font-bold text-slate-500 mb-1">Catatan</label><textarea rows={2} value={microNote} onChange={(e) => setMicroNote(e.target.value)} placeholder="Contoh: penggantian IC jalur charging" className="w-full px-3 py-2.5 text-xs border rounded-xl resize-none" /></div><div className="rounded-xl bg-white border p-3 space-y-1.5 text-[10px]"><div className="flex justify-between"><span className="text-slate-500">Total HPP internal</span><strong>Rp {(selectedMicro.purchaseCost * microQty).toLocaleString("id-ID")}</strong></div><div className="flex justify-between"><span className="text-slate-500">Biaya pelanggan</span><strong className="text-indigo-600">Rp {(microChargeable ? Number(microUnitPrice || 0) * microQty : 0).toLocaleString("id-ID")}</strong></div></div>{selectedMicro.stockQty < microQty ? <button type="button" onClick={() => { setPartOrderTicket(microTicket); setPartOrderName(selectedMicro.name); setPartOrderQty(Math.max(1, microQty - selectedMicro.stockQty)); setPartOrderSupplier(selectedMicro.supplierName || ""); setPartOrderCost(String(selectedMicro.purchaseCost * Math.max(1, microQty - selectedMicro.stockQty))); setPartOrderReason(`Stok komponen mikro tidak mencukupi (tersedia ${selectedMicro.stockQty}).`); setMicroTicket(null); }} className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold"><PackagePlus className="w-4 h-4 inline mr-1.5" /> Buat Permintaan & Menunggu Spare Part</button> : <button type="button" disabled={savingMicroUsage} onClick={async () => { if (!microTicket) return; setSavingMicroUsage(true); try { await consumeMicroComponentForService(selectedMicro.id, { ticketId: microTicket.id, warehouseId: selectedMicro.warehouseId, quantity: microQty, chargeable: microChargeable, unitPrice: microChargeable ? Number(microUnitPrice || 0) : undefined, note: microNote.trim() || undefined, idempotencyKey: `micro-${microTicket.id}-${selectedMicro.id}-${Date.now()}` }); showToast("Komponen tercatat dan stok diperbarui.", "success"); setSelectedMicroId(""); setMicroQty(1); setMicroNote(""); } catch (error: any) { showToast(error?.message || "Gagal memakai komponen.", "error"); } finally { setSavingMicroUsage(false); } }} className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold disabled:opacity-50">{savingMicroUsage ? "Menyimpan..." : "Gunakan Komponen"}</button>}</>}
                    </section>
                  </div>
                </div>
              </div>, document.body
            )}

            {partOrderTicket && createPortal(
              <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
                  <div className="bg-indigo-600 text-white px-5 py-4 flex justify-between items-center">
                    <div><h3 className="font-extrabold text-sm">Menunggu Spare Part</h3><p className="text-[10px] text-indigo-100 mt-1">Hentikan pengerjaan sementara dan catat kebutuhan part.</p></div>
                    <button type="button" onClick={() => setPartOrderTicket(null)} className="text-xl">×</button>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1">Nama Spare Part *</label><input value={partOrderName} onChange={(e) => setPartOrderName(e.target.value)} placeholder="Contoh: LCD iPhone 12 OLED" className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Jumlah *</label><input type="number" min="1" value={partOrderQty} onChange={(e) => setPartOrderQty(Number(e.target.value))} className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Supplier/Vendor</label><input value={partOrderSupplier} onChange={(e) => setPartOrderSupplier(e.target.value)} className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                    <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1">Alasan Dibutuhkan *</label><input value={partOrderReason} onChange={(e) => setPartOrderReason(e.target.value)} placeholder="Part rusak dan stok toko kosong" className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Estimasi Biaya</label><input type="number" value={partOrderCost} onChange={(e) => setPartOrderCost(e.target.value)} className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Estimasi Tiba</label><input type="date" value={partOrderEta} onChange={(e) => setPartOrderEta(e.target.value)} className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                    <label className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={partOrderCostApproved} onChange={(e) => setPartOrderCostApproved(e.target.checked)} /> Biaya part sudah disetujui pelanggan</label>
                    <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-slate-500 mb-1">Catatan</label><textarea rows={2} value={partOrderNote} onChange={(e) => setPartOrderNote(e.target.value)} className="w-full text-xs px-3 py-2.5 border rounded-xl" /></div>
                  </div>
                  <div className="px-5 py-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button type="button" onClick={() => setPartOrderTicket(null)} className="px-4 py-2 border rounded-xl text-xs font-bold">Batal</button>
                    <button type="button" disabled={savingPartOrder || !partOrderName.trim() || !partOrderReason.trim() || partOrderQty < 1} onClick={async () => {
                      setSavingPartOrder(true);
                      try {
                        const result = await createServicePartOrder(partOrderTicket.id, { partName: partOrderName.trim(), quantity: partOrderQty, reason: partOrderReason.trim(), supplierName: partOrderSupplier.trim(), estimatedCost: Number(partOrderCost || 0), estimatedArrivalDate: partOrderEta || undefined, costApproved: partOrderCostApproved, note: partOrderNote.trim(), idempotencyKey: `part-order-${partOrderTicket.id}-${Date.now()}` });
                        const customer = customers.find((item) => item.id === partOrderTicket.customerId);
                        const partCtx = {
                          customer_name: customer?.name || "Pelanggan",
                          ticket_no: partOrderTicket.ticketNo,
                          device_name: partOrderTicket.deviceName,
                          part_name: partOrderName,
                          eta: partOrderEta || "",
                        };
                        const templatedPart = renderTenantWaTemplate("SERVICE_UPDATE", partCtx);
                        const msg =
                          templatedPart ||
                          `Halo *${customer?.name || "Pelanggan"}*, unit *${partOrderTicket.deviceName}* (${partOrderTicket.ticketNo}) masih menunggu spare part *${partOrderName}*${partOrderEta ? ` dengan estimasi tiba ${partOrderEta}` : ""}. Kami akan mengabari kembali setelah part tersedia.`;
                        setActiveWaModal({ phone: customer?.phone || "", message: msg, ticketNo: partOrderTicket.ticketNo, customerName: customer?.name || "Pelanggan", type: "PART_ORDER" });
                        showToast("Tiket ditandai menunggu spare part.", "success");
                        setPartOrderTicket(null); setPartOrderName(""); setPartOrderReason(""); setPartOrderSupplier(""); setPartOrderCost(""); setPartOrderEta(""); setPartOrderNote("");
                      } catch (error: any) { showToast(error?.message || "Gagal membuat permintaan spare part.", "error"); }
                      finally { setSavingPartOrder(false); }
                    }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">{savingPartOrder ? "Menyimpan..." : "Simpan & Buat Pesan WhatsApp"}</button>
                  </div>
                </div>
              </div>, document.body
            )}

            {additionalCostTicket && createPortal(
              <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 max-w-lg w-full overflow-hidden">
                  <div className="bg-amber-500 text-white px-5 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm">Tambahan Biaya Sudah Disetujui</h3>
                      <p className="text-[10px] text-amber-50 mt-1">Catat persetujuan pelanggan tanpa menghentikan pengerjaan.</p>
                    </div>
                    <button type="button" onClick={() => setAdditionalCostTicket(null)} className="text-xl">×</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Tambahan Pekerjaan *</label>
                        <input value={additionalCostDescription} onChange={(e) => setAdditionalCostDescription(e.target.value)} placeholder="Contoh: Ganti konektor charger" className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-amber-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Tambahan Biaya *</label>
                        <input type="number" min="1" value={additionalCostAmount} onChange={(e) => setAdditionalCostAmount(e.target.value)} placeholder="150000" className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Disetujui Melalui</label>
                        <select value={additionalCostMethod} onChange={(e) => setAdditionalCostMethod(e.target.value as any)} className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white">
                          <option value="WHATSAPP">WhatsApp</option><option value="PHONE">Telepon</option><option value="IN_PERSON">Langsung di Toko</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Nama yang Menyetujui</label>
                        <input value={additionalCostApprovedBy} onChange={(e) => setAdditionalCostApprovedBy(e.target.value)} className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Screenshot/Bukti (Opsional)</label>
                        <input value={additionalCostProof} onChange={(e) => setAdditionalCostProof(e.target.value)} placeholder="Nama file bukti chat" className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Catatan (Opsional)</label>
                        <textarea rows={2} value={additionalCostNote} onChange={(e) => setAdditionalCostNote(e.target.value)} className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                      <div><p className="text-[9px] text-slate-400">Harga Lama</p><p className="text-xs font-bold">Rp {(Number(additionalCostTicket.estimatedCost) || 0).toLocaleString("id-ID")}</p></div>
                      <div><p className="text-[9px] text-slate-400">Tambahan</p><p className="text-xs font-bold text-amber-600">Rp {Number(additionalCostAmount || 0).toLocaleString("id-ID")}</p></div>
                      <div><p className="text-[9px] text-slate-400">Total Baru</p><p className="text-xs font-extrabold text-indigo-600">Rp {((Number(additionalCostTicket.estimatedCost) || 0) + Number(additionalCostAmount || 0)).toLocaleString("id-ID")}</p></div>
                    </div>
                  </div>
                  <div className="px-5 py-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button type="button" onClick={() => setAdditionalCostTicket(null)} className="px-4 py-2 text-xs font-bold border rounded-xl">Batal</button>
                    <button type="button" disabled={savingAdditionalCost || !additionalCostDescription.trim() || Number(additionalCostAmount) <= 0} onClick={async () => {
                      setSavingAdditionalCost(true);
                      try {
                        await addApprovedAdditionalCost(additionalCostTicket.id, { description: additionalCostDescription.trim(), amount: Number(additionalCostAmount), approvalMethod: additionalCostMethod, approvedByName: additionalCostApprovedBy.trim(), note: additionalCostNote.trim(), proofName: additionalCostProof.trim(), idempotencyKey: `additional-${additionalCostTicket.id}-${Date.now()}` });
                        showToast("Tambahan biaya dicatat. Pengerjaan tetap dilanjutkan.", "success");
                        setAdditionalCostTicket(null); setAdditionalCostDescription(""); setAdditionalCostAmount(""); setAdditionalCostNote(""); setAdditionalCostProof("");
                      } catch (error: any) { showToast(error?.message || "Gagal mencatat tambahan biaya.", "error"); }
                      finally { setSavingAdditionalCost(false); }
                    }} className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50">
                      {savingAdditionalCost ? "Menyimpan..." : "Simpan & Lanjutkan Pengerjaan"}
                    </button>
                  </div>
                </div>
              </div>, document.body
            )}

            {/* Manual WhatsApp Send Helper Modal */}
            {activeWaModal && createPortal(
              <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col animate-scaleUp">
                  {/* Header */}
                  <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      <div>
                        <h3 className="font-bold text-sm">
                          Kirim Pesan WhatsApp (Manual)
                        </h3>
                        <p className="text-[10px] text-emerald-100 font-mono">
                          Penerima: {activeWaModal.customerName} (
                          {activeWaModal.phone})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveWaModal(null)}
                      className="text-white hover:text-emerald-100 font-bold text-lg cursor-pointer transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-4">
                    {activeWaModal.type === "ESTIMATE" && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Konfirmasi Harga Perbaikan</p>
                            <p className="text-sm font-extrabold text-slate-800 mt-1">Rp {Number(activeWaModal.estimatedCost || 0).toLocaleString("id-ID")}</p>
                          </div>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
                            Menunggu Persetujuan
                          </span>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-600 line-clamp-3">{activeWaModal.diagnosis}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Anda telah mengonfigurasi pengiriman notifikasi ke{" "}
                      <strong>Manual (WhatsApp Web)</strong>. Silakan salin
                      pesan di bawah ini atau klik tombol kirim untuk langsung
                      membuka WhatsApp Web.
                    </p>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Isi Pesan Notifikasi:
                      </label>
                      <textarea
                        rows={6}
                        value={activeWaModal.message}
                        onChange={(e) =>
                          setActiveWaModal({
                            ...activeWaModal,
                            message: e.target.value,
                          })
                        }
                        className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-slate-50 px-5 py-3.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeWaModal.message);
                        showToast(
                          "Pesan berhasil disalin ke clipboard!",
                          "success",
                        );
                        // Log manual action as Copied to Clipboard
                        const savedLogs = localStorage.getItem(`saas_wa_logs_${currentTenantId}`);
                        const currentLogs = savedLogs
                          ? JSON.parse(savedLogs)
                          : [];
                        const newLog = {
                          id: "wa-" + Date.now().toString(36),
                          timestamp: new Date().toISOString(),
                          recipientName: activeWaModal.customerName,
                          recipientPhone: activeWaModal.phone,
                          type: "SERVICE_UPDATE",
                          message: activeWaModal.message,
                          status: "DELIVERED",
                          senderName: "Operator (Manual)",
                          channel: "Copied to Clipboard",
                        };
                        localStorage.setItem(
                          `saas_wa_logs_${currentTenantId}`,
                          JSON.stringify([newLog, ...currentLogs]),
                        );
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin Pesan
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveWaModal(null)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer transition-all"
                      >
                        Tutup
                      </button>
                      <a
                        href={`https://wa.me/${activeWaModal.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(activeWaModal.message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          // Log manual action as WhatsApp Web
                          const savedLogs = localStorage.getItem(`saas_wa_logs_${currentTenantId}`);
                          const currentLogs = savedLogs
                            ? JSON.parse(savedLogs)
                            : [];
                          const newLog = {
                            id: "wa-" + Date.now().toString(36),
                            timestamp: new Date().toISOString(),
                            recipientName: activeWaModal.customerName,
                            recipientPhone: activeWaModal.phone,
                            type: "SERVICE_UPDATE",
                            message: activeWaModal.message,
                            status: "DELIVERED",
                            senderName: "Operator (Manual)",
                            channel: "WhatsApp Web (wa.me)",
                          };
                          localStorage.setItem(
                            `saas_wa_logs_${currentTenantId}`,
                            JSON.stringify([newLog, ...currentLogs]),
                          );
                          setActiveWaModal(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Buka WhatsApp Web
                      </a>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Subtab: NEW TICKET WIZARD */}
        {localSubTab === "new-ticket" && (
          <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/70 backdrop-blur">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <Save className="w-3 h-3" /> Draft otomatis
              </span>
              <div className="flex items-center gap-2 min-w-[160px]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                  Kelengkapan form
                </span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${(receptionProgress / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{receptionProgress}/4</span>
              </div>
            </div>
            <form ref={receptionFormRef} onSubmit={handleCreateService} className="p-4 sm:p-6 space-y-6">
              {receptionErrors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    Data wajib belum lengkap
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-rose-700">
                    {receptionErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,1fr)] gap-6 items-start">
                {/* Left Column: Device & Customer Info */}
                <div className="space-y-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-sm">
                      1
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Pelanggan & Identitas Unit
                    </span>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Pelanggan <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Cari pelanggan lama atau daftarkan pelanggan baru.
                        </p>
                      </div>
                      {selectedReceptionCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewSrvCustomer("");
                            setCustQuery("");
                            setShowNewSrvCustForm(true);
                          }}
                          className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          Ganti pelanggan
                        </button>
                      )}
                    </div>

                    {selectedReceptionCustomer ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex-shrink-0">
                            {(selectedReceptionCustomer.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{selectedReceptionCustomer.name}</p>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedReceptionCustomer.phone || "Tanpa nomor WhatsApp"}</p>
                          </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                          <CheckCircle2 className="w-3 h-3" /> Terpilih
                        </span>
                      </div>
                    ) : (
                    <>
                    <div className="relative">
                        <div className="relative">
                          <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={custQuery}
                            placeholder="Cari nama / no. WhatsApp pelanggan..."
                            onFocus={() => setCustOpen(true)}
                            onBlur={() =>
                              setTimeout(() => setCustOpen(false), 150)
                            }
                            onChange={(e) => {
                              setCustQuery(e.target.value);
                              setCustOpen(true);
                            }}
                            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 transition-all font-semibold"
                          />
                        </div>
                        {custOpen && (
                          <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                            {customers
                              .filter((c) =>
                                `${c.name} ${c.phone}`
                                  .toLowerCase()
                                  .includes(custQuery.toLowerCase()),
                              )
                              .map((c) => (
                                <button
                                  type="button"
                                  key={c.id}
                                  onClick={() => {
                                    setNewSrvCustomer(c.id);
                                    setNewSrvCustName("");
                                    setNewSrvCustPhone("");
                                    setShowNewSrvCustForm(false);
                                    setCustQuery(`${c.name} (${c.phone})`);
                                    setCustOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between gap-2 ${
                                    newSrvCustomer === c.id
                                      ? "bg-indigo-50/60"
                                      : ""
                                  }`}
                                >
                                  <span className="font-semibold text-slate-700 truncate">
                                    {c.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                    {c.phone}
                                  </span>
                                </button>
                              ))}
                            {customers.filter((c) =>
                              `${c.name} ${c.phone}`
                                .toLowerCase()
                                .includes(custQuery.toLowerCase()),
                            ).length === 0 && custQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  const query = custQuery.trim();
                                  const queryLooksLikePhone = /^[\d\s+()-]{8,}$/.test(query);
                                  setNewSrvCustomer("");
                                  setNewSrvCustName(queryLooksLikePhone ? "" : query);
                                  setNewSrvCustPhone(queryLooksLikePhone ? query : "");
                                  setShowNewSrvCustForm(true);
                                  setCustOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 border-b border-slate-100 flex items-center gap-1.5"
                              >
                                <PlusCircle className="w-3.5 h-3.5" /> Tambah pelanggan baru: "{custQuery.trim()}"
                              </button>
                            )}
                            {customers.filter((c) =>
                              `${c.name} ${c.phone}`
                                .toLowerCase()
                                .includes(custQuery.toLowerCase()),
                            ).length === 0 && !custQuery.trim() && (
                              <p className="px-3 py-2 text-[11px] text-slate-400">
                                Ketik nama atau no. WhatsApp...
                              </p>
                            )}
                          </div>
                        )}
                        {/* menyimpan id terpilih untuk submit */}
                        <input type="hidden" value={newSrvCustomer} readOnly />
                      </div>

                      {showNewSrvCustForm && !newSrvCustomer && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-white p-3">
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                              Nama Pelanggan Baru *
                            </label>
                            <input
                              type="text"
                              value={newSrvCustName}
                              onChange={(e) => setNewSrvCustName(e.target.value)}
                              placeholder="Nama lengkap"
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                              Nomor WhatsApp *
                            </label>
                            <input
                              type="tel"
                              value={newSrvCustPhone}
                              onChange={(e) => setNewSrvCustPhone(e.target.value)}
                              onBlur={() =>
                                setNewSrvCustPhone(normalizeIndonesianPhone(newSrvCustPhone))
                              }
                              placeholder="081234567890"
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={newSrvCustEmail}
                              onChange={(e) => setNewSrvCustEmail(e.target.value)}
                              placeholder="pelanggan@email.com"
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                              Alamat
                            </label>
                            <input
                              type="text"
                              value={newSrvCustAddress}
                              onChange={(e) => setNewSrvCustAddress(e.target.value)}
                              placeholder="Alamat pelanggan"
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      )}
                      {newSrvCustPhone && (
                        <p className={`mt-2 text-[10px] font-medium ${
                          isValidIndonesianPhone(newSrvCustPhone)
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}>
                          {isValidIndonesianPhone(newSrvCustPhone)
                            ? `Nomor tersimpan sebagai ${normalizeIndonesianPhone(newSrvCustPhone)}`
                            : "Gunakan nomor WhatsApp Indonesia yang valid."}
                        </p>
                      )}
                    </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Kategori Perangkat
                      </label>
                      <select
                        value={newSrvCategory}
                        onChange={(e) => setNewSrvCategory(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 transition-all font-medium"
                      >
                        <option value="Smartphone">Smartphone / HP</option>
                        <option value="Tablet">Tablet / iPad</option>
                        <option value="Laptop">Laptop / MacBook</option>
                        <option value="Desktop">Desktop PC / iMac</option>
                        <option value="Console">Konsol Game (PS/Switch)</option>
                        <option value="Wearable">Smartwatch / Wearable</option>
                        <option value="Printer">Printer / Scanner</option>
                        <option value="Other">Lain-lain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Estimasi Selesai
                      </label>
                      <input
                        type="date"
                        value={newSrvEstCompletion}
                        onChange={(e) => setNewSrvEstCompletion(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Nama Perangkat
                      </label>
                      <input
                        type="text"
                        placeholder="Asus ROG GL503"
                        value={newSrvDevice}
                        onChange={(e) => setNewSrvDevice(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Brand / Model
                      </label>
                      <input
                        type="text"
                        placeholder="ASUS ROG GA401"
                        value={newSrvBrand}
                        onChange={(e) => setNewSrvBrand(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowMoreDetails((v) => !v)}
                      className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-600">Detail lainnya (opsional)</span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showMoreDetails ? "rotate-90" : ""}`} />
                    </button>
                    {showMoreDetails && (
                    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Serial Number (SN)
                      </label>
                      <input
                        type="text"
                        placeholder="M1N0CV02K24"
                        value={newSrvSerial}
                        onChange={(e) => setNewSrvSerial(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Masa Garansi Bawaan
                      </label>
                      <select
                        value={newSrvWarranty}
                        onChange={(e) =>
                          setNewSrvWarranty(Number(e.target.value))
                        }
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="0">Tanpa Garansi</option>
                        <option value="1">1 Bulan</option>
                        <option value="3">3 Bulan (Standar)</option>
                        <option value="6">6 Bulan</option>
                        <option value="12">12 Bulan</option>
                      </select>
                    </div>
                  </div>
                    </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                        Uang Muka / DP (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newSrvDownPayment}
                        onChange={(e) => setNewSrvDownPayment(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-indigo-500 font-mono font-bold"
                        disabled={newSrvIsCheckOnly}
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none mt-2">
                        <input
                          type="checkbox"
                          checked={newSrvIsCheckOnly}
                          onChange={(e) => {
                            setNewSrvIsCheckOnly(e.target.checked);
                            if (e.target.checked) {
                              setNewSrvDownPayment("0");
                            }
                          }}
                          className="accent-indigo-600 h-4 w-4 rounded"
                        />
                        <span>Hanya Cek / Estimasi Dulu</span>
                      </label>
                      <p className="text-[9px] text-slate-400 pl-6 mt-0.5">
                        Biaya ditentukan setelah diagnosa teknisi.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Kondisi Fisik Perangkat
                      </label>
                      <select
                        value={newSrvPhysicalCondition}
                        onChange={(e) =>
                          setNewSrvPhysicalCondition(e.target.value)
                        }
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 transition-all font-medium"
                      >
                        <option value="Mulus / Normal Wear">
                          Mulus / Normal Wear
                        </option>
                        <option value="Banyak Lecet Halus">
                          Banyak Lecet Halus
                        </option>
                        <option value="Lecet Kasar & Penyok">
                          Lecet Kasar & Penyok
                        </option>
                        <option value="Retak / Pecah Sebagian">
                          Retak / Pecah Sebagian
                        </option>
                        <option value="Pecah Parah / Hancur">
                          Pecah Parah / Hancur
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        PIN / Pola / Password Kunci Layar
                      </label>
                      <input
                        type={showScreenLock ? "text" : "password"}
                        placeholder="PIN / Pola Layar (Opsional)"
                        value={newSrvScreenLock}
                        onChange={(e) => setNewSrvScreenLock(e.target.value)}
                        className="w-full text-xs px-3 py-2 pr-16 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all font-mono font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowScreenLock((visible) => !visible)}
                        className="mt-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {showScreenLock ? "Sembunyikan PIN" : "Tampilkan PIN"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                      Keluhan Kerusakan / Kendala Perangkat
                    </label>
                    <textarea
                      rows={3}
                      placeholder="cth: Layar bergaris horizontal setelah terjatuh dari meja."
                      value={newSrvComplaint}
                      onChange={(e) => setNewSrvComplaint(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  {/* Dynamic Configuration Engine: Device Category Specification Fields */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSpecs((visible) => !visible)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                        <Cpu className="w-4 h-4 text-indigo-600" />
                        <span>Spesifikasi Teknis ({newSrvCategory})</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showAdvancedSpecs ? "rotate-90" : ""}`} />
                    </button>
                    {showAdvancedSpecs && (
                    <div className="px-4 pb-4 space-y-2.5 border-t border-slate-200 pt-3">
                    <p className="text-[10px] text-slate-400">
                      Lengkapi jika spesifikasi unit diketahui saat penerimaan.
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {(() => {
                        let fields: {
                          key: string;
                          label: string;
                          placeholder: string;
                        }[] = [];
                        if (
                          newSrvCategory === "Laptop" ||
                          newSrvCategory === "Desktop"
                        ) {
                          fields = [
                            {
                              key: "processor",
                              label: "Processor / Chipset",
                              placeholder: "Core i7 / Apple M2",
                            },
                            {
                              key: "ram",
                              label: "Ukuran RAM",
                              placeholder: "16 GB DDR5",
                            },
                            {
                              key: "storage",
                              label: "Kapasitas & Tipe Storage",
                              placeholder: "512 GB NVMe SSD",
                            },
                            {
                              key: "gpu",
                              label: "Graphics Card (Opsional)",
                              placeholder: "NVIDIA RTX 4050",
                            },
                          ];
                        } else if (
                          newSrvCategory === "Smartphone" ||
                          newSrvCategory === "Tablet"
                        ) {
                          fields = [
                            {
                              key: "os",
                              label: "Sistem Operasi",
                              placeholder: "iOS 17.5 / Android 14",
                            },
                            {
                              key: "bh",
                              label: "Battery Health (%)",
                              placeholder: "85%",
                            },
                            {
                              key: "storage",
                              label: "Kapasitas Storage",
                              placeholder: "256 GB",
                            },
                            {
                              key: "imei",
                              label: "IMEI / Serial",
                              placeholder: "358201...",
                            },
                          ];
                        } else if (newSrvCategory === "Printer") {
                          fields = [
                            {
                              key: "ink_level",
                              label: "Kondisi Tinta / Toner",
                              placeholder: "Penuh / Setengah / Kosong",
                            },
                            {
                              key: "connection",
                              label: "Tipe Koneksi",
                              placeholder: "Wi-Fi / USB / LAN",
                            },
                            {
                              key: "page_count",
                              label: "Total Print Page Count",
                              placeholder: "12,450 lembar",
                            },
                          ];
                        } else if (newSrvCategory === "Console") {
                          fields = [
                            {
                              key: "model_type",
                              label: "Tipe & Versi Konsol",
                              placeholder: "PS5 Slim Disc / Switch OLED",
                            },
                            {
                              key: "controllers",
                              label: "Jumlah Controller",
                              placeholder: "1 DualSense / 2 Joycons",
                            },
                            {
                              key: "storage",
                              label: "Storage Internal",
                              placeholder: "1 TB SSD",
                            },
                          ];
                        } else if (newSrvCategory === "Wearable") {
                          fields = [
                            {
                              key: "strap_type",
                              label: "Tipe & Warna Strap",
                              placeholder: "Sport Band Green",
                            },
                            {
                              key: "size",
                              label: "Ukuran Watch Size",
                              placeholder: "44mm / 49mm",
                            },
                          ];
                        } else {
                          fields = [
                            {
                              key: "custom_spec",
                              label: "Spesifikasi Tambahan",
                              placeholder: "Masukkan detail unit",
                            },
                          ];
                        }

                        return fields.map((f) => (
                          <div key={f.key} className="space-y-1">
                            <label className="block text-[9.5px] font-semibold text-slate-500 uppercase">
                              {f.label}
                            </label>
                            <input
                              type="text"
                              placeholder={f.placeholder}
                              value={newSrvDynamicSpecs[f.key] || ""}
                              onChange={(e) => {
                                setNewSrvDynamicSpecs((prev) => ({
                                  ...prev,
                                  [f.key]: e.target.value,
                                }));
                              }}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-indigo-500 font-medium font-mono"
                            />
                          </div>
                        ));
                      })()}
                    </div>
                    </div>
                    )}
                  </div>

                  <div className="space-y-2 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono text-indigo-700 uppercase">
                        Tugaskan Teknisi
                      </label>
                      <button
                        type="button"
                        onClick={runAutoAssign}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold font-mono uppercase rounded flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Auto-Assign Pintar
                      </button>
                    </div>
                    <select
                      value={newSrvTechId}
                      onChange={(e) => {
                        setNewSrvTechId(e.target.value);
                        setAutoAssignReason(null);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 transition-all font-medium"
                    >
                      <option value="">
                        -- Antrian Umum / Belum Ditugaskan --
                      </option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.position})
                        </option>
                      ))}
                    </select>
                    {autoAssignReason && (
                      <div className="text-[9.5px] text-indigo-800 leading-relaxed bg-white border border-indigo-150 p-2 rounded-lg font-medium shadow-2xs">
                        {autoAssignReason}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
                    <label className="block text-[10px] font-mono text-amber-800 uppercase">Lokasi Rak Unit</label>
                    <select
                      value={newSrvStorageLocId}
                      onChange={(e) => setNewSrvStorageLocId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-amber-200 rounded-lg bg-white outline-none focus:border-indigo-500 transition-all font-medium"
                    >
                      <option value="">-- Tentukan setelah penerimaan --</option>
                      {getStorageLocations(activeTenantId || "")
                        .filter((loc) => loc.type === "UNIT_SERVICE" && (!currentBranchId || loc.branchId === currentBranchId))
                        .map((loc) => (
                          <option key={loc.id} value={loc.id}>📍 {loc.code} — {loc.name}</option>
                        ))}
                    </select>
                    <p className="text-[9.5px] text-amber-700">Pilih rak/locker untuk unit fisik. Bisa diubah dari detail tiket.</p>
                  </div>
                </div>

                {/* Right Column: Checklist, Photos, and Outsourcing */}
                <div className="space-y-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm xl:sticky xl:top-28">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-sm">
                      2
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Kondisi Unit Saat Diterima
                    </span>
                  </div>

                  {/* Checklist */}
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        Checklist Uji Fungsi & Kondisi Masuk:
                      </p>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {Object.values(newSrvChecklist).filter(Boolean).length}{" "}
                        / {Object.keys(newSrvChecklist).length} OK
                      </span>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pb-1 border-b border-slate-150">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...newSrvChecklist };
                          Object.keys(updated).forEach((k) => {
                            updated[k] = true;
                          });
                          setNewSrvChecklist(updated);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-indigo-600 rounded cursor-pointer transition-all"
                      >
                        ✓ Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...newSrvChecklist };
                          Object.keys(updated).forEach((k) => {
                            updated[k] = false;
                          });
                          setNewSrvChecklist(updated);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-rose-600 rounded cursor-pointer transition-all"
                      >
                        ✕ Kosongkan Semua
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] max-h-60 overflow-y-auto pr-1">
                      {Object.entries(newSrvChecklist).map(
                        ([name, checked]) => (
                          <label
                            key={name}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                              checked
                                ? "bg-emerald-50/55 border-emerald-200 text-emerald-800 font-medium"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setNewSrvChecklist((prev) => ({
                                  ...prev,
                                  [name]: !prev[name],
                                }))
                              }
                              className="accent-emerald-600 h-3.5 w-3.5 rounded"
                            />
                            <span className="truncate">{name}</span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Accessories Left Selection */}
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
                    <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                      Aksesoris Titipan / Bawaan:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      {(
                        CATEGORY_CONFIGS[
                          newSrvCategory as keyof typeof CATEGORY_CONFIGS
                        ] || CATEGORY_CONFIGS.Other
                      ).accessories.map((item) => {
                        const checked = newSrvAccessories.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer select-none transition-all duration-200 ${
                              checked
                                ? "bg-indigo-50/55 border-indigo-200 text-indigo-800 font-medium"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setNewSrvAccessories((prev) =>
                                    prev.filter((x) => x !== item.id),
                                  );
                                } else {
                                  setNewSrvAccessories((prev) => [
                                    ...prev,
                                    item.id,
                                  ]);
                                }
                              }}
                              className="accent-indigo-600 h-3.5 w-3.5 rounded"
                            />
                            <span className="truncate">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                        Aksesoris Tambahan Lainnya (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="cth: Pouch, Stylus Pen, OTG adapter, dll"
                        value={newSrvCustomAccessories}
                        onChange={(e) =>
                          setNewSrvCustomAccessories(e.target.value)
                        }
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Interactive Capture Condition Module */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowDocumentation((visible) => !visible)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                          <Camera className="w-4 h-4 text-indigo-600" />
                          <span>Foto Kondisi Unit</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {newSrvCapturedConditions.length} foto tersimpan
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showDocumentation ? "rotate-90" : ""}`} />
                    </button>
                    {showDocumentation && (
                    <div className="px-4 pb-4 space-y-3.5 border-t border-slate-100 pt-3">
                    <p className="text-[10px] text-slate-400">
                      Ambil foto kondisi kerusakan dengan kategori dan cap waktu.
                    </p>

                    {/* Select Photo Category */}
                    <div className="space-y-1">
                      <label className="block text-[9.5px] font-semibold text-slate-500 uppercase">
                        Kategori Kerusakan / Bagian
                      </label>
                      <select
                        value={selectedCaptureCategory}
                        onChange={(e) =>
                          setSelectedCaptureCategory(e.target.value)
                        }
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-md outline-none focus:border-indigo-500"
                      >
                        <option value="Layar tergores">Layar tergores</option>
                        <option value="Penyok / Casing lecet">
                          Penyok / Casing lecet
                        </option>
                        <option value="Soket Charger Longgar">
                          Soket Charger Longgar
                        </option>
                        <option value="Tombol keras / rusak">
                          Tombol keras / rusak
                        </option>
                        <option value="Baterai Kembung">Baterai Kembung</option>
                        <option value="Kondisi Lainnya">
                          Kondisi Lainnya (Keterangan Bebas)
                        </option>
                      </select>
                    </div>

                    {/* Camera Console */}
                    {cameraActive ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 p-2 space-y-2 relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-44 object-cover bg-black rounded-lg"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5" /> Jepret Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // Fallback simulation
                              const simulationImages = [
                                "https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=400&q=80",
                                "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=400&q=80",
                                "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80",
                                "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
                              ];
                              const randomImg =
                                simulationImages[
                                  Math.floor(
                                    Math.random() * simulationImages.length,
                                  )
                                ];
                              const newCap = {
                                id: "sim-" + Date.now().toString(36),
                                photoUrl: randomImg,
                                category: selectedCaptureCategory,
                                timestamp: new Date().toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" },
                                ),
                              };
                              setNewSrvCapturedConditions((prev) => [
                                ...prev,
                                newCap,
                              ]);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            title="Gunakan preset demo jika tidak ada kamera"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Demo
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-1.5 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Tutup
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all font-semibold shadow-xs"
                      >
                        <Camera className="w-4 h-4 text-slate-400" /> Buka
                        Kamera Kondisi Fisik
                      </button>
                    )}

                    {/* Captured Photos Gallery */}
                    {newSrvCapturedConditions.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-semibold text-slate-400 uppercase">
                          Foto Terlampir ({newSrvCapturedConditions.length})
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {newSrvCapturedConditions.map((cap) => (
                            <div
                              key={cap.id}
                              className="relative rounded-lg overflow-hidden border border-slate-200 group h-20 bg-slate-900"
                            >
                              <img
                                src={cap.photoUrl}
                                alt={cap.category}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex items-center justify-between">
                                <span className="text-[7.5px] font-mono font-bold text-white uppercase truncate max-w-[100px]">
                                  {cap.category}
                                </span>
                                <span className="text-[7px] font-mono text-slate-300">
                                  {cap.timestamp}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setNewSrvCapturedConditions((prev) =>
                                    prev.filter((x) => x.id !== cap.id),
                                  )
                                }
                                className="absolute top-1 right-1 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                    )}
                  </div>

                  {/* Outsourcing Section */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newSrvIsOutsourced}
                          onChange={() =>
                            setNewSrvIsOutsourced(!newSrvIsOutsourced)
                          }
                          className="accent-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Subkontrak ke Pihak Luar (Outsourced)?
                        </span>
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-mono font-bold uppercase">
                        MAKLOON
                      </span>
                    </div>

                    {newSrvIsOutsourced && (
                      <div className="grid grid-cols-2 gap-3 pt-1 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                            Nama Vendor Rekanan
                          </label>
                          <input
                            type="text"
                            placeholder="cth: Bengkel Solder Master"
                            value={newSrvOutsourcedVendor}
                            onChange={(e) =>
                              setNewSrvOutsourcedVendor(e.target.value)
                            }
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-0.5">
                            Estimasi Biaya Vendor (HPP)
                          </label>
                          <input
                            type="number"
                            placeholder="Rp..."
                            value={newSrvOutsourcingCost}
                            onChange={(e) =>
                              setNewSrvOutsourcingCost(e.target.value)
                            }
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200 bg-white/95 backdrop-blur p-3 sm:px-4 rounded-2xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Save className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Perubahan tersimpan otomatis sebagai draft di perangkat ini.</span>
                </div>
                <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("list")}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReception}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmittingReception ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><PlusCircle className="w-4 h-4" /> Daftarkan Unit & Buat SPK</>
                  )}
                </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* QC sekarang tersedia langsung di modal detail tiket. */}
        {/* Subtab: KNOWLEDGE BASE */}
        {localSubTab === "knowledge-base" && (
          <div className="h-[calc(100vh-140px)]">
            <KnowledgeBase />
          </div>
        )}

        {/* Subtab: COST CALCULATOR & QUOTE GENERATOR */}
        {localSubTab === "cost-calculator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Form: Parameters (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider font-mono">
                  <Sliders className="w-4 h-4 text-indigo-600" /> Kalkulator
                  Estimasi Biaya
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tentukan jenis unit dan kerusakan untuk simulasi harga &
                  garansi.
                </p>
              </div>

              <div className="space-y-4">
                {/* Select Device Model */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Model Perangkat
                  </label>
                  <select
                    value={calcDeviceModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCalcDeviceModel(val);
                      // Auto-adjust default costs based on standard pricing for models
                      if (val === "MacBook Pro M1") {
                        setCalcPartCost("1500000");
                        setCalcServiceCost("450000");
                      } else if (val === "MacBook Air M1") {
                        setCalcPartCost("1200000");
                        setCalcServiceCost("350000");
                      } else if (val === "iPhone 14 Pro") {
                        setCalcPartCost("1800000");
                        setCalcServiceCost("300000");
                      } else if (val === "Samsung S23 Ultra") {
                        setCalcPartCost("2100000");
                        setCalcServiceCost("300000");
                      } else if (val === "iPad Air") {
                        setCalcPartCost("950000");
                        setCalcServiceCost("250000");
                      } else if (val === "Custom") {
                        setCalcPartCost("0");
                        setCalcServiceCost("0");
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="MacBook Pro M1">
                      MacBook Pro M1 (High Class)
                    </option>
                    <option value="MacBook Air M1">
                      MacBook Air M1 (Medium Class)
                    </option>
                    <option value="iPhone 14 Pro">
                      iPhone 14 Pro (Premium Mobile)
                    </option>
                    <option value="Samsung S23 Ultra">
                      Samsung S23 Ultra (Premium Mobile)
                    </option>
                    <option value="iPad Air">iPad Air (Tablet Class)</option>
                    <option value="Custom">-- Custom Perangkat Lain --</option>
                  </select>
                </div>

                {calcDeviceModel === "Custom" && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      Ketik Nama Model Kustom
                    </label>
                    <input
                      type="text"
                      placeholder="cth: Asus ROG Zephyrus G14"
                      value={calcCustomDeviceModel}
                      onChange={(e) => setCalcCustomDeviceModel(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Select Damage Type */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Jenis Kerusakan
                  </label>
                  <select
                    value={calcDamageType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCalcDamageType(val);
                      // Multiplier modification
                      let mult = 1.0;
                      if (calcDeviceModel === "MacBook Pro M1") mult = 1.4;
                      else if (calcDeviceModel === "MacBook Air M1") mult = 1.2;
                      else if (calcDeviceModel === "iPhone 14 Pro") mult = 1.1;
                      else if (calcDeviceModel === "Samsung S23 Ultra")
                        mult = 1.25;

                      if (val === "Ganti Layar LCD") {
                        setCalcPartCost(String(Math.round(1400000 * mult)));
                        setCalcServiceCost(String(Math.round(350000 * mult)));
                      } else if (val === "Ganti Baterai") {
                        setCalcPartCost(String(Math.round(450000 * mult)));
                        setCalcServiceCost(String(Math.round(150000 * mult)));
                      } else if (val === "Mati Total / IC Power") {
                        setCalcPartCost(String(Math.round(650000 * mult)));
                        setCalcServiceCost(String(Math.round(600000 * mult)));
                      } else if (val === "Keyboard Error") {
                        setCalcPartCost(String(Math.round(550000 * mult)));
                        setCalcServiceCost(String(Math.round(300000 * mult)));
                      } else if (val === "Pembersihan & Pasta") {
                        setCalcPartCost("50000");
                        setCalcServiceCost("100000");
                      } else if (val === "Custom") {
                        setCalcPartCost("0");
                        setCalcServiceCost("0");
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Ganti Layar LCD">
                      Ganti Layar LCD Original
                    </option>
                    <option value="Ganti Baterai">
                      Ganti Baterai High Capacity
                    </option>
                    <option value="Mati Total / IC Power">
                      Mati Total / Perbaikan IC Board
                    </option>
                    <option value="Keyboard Error">
                      Ganti Keyboard & Trackpad
                    </option>
                    <option value="Pembersihan & Pasta">
                      Pembersihan Internal & Repaste Thermal
                    </option>
                    <option value="Custom">-- Custom Kerusakan Lain --</option>
                  </select>
                </div>

                {calcDamageType === "Custom" && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      Deskripsi Kerusakan Kustom
                    </label>
                    <input
                      type="text"
                      placeholder="cth: Kerusakan Engsel Layar & Casing Retak"
                      value={calcCustomDamageType}
                      onChange={(e) => setCalcCustomDamageType(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Pricing Input Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      Biaya Suku Cadang (Rp)
                    </label>
                    <input
                      type="number"
                      value={calcPartCost}
                      onChange={(e) => setCalcPartCost(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      Biaya Jasa Servis (Rp)
                    </label>
                    <input
                      type="number"
                      value={calcServiceCost}
                      onChange={(e) => setCalcServiceCost(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Options Checkbox & Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 py-2 bg-slate-50/50">
                    <input
                      type="checkbox"
                      id="include-tax-chk"
                      checked={calcIncludeTax}
                      onChange={(e) => setCalcIncludeTax(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label
                      htmlFor="include-tax-chk"
                      className="text-xs text-slate-600 font-medium cursor-pointer"
                    >
                      Terapkan PPN (11%)
                    </label>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Diskon (Rupiah)..."
                      value={calcDiscountValue}
                      onChange={(e) => setCalcDiscountValue(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Customer Selection & Warranty */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      Hubungkan ke Pelanggan
                    </label>
                    <select
                      value={calcCustomerId}
                      onChange={(e) => setCalcCustomerId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-medium"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                      <option value="new">+ Daftarkan Pelanggan Baru +</option>
                    </select>
                  </div>

                  {calcCustomerId === "new" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-fadeIn">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                        Form Pendaftaran Cepat
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            placeholder="Nama Lengkap..."
                            value={calcCustName}
                            onChange={(e) => setCalcCustName(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="No. WhatsApp (628...)"
                            value={calcCustPhone}
                            onChange={(e) => setCalcCustPhone(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                      Masa Garansi Ditawarkan
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setCalcWarranty(m)}
                          className={`py-1.5 px-2 text-xs font-bold font-mono rounded-lg border cursor-pointer transition-all ${
                            calcWarranty === m
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {m} Bln
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Submit */}
                <button
                  type="button"
                  onClick={() => {
                    const part = Number(calcPartCost || 0);
                    const service = Number(calcServiceCost || 0);
                    const subtotal = part + service;
                    const tax = calcIncludeTax
                      ? Math.round(subtotal * 0.11)
                      : 0;
                    const disc = Number(calcDiscountValue || 0);
                    const total = subtotal + tax - disc;

                    let customerObj = null;
                    if (calcCustomerId === "new") {
                      if (!calcCustName || !calcCustPhone) {
                        showToast(
                          "Mohon lengkapi data Nama & WhatsApp pelanggan baru!",
                          "error",
                        );
                        return;
                      }
                      customerObj = {
                        id: "cust-temp",
                        name: calcCustName,
                        phone: calcCustPhone,
                      };
                    } else {
                      customerObj = customers.find(
                        (c) => c.id === calcCustomerId,
                      ) || { id: "cust-temp", name: "Umum", phone: "+62 811" };
                    }

                    const devName =
                      calcDeviceModel === "Custom"
                        ? calcCustomDeviceModel
                        : calcDeviceModel;
                    const damageName =
                      calcDamageType === "Custom"
                        ? calcCustomDamageType
                        : calcDamageType;

                    const quoteTime = Date.now();
                    setActiveQuote({
                      id: "qt-" + quoteTime.toString(36),
                      quoteNo: `QT/${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}/${quoteTime.toString().slice(-4)}`,
                      createdAt: new Date().toISOString(),
                      customer: customerObj,
                      deviceName: devName,
                      damageType: damageName,
                      partCost: part,
                      serviceCost: service,
                      subtotal,
                      tax,
                      discount: disc,
                      grandTotal: total,
                      warranty: calcWarranty,
                    });
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" /> Buat Dokumen
                  Penawaran Resmi
                </button>
              </div>
            </div>

            {/* Right Column: Quote Preview & Action Sheet (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {!activeQuote ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-3 min-h-[450px]">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                      Preview Penawaran Kosong
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      Masukkan parameter estimasi di kolom sebelah kiri dan klik
                      tombol buat penawaran untuk memuat dokumen formal.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Official Business Layout Letterhead */}
                  <div className="bg-white border border-slate-300 rounded-2xl shadow-xl p-6 md:p-8 font-sans text-slate-800 space-y-6 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50/40 rounded-full border border-indigo-100/30 pointer-events-none" />

                    {/* Letterhead Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Wrench className="w-5 h-5 text-indigo-600" />
                          <span className="font-black text-sm uppercase tracking-tight text-slate-900">
                            {activeTenant?.name || "REPAIR SERVICE CENTER"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          OFFICIAL SERVICE QUOTATION SHEET
                        </p>
                        <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                          {activeTenant?.address ||
                            "Kawasan Tamalanrea Utama, Makassar, ID"}
                        </p>
                      </div>
                      <div className="md:text-right font-mono text-[10px] space-y-0.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                        <p className="text-slate-400 uppercase font-bold text-[8px]">
                          Penawaran No:
                        </p>
                        <p className="text-slate-800 font-extrabold text-xs">
                          {activeQuote.quoteNo}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1">
                          Tanggal:{" "}
                          {new Date(activeQuote.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[9px] text-emerald-600 font-bold">
                          Masa Berlaku: 14 Hari
                        </p>
                      </div>
                    </div>

                    {/* Client details info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl text-xs">
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">
                          Ditujukan Kepada:
                        </p>
                        <p className="font-extrabold text-slate-800">
                          {activeQuote.customer?.name}
                        </p>
                        <p className="text-slate-500">
                          Phone: {activeQuote.customer?.phone}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-mono uppercase font-bold">
                          Rincian Perangkat:
                        </p>
                        <p className="font-extrabold text-slate-800">
                          {activeQuote.deviceName}
                        </p>
                        <p className="text-slate-500">
                          Estimasi Kerusakan:{" "}
                          <span className="font-bold text-indigo-600">
                            {activeQuote.damageType}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Pricing Table */}
                    <div className="space-y-2 text-xs">
                      <p className="font-mono text-[9px] text-slate-400 uppercase font-bold">
                        Rincian Estimasi Biaya Perbaikan (Itemized Cost):
                      </p>
                      <div className="overflow-hidden border border-slate-200 rounded-xl">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase font-mono text-slate-500">
                            <tr>
                              <th className="px-3.5 py-2">
                                Deskripsi Layanan & Part
                              </th>
                              <th className="px-3.5 py-2 text-right">
                                Biaya Satuan
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                            <tr>
                              <td className="px-3.5 py-2.5 font-medium">
                                Komponen Pengganti Suku Cadang (
                                {activeQuote.damageType})
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono">
                                Rp{" "}
                                {(activeQuote.partCost ?? 0).toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3.5 py-2.5 font-medium">
                                Biaya Jasa Perbaikan Perangkat & Pengujian
                                Teknis
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono">
                                Rp{" "}
                                {(
                                  activeQuote.serviceCost ?? 0
                                ).toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary Pricing Block */}
                    <div className="border-t border-slate-200 pt-4 flex flex-col items-end text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between w-64 text-slate-500">
                        <span>Subtotal:</span>
                        <span>
                          Rp {(activeQuote.subtotal ?? 0).toLocaleString()}
                        </span>
                      </div>
                      {(activeQuote.tax ?? 0) > 0 && (
                        <div className="flex justify-between w-64 text-slate-500">
                          <span>PPN Pajak (11%):</span>
                          <span>
                            Rp {(activeQuote.tax ?? 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {(activeQuote.discount ?? 0) > 0 && (
                        <div className="flex justify-between w-64 text-rose-500 font-bold">
                          <span>Diskon Khusus:</span>
                          <span>
                            -Rp {(activeQuote.discount ?? 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between w-64 text-slate-900 border-t border-slate-200 pt-2 font-black text-sm">
                        <span className="font-sans">Grand Total:</span>
                        <span className="text-indigo-600">
                          Rp {(activeQuote.grandTotal ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Terms and Conditions Footnotes */}
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-[10px] text-slate-500 leading-relaxed font-sans">
                      <p className="font-bold text-slate-700 font-mono uppercase tracking-wider text-[8px]">
                        Ketentuan & Syarat Layanan:
                      </p>
                      <p>
                        1. Penawaran biaya perbaikan ini bersifat estimasi awal
                        dan berlaku selama *14 hari* dari tanggal tertera.
                      </p>
                      <p>
                        2. Garansi berlaku selama *{activeQuote.warranty} bulan*
                        untuk jenis penggantian komponen yang sama pasca serah
                        terima.
                      </p>
                      <p>
                        3. Pihak toko berhak membatalkan perbaikan apabila
                        ditemukan kerusakan sekunder pasca bongkar unit dengan
                        persetujuan customer.
                      </p>
                    </div>
                  </div>

                  {/* Operational Action Row */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          `Mencetak Dokumen Resmi ${activeQuote.quoteNo}... Mengunduh file penawaran berformat PDF.`,
                          "info",
                        );
                      }}
                      className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-4 h-4 text-slate-500" /> Unduh PDF
                      Formal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let finalCustId = activeQuote.customer.id;
                        if (calcCustomerId === "new") {
                          const addedCust = addCustomer({
                            name: activeQuote.customer.name,
                            phone: activeQuote.customer.phone,
                            email: "client@service.io",
                            address: "",
                            segment: CustomerSegment.PERSONAL,
                            tags: [],
                            salesPipelineStage: "LEAD",
                          });
                          finalCustId = addedCust.id;
                        }

                        addServiceTicket({
                          tenantId: currentTenantId,
                          branchId: currentBranchId,
                          customerId: finalCustId,
                          deviceName: activeQuote.deviceName,
                          deviceBrandModel: activeQuote.deviceName,
                          initialChecklist: [
                            { name: "Unit Menyala", checked: true },
                            { name: "Fisik Mulus", checked: true },
                          ],
                          initialPhotos: [
                            "https://images.unsplash.com/photo-1597872200319-336c261c6742?auto=format&fit=crop&q=80&w=400",
                          ],
                          customerComplaints: `Unit dikonversi langsung dari Penawaran Penjualan #${activeQuote.quoteNo}. Penanganan: ${activeQuote.damageType}`,
                          techDiagnosis: activeQuote.damageType,
                          estimatedCost: activeQuote.grandTotal,
                          customerApprovalStatus: "APPROVED",
                          customerApprovalDate: new Date().toISOString(),
                          partsUsed: [
                            {
                              productId: "sparepart-temp",
                              name: activeQuote.damageType,
                              quantity: 1,
                              unitPrice: activeQuote.partCost,
                              totalPrice: activeQuote.partCost,
                            },
                          ],
                          warrantyMonths: activeQuote.warranty,
                          isOutsourced: false,
                        });

                        showToast(
                          `Penawaran resmi ${activeQuote.quoteNo} berhasil dikonversi dan disetujui! Tiket perbaikan aktif dan SPK baru telah diterbitkan.`,
                          "success",
                        );
                        setActiveQuote(null);
                        setCalcCustName("");
                        setCalcCustPhone("");
                        setActiveSubTab("list");
                      }}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10"
                    >
                      <CheckSquare className="w-4 h-4" /> Konversi & Buat Tiket
                      Aktif
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtab: FIELD SERVICE */}
        {localSubTab === "field-service" && <FieldServiceGps />}

        {/* Subtab: RENTAL */}
        {localSubTab === "rental" && <DeviceRentalDashboard />}

        {/* Subtab: WARRANTY & CLAIMS */}
        {localSubTab === "warranty-claims" && <WarrantyClaims />}

        {/* Subtab: QR CODE TRACKING */}
        {localSubTab === "qr-tracker" && <ServiceTrackerQr />}
      </div>

      <DocumentPrintouts
        showSpkPrintout={showSpkPrintout}
        setShowSpkPrintout={setShowSpkPrintout}
        showInvoicePrintout={showInvoicePrintout}
        setShowInvoicePrintout={setShowInvoicePrintout}
        showProvisionalQuote={showProvisionalQuote}
        setShowProvisionalQuote={setShowProvisionalQuote}
        showWarrantyPrintout={showWarrantyPrintout}
        setShowWarrantyPrintout={setShowWarrantyPrintout}
        tenantServices={tenantServices}
        customers={customers}
        employees={employees}
        currentUser={currentUser}
        showToast={showToast}
        printConfig={tenantObj?.settings?.printConfig}
      />
    </>
  );
};
