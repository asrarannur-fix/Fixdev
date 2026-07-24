/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. SAAS & MULTI-TENANT TYPES
// ==========================================

export enum SubscriptionTier {
  BASIC = "BASIC",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum TenantStatus {
  ACTIVE = "ACTIVE",
  TRIAL = "TRIAL",
  EXPIRED = "EXPIRED",
  SUSPENDED = "SUSPENDED",
}

export interface TenantLimits {
  users: number;
  branches: number;
  storageMb: number;
  maxServiceTickets: number;
  maxPosTransactions: number;
  features: string[]; // List of enabled modular features
}

export interface TenantBranding {
  logo?: string;
  primaryColor: string;
  accentColor: string;
  whiteLabelEnabled: boolean;
  customDomain?: string;
  portalHelpTitle?: string;
  portalContactText?: string;
  secondaryColor?: string;
  logoUrl?: string;
  slogan?: string;
  fontFamily?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: "SERVICE_UPDATE" | "INVOICE_REMINDER" | "PROMOTION" | "CUSTOM";
  content: string;
}

export interface TenantSettings {
  baseCurrency?: string;
  organizationStructure?: {
    mainBranch?: string;
    divisions?: string[];
  };
  authSettings?: {
    allowGoogleLogin?: boolean;
    requireMfa?: boolean;
    passwordPolicy?: string;
    ipWhitelist?: string[];
  };
  taxSettings?: {
    taxEnabled?: boolean;
    taxRate?: number;
    taxInclusive?: boolean;
  };
  notificationSettings?: {
    whatsappEnabled?: boolean;
    telegramEnabled?: boolean;
    emailEnabled?: boolean;
    whatsappNumber?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
  };
  printConfig?: {
    printMode?: "browser" | "qz";
    printerName?: string;
    paperSize?: string;
    printQrCode?: boolean;
    printHeaderLogo?: boolean;
    printCustomerNotes?: boolean;
    printTermsAndConditions?: boolean;
    showTermsInTracking?: boolean;
    printFontSize?: string;
    printMargin?: number;
    customHeaderTitle?: string;
    customFooterText?: string;
    termsAndConditionsText?: string;
    labelWidth?: number;
    labelHeight?: number;
    labelFontSize?: string;
    labelShowQr?: boolean;
    labelShowLogo?: boolean;
    labelCustomText?: string;
    termsSalesText?: string;
    termsRentalText?: string;
  };
  waConfig?: {
    gateway?: string;
    isConnected?: boolean;
    apiToken?: string;
    phoneNumber?: string;
    sendingMethod?: string;
    syncEstimate?: boolean;
    phoneId?: string;
    wabaId?: string;
    webhookSecret?: string;
    whatsappKey?: string;
    triggers?: Record<string, any>;
    templates?: WhatsAppTemplate[];
  };
  documentConfig?: {
    ticketPrefix?: string;
    invoicePrefix?: string;
    posInvoicePrefix?: string;
    purchaseOrderPrefix?: string;
    paymentPrefix?: string;
    refundPrefix?: string;
    stockOpnamePrefix?: string;
  };
  warrantyDays?: number;
  autoReminderDays?: number;
  stockLowThreshold?: number;
  enableTechnicianCommission?: boolean;
  enableKnowledgeBase?: boolean;
  taxRate?: number;
  securitySettings?: {
    sessionTimeout?: number;
    minPasswordLength?: number;
    requireUppercase?: boolean;
    requireNumber?: boolean;
    requireSpecial?: boolean;
    maxLoginAttempts?: number;
    lockoutDuration?: number;
    enableMFA?: boolean;
    allowPasswordReuse?: boolean;
  };
  generalSettings?: {
    appName?: string;
    timezone?: string;
    dateFormat?: string;
    language?: string;
    numberFormat?: string;
    maintenanceMode?: boolean;
  };
  posSettings?: {
    paymentMethods?: string[];
    maxDiscount?: number;
    allowNegativeStock?: boolean;
    requireVoidApproval?: boolean;
    requireCloseCash?: boolean;
  };
  serviceSettings?: {
    defaultDiagnosisFee?: number;
    requireEstimateApproval?: boolean;
    allowProceedWithoutApproval?: boolean;
    slaHours?: number;
    autoAssignTechnician?: boolean;
  };
  purchaseSettings?: {
    hppMethod?: string;
    defaultWarehouseId?: string;
    requireAdjustmentApproval?: boolean;
  };
  inventorySettings?: {
    enableStockAlert?: boolean;
  };
  accountingSettings?: {
    defaultCashAccountId?: string;
    defaultBankAccountId?: string;
    defaultSalesAccountId?: string;
    defaultHppAccountId?: string;
    defaultInventoryAccountId?: string;
    defaultReceivableAccountId?: string;
    defaultPayableAccountId?: string;
    autoJournalEnabled?: boolean;
  };
  hrSettings?: {
    defaultWorkHours?: number;
    graceLateMinutes?: number;
    enableOvertime?: boolean;
    overtimeRate?: number;
  };
  customerPortalSettings?: {
    enableStatusCheck?: boolean;
    enableEstimateApproval?: boolean;
    enableInvoiceView?: boolean;
    enableWarrantyView?: boolean;
    enableTicketTracking?: boolean;
    hideInternalNotes?: boolean;
    hideProfit?: boolean;
  };
  emailSettings?: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    defaultFromEmail?: string;
    enablePushNotifications?: boolean;
    enableRealtimeNotifications?: boolean;
  };
  fileUploadSettings?: {
    maxUploadSizeMb?: number;
    allowedFileTypes?: string;
    folderInvoices?: string;
    folderServicePhotos?: string;
    folderAttendance?: string;
    folderCustomerDocs?: string;
    fileVisibility?: string;
    retentionDays?: number;
  };
  themeSettings?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    darkMode?: boolean;
    sidebarMode?: string;
    layoutDensity?: string;
  };
}

