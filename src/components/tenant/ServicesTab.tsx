import * as React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Cpu,
  Share2,
  Barcode,
  ShieldCheck,
  Timer,
  PackagePlus,
  ListChecks,
} from 'lucide-react';
import { useSaaS } from '../../context/SaaSContext';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FieldServiceGps } from '../FieldServiceGps';
import { DeviceRentalDashboard } from '../DeviceRentalDashboard';
import { WarrantyClaims } from '../WarrantyClaims';
import { DocumentPrintouts } from './services/DocumentPrintouts';
import { WhatsAppHub } from './services/WhatsAppHub';
import { SparepartsLedger } from './services/SparepartsLedger';
import { HandoverPanel } from './services/HandoverPanel';
import { ServiceCostCalculator } from './ServiceCostCalculator';
import { ServiceList } from './ServiceList';
import { ServiceReceptionWizard } from './ServiceReceptionWizard';
import { QCChecklistModal } from './services/QCChecklistModal';
import { StorageLocation } from '../../types';
import { renderTenantWaTemplate } from '../../utils/waTemplate';
import { useServiceReception } from '../../hooks/useServiceReception';
import { getServiceStatusEvents, getServiceTicket, patchServiceTicketScope } from '../../lib/api/services';
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
} from '../../types';
import { CATEGORY_CONFIGS } from '../../config/categoryConfigs';
import { isSubTabFeatureAllowed } from '../../lib/featureUtils';
import {
  buildServiceReceptionPreview,
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
  validateServiceReceptionForm,
} from '../../utils/serviceReceptionUtils';
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
    apiFetch,
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
    warehouses,
    currentTenantId: contextTenantId,
    publicBaseUrl,
  } = useSaaS();
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const activeTenantId = currentTenantId || contextTenantId;
  const tenantObj = tenants.find((t: Tenant) => t.id === activeTenantId);
  const serviceTickets = useMemo(
    () =>
      services.filter(
        (service) => service.tenantId === activeTenantId && service.branchId === currentBranchId
      ),
    [services, activeTenantId, currentBranchId]
  );
  const triggers = [] as any[];

  const currentUserPermissions = useMemo(() => {
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      return ['admin_access'];
    }
    return tenantObj?.rbacMatrix?.[currentUser?.role] ?? currentUser?.permissions ?? [];
  }, [tenantObj, currentUser]);
  // Declaring missing states, variables, and helper functions
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedPartWarehouseId, setSelectedPartWarehouseId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => new URLSearchParams(window.location.search).get('status') || 'ALL');
  const [srvSort, setSrvSort] = useState<string>(() => new URLSearchParams(window.location.search).get('sort') || 'newest');
  const [srvSearchQuery, setSrvSearchQuery] = useState<string>(() => new URLSearchParams(window.location.search).get('q') || '');
  const [viewingServiceTicketId, setViewingServiceTicketId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [fetchedService, setFetchedService] = useState<ServiceTicket | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedServiceIds([]);
    setSelectedPartWarehouseId('');
    setSrvSearchQuery(params.get('q') || '');
    setStatusFilter(params.get('status') || 'ALL');
    setSrvSort(params.get('sort') || 'newest');
    setViewingServiceTicketId(params.get('serviceId'));
    setFetchedService(null);
  }, [activeTenantId, currentBranchId]);
  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };
  const setViewingServiceTicketIdFromUrl = (id: string | null) => {
    setDetailError(null);
    setViewingServiceTicketId(id);
    window.history.pushState(null, '', `${window.location.pathname}${(() => {
      const params = new URLSearchParams(window.location.search);
      if (id) params.set('serviceId', id);
      else params.delete('serviceId');
      const query = params.toString();
      return query ? `?${query}` : '';
    })()}${window.location.hash}`);
  };
  const setSrvSearchQueryFromUrl = (value: string) => {
    setSrvSearchQuery(value);
    updateUrl({ q: value || null });
  };
  const setStatusFilterFromUrl = (value: string) => {
    setStatusFilter(value);
    updateUrl({ status: value === 'ALL' ? null : value });
  };
  const setSrvSortFromUrl = (value: string) => {
    setSrvSort(value);
    updateUrl({ sort: value === 'newest' ? null : value });
  };
  useEffect(() => {
    const readUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setSrvSearchQuery(params.get('q') || '');
      setStatusFilter(params.get('status') || 'ALL');
      setSrvSort(params.get('sort') || 'newest');
      const id = params.get('serviceId');
      setViewingServiceTicketId(id);
    };
    readUrl();
    window.addEventListener('popstate', readUrl);
    return () => window.removeEventListener('popstate', readUrl);
  }, []);
  useEffect(() => {
    const id = viewingServiceTicketId;
    if (!id) {
      setFetchedService(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setFetchedService(null);
    setDetailLoading(true);
    setDetailError(null);
    getServiceTicket(apiFetch, id)
      .then(async (ticket) => {
        if (ticket.tenantId !== activeTenantId || (currentBranchId && ticket.branchId !== currentBranchId)) {
          throw new Error('Tiket tidak tersedia pada tenant atau cabang aktif.');
        }
        const timeline = await getServiceStatusEvents(apiFetch, id).catch(() => null);
        if (!cancelled) setFetchedService({ ...ticket, timeline: timeline ?? ticket.timeline });
      })
      .catch((error: Error) => {
        if (!cancelled) setDetailError(error.message);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, viewingServiceTicketId]);
  const [showSpkPrintout, setShowSpkPrintout] = useState<string | null>(null);
  const [showInvoicePrintout, setShowInvoicePrintout] = useState<string | null>(null);
  const [showProvisionalQuote, setShowProvisionalQuote] = useState<string | null>(null);
  const [showWarrantyPrintout, setShowWarrantyPrintout] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<any | null>(null);
  const [calcCustomerId, setCalcCustomerId] = useState<string>('new');
  const [calcCustName, setCalcCustName] = useState<string>('Budi Santoso');
  const [calcCustPhone, setCalcCustPhone] = useState<string>('0812-3456-7890');
  const [calcDeviceModel, setCalcDeviceModel] = useState<string>('MacBook Pro M1');
  const [calcCustomDeviceModel, setCalcCustomDeviceModel] = useState<string>('');
  const [calcDamageType, setCalcDamageType] = useState<string>('Ganti Layar LCD');
  const [calcCustomDamageType, setCalcCustomDamageType] = useState<string>('');
  const [calcPartCost, setCalcPartCost] = useState<string>('1500000');
  const [calcServiceCost, setCalcServiceCost] = useState<string>('450000');
  const [calcIncludeTax, setCalcIncludeTax] = useState<boolean>(false);
  const [calcDiscountValue, setCalcDiscountValue] = useState<string>('');
  const [calcWarranty, setCalcWarranty] = useState<number>(3);
  // Handover state variables
  const [handoverPaymentMethod, setHandoverPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH
  );
  const [handoverRefNo, setHandoverRefNo] = useState<string>('');
  const [handoverProofName, setHandoverProofName] = useState<string>('');
  const [handoverTempoDays, setHandoverTempoDays] = useState<string>('30');
  const [handoverChecklist, setHandoverChecklist] = useState({
    accessoriesReturned: false,
    customerChecked: false,
    invoiceReady: false,
    warrantyReady: false,
  });
  // WhatsApp and active WA notifications
  const [activeWaModal, setActiveWaModal] = useState<any | null>(null);
  const [justCreatedTicket, setJustCreatedTicket] = useState<any | null>(null);
  const [customWaMessageText, setCustomWaMessageText] = useState<string>('');
  const [additionalCostTicket, setAdditionalCostTicket] = useState<ServiceTicket | null>(null);
  const [additionalCostDescription, setAdditionalCostDescription] = useState('');
  const [additionalCostAmount, setAdditionalCostAmount] = useState('');
  const [additionalCostMethod, setAdditionalCostMethod] = useState<
    'WHATSAPP' | 'PHONE' | 'IN_PERSON'
  >('WHATSAPP');
  const [additionalCostApprovedBy, setAdditionalCostApprovedBy] = useState('');
  const [additionalCostNote, setAdditionalCostNote] = useState('');
  const [additionalCostProof, setAdditionalCostProof] = useState('');
  const [savingAdditionalCost, setSavingAdditionalCost] = useState(false);
  const [partOrderTicket, setPartOrderTicket] = useState<ServiceTicket | null>(null);
  const [partOrderName, setPartOrderName] = useState('');
  const [partOrderQty, setPartOrderQty] = useState(1);
  const [partOrderReason, setPartOrderReason] = useState('');
  const [partOrderSupplier, setPartOrderSupplier] = useState('');
  const [partOrderCost, setPartOrderCost] = useState('');
  const [partOrderEta, setPartOrderEta] = useState('');
  const [partOrderCostApproved, setPartOrderCostApproved] = useState(false);
  const [partOrderNote, setPartOrderNote] = useState('');
  const [savingPartOrder, setSavingPartOrder] = useState(false);
  const [microTicket, setMicroTicket] = useState<ServiceTicket | null>(null);
  const [microSearch, setMicroSearch] = useState('');
  const [selectedMicroId, setSelectedMicroId] = useState('');
  const [microQty, setMicroQty] = useState(1);
  const [microChargeable, setMicroChargeable] = useState(false);
  const [microUnitPrice, setMicroUnitPrice] = useState('');
  const [microNote, setMicroNote] = useState('');
  const [savingMicroUsage, setSavingMicroUsage] = useState(false);
  const openMicroComponentModal = async (ticket: ServiceTicket) => {
    setMicroTicket(ticket);
    setMicroSearch('');
    setSelectedMicroId('');
    setMicroQty(1);
    setMicroChargeable(false);
    setMicroUnitPrice('');
    setMicroNote('');
    try {
      await loadMicroComponents();
    } catch (_) {
      console.warn('Gagal memuat micro components (ServicesTab)');
    }
  };
  const filteredMicroComponents = useMemo(() => {
    const query = microSearch.trim().toLowerCase();
    if (!query) return microComponents;
    return microComponents.filter((item) =>
      [item.name, item.sku, item.category, ...(item.compatModels || [])].some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [microComponents, microSearch]);
  const selectedMicro = microComponents.find((item) => item.id === selectedMicroId);
  // Customer Wizard variables
  const [showNewSrvCustForm, setShowNewSrvCustForm] = useState<boolean>(true);
  // Diagnostics and request part states
  const [internalCommentText, setInternalCommentText] = useState<string>('');
  const [liveTimerSeconds, setLiveTimerSeconds] = useState<number>(0);
  const [requestPartMode, setRequestPartMode] = useState<boolean>(false);
  const [requestedPartId, setRequestedPartId] = useState<string>('');
  const [requestedPartQty, setRequestedPartQty] = useState<number>(1);
  const [manualDiagNotes, setManualDiagNotes] = useState<string>('');
  const [manualDiagCost, setManualDiagCost] = useState<string>('0');
  const [selectedSparepartId, setSelectedSparepartId] = useState<string>('');
  const [sparepartQty, setSparepartQty] = useState<number>(1);
  const [sparepartSN, setSparepartSN] = useState<string>('');
  const approveServiceEstimate = async (ticketId: string, isApproved: boolean) => {
    try {
      const ticket = await approveServiceEstimateContext(ticketId, isApproved, currentUser?.name || 'Owner', '');
      showToast(
        isApproved ? 'Estimasi biaya disetujui pelanggan!' : 'Estimasi biaya ditolak pelanggan!',
        isApproved ? 'success' : 'info'
      );
      return ticket;
    } catch (error: any) {
      showToast(error?.message || 'Gagal memproses persetujuan estimasi.', 'error');
      throw error;
    }
  };
  const updateServiceStatus = async (ticketId: string, status: ServiceStatus, note: string) => {
    try {
      return await updateServiceStatusContext(ticketId, status, note);
    } catch (error: any) {
      showToast(error?.message || 'Gagal memperbarui status servis.', 'error');
      throw error;
    }
  };
  // Camera capture states and refs
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedCaptureCategory, setSelectedCaptureCategory] = useState<string>('Bodi Luar');
  // Outsourcing states
  const [receptionErrors, setReceptionErrors] = useState<Record<string, string>>({});
  const [isSubmittingReception, setIsSubmittingReception] = useState<boolean>(false);
  const [previewReceptionTicket, setPreviewReceptionTicket] = useState<any | null>(null);
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState<boolean>(false);
  const [showDocumentation, setShowDocumentation] = useState<boolean>(false);
  const [showScreenLock, setShowScreenLock] = useState<boolean>(false);
  // Quality control states
  const [qcNotes, setQcNotes] = useState<string>('');
  const [qcTicket, setQcTicket] = useState<ServiceTicket | null>(null);
  // Technician assignment
  const [autoAssignReason, setAutoAssignReason] = useState<string | null>(null);
  const [custOpen, setCustOpen] = useState<boolean>(false);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/module-records?module=storage_locations')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Storage locations HTTP ${r.status}`);
        const body = await r.json();
        const rows = Array.isArray(body) ? body : body.data || body.items || [];
        if (!cancelled)
          setStorageLocations(
            rows
              .map((row: any) => row.payload || row)
              .filter((x: StorageLocation) => x.tenantId === activeTenantId)
          );
      })
      .catch((e: any) => showToast(e.message || 'Lokasi penyimpanan gagal dimuat.', 'error'));
    return () => {
      cancelled = true;
    };
  }, [apiFetch, activeTenantId, showToast]);
   const rentalAllowed =
     currentUser?.role === UserRole.SUPER_ADMIN ||
    isSubTabFeatureAllowed('services', 'rental', tenantObj || {});
  const [localSubTab, setLocalSubTab] = useState<string>(() => {
    const storedSubTab = localStorage.getItem('fixdev_srv_subtab') || activeSubTab || 'list';
    return storedSubTab === 'rental' && !rentalAllowed ? 'list' : storedSubTab;
  });
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);
  useEffect(() => {
    if (activeSubTab === 'rental' && !rentalAllowed) {
      localStorage.setItem('fixdev_srv_subtab', 'list');
      onSetTab?.('services', 'list');
      setLocalSubTab('list');
      return;
    }
    setLocalSubTab(activeSubTab);
  }, [activeSubTab, onSetTab, rentalAllowed]);

  const setActiveSubTab = (sub: string) => {
    if (sub === 'rental' && !rentalAllowed) sub = 'list';
    setLocalSubTab(sub);
    try {
      localStorage.setItem('fixdev_srv_subtab', sub);
    } catch {
      onSetTab?.('services', sub);
      return;
    }
    onSetTab?.('services', sub);
  };
  useEffect(() => {
    if (justCreatedTicket?.id) {
      setViewingServiceTicketIdFromUrl(justCreatedTicket.id);
      if (activeSubTab !== 'list') setActiveSubTab('list');
      setJustCreatedTicket(null);
    }
  }, [justCreatedTicket, activeSubTab, setViewingServiceTicketIdFromUrl, setActiveSubTab]);
  const {
    newSrvCustName,
    setNewSrvCustName,
    newSrvCustPhone,
    setNewSrvCustPhone,
    newSrvCustEmail,
    setNewSrvCustEmail,
    newSrvCustAddress,
    setNewSrvCustAddress,
    newSrvCustomer,
    setNewSrvCustomer,
    newSrvEstCompletion,
    setNewSrvEstCompletion,
    newSrvDevice,
    setNewSrvDevice,
    newSrvBrand,
    setNewSrvBrand,
    newSrvSerial,
    setNewSrvSerial,
    newSrvWarranty,
    setNewSrvWarranty,
    newSrvDownPayment,
    setNewSrvDownPayment,
    newSrvDownPaymentMethod,
    setNewSrvDownPaymentMethod,
    newSrvIsCheckOnly,
    setNewSrvIsCheckOnly,
    newSrvPhysicalCondition,
    setNewSrvPhysicalCondition,
    newSrvScreenLock,
    setNewSrvScreenLock,
    newSrvComplaint,
    setNewSrvComplaint,
    newSrvCategory,
    setNewSrvCategory,
    newSrvDynamicSpecs,
    setNewSrvDynamicSpecs,
    newSrvChecklist,
    setNewSrvChecklist,
    newSrvAccessories,
    setNewSrvAccessories,
    newSrvCustomAccessories,
    setNewSrvCustomAccessories,
    newSrvStorageLocId,
    setNewSrvStorageLocId,
    newSrvCapturedConditions,
    setNewSrvCapturedConditions,
    newSrvIsOutsourced,
    setNewSrvIsOutsourced,
    newSrvOutsourcedVendor,
    setNewSrvOutsourcedVendor,
    newSrvOutsourcingCost,
    setNewSrvOutsourcingCost,
    newSrvTechId,
    setNewSrvTechId,
    custQuery,
    setCustQuery,
    receptionFormRef,
    handleCreateService,
  } = useServiceReception({
    customers,
    activeTenantId,
    currentTenantId,
    currentBranchId,
    currentUserId: currentUser?.id,
    tenantObj,
    addServiceTicket,
    apiFetch,
    showToast,
    showNewSrvCustForm,
    setShowNewSrvCustForm,
    setReceptionErrors,
    setIsSubmittingReception,
    setJustCreatedTicket,
    setPreviewReceptionTicket,
    setActiveSubTab,
    setAutoAssignReason,
  });

  const tenantServices = serviceTickets;
  const selectedReceptionCustomer = customers.find((customer) => customer.id === newSrvCustomer);
  const receptionProgress = [
    Boolean(newSrvCustomer || (newSrvCustName.trim() && isValidIndonesianPhone(newSrvCustPhone))),
    Boolean(newSrvDevice.trim()),
    Boolean(newSrvComplaint.trim()),
    Object.keys(newSrvChecklist).length === 0 || Object.values(newSrvChecklist).some(Boolean),
  ].filter(Boolean).length;
  const activeTenant = tenantObj;
  const isSubTabAllowed = (tabId: string, subId: string) =>
    currentUser.role === UserRole.SUPER_ADMIN ||
    isSubTabFeatureAllowed(tabId, subId, tenantObj || {});
  const startCamera = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showToast('Kamera hanya tersedia melalui HTTPS. Gunakan Pilih Foto.', 'error');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (error: any) {
        if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') throw error;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setCameraActive(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const video = videoRef.current;
      if (!video) throw new Error('Pratinjau kamera tidak tersedia.');
      video.srcObject = stream;
      await video.play();
    } catch (error: any) {
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
      const message = error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser atau gunakan Pilih Foto.'
        : error?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan. Gunakan Pilih Foto.'
          : error?.name === 'NotReadableError'
            ? 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.'
            : error?.message || 'Gagal mengakses kamera perangkat.';
      showToast(message, 'error');
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
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      showToast('Gagal menyiapkan foto kondisi fisik.', 'error');
      return;
    }
    const newPhoto = {
      id: crypto.randomUUID(),
      category: selectedCaptureCategory,
      url: URL.createObjectURL(blob),
      blob,
      timestamp: new Date().toISOString(),
    };
    setNewSrvCapturedConditions((prev) => [...prev, newPhoto]);
    showToast('Foto kondisi fisik berhasil diambil!', 'success');
  };
  const runAutoAssign = () => {
    const techs = employees.filter(
      (emp: any) =>
        emp.tenantId === activeTenantId &&
        (!currentBranchId || emp.branchId === currentBranchId) &&
        emp.isActive !== false &&
        (emp.role === 'TEKNISI' || emp.position?.toLowerCase().includes('teknisi'))
    );
    if (techs.length > 0) {
      const activeStatuses = new Set([
        ServiceStatus.DITERIMA,
        ServiceStatus.ANTRIAN,
        ServiceStatus.DIAGNOSA,
        ServiceStatus.SEDANG_DIKERJAKAN,
        ServiceStatus.MENUGGU_SPAREPART,
        ServiceStatus.MENUGGU_PART_ORDER,
        ServiceStatus.QC,
        ServiceStatus.REWORK,
      ]);
      const selected = [...techs].sort((a, b) =>
        serviceTickets.filter((ticket) => ticket.assignedTechId === a.id && activeStatuses.has(ticket.status)).length -
        serviceTickets.filter((ticket) => ticket.assignedTechId === b.id && activeStatuses.has(ticket.status)).length
      )[0];
      setNewSrvTechId(selected.id);
      setAutoAssignReason(
        `Sistem otomatis memilih ${selected.name} karena memiliki beban kerja paling ringan saat ini.`
      );
      showToast(`Teknisi otomatis ditugaskan ke ${selected.name}`, 'success');
    } else {
      showToast('Tidak ada staf tersedia untuk ditugaskan!', 'error');
    }
  };
  const openQcChecklist = (ticket: ServiceTicket) => {
    setQcTicket(ticket);
    setQcNotes('');
  };
  const saveQcChecklist = async (checklist: { criteria: string; passed: boolean }[]) => {
    if (!qcTicket) return;
    const updated = await patchServiceTicketScope(apiFetch, qcTicket.id, 'qc-draft', { checklist });
    setQcTicket(updated);
    setFetchedService((current) => (current?.id === updated.id ? { ...current, ...updated } : current));
    setQcTicket(null);
    showToast('Checklist QC berhasil disimpan.', 'success');
  };
  const completeServiceQC = async (
    ticketId: string,
    notes: string,
    checklist?: ServiceTicket['qcChecklist']
  ) => {
    try {
      const ticket = await completeServiceQCContext(ticketId, notes, checklist);
      const passed = !!ticket?.qcChecklist?.length && ticket.qcChecklist.every((item) => item.passed);
      showToast(
        passed
          ? 'Quality Control berhasil diselesaikan!'
          : 'Status diset ke Rework untuk perbaikan ulang.',
        passed ? 'success' : 'warning'
      );
      return ticket;
    } catch (error: any) {
      showToast(error?.message || 'Gagal menyimpan hasil QC.', 'error');
      throw error;
    }
  };
  const handoverServiceDevice = async (
    ticketId: string,
    paymentMethod: PaymentMethod,
    details: any
  ) => {
    try {
      const ticket = await handoverServiceDeviceContext(ticketId, paymentMethod, details);
      showToast(
        'Serah terima perangkat selesai. Pembayaran, ledger, stok, dan garansi tersinkron.',
        'success'
      );
      return ticket;
    } catch (error: any) {
      showToast(error?.message || 'Gagal memproses serah terima perangkat.', 'error');
      throw error;
    }
  };
  const handlePrintReceptionReceipt = (ticket: any) => {
    setShowSpkPrintout(ticket.id);
    setPreviewReceptionTicket(null);
  };
  const renderTenantWaTemplate = (category: string, ctx: Record<string, any>): string | null => {
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
    parts: any[] = []
  ) => {
    const customer = customers.find((item) => item.id === ticket.customerId);
    const partsText = parts.length
      ? parts
          .map(
            (part) =>
              `• ${part.name || 'Spare part'} x${part.quantity || 1}: Rp ${Number(part.totalPrice || (part.unitPrice || 0) * (part.quantity || 1)).toLocaleString('id-ID')}`
          )
          .join('\n')
      : '• Tidak ada penggantian spare part';
    if (!ticket.publicTrackingToken) {
      showToast('Link persetujuan belum tersedia. Muat ulang tiket lalu coba lagi.', 'error');
      return;
    }
    const approvalLink = `${publicBaseUrl}/?tracking=${encodeURIComponent(ticket.publicTrackingToken)}`;
    const ctx = {
      customer_name: customer?.name || 'Pelanggan',
      ticket_no: ticket.ticketNo,
      device_name: ticket.deviceName,
      status_note: diagnosis,
      estimated_cost: estimatedCost,
      parts_text: partsText,
      approval_link: approvalLink,
    };
    const templated = renderTenantWaTemplate('SERVICE_UPDATE', ctx);
    const message =
      templated ||
      `Halo *${customer?.name || 'Pelanggan'}*,\n\nPengecekan unit *${ticket.deviceName}* dengan nomor tiket *${ticket.ticketNo}* telah selesai.\n\n*Hasil Diagnosis:*\n${diagnosis}\n\n*Rincian Estimasi:*\n${partsText}\n\n*Total Estimasi Perbaikan: Rp ${estimatedCost.toLocaleString('id-ID')}*\n\nMohon konfirmasi apakah perbaikan dapat kami lanjutkan melalui tautan berikut:\n${approvalLink}\n\nUnit belum akan dikerjakan sebelum mendapatkan persetujuan. Terima kasih.`;
    setActiveWaModal({
      phone: customer?.phone || '',
      message,
      ticketNo: ticket.ticketNo,
      ticketId: ticket.id,
      customerName: customer?.name || 'Pelanggan',
      type: 'ESTIMATE',
      diagnosis,
      estimatedCost,
      parts,
    });
  };
  return (
    <>
      <div className="mx-auto w-full max-w-screen-2xl space-y-6" id="services-pane">
        {/* Subtab: LIST OF SERVICES */}
        {(localSubTab === 'list' || viewingServiceTicketId) && (
          <>
            <ServiceList
              {...{
                 activeTenantId,
                 apiFetch,
                 activeWaModal,
                additionalCostAmount,
                additionalCostApprovedBy,
                additionalCostDescription,
                additionalCostMethod,
                additionalCostNote,
                additionalCostProof,
                additionalCostTicket,
                approveServiceEstimate,
                cameraActive,
                completeServiceQC,
                currentUserPermissions,
                customWaMessageText,
                filteredMicroComponents,
                handlePrintReceptionReceipt,
                handoverChecklist,
                handoverPaymentMethod,
                handoverProofName,
                handoverRefNo,
                handoverServiceDevice,
                handoverTempoDays,
                internalCommentText,
                isSubTabAllowed,
                justCreatedTicket,
                liveTimerSeconds,
                manualDiagCost,
                manualDiagNotes,
                microChargeable,
                microNote,
                microQty,
                microSearch,
                microTicket,
                microUnitPrice,
                 openManualEstimateWhatsApp,
                 openMicroComponentModal,
                 openQcChecklist,
                partOrderCost,
                partOrderCostApproved,
                partOrderEta,
                partOrderName,
                partOrderNote,
                partOrderQty,
                partOrderReason,
                partOrderSupplier,
                partOrderTicket,
                previewReceptionTicket,
                qcNotes,
                requestPartMode,
                requestedPartId,
                 requestedPartQty,
                 selectedPartWarehouseId,
                 setSelectedPartWarehouseId,
                 warehouses,
                 renderTenantWaTemplate,
                savingAdditionalCost,
                savingMicroUsage,
                savingPartOrder,
                selectedMicro,
                selectedMicroId,
                selectedServiceId,
                selectedServiceIds,
                selectedSparepartId,
                setActiveSubTab,
                setActiveWaModal,
                setAdditionalCostAmount,
                setAdditionalCostApprovedBy,
                setAdditionalCostDescription,
                setAdditionalCostMethod,
                setAdditionalCostNote,
                setAdditionalCostProof,
                setAdditionalCostTicket,
                setCustomWaMessageText,
                setHandoverChecklist,
                setHandoverPaymentMethod,
                setHandoverProofName,
                setHandoverRefNo,
                setHandoverTempoDays,
                setInternalCommentText,
                setJustCreatedTicket,
                setManualDiagCost,
                setManualDiagNotes,
                setMicroChargeable,
                setMicroNote,
                setMicroQty,
                setMicroSearch,
                setMicroTicket,
                setMicroUnitPrice,
                setPartOrderCost,
                setPartOrderCostApproved,
                setPartOrderEta,
                setPartOrderName,
                setPartOrderNote,
                setPartOrderQty,
                setPartOrderReason,
                setPartOrderSupplier,
                setPartOrderTicket,
                setPreviewReceptionTicket,
                setQcNotes,
                setRequestPartMode,
                setRequestedPartId,
                setRequestedPartQty,
                setSavingAdditionalCost,
                setSavingMicroUsage,
                setSavingPartOrder,
                setSelectedMicroId,
                setSelectedServiceId,
                setSelectedServiceIds,
                setSelectedSparepartId,
                setShowInvoicePrintout,
                setShowProvisionalQuote,
                setShowSpkPrintout,
                setShowWarrantyPrintout,
                setSparepartQty,
                setSparepartSN,
                setSrvSearchQuery: setSrvSearchQueryFromUrl,
                setSrvSort: setSrvSortFromUrl,
                setStatusFilter: setStatusFilterFromUrl,
                setViewingServiceTicketId: setViewingServiceTicketIdFromUrl,
                showInvoicePrintout,
                showProvisionalQuote,
                showSpkPrintout,
                showWarrantyPrintout,
                sparepartQty,
                sparepartSN,
                srvSearchQuery,
                srvSort,
                startCamera,
                statusFilter,
                stopCamera,
                tenantObj,
                 tenantServices: fetchedService ? serviceTickets.some((ticket) => ticket.id === fetchedService.id) ? serviceTickets.map((ticket) => ticket.id === fetchedService.id ? { ...ticket, ...fetchedService } : ticket) : [...serviceTickets, fetchedService] : serviceTickets,
                 detailLoading,
                 detailError,
                 storageLocations,
                  onDetailUpdated: (ticket: ServiceTicket) => {
                    setFetchedService(ticket);
                    window.dispatchEvent(new Event('service-ticket-updated'));
                  },
                  updateServiceStatus,
                videoRef,
                viewingServiceTicketId,
                currentUser,
                showConfirm,
                updateServiceTicket,
                showToast,
                customers,
                employees,
                 products,
                 publicBaseUrl,
                 currentTenantId,
                 currentBranchId,
                 microComponentsLoading,
                microComponentsError,
                loadMicroComponents,
                consumeMicroComponentForService,
                addServiceDiagnostic,
                requestServicePart,
                cancelServicePart,
                patchServiceWork,
                createServicePartOrder,
                  addApprovedAdditionalCost,
                }}
             />
          </>
        )}
        {/* Subtab: NEW TICKET WIZARD */}
        {localSubTab === 'new-ticket' && (
          <ServiceReceptionWizard
            {...{
              receptionProgress,
              receptionFormRef,
              handleCreateService,
              receptionErrors,
              selectedReceptionCustomer,
              setNewSrvCustomer,
              setCustQuery,
              setShowNewSrvCustForm,
              custQuery,
              setCustOpen,
              custOpen,
              customers,
              setNewSrvCustName,
              setNewSrvCustPhone,
              newSrvCustomer,
              showNewSrvCustForm,
              newSrvCustName,
              newSrvCustPhone,
              newSrvCustEmail,
              setNewSrvCustEmail,
              newSrvCustAddress,
              setNewSrvCustAddress,
              newSrvCategory,
              setNewSrvCategory,
              newSrvEstCompletion,
              setNewSrvEstCompletion,
              newSrvDevice,
              setNewSrvDevice,
              newSrvBrand,
              setNewSrvBrand,
              setShowMoreDetails,
              showMoreDetails,
              newSrvSerial,
              setNewSrvSerial,
              newSrvWarranty,
              setNewSrvWarranty,
              newSrvDownPayment,
              setNewSrvDownPayment,
              newSrvDownPaymentMethod,
              setNewSrvDownPaymentMethod,
              newSrvIsCheckOnly,
              setNewSrvIsCheckOnly,
              newSrvPhysicalCondition,
              setNewSrvPhysicalCondition,
              showScreenLock,
              newSrvScreenLock,
              setNewSrvScreenLock,
              setShowScreenLock,
              newSrvComplaint,
              setNewSrvComplaint,
              setShowAdvancedSpecs,
              showAdvancedSpecs,
              newSrvDynamicSpecs,
              setNewSrvDynamicSpecs,
              runAutoAssign,
              newSrvTechId,
              setNewSrvTechId,
              setAutoAssignReason,
              employees,
              autoAssignReason,
              newSrvStorageLocId,
              setNewSrvStorageLocId,
               storageLocations,
               activeTenantId,
              currentBranchId,
              newSrvChecklist,
              setNewSrvChecklist,
              newSrvAccessories,
              setNewSrvAccessories,
              newSrvCustomAccessories,
              setNewSrvCustomAccessories,
              setShowDocumentation,
              newSrvCapturedConditions,
              showDocumentation,
              selectedCaptureCategory,
              setSelectedCaptureCategory,
              cameraActive,
              videoRef,
              capturePhoto,
              setNewSrvCapturedConditions,
              stopCamera,
              startCamera,
              newSrvIsOutsourced,
              setNewSrvIsOutsourced,
              newSrvOutsourcedVendor,
              setNewSrvOutsourcedVendor,
              newSrvOutsourcingCost,
              setNewSrvOutsourcingCost,
              setActiveSubTab,
              isSubmittingReception,
              showToast,
            }}
          />
        )}
        {/* QC sekarang tersedia langsung di modal detail tiket. */}
        {/* Subtab: COST CALCULATOR & QUOTE GENERATOR */}
        {localSubTab === 'cost-calculator' && (
          <ServiceCostCalculator
            calcDeviceModel={calcDeviceModel}
            setCalcDeviceModel={setCalcDeviceModel}
            calcCustomDeviceModel={calcCustomDeviceModel}
            setCalcCustomDeviceModel={setCalcCustomDeviceModel}
            calcDamageType={calcDamageType}
            setCalcDamageType={setCalcDamageType}
            calcCustomDamageType={calcCustomDamageType}
            setCalcCustomDamageType={setCalcCustomDamageType}
            calcPartCost={calcPartCost}
            setCalcPartCost={setCalcPartCost}
            calcServiceCost={calcServiceCost}
            setCalcServiceCost={setCalcServiceCost}
            calcIncludeTax={calcIncludeTax}
            setCalcIncludeTax={setCalcIncludeTax}
            calcDiscountValue={calcDiscountValue}
            setCalcDiscountValue={setCalcDiscountValue}
            calcCustomerId={calcCustomerId}
            setCalcCustomerId={setCalcCustomerId}
            calcCustName={calcCustName}
            setCalcCustName={setCalcCustName}
            calcCustPhone={calcCustPhone}
            setCalcCustPhone={setCalcCustPhone}
            calcWarranty={calcWarranty}
            setCalcWarranty={setCalcWarranty}
            activeQuote={activeQuote}
            setActiveQuote={setActiveQuote}
            setActiveSubTab={setActiveSubTab}
            customers={customers}
            addCustomer={addCustomer}
            addServiceTicket={addServiceTicket}
            currentTenantId={currentTenantId}
            currentBranchId={currentBranchId}
            activeTenant={activeTenant}
            showToast={showToast}
          />
        )}
        {/* Subtab: FIELD SERVICE */}
        {localSubTab === 'field-service' && <FieldServiceGps />}
        {/* Subtab: RENTAL */}
        {localSubTab === 'rental' && <DeviceRentalDashboard />}
        {/* Subtab: WARRANTY & CLAIMS */}
        {localSubTab === 'warranty-claims' && <WarrantyClaims />}
      </div>
      {qcTicket && (
        <QCChecklistModal
          ticket={qcTicket}
          initialChecklist={qcTicket.qcChecklist}
          onClose={() => setQcTicket(null)}
          onSave={saveQcChecklist}
        />
      )}
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
        activeTicket={fetchedService}
        customers={customers}
        _employees={employees}
        currentUser={currentUser}
        showToast={showToast}
        printConfig={tenantObj?.settings?.printConfig}
      />
    </>
  );
};