export type SaaSInvoiceStatus =
  | "PAID"
  | "UNPAID"
  | "PENDING_VERIFICATION"
  | "OVERDUE"
  | "CANCELLED";

export type ManualPaymentMethod = "BANK_TRANSFER" | "MANUAL_QRIS";
export type ManualPaymentStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface ManualPaymentRequest {
  id: string;
  invoiceId: string;
  tenantId: string;
  tenantName?: string;
  method: ManualPaymentMethod;
  amount: number;
  paidAt: string;
  payerName: string;
  referenceNumber: string;
  notes?: string;
  proofOriginalName: string;
  proofContentType: "image/jpeg" | "image/png" | "application/pdf";
  proofSizeBytes: number;
  status: ManualPaymentStatus;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  version: number;
  tier?: SubscriptionTier;
  billingCycle?: "monthly" | "yearly";
}

export interface SaaSInvoice {
  id: string;
  tenantId: string;
  date: string;
  dueDate: string;
  amount: number;
  tier: SubscriptionTier;
  status: SaaSInvoiceStatus;
  qrisData?: string;
  billingCycle?: "monthly" | "yearly";
  autoRenew?: boolean;
  version?: number;
  pdfUrl?: string;
  confirmationLink?: string;
  message?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  customDomainVerifiedAt?: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  trialEndsAt: string;
  createdAt: string;
  version?: number;
  limits: TenantLimits;
  branding: TenantBranding;
  settings: TenantSettings;
  billingHistory: SaaSInvoice[];
  rbacMatrix?: Record<string, string[]>;
  moduleConfigs?: Record<string, any>;
  isOnboarded?: boolean;
  onboardingStep?: number;
  address?: string;
}

// ==========================================
// 2. AUTH, LOGIN, ROLE & PERMISSION
// ==========================================

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  KASIR = "KASIR",
  TEKNISI = "TEKNISI",
  SALES = "SALES",
  HR = "HR",
  CUSTOMER = "CUSTOMER",
  ANONYMOUS = "ANONYMOUS",
}

export interface UserSession {
  id: string;
  device: string;
  ip: string;
  location?: string;
  loginTime: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  tenantId?: string; // Empty if Super Admin
  branchIds: string[]; // User can belong to multiple branches
  permissions: string[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  loginHistory: { ip: string; device: string; timestamp: string }[];
  activeSessions: UserSession[];
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  location: string;
}

// ==========================================
// 3. SERVICE MANAGEMENT & TICKETING
// ==========================================

export enum ServiceStatus {
  DRAFT = "DRAFT",
  BOOKING = "BOOKING",
  DITERIMA = "DITERIMA",
  ANTRIAN = "ANTRIAN",
  DIAGNOSA = "DIAGNOSA",
  ESTIMATE_PENDING = "ESTIMATE_PENDING", // New status
  MENUGGU_APPROVAL = "MENUGGU_APPROVAL",
  APPROVAL_DITOLAK = "APPROVAL_DITOLAK",
  MENUGGU_SPAREPART = "MENUGGU_SPAREPART",
  SEDANG_DIKERJAKAN = "SEDANG_DIKERJAKAN",
  DIKIRIM_KE_VENDOR = "DIKIRIM_KE_VENDOR", // Subkon
  REWORK = "REWORK",
  QC = "QC",
  SELESAI = "SELESAI",
  MENUGGU_PEMBAYARAN = "MENUGGU_PEMBAYARAN",
  SIAP_DIAMBIL = "SIAP_DIAMBIL",
  DIAMBIL = "DIAMBIL",
  DIBATALKAN = "DIBATALKAN",
  KLAIM_GARANSI = "KLAIM_GARANSI",
  TIDAK_BISA_DIPERBAIKI = "TIDAK_BISA_DIPERBAIKI",
  CUSTOMER_TIDAK_MERESPON = "CUSTOMER_TIDAK_MERESPON",
  BARANG_TIDAK_DIAMBIL = "BARANG_TIDAK_DIAMBIL",
  RUSAK = "RUSAK",
}

export interface ServiceTimelineEvent {
  status: ServiceStatus;
  note: string;
  timestamp: string;
  operator: string;
}

export interface SparepartUsage {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serialNumber?: string;
}

export interface MicroComponentUsage {
  id: string;
  componentId: string;
  name: string;
  quantity: number;
  unitCost: number;
  hppTotal: number;
  chargeable: boolean;
  unitPrice: number;
  chargeTotal: number;
  consumedAt?: string;
}

export interface MicroComponent {
  id: string;
  tenantId: string;
  warehouseId?: string;
  productId?: string;
  isActive?: boolean;
  name: string;
  sku: string;
  category: string;
  rackId: string;
  drawerId: string;
  stockQty: number;
  minStock: number;
  compatModels: string[];
  purchaseCost: number;
  sellPrice: number;
  supplierName?: string;
  avgWeeklyConsumption?: number;
  leadTimeDays?: number;
}

export interface ServiceTicket {
  id: string;
  tenantId: string;
  branchId: string;
  ticketNo: string;
  customerId: string;
  deviceName: string;
  deviceSerial?: string;
  deviceBrandModel: string;
  initialChecklist: { name: string; checked: boolean }[];
  initialPhotos: string[];
  customerComplaints: string;
  techDiagnosis?: string;
  estimatedCost: number;
  customerApprovalStatus: "PENDING" | "APPROVED" | "REJECTED" | string;
  customerApprovalDate?: string;
  assignedTechId?: string;
  partsUsed: SparepartUsage[];
  microComponentUsages?: MicroComponentUsage[];
  qcScore?: number;
  qcChecklist?: { criteria: string; passed: boolean }[];
  qcPhotos?: string[];
  qcNotes?: string;
  status: ServiceStatus;
  timeline: ServiceTimelineEvent[];
  warrantyMonths: number;
  warrantyEndsAt?: string;
  invoiceId?: string;
  isOutsourced: boolean;
  outsourcedVendorId?: string;
  outsourcingCost?: number;
  supplierRmaId?: string;
  downPayment?: number;
  isCheckOnly?: boolean;
  warrantyCardSent?: boolean;
  warrantyCardUrl?: string;
  deviceCategory?: string;
  accessoriesLeft?: string[];
  customAccessories?: string;
  physicalCondition?: string;
  screenLockPin?: string;
  estimatedCompletionDate?: string;
  capturedConditions?: {
    id: string;
    category: string;
    photoUrl?: string;
    url: string;
    timestamp: string;
  }[];
  provisionalSignature?: string; // Digital signature base64 or SVG path
  provisionalApprovedAt?: string; // Time of digital approval
  paymentMethod?: PaymentMethod;
  paymentRef?: string;
  paymentProofName?: string;
  tempoDays?: number;
  handoverAt?: string;
  estimateApproved?: boolean;
  notes?: string;
  provisionalSignatureName?: string; // Name of person who signed
  dynamicFields?: Record<string, string>; // Dynamic specification input values
  technicianNotes?: string; // Internal tech notes
  qcStatus?: "PASSED" | "FAILED" | string;
  internalDiscussions?: {
    id: string;
    text: string;
    operator: string;
    timestamp: string;
  }[]; // Internal comments
  repairStartTime?: string; // Timer SLA Start
  repairEndTime?: string; // Timer SLA End
  techPreChecklist?: { criteria: string; passed: boolean }[];
  techPostChecklist?: { criteria: string; passed: boolean }[];
  partsRequested?: {
    id: string;
    sparepartId: string;
    qty: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    requestedAt: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  storageLocationId?: string; // Physical rack/locker where the customer unit is stored
}

// ==========================================
// 4. FIELD SERVICE (HOME SERVICE)
// ==========================================

export interface FieldServiceVisit {
  id: string;
  tenantId: string;
  branchId: string;
  serviceId: string;
  techId: string;
  scheduledAt: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLoc?: { lat: number; lng: number; address: string };
  checkOutLoc?: { lat: number; lng: number; address: string };
  digitalSignature?: string; // base64 photo
  proofPhotos: string[];
  notes: string;
  visitReport?: string;
  commissionEarned: number;
  customerId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  technicianName?: string;
  issue?: string;
}

// ==========================================
// 5. CUSTOMER & CRM
// ==========================================

export enum CustomerSegment {
  PERSONAL = "PERSONAL",
  CORPORATE = "CORPORATE",
}

export interface CRMQuotation {
  id: string;
  date: string;
  subject: string;
  amount: number;
  status: "DRAFT" | "SENT" | "APPROVED" | "EXPIRED";
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  segment: CustomerSegment;
  companyName?: string;
  npwp?: string;
  tags: string[];
  notes?: string;
  loyaltyPoints?: number;
  storeCredit?: number;
  referralCode?: string;
  salesPipelineStage?: "LEAD" | "OPPORTUNITY" | "QUOTATION" | "WON" | "LOST";
  quotations?: CRMQuotation[];
  totalSpend?: number;
}

// ==========================================
// 6. POS & CASHIER
// ==========================================

export interface POSItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export enum PaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  QRIS = "QRIS",
  EDC = "EDC",
  E_WALLET = "E_WALLET",
  DEPOSIT = "DEPOSIT",
  TEMPO = "TEMPO",
}

export interface POSShift {
  id: string;
  tenantId: string;
  branchId: string;
  cashierId: string;
  openedAt: string;
  closedAt?: string;
  startingCash: number;
  expectedEndingCash?: number;
  actualEndingCash?: number;
  difference?: number;
  cashInHand?: number;
  notes?: string;
  status: "OPEN" | "CLOSED";
}

export interface POSTransaction {
  id: string;
  tenantId: string;
  branchId: string;
  shiftId: string;
  invoiceNo: string;
  customerId: string;
  items: POSItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: string;
  amountPaid: number;
  changeAmount: number;
  timestamp: string;
  isRefunded: boolean;
  refundReason?: string;
  notes?: string;
  depositUsed: number;
  postedToLedger: boolean;
}

// ==========================================
// 7. INVENTORY, USED ITEMS, PROCUREMENT
// ==========================================

export enum ItemGrade {
  NEW = "NEW",
  GRADE_A = "GRADE_A",
  GRADE_B = "GRADE_B",
  GRADE_C = "GRADE_C",
  GRADE_D = "GRADE_D",
}

export interface InventoryProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode: string;
  category: "SPAREPART" | "AKSESORIS" | "JASA" | "LAINNYA";
  itemType?: "RETAIL_PRODUCT" | "SERVICE_PART" | "MICRO_COMPONENT" | "CONSUMABLE";
  isActive?: boolean;
  purchaseCost: number; // HPP (Average Cost)
  sellPrice: number;
  unit: string;
  minStock: number;
  reorderLevel: number;
  stockQty: number; // Global stock
  stock?: number; // Optional alias for stockQty
  warehouseStock: { [warehouseId: string]: number };
  batchNo?: string;
  serialNo?: string;
  grade: ItemGrade;
  isConsignment: boolean;
  consignorId?: string; // owner of the consignment product
  consignmentPrice?: number;
  storageLocationId?: string; // Rack / shelf location for physical pickup
}

export interface StorageLocation {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;      // Contoh: "Rak A - Layar"
  code: string;      // Contoh: "RAK-A1"
  type: "SPAREPART" | "UNIT_SERVICE";
  description?: string;
  occupiedTicketIds?: string[]; // Menyimpan ID tiket servis yang sedang ditaruh di sini
}

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "RESERVATION";
  quantity: number;
  referenceNo: string; // TicketNo, InvoiceNo, PO etc.
  note: string;
  timestamp: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNo: string;
  vendorId: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    costPrice: number;
  }[];
  status: "PENDING" | "APPROVED" | "ORDERED" | "RECEIVED" | "CANCELLED";
  totalAmount: number;
  createdAt: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  outstandingDebt: number;
}

// ==========================================
// 8. DOUBLE-ENTRY ACCOUNTING & FINANCE
// ==========================================

export enum AccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

export interface COAAccount {
  id: string;
  tenantId: string;
  code: string; // e.g. "10100" (Kas), "40100" (Pendapatan Jasa)
  name: string;
  type: AccountType;
  isGroup?: boolean;
  balance: number;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  branchId: string;
  entryDate: string;
  refNo: string; // Ticket No, Invoice No, Cash Voucher No
  description: string;
  lines: JournalLine[];
  isPosted: boolean;
  postedBy: string;
  sourceType?: string;
  sourceId?: string;
  createdAt?: string;
  isReversalOf?: string; // links to reversed entry id
}

export interface CashTransaction {
  id: string;
  tenantId: string;
  branchId: string;
  type: "CASH_IN" | "CASH_OUT" | "TRANSFER";
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  description: string;
  timestamp: string;
  operator: string;
}

// ==========================================
// 9. HRM / HRD TYPES
// ==========================================

export interface WorkShift {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  latitude: number;
  longitude: number;
  radius: number; // acceptable radius in meters (e.g., 100)
}

export interface Employee {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  position: string;
  division: string;
  contractStatus: "PERMANENT" | "CONTRACT" | "INTERN";
  basicSalary: number;
  email: string;
  phone: string;
  attendanceHistory: {
    date: string;
    checkIn: string;
    checkOut?: string;
    status: "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
    shiftId?: string;
    shiftName?: string;
    clockInLat?: number;
    clockInLng?: number;
    clockInDistance?: number;
    clockInValid?: boolean;
    clockOutLat?: number;
    clockOutLng?: number;
    clockOutDistance?: number;
    clockOutValid?: boolean;
    workHours?: number;
  }[];
  leaves: {
    id: string;
    start: string;
    end: string;
    type: "ANNUAL" | "SICK" | "UNPAID";
    status: "PENDING" | "APPROVED" | "REJECTED";
    reason: string;
  }[];
  cashAdvances?: {
    id: string;
    date: string;
    amount: number;
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
    approvedBy?: string;
  }[];
  contractStartDate?: string;
  contractEndDate?: string;
  joinDate?: string;
  address?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  npwp?: string;
  bpjsKesehatanNo?: string;
  bpjsKetenagakerjaanNo?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  photoUrl?: string;
  documents?: EmployeeDocument[];
  overtimeHistory?: OvertimeRecord[];
  disciplinaryActions?: DisciplinaryAction[];
  trainingRecords?: TrainingRecord[];
  resignations?: Resignation[];
  performanceReviews?: PerformanceReview[];
  status?: "ACTIVE" | "RESIGNED" | "TERMINATED" | "ON_LEAVE";
  resignedAt?: string;
  lastWorkingDate?: string;
  exitInterviewNotes?: string;
  settlementAmount?: number;
}

export interface EmployeeDocument {
  id: string;
  type: "KTP" | "SK" | "CONTRACT" | "CV" | "CERTIFICATE" | "OTHER";
  name: string;
  fileUrl: string;
  uploadedAt: string;
  expiresAt?: string;
}

export interface OvertimeRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  rate: "1.5X" | "2X";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  totalAmount: number;
}

export interface DisciplinaryAction {
  id: string;
  date: string;
  level: "SP1" | "SP2" | "SP3" | "WARNING" | "TERMINATION";
  reason: string;
  description: string;
  issuedBy: string;
  acknowledgedBy?: string;
  attachments?: string[];
}

export interface TrainingRecord {
  id: string;
  title: string;
  provider: string;
  startDate: string;
  endDate: string;
  hours: number;
  cost: number;
  certificate?: string;
  status: "PLANNED" | "ONGOING" | "COMPLETED";
  notes?: string;
}

export interface Resignation {
  id: string;
  employeeId: string;
  submittedAt: string;
  lastWorkingDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  clearanceChecklist?: { item: string; cleared: boolean }[];
  settlementAmount?: number;
  exitInterviewNotes?: string;
}

export interface PerformanceReview {
  id: string;
  reviewDate: string;
  period: string;
  overallScore: number;
  criteria: { name: string; score: number; weight: number }[];
  reviewedBy: string;
  comments?: string;
  goals?: string[];
}

export interface Payroll {
  id: string;
  tenantId: string;
  employeeId: string;
  monthYear: string;
  basicSalary: number;
  commissions: number;
  allowances: number;
  overtimePay: number;
  thrAmount: number;
  bpjsKesehatan: number;
  bpjsKetenagakerjaan: number;
  pph21: number;
  deductions: number;
  kasbonDeduction: number;
  netSalary: number;
  status: "DRAFT" | "PAID";
  paidAt?: string;
  breakdown?: {
    label: string;
    amount: number;
    type: "INCOME" | "DEDUCTION";
  }[];
}

export interface TechnicianCommission {
  id: string;
  tenantId: string;
  branchId: string;
  employeeId: string;
  serviceId?: string;
  posTransactionId?: string;
  type: "SERVICE" | "SALES" | "FIELD";
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  timestamp: string;
}

// ==========================================
// 10. MARKETING, LOYALTY, VOUCHERS
// ==========================================

export interface Voucher {
  id: string;
  tenantId: string;
  code: string;
  type: "DISCOUNT" | "CASHBACK" | "STORE_CREDIT";
  discountType: "PERCENTAGE" | "VALUE";
  value: number; // e.g. 10 for 10% or 50000 for Rp50.000
  minTransaction: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
}

// ==========================================
// 11. HELPDESK & PROJECTS
// ==========================================

export interface SupportTicket {
  id: string;
  tenantId: string;
  customerId: string;
  subject: string;
  category: "SERVICE" | "BILLING" | "TECHNICAL";
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedTo?: string;
  messages: { sender: string; message: string; timestamp: string }[];
}

export interface ProjectTask {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string;
  assigneeId?: string;
}

// ==========================================
// 12. AUDIT LOGS, FRAUD ALERTS & SYSTEMS
// ==========================================

export interface AuditLog {
  id: string;
  tenantId?: string;
  branchId?: string;
  userId: string;
  userName: string;
  timestamp: string;
  action: string;
  details: string;
  ipAddress: string;
  category:
    | "AUTH"
    | "FINANCE"
    | "INVENTORY"
    | "ADMIN"
    | "SERVICE"
    | "SECURITY"
    | "SYSTEM"
    | "CRM"
    | "SALES";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface FraudAlert {
  id: string;
  tenantId: string;
  branchId: string;
  type:
    | "VOID_SALE"
    | "LARGE_DISCOUNT"
    | "HPP_MODIFIED"
    | "SERVICE_RELEASE_UNPAID"
    | "LOGIN_ANOMALY";
  message: string;
  riskLevel: "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  operator: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolutionNote?: string;
}

// ==========================================
// 13. AUTOMATED ERP WORKFLOWS
// ==========================================

export interface ERPWorkflow {
  id: string;
  tenantId: string;
  name: string;
  triggerType:
    "INVOICE_UNPAID" | "TICKET_CREATED" | "STOCK_LOW" | "SHIFT_CLOSED";
  triggerCondition: string; // e.g., "> 30"
  actionType: "WHATSAPP" | "EMAIL" | "JOURNAL_ENTRY" | "FRAUD_ALERT";
  actionPayload: string;
  isActive: boolean;
  lastTriggeredAt?: string;
  executionCount: number;
}

export type WorkflowRule = ERPWorkflow;

// ==========================================
// 14. MULTI-BRANCH INVENTORY TRANSFERS
// ==========================================

export interface TransferItem {
  productId: string;
  quantity: number;
  qty?: number;
}

export interface InventoryTransfer {
  id: string;
  tenantId: string;
  transferNo: string;
  originWarehouseId: string;
  destinationWarehouseId: string;
  items: TransferItem[];
  status: "REQUEST_CREATED" | "PACKED" | "SHIPPED" | "RECEIVED";
  note: string;
  createdAt: string;
  updatedAt: string;
  history: {
    status: "REQUEST_CREATED" | "PACKED" | "SHIPPED" | "RECEIVED";
    timestamp: string;
    note?: string;
  }[];
}

export interface InternalMessage {
  id: string;
  tenantId: string;
  sender: string;
  senderRole: string;
  message: string;
  timestamp: string;
  recipientId?: string;
  ticketId?: string;
}

export interface PlatformHealth {
  status: "checking" | "ok" | "degraded" | "down" | "local";
  checkedAt?: string;
  components?: {
    api?: { status: string; latencyMs?: number };
    auth?: { status: string };
    database?: {
      status: string;
      latencyMs?: number;
      tenantCount?: number;
      userCount?: number;
    };
    billing?: { status: string; openInvoices?: number; overdue?: number };
    notificationOutbox?: { status: string; failed?: number; pending?: number; lastSentAt?: string | null };
    backup?: { status: string; lastJobAt?: string; message?: string };
    incidents?: { status: string; open?: number; critical?: number };
  };
  message?: string;
}

export interface SuperAdminMetrics {
  mrr: number;
  arr: number;
  receivedThisMonth: number;
  outstanding: number;
  overdueInvoices: number;
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  pendingManualPayments: number;
  trialExpiring: number;
  unreadNotifications: number;
}

export interface SuperAdminActionItem {
  id: string;
  severity: "info" | "warning" | "critical";
  count: number;
  label: string;
  targetTab: string;
  targetFilter?: string;
}

export interface SuperAdminOverview {
  metrics: SuperAdminMetrics;
  actions: SuperAdminActionItem[];
  generatedAt: string;
  source: "database";
}

export interface TenantUsageSummary {
  usedMb: number;
  limitMb: number;
  percent: number;
  source: "actual" | "estimated";
  measuredAt?: string;
}

export interface SuperAdminTenantSummary extends Tenant {
  version: number;
  userCount: number;
  branchCount: number;
  transactionCount: number;
  serviceCount: number;
  overdueCount: number;
  lastActivityAt?: string;
  statusReason?: string;
  scheduledReactivationAt?: string;
  usage: TenantUsageSummary;
}

export interface ImpersonationSession {
  id: string;
  tenantId: string;
  tenantName: string;
  reason: string;
  ticketId?: string;
  accessMode: "READ_ONLY" | "FULL";
  startedAt: string;
  expiresAt: string;
}

export interface SuperAdminAuditEvent {
  id: string;
  actorName?: string;
  tenantName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome: "SUCCESS" | "DENIED" | "FAILED";
  clientIp?: string;
  correlationId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}


