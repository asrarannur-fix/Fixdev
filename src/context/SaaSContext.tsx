/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { safeLocalStorage } from "../utils/safeStorage";
import { applyTenantBranding } from "../utils/branding";
import {
  Tenant,
  SubscriptionTier,
  TenantStatus,
  User,
  UserRole,
  Branch,
  Warehouse,
  Customer,
  CustomerSegment,
  InventoryProduct,
  ItemGrade,
  MicroComponent,
  MicroComponentUsage,
  ServiceTicket,
  ServiceStatus,
  FieldServiceVisit,
  POSShift,
  POSTransaction,
  PaymentMethod,
  COAAccount,
  AccountType,
  JournalEntry,
  CashTransaction,
  Employee,
  Payroll,
  TechnicianCommission,
  Voucher,
  SupportTicket,
  ProjectTask,
  AuditLog,
  FraudAlert,
  ERPWorkflow,
  StockMovement,
  InventoryTransfer,
  TransferItem,
  WorkShift,
  InternalMessage,
  PlatformHealth,
} from "../types";

import {
  INITIAL_TENANTS,
  INITIAL_BRANCHES,
  INITIAL_WAREHOUSES,
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SERVICES,
  INITIAL_COA,
  INITIAL_EMPLOYEES,
  INITIAL_VOUCHERS,
  INITIAL_AUDITS,
  INITIAL_WORK_SHIFTS,
  INITIAL_TRANSACTIONS,
  seedCashTransactions,
} from "../mocks/seedData";
import { mockApi } from "../mocks/api";
import {
  toCamelCase,
  toSnakeCase,
  safeArray,
  parseArray,
  generateUUID,
  deepUUIDify,
  isUUID,
  deterministicUUID,
  ensureUUID,
} from "../utils/saasUtils";
import {
  cleanUserForDb,
  isBackendConfigured,
  getAuthClient,
} from "../utils/authClient";
import { useSaaSPOS } from "../hooks/useSaaSPOS";
import { useSaaSInventory } from "../hooks/useSaaSInventory";
import { readJsonResponse } from "../utils/apiResponse";

const localStorage = safeLocalStorage;



const STATE_TO_TABLE_MAP: Record<string, string> = {
  tenants: "tenants",
  branches: "branches",
  warehouses: "warehouses",
  users: "users",
  customers: "customers",
  products: "products",
  services: "service_tickets",
  transactions: "pos_transactions",
  shifts: "pos_shifts",
  accounts: "coa_accounts",
  journals: "journal_entries",
  auditLogs: "audit_logs",
};

let syncToApi: (
  tableKey: string,
  action: "insert" | "update" | "delete",
  data: any,
  idField?: string,
) => Promise<void> = async () => {};

interface SaaSContextType {
  // Config & State
  tenants: Tenant[];
  currentTenantId: string;
  currentBranchId: string;
  currentUser: User;
  users: User[];
  branches: Branch[];
  warehouses: Warehouse[];
  customers: Customer[];
  products: InventoryProduct[];
  microComponents: MicroComponent[];
  microComponentsLoading: boolean;
  microComponentsError: string;
  services: ServiceTicket[];
  fieldVisits: FieldServiceVisit[];
  shifts: POSShift[];
  transactions: POSTransaction[];
  accounts: COAAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<COAAccount[]>>;
  journals: JournalEntry[];
  cashTransactions: CashTransaction[];
  employees: Employee[];
  payroll: Payroll[];
  commissions: TechnicianCommission[];
  vouchers: Voucher[];
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
  supportTickets: SupportTicket[];
  tasks: ProjectTask[];
  auditLogs: AuditLog[];
  fraudAlerts: FraudAlert[];
  workflows: ERPWorkflow[];
  stockMovements: StockMovement[];
  inventoryTransfers: InventoryTransfer[];
  workShifts: WorkShift[];
  internalMessages: InternalMessage[];
  apiLoading: boolean;
  apiStatus: string;

  // Scoped Data Arrays (Strictly Isolated Filters)
  scopedProducts: InventoryProduct[];
  scopedServices: ServiceTicket[];
  scopedTransactions: POSTransaction[];
  scopedUsers: User[];
  scopedCustomers: Customer[];
  scopedEmployees: Employee[];
  scopedAccounts: COAAccount[];
  scopedJournals: JournalEntry[];
  scopedCashTransactions: CashTransaction[];
  scopedShifts: POSShift[];
  scopedWorkflows: ERPWorkflow[];
  scopedWarehouses: Warehouse[];
  scopedBranches: Branch[];
  scopedFieldVisits: FieldServiceVisit[];
  scopedWorkShifts: WorkShift[];
  scopedPayroll: Payroll[];
  scopedCommissions: TechnicianCommission[];
  scopedVouchers: Voucher[];
  scopedSupportTickets: SupportTicket[];
  scopedInternalMessages: InternalMessage[];

  // Tenant/Branch selector
  switchTenant: (id: string) => void;
  switchBranch: (id: string) => void;
  switchRole: (role: UserRole) => void;

  // Middleware and Utilities
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
  verifyScope: (
    tenantId?: string,
    branchId?: string,
  ) => { tenantId: string; branchId: string };

  // Actions
  addTenant: (
    tenant: Omit<Tenant, "id" | "createdAt" | "billingHistory">,
  ) => Promise<{ tenant: Tenant; branch: Branch }>;
  updateTenantStatus: (id: string, status: TenantStatus) => void;
  impersonateTenant: (tenantId: string) => void;
  exitImpersonate: () => void;
  isImpersonating: boolean;
  updateTenant: (id: string, updates: Partial<Tenant>) => Promise<void>;

  addServiceTicket: (
    ticket: Omit<ServiceTicket, "id" | "ticketNo" | "timeline" | "status"> & {
      tenantId?: string;
      branchId?: string;
      customerData?: { name: string; phone: string; email?: string; address?: string };
    },
  ) => Promise<ServiceTicket>;
  updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => void;
  loadMicroComponents: () => Promise<MicroComponent[]>;
  createMicroComponent: (data: Omit<MicroComponent, "id" | "tenantId">) => Promise<MicroComponent>;
  updateMicroComponent: (id: string, data: Partial<MicroComponent>) => Promise<MicroComponent[]>;
  adjustMicroComponentStock: (id: string, data: { warehouseId: string; mode: "IN" | "OUT" | "SET"; quantity: number; reason: string; referenceNo?: string; idempotencyKey: string }) => Promise<MicroComponent>;
  consumeMicroComponentForService: (componentId: string, data: {
    ticketId: string; warehouseId?: string; quantity: number; chargeable: boolean; unitPrice?: number;
    note?: string; idempotencyKey: string;
  }) => Promise<{ usage: MicroComponentUsage; component: MicroComponent; ticket: ServiceTicket; idempotent: boolean }>;
  requestServicePart: (id: string, part: { productId: string; warehouseId: string; quantity: number; serialNumber?: string }) => Promise<void>;
  cancelServicePart: (id: string, partId: string) => Promise<void>;
  patchServiceWork: (id: string, updates: Record<string, any>) => Promise<void>;
  addApprovedAdditionalCost: (id: string, data: {
    description: string; amount: number; approvalMethod: "WHATSAPP" | "PHONE" | "IN_PERSON";
    approvedByName?: string; note?: string; proofName?: string; idempotencyKey: string;
  }) => Promise<void>;
  createServicePartOrder: (id: string, data: Record<string, any>) => Promise<any>;
  updateServicePartOrder: (id: string, orderId: string, data: Record<string, any>) => Promise<any>;
  receiveServicePartOrder: (id: string, orderId: string, data: Record<string, any>) => Promise<any>;
  cancelServicePartOrder: (id: string, orderId: string) => Promise<any>;
  updateServiceStatus: (
    id: string,
    status: ServiceStatus,
    note: string,
  ) => Promise<void>;
  addServiceDiagnostic: (
    id: string,
    diagnosis: string,
    estCost: number,
    parts: any[],
  ) => Promise<void>;
  approveServiceEstimate: (
    id: string,
    approved: boolean,
    signatureName?: string,
    signatureText?: string,
  ) => Promise<void>;
  completeServiceQC: (
    id: string,
    score: number,
    notes: string,
    passed: boolean,
  ) => Promise<void>;
  handoverServiceDevice: (
    id: string,
    paymentMethod: PaymentMethod,
    details?: { refNo?: string; proofName?: string; tempoDays?: number },
  ) => Promise<void>;
  triggerCustomerNotification: (
    ticket: ServiceTicket,
    status: ServiceStatus,
    noteText: string,
  ) => void;
  addCashTransaction: (
    tx: Omit<
      CashTransaction,
      "id" | "tenantId" | "branchId" | "timestamp" | "operator"
    >,
  ) => void;

  checkInFieldService: (
    visitId: string,
    lat: number,
    lng: number,
    address: string,
  ) => void;
  checkOutFieldService: (
    visitId: string,
    lat: number,
    lng: number,
    address: string,
    sig: string,
    report: string,
    proofPhoto?: string,
  ) => void;

  openShift: (startingCash: number) => Promise<any>;
  closeShift: (actualEndingCash: number, notes: string) => Promise<any>;
  createPOSTransaction: (
    customerId: string,
    cart: { product: InventoryProduct; qty: number; discount: number }[],
    paymentMethod: PaymentMethod,
    amountPaid: number,
    depositUsed: number,
    paymentDetails?: string,
  ) => Promise<POSTransaction>;
  refundTransaction: (txId: string, reason: string) => Promise<any>;
  addInventoryProduct: (
    product: Omit<InventoryProduct, "id" | "tenantId"> & { tenantId?: string },
  ) => void;
  updateInventoryProduct: (
    productId: string,
    data: Partial<InventoryProduct> & { tenantId?: string },
  ) => void;
  transferProductStock: (
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    note: string,
  ) => void;
  adjustProductStock: (
    productId: string,
    warehouseId: string,
    adjustmentQty: number,
    type: "IN" | "OUT" | "ADJUSTMENT",
    note: string,
  ) => void;
  createInventoryTransfer: (data: {
    originWarehouseId: string;
    destinationWarehouseId: string;
    items: TransferItem[];
    note: string;
  }) => void;
  updateInventoryTransferStatus: (
    transferId: string,
    status: "REQUEST_CREATED" | "PACKED" | "SHIPPED" | "RECEIVED",
    note?: string,
  ) => void;

  addEmployee: (
    employee: Omit<
      Employee,
      "id" | "tenantId" | "attendanceHistory" | "leaves"
    >,
  ) => void;
  updateEmployee: (employeeId: string, data: Partial<Employee>) => void;
  recordAttendance: (
    employeeId: string,
    date: string,
    checkIn: string,
    checkOut?: string,
    status?: "PRESENT" | "LATE" | "ABSENT" | "LEAVE",
  ) => void;
  bulkCheckIn: () => void;
  submitLeave: (
    employeeId: string,
    leave: Omit<Employee["leaves"][number], "id" | "status">,
  ) => void;
  approveLeave: (
    employeeId: string,
    leaveId: string,
    status: "APPROVED" | "REJECTED",
  ) => void;
  requestCashAdvance: (
    employeeId: string,
    data: { amount: number; reason: string; date: string },
  ) => void;
  approveCashAdvance: (
    employeeId: string,
    advanceId: string,
    status: "APPROVED" | "REJECTED",
    approvedBy: string,
  ) => void;

  addWorkShift: (shift: Omit<WorkShift, "id" | "tenantId">) => void;
  deleteWorkShift: (id: string) => void;
  updateWorkShift: (id: string, data: Partial<WorkShift>) => void;
  clockInStaff: (
    employeeId: string,
    shiftId: string,
    lat: number,
    lng: number,
    note?: string,
  ) => void;
  clockOutStaff: (
    employeeId: string,
    lat: number,
    lng: number,
    note?: string,
  ) => void;

  addJournalEntry: (
    refNo: string,
    desc: string,
    lines: { accountId: string; debit: number; credit: number }[],
  ) => void;
  generatePayroll: (monthYear: string) => void;
  claimWarranty: (ticketId: string, complaints: string) => void;
  addSupportMessage: (
    ticketId: string,
    sender: string,
    message: string,
  ) => void;
  addInternalMessage: (
    sender: string,
    senderRole: string,
    message: string,
    recipientId?: string,
    ticketId?: string,
  ) => void;
  updateTaskStatus: (taskId: string, status: ProjectTask["status"]) => void;
  triggerFraudAlert: (
    type: FraudAlert["type"],
    message: string,
    riskLevel: FraudAlert["riskLevel"],
  ) => void;
  resolveFraudAlert: (id: string) => void;

  // Workflows & Staff CRUD
  addWorkflow: (
    workflow: Omit<ERPWorkflow, "id" | "executionCount"> & {
      executionCount?: number;
    },
  ) => Promise<void>;
  updateWorkflow: (id: string, updates: Partial<ERPWorkflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  executeWorkflow: (id: string) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserPermissions: (userId: string, permissions: string[]) => void;
  addUser: (
    user: Omit<
      User,
      "id" | "permissions" | "loginHistory" | "activeSessions" | "mfaEnabled"
    >,
  ) => Promise<void> | void;
  deleteUser: (userId: string) => Promise<void> | void;
  addCustomer: (customer: Omit<Customer, "id" | "tenantId">) => Customer;
  updateCustomer: (customerId: string, data: Partial<Customer>) => void;

  // Marketplace Sync Integration Helpers
  updateProductStock: (productId: string, newQty: number) => void;
  addMarketplaceSale: (
    invoiceNo: string,
    platform: string,
    items: { productId: string; qty: number; price: number }[],
    totalAmount: number,
    adminFee: number,
  ) => void;

  triggerBackup: () => any;
  restoreBackup: (backupData: any) => void;
  reseedCOAAccounts: (tenantId: string, template: string) => void;

  // Branch CRUD
  addBranch: (branchData: Omit<Branch, "id" | "tenantId">) => Branch;
  updateBranch: (
    branchId: string,
    branchData: Partial<Omit<Branch, "id" | "tenantId">>,
  ) => void;
  deleteBranch: (branchId: string) => void;

  // Global Theme
  theme: "light" | "dark";
  toggleTheme: () => void;
  addLog: (
    action: string,
    details: string,
    category: AuditLog["category"],
    riskLevel?: AuditLog["riskLevel"],
  ) => void;

  // Offline Synchronization States & Helpers
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineQueue: any[];
  addOfflineAction: (action: {
    type: string;
    label: string;
    payload: any;
  }) => void;
  clearOfflineQueue: () => void;
  removeOfflineAction: (id: string) => void;
  platformHealth: PlatformHealth;
  refreshPlatformHealth: () => Promise<void>;
  isAuthenticated: boolean;
  loginUser: (email: string, password?: string) => Promise<boolean>;
  logoutUser: () => Promise<void> | void;
  updateCurrentUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "overview",
    "data-explorer",
    "services-list",
    "services-new-ticket",
    "services-field-service",
    "services-qc",
    "services-rental",
    "services-warranty-claims",
    "services-knowledge-base",
    "pos-cashier",
    "pos-shifts",
    "pos-history",
    "pos-marketplace-hub",
    "inventory-stock",
    "inventory-tradein",
    "inventory-cannibal",
    "inventory-small-parts",
    "inventory-assets",
    "accounting-coa",
    "accounting-ledger",
    "accounting-statements",
    "hr-attendance",
    "hr-payroll",
    "hr-commission",
    "hr-kasbon",
    "action-services-qc-approve",
    "action-inventory-cannibal-scrap",
    "crm-customers",
    "crm-pipeline",
    "crm-whatsapp",
    "crm-marketing",
    "settings-branding",
    "settings-branches",
    "settings-whatsapp",
    "settings-storage",
    "settings-notifications",
    "settings-modules-config",
    "settings-workflows",
    "settings-rbac",
    "settings-audit",
    "settings-fraud",
    "settings-subscription",
    "action-pos-invoice-view",
    "action-pos-void-approve",
    "action-pos-discount-apply",
    "action-hr-salary-edit",
    "action-hr-payroll-approve",
    "action-services-qc-approve",
    "action-services-delete-ticket",
    "action-inventory-stock-adjust",
    "action-inventory-tradein-approve",
    "action-inventory-cannibal-scrap",
    "action-accounting-coa-create",
    "action-settings-workflows-edit",
  ],
  OWNER: [
    "overview",
    "data-explorer",
    "services-list",
    "services-new-ticket",
    "services-field-service",
    "services-qc",
    "services-rental",
    "services-warranty-claims",
    "services-knowledge-base",
    "pos-cashier",
    "pos-shifts",
    "pos-history",
    "pos-marketplace-hub",
    "inventory-stock",
    "inventory-tradein",
    "inventory-cannibal",
    "inventory-small-parts",
    "inventory-assets",
    "accounting-coa",
    "accounting-ledger",
    "accounting-statements",
    "hr-attendance",
    "hr-payroll",
    "hr-commission",
    "hr-kasbon",
    "action-services-qc-approve",
    "action-inventory-cannibal-scrap",
    "crm-customers",
    "crm-pipeline",
    "crm-whatsapp",
    "crm-marketing",
    "settings-branding",
    "settings-branches",
    "settings-whatsapp",
    "settings-notifications",
    "settings-modules-config",
    "settings-workflows",
    "settings-rbac",
    "settings-audit",
    "settings-fraud",
    "settings-subscription",
    "action-pos-invoice-view",
    "action-pos-void-approve",
    "action-pos-discount-apply",
    "action-hr-salary-edit",
    "action-hr-payroll-approve",
    "action-services-qc-approve",
    "action-services-delete-ticket",
    "action-inventory-stock-adjust",
    "action-inventory-tradein-approve",
    "action-inventory-cannibal-scrap",
    "action-accounting-coa-create",
    "action-settings-workflows-edit",
  ],
  ADMIN: [
    "overview",
    "data-explorer",
    "services-list",
    "services-new-ticket",
    "services-field-service",
    "services-qc",
    "services-rental",
    "services-warranty-claims",
    "services-knowledge-base",
    "pos-cashier",
    "pos-shifts",
    "pos-history",
    "pos-marketplace-hub",
    "inventory-stock",
    "inventory-tradein",
    "inventory-cannibal",
    "inventory-small-parts",
    "inventory-assets",
    "accounting-coa",
    "accounting-ledger",
    "accounting-statements",
    "hr-attendance",
    "hr-payroll",
    "hr-commission",
    "hr-kasbon",
    "crm-customers",
    "crm-pipeline",
    "crm-whatsapp",
    "crm-marketing",
    "settings-branding",
    "settings-whatsapp",
    "settings-notifications",
    "settings-modules-config",
    "settings-workflows",
    "settings-rbac",
    "settings-audit",
    "settings-subscription",
    "action-pos-invoice-view",
    "action-pos-discount-apply",
    "action-services-qc-approve",
    "action-inventory-stock-adjust",
    "action-inventory-tradein-approve",
  ],
  MANAGER: [
    "overview",
    "data-explorer",
    "services-list",
    "services-field-service",
    "pos-cashier",
    "pos-shifts",
    "pos-history",
    "inventory-stock",
    "inventory-assets",
    "hr-attendance",
    "hr-commission",
    "hr-kasbon",
    "action-services-qc-approve",
    "action-inventory-cannibal-scrap",
    "crm-customers",
    "crm-pipeline",
    "action-pos-invoice-view",
    "action-pos-discount-apply",
    "action-services-qc-approve",
    "action-inventory-tradein-approve",
  ],
  KASIR: [
    "overview",
    "data-explorer",
    "pos-cashier",
    "pos-shifts",
    "crm-customers",
    "action-pos-invoice-view",
  ],
  TEKNISI: [
    "overview",
    "data-explorer",
    "services-list",
    "services-new-ticket",
    "services-field-service",
    "services-qc",
    "services-warranty-claims",
    "services-knowledge-base",
    "inventory-small-parts",
    "hr-attendance",
    "hr-commission",
    "hr-kasbon",
    "action-services-qc-approve",
    "action-inventory-cannibal-scrap",
  ],
  SALES: ["overview", "pos-cashier", "crm-customers", "crm-pipeline"],
  HR: [
    "overview",
    "data-explorer",
    "hr-attendance",
    "hr-payroll",
    "hr-kasbon",
    "action-hr-salary-edit",
    "action-hr-payroll-approve",
  ],
};

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

// ==========================================
// SEED DATA INITIALIZERS (MOVED TO src/mocks/seedData.ts)
// ==========================================

// ==========================================
// CONTEXT PROVIDER COMPONENT
// ==========================================

// Prevent concurrent duplicate synchronization on initial component mount/hot-reload
// Menggunakan sessionStorage agar tidak di-reset oleh Vite HMR module invalidation
const SYNC_KEY = "__saas_sync_started__";
const isSyncStarted = () => sessionStorage.getItem(SYNC_KEY) === "1";
const markSyncStarted = () => sessionStorage.setItem(SYNC_KEY, "1");
const resetSync = () => sessionStorage.removeItem(SYNC_KEY);

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Helper to trigger safe toast notifications through App.tsx event listener
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    window.dispatchEvent(
      new CustomEvent("saas-toast", { detail: { message, type } }),
    );
  };

  // Config & State variables
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<string>("");



  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("saas_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("saas_theme", next);
      return next;
    });
  };

  // === AUTH STATE VERSIONING — must run before localStorage-backed state initializes ===
  // Bump version to force automatic cache reset when auth/tenant mapping changes.
  const AUTH_VERSION_KEY = "saas_auth_version";
  const CURRENT_AUTH_VERSION = "5";
  try {
    if (localStorage.getItem(AUTH_VERSION_KEY) !== CURRENT_AUTH_VERSION) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("saas_") && k !== "saas_theme") {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem(SYNC_KEY);
      localStorage.setItem(AUTH_VERSION_KEY, CURRENT_AUTH_VERSION);
    }
  } catch (_) {}

  const [tenants, setTenants] = useState<Tenant[]>(() =>
    parseArray<Tenant>("saas_tenants", isBackendConfigured() ? [] : INITIAL_TENANTS),
  );

  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    const saved = localStorage.getItem("saas_curr_tenant_id");
    return saved || "";
  });

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    const saved = localStorage.getItem("saas_curr_branch_id");
    return saved || "";
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem("saas_curr_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && parsed.id) return parsed;
      }
    } catch (_) {}
    return isBackendConfigured()
      ? ({ id: "", name: "", email: "", role: UserRole.ANONYMOUS, permissions: [], branchIds: [], loginHistory: [], activeSessions: [], mfaEnabled: false } as User)
      : INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    !isBackendConfigured() &&
    localStorage.getItem("saas_is_authenticated") === "true" &&
    !!localStorage.getItem("saas_curr_user"),
  );

  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return !!localStorage.getItem("saas_original_user");
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || currentUser.role === UserRole.ANONYMOUS) return;

    const fetchApiData = async () => {
      const hasCachedData = parseArray("saas_tenants", []).length > 0;
      if (!hasCachedData) {
        setApiLoading(true);
        setApiStatus("Memuat data real dari database...");
      }
      const fetchedData: { [key: string]: any[] } = {};
      let bootstrapFailure = "";

      try {
        // === PRIMARY PATH: Production-safe /api/bootstrap using backend verification ===
        try {
          if (!hasCachedData) {
            setApiStatus("Mengambil data via backend bootstrap...");
          }
          const client = getAuthClient();
          let accessToken = "";
          if (client) {
            const { data: sessionData } = await client.auth.getSession();
            accessToken = sessionData.session?.access_token || "";
          }
          const isSuperAdminProfile = currentUser.role === UserRole.SUPER_ADMIN;
          const bootstrapUrl = isSuperAdminProfile
            ? "/api/platform/bootstrap"
            : `/api/bootstrap?tenantId=${encodeURIComponent(currentTenantId)}`;
          const requestBootstrap = (token: string) => {
            const headers: Record<string, string> = token ? { Authorization: "Bearer " + token } : {};
            if (!isSuperAdminProfile) {
              try {
                const impersonation = JSON.parse(localStorage.getItem("saas_impersonation_session") || "null");
                if (impersonation?.id) headers["X-Impersonation-Session-ID"] = impersonation.id;
              } catch {}
            }
            return fetch(bootstrapUrl, { headers });
          };

          let bootstrapResponse = await requestBootstrap(accessToken);

          const bootstrap = await readJsonResponse<any>(bootstrapResponse, "Backend bootstrap");
          Object.assign(fetchedData, {
            tenants: safeArray(bootstrap.tenants),
            users: safeArray(bootstrap.users),
            user_branches: safeArray(bootstrap.userBranches),
            branches: safeArray(bootstrap.branches),
            warehouses: safeArray(bootstrap.warehouses),
            customers: safeArray(bootstrap.customers),
            products: safeArray(bootstrap.products),
            product_stock: safeArray(bootstrap.productStock),
            service_tickets: safeArray(bootstrap.serviceTickets),
            pos_transactions: safeArray(bootstrap.posTransactions),
            pos_shifts: safeArray(bootstrap.posShifts),
            coa_accounts: safeArray(bootstrap.coaAccounts),
            journal_entries: safeArray(bootstrap.journalEntries),
            audit_logs: safeArray(bootstrap.auditLogs),
            module_records: safeArray(bootstrap.moduleRecords),
          });
          setIsOnline(true);
        } catch (err) {
          bootstrapFailure = err instanceof Error ? err.message : "Backend bootstrap gagal.";
          console.warn("Backend bootstrap gagal:", err);
        }

        // === FALLBACK: Mock data (only if everything above returned nothing) ===
        const hasData = safeArray(fetchedData["tenants"]).length > 0 || safeArray(fetchedData["users"]).length > 0;
        if (!hasData) {
          setIsOnline(false);
          setTenants([]);
          setUsers([]);
          setBranches([]);
          setWarehouses([]);
          setCustomers([]);
          setProducts([]);
          setServices([]);
          setTransactions([]);
          setShifts([]);
          setAccounts([]);
          setJournals([]);
          setAuditLogs([]);
          showToast(
            bootstrapFailure || "Data database tidak tersedia. Periksa sesi dan coba lagi.",
            "error",
          );
          return;
        }
          const dbTenants = fetchedData["tenants"] || [];
          const dbUsers = fetchedData["users"] || [];
          const dbUserBranches = fetchedData["user_branches"] || [];
          const dbBranches = fetchedData["branches"] || [];
          const dbWarehouses = fetchedData["warehouses"] || [];
          const dbCustomers = fetchedData["customers"] || [];
          const dbProducts = fetchedData["products"] || [];
          const dbProductStock = fetchedData["product_stock"] || [];
          const dbServices = fetchedData["service_tickets"] || [];
          const dbTransactions = fetchedData["pos_transactions"] || [];
          const dbShifts = fetchedData["pos_shifts"] || [];
          const dbAccounts = fetchedData["coa_accounts"] || [];
          const dbJournals = fetchedData["journal_entries"] || [];
          const dbAudits = fetchedData["audit_logs"] || [];
          const dbModuleRecords = fetchedData["module_records"] || [];

          const tenantsList = dbTenants ? toCamelCase<Tenant[]>(dbTenants) : [];
          const userBranchRows = dbUserBranches ? toCamelCase<Array<{ userId: string; branchId: string }>>(dbUserBranches) : [];
          const userBranchMap = userBranchRows.reduce<Record<string, string[]>>((acc, row) => {
            acc[row.userId] = [...(acc[row.userId] || []), row.branchId];
            return acc;
          }, {});
          const usersList = dbUsers
            ? toCamelCase<User[]>(dbUsers).map((user) => ({
                ...user,
                branchIds: userBranchMap[user.id] || user.branchIds || [],
                loginHistory: user.loginHistory || [],
                activeSessions: user.activeSessions || [],
              }))
            : [];
          const productStockRows = dbProductStock
            ? toCamelCase<Array<{ productId: string; warehouseId: string; quantity: number }>>(dbProductStock)
            : [];
          const productStockMap = productStockRows.reduce<Record<string, Record<string, number>>>((acc, row) => {
            acc[row.productId] = { ...(acc[row.productId] || {}), [row.warehouseId]: row.quantity || 0 };
            return acc;
          }, {});
          const productsList = dbProducts
            ? toCamelCase<InventoryProduct[]>(dbProducts).map((product) => {
                const warehouseStock = productStockMap[product.id] || product.warehouseStock || {};
                const stockQty = Object.values(warehouseStock).reduce((sum, qty) => sum + Number(qty || 0), 0);
                return { ...product, warehouseStock, stockQty, stock: stockQty };
              })
            : [];
          const moduleRows = dbModuleRecords
            ? toCamelCase<Array<{ module: string; payload: any; deletedAt?: string }>>(dbModuleRecords).filter((row) => !row.deletedAt)
            : [];
          const modulePayloads = <T,>(module: string): T[] =>
            moduleRows.filter((row) => row.module === module).map((row) => toCamelCase<T>(row.payload));
          let branchesList = dbBranches
            ? toCamelCase<Branch[]>(dbBranches)
            : [];
          let warehousesList = dbWarehouses
            ? toCamelCase<Warehouse[]>(dbWarehouses)
            : [];

          // Self-healing: Ensure every tenant in DB has at least one branch and warehouse
          for (const t of tenantsList) {
            if (!branchesList.some((b) => b.tenantId === t.id)) {
              const branchId = generateUUID();
              branchesList.push({ id: branchId, tenantId: t.id, name: `Cabang Utama ${t.name}`, address: `Alamat Utama ${t.name}`, phone: "0812345678", isActive: true } as Branch);
              warehousesList.push({ id: generateUUID(), tenantId: t.id, branchId, name: "Gudang Utama", location: "Lt. 1" } as Warehouse);
            }
          }

          setTenants(tenantsList);
          setUsers(usersList);
          setBranches(branchesList);
          const activeBranchId = branchesList.find((b) => b.tenantId === currentTenantId)?.id || "";
          if (activeBranchId) {
            setCurrentBranchId(activeBranchId);
            localStorage.setItem("saas_curr_branch_id", activeBranchId);
            setCurrentUser((prev) => {
              const branchIds = branchesList.filter((b) => b.tenantId === currentTenantId).map((b) => b.id);
              const next = { ...prev, tenantId: currentTenantId, branchIds };
              localStorage.setItem("saas_curr_user", JSON.stringify(next));
              return next;
            });
          }
          setWarehouses(warehousesList);
          setCustomers(dbCustomers ? toCamelCase(dbCustomers) : []);
          setProducts(productsList);
          setServices(dbServices ? toCamelCase(dbServices) : []);
          setTransactions(dbTransactions ? toCamelCase(dbTransactions) : []);
          setShifts(dbShifts ? toCamelCase(dbShifts) : []);
          setAccounts(dbAccounts ? toCamelCase(dbAccounts) : []);
          setJournals(dbJournals ? toCamelCase(dbJournals) : []);
          setAuditLogs(dbAudits ? toCamelCase(dbAudits) : []);
          setEmployees(modulePayloads<Employee>("employees"));
          setPayroll(modulePayloads<Payroll>("payroll"));
          setWorkShifts(modulePayloads<WorkShift>("work_shifts"));
          setWorkflows(modulePayloads<ERPWorkflow>("workflows"));

          addLog(
            "Initial Data Loaded",
            "Berhasil memuat data dari seluruh tabel database.",
            "SYSTEM",
            "LOW",
          );
        } catch (err: any) {
          console.error("Gagal sinkronisasi data:", err);
          showToast(
            "Database tidak dapat dimuat. Data demo tidak digunakan; silakan coba lagi.",
            "error",
          );
          setIsOnline(false);
          setTenants([]);
          setUsers([]);
          setBranches([]);
          setWarehouses([]);
          setCustomers([]);
          setProducts([]);
          setServices([]);
          setTransactions([]);
          setShifts([]);
          setAccounts([]);
          setJournals([]);
          setAuditLogs([]);
        } finally {
          // ✅ DEFINITIF: finally SELALU dipanggil (sukses, error, maupun early return)
          setApiLoading(false);
          setApiStatus("");
        }
    };
    fetchApiData();
  }, [currentTenantId, currentUser?.id, currentUser?.role, isAuthenticated]);

  // === TENANT BRANDING INJECTION ===
  useEffect(() => {
    const root = document.documentElement;
    const active = tenants.find((t) => t.id === currentTenantId);
    if (!active?.branding) {
      // Reset to CSS defaults when no branding
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-hover");
      root.style.removeProperty("--accent-light");
      root.style.removeProperty("--accent-lighter");
      return;
    }
    applyTenantBranding(active.branding, active.name);
  }, [tenants, currentTenantId, theme]);

  // Public refreshData — reload page to re-fetch all data from DB
  const refreshData = async () => {
    window.location.reload();
  };

// Do not sign out a valid server-verified session just because local UI cache is absent.

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("fixdev_token");
    if (!token) {
      setIsAuthenticated(false);
      localStorage.setItem("saas_is_authenticated", "false");
      localStorage.removeItem("saas_curr_user");
      return;
    }

    (async () => {
      try {
        const profileRes = await fetch("/api/auth/profile", {
          headers: { Authorization: "Bearer " + token },
        });
        const dbUser = profileRes.ok ? await profileRes.json() : null;

        if (dbUser) {
          const camelUser = toCamelCase<User>(dbUser);
          camelUser.permissions =
            camelUser.permissions && camelUser.permissions.length > 0
              ? camelUser.permissions
              : DEFAULT_ROLE_PERMISSIONS[camelUser.role] || [];

          setCurrentUser(camelUser);
          setIsAuthenticated(true);
          localStorage.setItem("saas_is_authenticated", "true");
          localStorage.setItem("saas_curr_user", JSON.stringify(camelUser));
          if (camelUser.tenantId) {
            setCurrentTenantId(camelUser.tenantId);
            localStorage.setItem("saas_curr_tenant_id", camelUser.tenantId);
          }
        } else if ([401, 403, 404].includes(profileRes.status)) {
          localStorage.removeItem("fixdev_token");
          setIsAuthenticated(false);
          localStorage.setItem("saas_is_authenticated", "false");
          localStorage.removeItem("saas_curr_user");
        }
      } catch (e) {
        console.error("Error reading user profile:", e);
      }
    })();
  }, []);

  const loginUser = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    const cleanInput = email.trim().toLowerCase();
    const client = getAuthClient();

    if (client) {
      setApiLoading(true);
      setApiStatus("Melakukan autentikasi...");
      try {
        let authResult;
        try {
          authResult = await client.auth.signInWithPassword({
            email: cleanInput,
            password: password,
          });
        } catch (signInErr: any) {
          authResult = { data: null, error: signInErr };
        }

        if (authResult.error) {
          throw new Error(
            authResult.error.message || "Email atau password salah.",
          );
        }

        const data = authResult.data;

        if (data?.user) {
            const { data: sessionData } = await client.auth.getSession();
            const profileRes = await fetch("/api/auth/profile", {
              headers: { Authorization: "Bearer " + (sessionData.session?.access_token || "") },
            });
          const dbUser = profileRes.ok ? await profileRes.json() : null;

          if (dbUser) {
            const camelUser = toCamelCase<User>(dbUser);
            camelUser.permissions =
              camelUser.permissions && camelUser.permissions.length > 0
                ? camelUser.permissions
                : DEFAULT_ROLE_PERMISSIONS[camelUser.role] || [];

            setCurrentUser(camelUser);
            setIsAuthenticated(true);
            localStorage.setItem("saas_is_authenticated", "true");
            localStorage.setItem("saas_curr_user", JSON.stringify(camelUser));
            if (camelUser.tenantId) {
              setCurrentTenantId(camelUser.tenantId);
              localStorage.setItem("saas_curr_tenant_id", camelUser.tenantId);
            } else {
              setCurrentTenantId("");
              localStorage.removeItem("saas_curr_tenant_id");
            }
            addLog(
              "Login Success",
              `Berhasil masuk sebagai ${camelUser.name} (${camelUser.role})`,
              "AUTH",
            );
            return true;
          } else {
            const profileError = await profileRes.json().catch(() => ({}));
            await client.auth.signOut();
            throw new Error(
              profileError.error ||
                "Akun berhasil diautentikasi, tetapi profil aplikasi belum terhubung. Hubungi administrator.",
            );
          }
        }
      } catch (err: any) {
        showToast("Error Autentikasi: " + err.message, "error");
        return false;
      } finally {
        setApiLoading(false);
        setApiStatus("");
      }
    }

    // Backend auth unavailable — reject login
    showToast("Autentikasi tidak tersedia. Silakan hubungi administrator.", "error");
    return false;
  };

  const updateCurrentUserPassword = async (_currentPassword: string, newPassword: string): Promise<void> => {
    setApiLoading(true);
    setApiStatus("Memperbarui password...");
    try {
      const token = localStorage.getItem("fixdev_token");
      const res = await fetch("/api/auth/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({ currentPassword: _currentPassword, newPassword }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal memperbarui password.");
      }
      addLog(
        "Password Changed",
        `Password berhasil diubah pada ${new Date().toLocaleString()}`,
        "SECURITY",
      );
    } catch (err: any) {
      throw new Error(err.message || "Gagal memperbarui password. Silakan coba lagi.");
    } finally {
      setApiLoading(false);
      setApiStatus("");
    }
  };

  const logoutUser = async () => {
    try {
      addLog("Logout", "User melakukan logout", "AUTH");
    } catch (e) {}

    let keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("saas_") || k.startsWith("sb-"))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("fixdev_token");
    localStorage.setItem("saas_is_authenticated", "false");

    sessionStorage.clear();
    resetSync();
    setIsAuthenticated(false);
    setCurrentUser(INITIAL_USERS[0]);

    const client = getAuthClient();
    if (client) {
      Promise.race([
        client.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]).catch((e) => console.error("Error signing out from auth:", e));
    }

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    window.history.replaceState({}, document.title, url.toString());
    window.location.replace("/");
  };

  const [users, setUsers] = useState<User[]>(() => {
    return parseArray<User>("saas_users", isBackendConfigured() ? [] : INITIAL_USERS);
  });

  const [workflows, setWorkflows] = useState<ERPWorkflow[]>(() =>
    parseArray<ERPWorkflow>("saas_workflows", [
      {
        id: "wf-invoice-remind",
        tenantId: "tenant-owner-1",
        name: "Pengingat Tagihan Tertunggak > 30 Hari",
        triggerType: "INVOICE_UNPAID",
        triggerCondition: "> 30",
        actionType: "WHATSAPP",
        actionPayload:
          "Halo {customer_name}, invoice tagihan Anda #{invoice_no} senilai Rp {amount} telah tertunggak lebih dari {condition} hari. Mohon segera melakukan pembayaran. Terima kasih!",
        isActive: true,
        executionCount: 12,
        lastTriggeredAt: "2026-06-29T10:15:00Z",
      },
      {
        id: "wf-stock-alert",
        tenantId: "tenant-owner-1",
        name: "Peringatan Stok Tipis (< 5 unit)",
        triggerType: "STOCK_LOW",
        triggerCondition: "< 5",
        actionType: "EMAIL",
        actionPayload:
          "⚠️ PERINGATAN: Stok produk {product_name} sisa {stock_qty} unit (di bawah ambang batas {condition} unit). Hubungi supplier segera!",
        isActive: true,
        executionCount: 5,
        lastTriggeredAt: "2026-06-28T14:30:00Z",
      },
      {
        id: "wf-ticket-create",
        tenantId: "tenant-owner-1",
        name: "Notifikasi Otomatis Tiket Masuk Baru",
        triggerType: "TICKET_CREATED",
        triggerCondition: "all",
        actionType: "WHATSAPP",
        actionPayload:
          "Hai {customer_name}, tiket reparasi Anda #{ticket_no} ({device_name}) telah diterima di sistem kami. Teknisi kami akan segera memproses diagnosis. Pantau status di {portal_url}",
        isActive: true,
        executionCount: 45,
        lastTriggeredAt: "2026-06-30T09:20:00Z",
      },
    ]),
  );

  const [branches, setBranches] = useState<Branch[]>(() => {
    return parseArray<Branch>("saas_branches", isBackendConfigured() ? [] : INITIAL_BRANCHES);
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    return parseArray<Warehouse>("saas_warehouses", isBackendConfigured() ? [] : INITIAL_WAREHOUSES);
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    return parseArray<Customer>("saas_customers", isBackendConfigured() ? [] : INITIAL_CUSTOMERS);
  });

  const [products, setProducts] = useState<InventoryProduct[]>(() => {
    return parseArray<InventoryProduct>("saas_products", isBackendConfigured() ? [] : INITIAL_PRODUCTS);
  });

  const [microComponents, setMicroComponents] = useState<MicroComponent[]>([]);
  const [microComponentsLoading, setMicroComponentsLoading] = useState(false);
  const [microComponentsError, setMicroComponentsError] = useState("");

  const [services, setServices] = useState<ServiceTicket[]>(() => {
    return parseArray<ServiceTicket>("saas_services", isBackendConfigured() ? [] : INITIAL_SERVICES);
  });

  const [fieldVisits, setFieldVisits] = useState<FieldServiceVisit[]>(() => {
    return parseArray<FieldServiceVisit>("saas_field_visits", []);
  });

  const [shifts, setShifts] = useState<POSShift[]>(() => {
    return parseArray<POSShift>("saas_shifts", []);
  });

  const [transactions, setTransactions] = useState<POSTransaction[]>(() => {
    return parseArray<POSTransaction>("saas_transactions", isBackendConfigured() ? [] : INITIAL_TRANSACTIONS);
  });

  const [accounts, setAccounts] = useState<COAAccount[]>(() => {
    return parseArray<COAAccount>("saas_accounts", isBackendConfigured() ? [] : INITIAL_COA);
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    return parseArray<JournalEntry>("saas_journals", []);
  });

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(
    () => {
      return parseArray<CashTransaction>("saas_cash_tx", isBackendConfigured() ? [] : seedCashTransactions("tenant-owner-1"));
    },
  );

  const [employees, setEmployees] = useState<Employee[]>(() => {
    return parseArray<Employee>("saas_employees", isBackendConfigured() ? [] : INITIAL_EMPLOYEES);
  });

  const [workShifts, setWorkShifts] = useState<WorkShift[]>(() => {
    return parseArray<WorkShift>("saas_work_shifts", isBackendConfigured() ? [] : INITIAL_WORK_SHIFTS);
  });

  const [payroll, setPayroll] = useState<Payroll[]>(() => {
    return parseArray<Payroll>("saas_payroll", []);
  });

  const [commissions, setCommissions] = useState<TechnicianCommission[]>(() => {
    return parseArray<TechnicianCommission>("saas_commissions", []);
  });

  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    return parseArray<Voucher>("saas_vouchers", isBackendConfigured() ? [] : INITIAL_VOUCHERS);
  });

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    return parseArray<SupportTicket>("saas_support", []);
  });

  const [tasks, setTasks] = useState<ProjectTask[]>(() => {
    return parseArray<ProjectTask>("saas_tasks", []);
  });

  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>(
    () =>
      parseArray<InternalMessage>("saas_internal_messages", [
        {
          id: "msg-init-1",
          tenantId: "tenant-owner-1",
          sender: "Agus Admin (Pusat)",
          senderRole: "ADMIN",
          message:
            "Halo tim teknisi, mohon pastikan mencatat detail komponen yang diganti di kolom diagnosa untuk mempermudah klaim garansi.",
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: "msg-init-2",
          tenantId: "tenant-owner-1",
          sender: "Agus Admin (Pusat)",
          senderRole: "ADMIN",
          message:
            "Bagi yang bertugas lapangan hari ini, pastikan cek GPS di aplikasi dan selesaikan form check-out beserta foto bukti.",
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ]),
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    if (isBackendConfigured()) return [];
    return parseArray<AuditLog>("saas_audit_logs", INITIAL_AUDITS);
  });

  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(() => {
    if (isBackendConfigured()) return [];
    return parseArray<FraudAlert>("saas_fraud", []);
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    if (isBackendConfigured()) return [];
    return parseArray<StockMovement>("saas_stock_movements", [
      {
        id: "mov-init-1",
        tenantId: "tenant-owner-1",
        productId: "prod-lcd",
        warehouseId: "wh-mks-1",
        type: "IN",
        quantity: 8,
        referenceNo: "INIT-STOCK",
        note: "Stok awal migrasi sistem",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "mov-init-2",
        tenantId: "tenant-owner-1",
        productId: "prod-ssd",
        warehouseId: "wh-mks-1",
        type: "IN",
        quantity: 10,
        referenceNo: "INIT-STOCK",
        note: "Stok awal migrasi sistem",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "mov-init-3",
        tenantId: "tenant-owner-1",
        productId: "prod-ssd",
        warehouseId: "wh-mks-2",
        type: "IN",
        quantity: 2,
        referenceNo: "INIT-STOCK",
        note: "Stok kanibalan untuk SSD",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  });

  const [inventoryTransfers, setInventoryTransfers] = useState<
    InventoryTransfer[]
  >(() => {
    if (isBackendConfigured()) return [];
    return parseArray<InventoryTransfer>("saas_inventory_transfers", [
      {
        id: "trf-seed-1",
        tenantId: "tenant-owner-1",
        transferNo: "TRF-20260601",
        originWarehouseId: "wh-mks-1",
        destinationWarehouseId: "wh-mks-2",
        items: [{ productId: "prod-lcd", quantity: 2 }],
        status: "RECEIVED",
        note: "Transfer urgent LCD Touchscreen untuk pengerjaan servis laptop",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
        ).toISOString(),
        history: [
          {
            status: "REQUEST_CREATED",
            timestamp: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Permintaan dibuat otomatis oleh sistem",
          },
          {
            status: "PACKED",
            timestamp: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Barang telah dikemas rapi dengan pelindung bubble wrap",
          },
          {
            status: "SHIPPED",
            timestamp: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Dikirim via Kurir Eksternal (GrabExpress)",
          },
          {
            status: "RECEIVED",
            timestamp: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Diterima dan dikonfirmasi lengkap oleh Admin Cabang Hertasning",
          },
        ],
      },
      {
        id: "trf-seed-2",
        tenantId: "tenant-owner-1",
        transferNo: "TRF-20260602",
        originWarehouseId: "wh-mks-1",
        destinationWarehouseId: "wh-mks-2",
        items: [{ productId: "prod-ssd", quantity: 3 }],
        status: "SHIPPED",
        note: "Mutasi rutin SSD 256GB",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
        ).toISOString(),
        history: [
          {
            status: "REQUEST_CREATED",
            timestamp: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Permintaan transfer stok harian",
          },
          {
            status: "PACKED",
            timestamp: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Selesai packing",
          },
          {
            status: "SHIPPED",
            timestamp: new Date(
              Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
            ).toISOString(),
            note: "Sedang dibawa kurir toko",
          },
        ],
      },
    ]);
  });

  // ==========================================
  // PERSISTENCE EFFECT PIPELINES
  // ==========================================

  useEffect(() => {
    // Session state selalu disimpan di localStorage (client-only)
    localStorage.setItem("saas_curr_tenant_id", currentTenantId);
    localStorage.setItem("saas_curr_branch_id", currentBranchId);
    localStorage.setItem("saas_curr_user", JSON.stringify(currentUser));

      // If backend active, skip cache data — use DB as source of truth
    if (isBackendConfigured()) return;

    // Fallback offline: cache semua data ke localStorage
    localStorage.setItem("saas_tenants", JSON.stringify(tenants));
    localStorage.setItem("saas_branches", JSON.stringify(branches));
    localStorage.setItem("saas_warehouses", JSON.stringify(warehouses));
    localStorage.setItem("saas_customers", JSON.stringify(customers));
    localStorage.setItem("saas_products", JSON.stringify(products));
    localStorage.setItem("saas_services", JSON.stringify(services));
    localStorage.setItem("saas_field_visits", JSON.stringify(fieldVisits));
    localStorage.setItem("saas_shifts", JSON.stringify(shifts));
    localStorage.setItem("saas_transactions", JSON.stringify(transactions));
    localStorage.setItem("saas_accounts", JSON.stringify(accounts));
    localStorage.setItem("saas_journals", JSON.stringify(journals));
    localStorage.setItem("saas_cash_tx", JSON.stringify(cashTransactions));
    localStorage.setItem("saas_employees", JSON.stringify(employees));
    localStorage.setItem("saas_work_shifts", JSON.stringify(workShifts));
    localStorage.setItem("saas_payroll", JSON.stringify(payroll));
    localStorage.setItem("saas_commissions", JSON.stringify(commissions));
    localStorage.setItem("saas_vouchers", JSON.stringify(vouchers));
    localStorage.setItem("saas_support", JSON.stringify(supportTickets));
    localStorage.setItem("saas_tasks", JSON.stringify(tasks));
    localStorage.setItem(
      "saas_internal_messages",
      JSON.stringify(internalMessages),
    );
    localStorage.setItem("saas_audit_logs", JSON.stringify(auditLogs));
    localStorage.setItem("saas_fraud", JSON.stringify(fraudAlerts));
    localStorage.setItem("saas_users", JSON.stringify(users));
    localStorage.setItem("saas_workflows", JSON.stringify(workflows));
    localStorage.setItem(
      "saas_stock_movements",
      JSON.stringify(stockMovements),
    );
    localStorage.setItem(
      "saas_inventory_transfers",
      JSON.stringify(inventoryTransfers),
    );
  }, [
    tenants,
    currentTenantId,
    currentBranchId,
    currentUser,
    branches,
    warehouses,
    customers,
    products,
    services,
    fieldVisits,
    shifts,
    transactions,
    accounts,
    journals,
    cashTransactions,
    employees,
    workShifts,
    payroll,
    commissions,
    vouchers,
    supportTickets,
    tasks,
    internalMessages,
    auditLogs,
    fraudAlerts,
    users,
    workflows,
    stockMovements,
    inventoryTransfers,
  ]);

  // ==========================================
  // MULTI-TENANT FILTER & ISOLATION MIDDLEWARE
  // ==========================================

  const scopedProducts = React.useMemo(
    () => products.filter((p) => p.tenantId === currentTenantId),
    [products, currentTenantId],
  );
  const scopedServices = React.useMemo(
    () =>
      services.filter(
        (s) => s.tenantId === currentTenantId && s.branchId === currentBranchId,
      ),
    [services, currentTenantId, currentBranchId],
  );
  const scopedTransactions = React.useMemo(
    () =>
      transactions.filter(
        (t) => t.tenantId === currentTenantId && t.branchId === currentBranchId,
      ),
    [transactions, currentTenantId, currentBranchId],
  );
  const scopedUsers = React.useMemo(
    () => users.filter((u) => u.tenantId === currentTenantId),
    [users, currentTenantId],
  );
  const scopedCustomers = React.useMemo(
    () => customers.filter((c) => c.tenantId === currentTenantId),
    [customers, currentTenantId],
  );
  const scopedEmployees = React.useMemo(
    () =>
      employees.filter(
        (e) => e.tenantId === currentTenantId && e.branchId === currentBranchId,
      ),
    [employees, currentTenantId, currentBranchId],
  );
  const scopedAccounts = React.useMemo(
    () => accounts.filter((a) => a.tenantId === currentTenantId),
    [accounts, currentTenantId],
  );
  const scopedJournals = React.useMemo(
    () => journals.filter((j) => j.tenantId === currentTenantId),
    [journals, currentTenantId],
  );
  const scopedCashTransactions = React.useMemo(
    () =>
      cashTransactions.filter(
        (ct) =>
          ct.tenantId === currentTenantId && ct.branchId === currentBranchId,
      ),
    [cashTransactions, currentTenantId, currentBranchId],
  );
  const scopedShifts = React.useMemo(
    () =>
      shifts.filter(
        (s) => s.tenantId === currentTenantId && s.branchId === currentBranchId,
      ),
    [shifts, currentTenantId, currentBranchId],
  );
  const scopedWorkflows = React.useMemo(
    () => workflows.filter((w) => w.tenantId === currentTenantId),
    [workflows, currentTenantId],
  );
  const scopedWarehouses = React.useMemo(
    () =>
      warehouses.filter(
        (w) => w.tenantId === currentTenantId && w.branchId === currentBranchId,
      ),
    [warehouses, currentTenantId, currentBranchId],
  );
  const scopedBranches = React.useMemo(
    () => branches.filter((b) => b.tenantId === currentTenantId && b.isActive),
    [branches, currentTenantId],
  );
  const scopedFieldVisits = React.useMemo(
    () =>
      fieldVisits.filter(
        (fv) =>
          fv.tenantId === currentTenantId && fv.branchId === currentBranchId,
      ),
    [fieldVisits, currentTenantId, currentBranchId],
  );
  const scopedWorkShifts = React.useMemo(
    () => workShifts.filter((ws) => ws.tenantId === currentTenantId),
    [workShifts, currentTenantId],
  );
  const scopedPayroll = React.useMemo(
    () => payroll.filter((p) => p.tenantId === currentTenantId),
    [payroll, currentTenantId],
  );
  const scopedCommissions = React.useMemo(
    () => commissions.filter((c) => c.tenantId === currentTenantId),
    [commissions, currentTenantId],
  );
  const scopedVouchers = React.useMemo(
    () => vouchers.filter((v) => v.tenantId === currentTenantId),
    [vouchers, currentTenantId],
  );
  const scopedSupportTickets = React.useMemo(
    () => supportTickets.filter((st) => st.tenantId === currentTenantId),
    [supportTickets, currentTenantId],
  );
  const scopedInternalMessages = React.useMemo(
    () => internalMessages.filter((m) => m.tenantId === currentTenantId),
    [internalMessages, currentTenantId],
  );

  const verifyScope = (tenantId?: string, branchId?: string) => {
    const activeTenant = tenantId || currentTenantId;
    const activeBranch = branchId || currentBranchId;

    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      if (currentUser.tenantId && currentUser.tenantId !== activeTenant) {
        const errMsg = `[SECURITY SHIELD] Deteksi upaya kebocoran data lintas tenant! Akses diblokir untuk tenant: ${activeTenant}. User ID: ${currentUser.id}`;
        addLog("Security Violation", errMsg, "SECURITY", "HIGH");
        triggerFraudAlert("LOGIN_ANOMALY", errMsg, "HIGH");
        throw new Error(errMsg);
      }
      if (
        activeBranch &&
        currentUser.branchIds &&
        currentUser.branchIds.length > 0 &&
        !currentUser.branchIds.includes(activeBranch)
      ) {
        const errMsg = `[SECURITY SHIELD] Deteksi upaya kebocoran data lintas cabang! Akses diblokir untuk cabang: ${activeBranch}. User ID: ${currentUser.id}`;
        addLog("Security Violation", errMsg, "SECURITY", "HIGH");
        triggerFraudAlert("LOGIN_ANOMALY", errMsg, "HIGH");
        throw new Error(errMsg);
      }
    }
    return { tenantId: activeTenant, branchId: activeBranch };
  };

  const getCOAAccount = (type: "cash" | "bank" | "sales" | "service" | "tax", tId: string) => {
    const activeT = tenants.find((t) => t.id === tId);
    const accs = activeT?.settings?.accountingSettings || {};
    if (type === "cash") return accs.defaultCashAccountId || `coa-${tId}-10100`;
    if (type === "bank") return accs.defaultBankAccountId || `coa-${tId}-10200`;
    if (type === "sales") return accs.defaultSalesAccountId || `coa-${tId}-40200`;
    if (type === "service") return accs.defaultSalesAccountId || `coa-${tId}-40100`;
    if (type === "tax") return accs.defaultPayableAccountId || `coa-${tId}-20300`;
    return `coa-${tId}-10100`;
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    // Inject headers
    headers.set("X-Tenant-ID", currentTenantId);
    headers.set("X-Branch-ID", currentBranchId);
    try {
      const consoleSession = JSON.parse(localStorage.getItem("saas_superadmin_console_session") || "null");
      if (consoleSession?.id && new Date(consoleSession.expiresAt).getTime() > Date.now()) {
        headers.set("X-SuperAdmin-Session-ID", consoleSession.id);
      }
      const impersonationSession = JSON.parse(localStorage.getItem("saas_impersonation_session") || "null");
      if (impersonationSession?.id && new Date(impersonationSession.expiresAt).getTime() > Date.now()) {
        headers.set("X-Impersonation-Session-ID", impersonationSession.id);
      }
    } catch {
      localStorage.removeItem("saas_superadmin_console_session");
      localStorage.removeItem("saas_impersonation_session");
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    // Inject JWT for backend auth (requireJwt middleware)
    if (!headers.has("Authorization")) {
      try {
        const client = getAuthClient();
        if (client) {
          const sessionData = await Promise.race([
            client.auth.getSession(),
            new Promise<never>((_, reject) =>
              window.setTimeout(() => reject(new Error("AUTH_SESSION_TIMEOUT")), 4000),
            ),
          ]);
          if (sessionData.data.session?.access_token) {
            headers.set("Authorization", `Bearer ${sessionData.data.session.access_token}`);
          }
        }
      } catch (e: any) {
        if (e?.message === "AUTH_SESSION_TIMEOUT") {
          throw new Error("Sesi autentikasi tidak merespons. Muat ulang atau login kembali.");
        }
      }
    }

    let url = endpoint;
    const separator = url.includes("?") ? "&" : "?";

    if (!options.method || options.method === "GET") {
      url = `${url}${separator}tenant_id=${encodeURIComponent(currentTenantId)}&branch_id=${encodeURIComponent(currentBranchId)}`;
    } else if (options.body && typeof options.body === "string") {
      try {
        const bodyObj = JSON.parse(options.body);
        bodyObj.tenant_id = currentTenantId;
        bodyObj.branch_id = currentBranchId;
        options.body = JSON.stringify(bodyObj);
      } catch (e) {
        // Fallback
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response;
  };

  // ==========================================
  // CONTEXT FUNCTIONS & ACTION HANDLERS
  // ==========================================

  const addLog = (
    action: string,
    details: string,
    category: AuditLog["category"],
    riskLevel: AuditLog["riskLevel"] = "LOW",
  ) => {
    const newLog: AuditLog = {
      id: "log-" + Math.random().toString(36).substr(2, 9),
      tenantId: currentTenantId,
      branchId: currentBranchId,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date().toISOString(),
      action,
      details,
      ipAddress: "192.168.1.100",
      category,
      riskLevel,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const syncModuleRecord = async (
    module: string,
    recordId: string,
    payload: Record<string, any>,
    action: "insert" | "update" | "delete" = "insert",
  ) => {
    if (!isBackendConfigured()) throw new Error("Backend belum terkonfigurasi; perubahan tidak disimpan.");
    const response = await apiFetch("/api/module-records", {
      method: "POST",
      body: JSON.stringify({ tenantId: currentTenantId, module, recordId, payload, action }),
    });
    if (!response.ok) throw new Error(`Module record sync HTTP ${response.status}`);
  };

  const syncToApi = async (
    tableKey: string,
    action: "insert" | "update" | "delete",
    data: any,
    idField: string = "id",
  ) => {
    try {
      if (!isBackendConfigured()) {
        throw new Error("Backend belum terkonfigurasi; perubahan tidak disimpan.");
      }

      if (["users", "auditLogs"].includes(tableKey)) return;
      const tableName = STATE_TO_TABLE_MAP[tableKey];
      if (!tableName) throw new Error(`Tabel sinkronisasi tidak dikenal: ${tableKey}`);

      let payload = toSnakeCase(data);
      payload = deepUUIDify(payload);

      const response = await apiFetch("/api/data/sync", {
        method: "POST",
        body: JSON.stringify({
          table: tableName,
          action,
          data: payload,
          idField,
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Database sync HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
      }
    } catch (err: any) {
      console.error(`Sync execution failed for ${tableKey}:`, err);
      addLog(
        "Database Sync Exception",
        `Error replikasi data: ${err.message}`,
        "SYSTEM",
        "HIGH",
      );
      throw err;
    }
  };

  const triggerFraudAlert = (
    type: FraudAlert["type"],
    message: string,
    riskLevel: FraudAlert["riskLevel"],
  ) => {
    const newAlert: FraudAlert = {
      id: "fraud-" + Math.random().toString(36).substr(2, 9),
      tenantId: currentTenantId,
      branchId: currentBranchId,
      type,
      message,
      riskLevel,
      timestamp: new Date().toISOString(),
      operator: currentUser.name,
      isResolved: false,
    };
    setFraudAlerts((prev) => [newAlert, ...prev]);
    addLog(`Fraud Alert Triggered: ${type}`, message, "SECURITY", "HIGH");
  };

  const resolveFraudAlert = (id: string) => {
    setFraudAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isResolved: true } : a))
    );
  };

  const switchTenant = (id: string) => {
    setCurrentTenantId(id);
    const tenantBranches = branches.filter((b) => b.tenantId === id);
    if (tenantBranches.length > 0) {
      setCurrentBranchId(tenantBranches[0].id);
    }
    addLog("Switch Tenant", `Pindah akses ke tenant ID: ${id}`, "AUTH");
  };

  const switchBranch = (id: string) => {
    const branch = branches.find((b) => b.id === id);
    if (!branch || branch.tenantId !== currentTenantId || !branch.isActive) {
      throw new Error("Cabang tidak tersedia atau sudah nonaktif.");
    }
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.branchIds?.length &&
      !currentUser.branchIds.includes(id)
    ) {
      throw new Error("Anda tidak memiliki akses ke cabang ini.");
    }
    setCurrentBranchId(id);
    localStorage.setItem("saas_curr_branch_id", id);
    addLog("Switch Branch", `Pindah akses ke cabang ID: ${id}`, "AUTH");
  };

  const switchRole = (role: UserRole) => {
    const foundUser = INITIAL_USERS.find((u) => u.role === role);
    if (foundUser) {
      setCurrentUser(foundUser);
      if (foundUser.tenantId) {
        setCurrentTenantId(foundUser.tenantId);
        let b = branches.filter((br) => br.tenantId === foundUser.tenantId);
        if (foundUser.branchIds && foundUser.branchIds.length > 0) {
          b = b.filter((br) => foundUser.branchIds?.includes(br.id));
        }
        if (b.length > 0) setCurrentBranchId(b[0].id);
      }
      addLog(
        "Switch Role Simulator",
        `Mengubah peran aktif menjadi: ${role}`,
        "AUTH",
      );
    }
  };

  const [platformHealth, setPlatformHealth] = useState<PlatformHealth>(() => ({
    status: isBackendConfigured() ? "checking" : "local",
  }));

  const refreshPlatformHealth = async () => {
    if (!isBackendConfigured()) {
      setPlatformHealth({ status: "local", checkedAt: new Date().toISOString() });
      return;
    }
    setPlatformHealth((prev) => ({ ...prev, status: "checking" }));
    try {
      const response = await apiFetch("/api/platform/health");
      const health = await readJsonResponse<PlatformHealth>(response, "Health platform");
      setPlatformHealth(health);
    } catch (error: any) {
      const status = error?.status >= 500 || error?.status === 0 ? "down" : "degraded";
      setPlatformHealth({
        status,
        checkedAt: new Date().toISOString(),
        message: error?.message || "Health platform tidak tersedia.",
      });
    }
  };

  useEffect(() => {
    if (!isAuthenticated || currentUser.role !== UserRole.SUPER_ADMIN) return;
    refreshPlatformHealth();
    const timer = window.setInterval(refreshPlatformHealth, 60_000);
    return () => window.clearInterval(timer);
}, [isAuthenticated, currentUser.role]);

  const addTenant = async (
    t: Omit<Tenant, "id" | "createdAt" | "billingHistory">,
  ): Promise<{ tenant: Tenant; branch: Branch }> => {
    const id = generateUUID();
    const newTenant: Tenant = {
      ...t,
      id,
      createdAt: new Date().toISOString(),
      billingHistory: [],
    };
    setTenants((prev) => [...prev, newTenant]);
    await syncToApi("tenants", "insert", newTenant);

    // Bootstrap basic branches & warehouses
    const newBranch: Branch = {
      id: generateUUID(),
      tenantId: id,
      name: `Cabang Utama ${t.name}`,
      address: `Alamat Utama ${t.name}`,
      phone: "0812345678",
      isActive: true,
    };
    setBranches((prev) => [...prev, newBranch]);
    await syncToApi("branches", "insert", newBranch);

    const newWH: Warehouse = {
      id: generateUUID(),
      tenantId: id,
      branchId: newBranch.id,
      name: "Gudang Utama",
      location: "Lt. 1",
    };
    setWarehouses((prev) => [...prev, newWH]);
    await syncToApi("warehouses", "insert", newWH);

    // Setup standard COA for new tenant
    const coaSeed = INITIAL_COA.map((c) => ({
      ...c,
      id: generateUUID(),
      tenantId: id,
      balance: c.code.startsWith("10")
        ? c.code === "10100"
          ? 5000000
          : 25000000
        : 0,
    }));
    setAccounts((prev) => [...prev, ...coaSeed]);
    for (const coa of coaSeed) {
      await syncToApi("accounts", "insert", coa);
    }

    addLog(
      "Register Tenant",
      `Mendaftarkan Tenant Baru: ${t.name} (${t.subdomain})`,
      "ADMIN",
      "MEDIUM",
    );
    return { tenant: newTenant, branch: newBranch };
  };

  const updateTenantStatus = (id: string, status: TenantStatus) => {
    setTenants((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, status } : t));
      const updated = next.find((t) => t.id === id);
      if (updated) syncToApi("tenants", "update", updated);
      return next;
    });
    addLog(
      "Update Tenant Status",
      `Mengubah status Tenant ID: ${id} menjadi ${status}`,
      "ADMIN",
      "HIGH",
    );
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>) => {
    const current = tenants.find((tenant) => tenant.id === id);
    if (!current) throw new Error("Tenant tidak ditemukan.");
    const updated = { ...current, ...updates };
    await syncToApi("tenants", "update", updated);
    setTenants((prev) => prev.map((tenant) => (tenant.id === id ? updated : tenant)));
    addLog(
      "Update Tenant Settings",
      `Memperbarui konfigurasi tenant ID: ${id}`,
      "ADMIN",
      "MEDIUM",
    );
  };

  const impersonateTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      // Store original credentials to restore them on exit
      localStorage.setItem("saas_original_user", JSON.stringify(currentUser));
      localStorage.setItem("saas_original_tenant_id", currentTenantId);
      localStorage.setItem("saas_original_branch_id", currentBranchId);

      setCurrentTenantId(tenantId);
      localStorage.setItem("saas_curr_tenant_id", tenantId);
      const b = branches.filter((br) => br.tenantId === tenantId);
      if (b.length > 0) {
        setCurrentBranchId(b[0].id);
        localStorage.setItem("saas_curr_branch_id", b[0].id);
      }

      const impersonatedUser = {
        ...currentUser,
        role: UserRole.OWNER,
        tenantId,
        name: `Impersonated (${tenant.name})`,
      };

      setCurrentUser(impersonatedUser);
      localStorage.setItem("saas_curr_user", JSON.stringify(impersonatedUser));
      setIsImpersonating(true);

      addLog(
        "Impersonation Tenant Access",
        `Melakukan Impersonate Akses Aman ke Tenant: ${tenant.name}`,
        "SECURITY",
        "HIGH",
      );
    }
  };

  const exitImpersonate = () => {
    const origUserStr = localStorage.getItem("saas_original_user");
    const origTenantId = localStorage.getItem("saas_original_tenant_id");
    const origBranchId = localStorage.getItem("saas_original_branch_id");

    if (origUserStr) {
      const origUser = JSON.parse(origUserStr);
      setCurrentUser(origUser);
      localStorage.setItem("saas_curr_user", JSON.stringify(origUser));

      if (origTenantId) {
        setCurrentTenantId(origTenantId);
        localStorage.setItem("saas_curr_tenant_id", origTenantId);
      }

      if (origBranchId) {
        setCurrentBranchId(origBranchId);
        localStorage.setItem("saas_curr_branch_id", origBranchId);
      }

      localStorage.removeItem("saas_original_user");
      localStorage.removeItem("saas_original_tenant_id");
      localStorage.removeItem("saas_original_branch_id");
      setIsImpersonating(false);

      addLog(
        "Exit Impersonation",
        `Keluar dari mode impersonasi, kembali sebagai ${origUser.name}`,
        "SECURITY",
        "MEDIUM",
      );
    }
  };

  // ==========================================
  // SERVICE WORKFLOWS
  // ==========================================

  const addServiceTicket = async (
    ticket: Omit<ServiceTicket, "id" | "ticketNo" | "timeline" | "status"> & {
      tenantId?: string;
      branchId?: string;
      customerData?: { name: string; phone: string; email?: string; address?: string };
    },
  ): Promise<ServiceTicket> => {
    const { tenantId, branchId } = verifyScope(
      ticket.tenantId,
      ticket.branchId,
    );
    const { customerData, ...ticketData } = ticket;

    let newTicket: ServiceTicket;
    if (isBackendConfigured()) {
      const response = await apiFetch("/api/service-receptions", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          branchId,
          customer: customerData
            ? { mode: "new", ...customerData }
            : { mode: "existing", id: ticket.customerId },
          device: {
            name: ticket.deviceName,
            brandModel: ticket.deviceBrandModel || "",
            serial: ticket.deviceSerial || "",
            category: ticket.deviceCategory || "",
            dynamicFields: ticket.dynamicFields || {},
            screenLockPin: ticket.screenLockPin || "",
          },
          reception: {
            complaint: ticket.customerComplaints,
            physicalCondition: ticket.physicalCondition || "",
            checklist: ticket.initialChecklist || [],
            accessories: ticket.accessoriesLeft || [],
            customAccessories: ticket.customAccessories || "",
            capturedConditions: ticket.capturedConditions || [],
            storageLocationId: ticket.storageLocationId || "",
          },
          service: {
            assignedTechId: ticket.assignedTechId || null,
            estimatedCompletionDate: ticket.estimatedCompletionDate || "",
            warrantyMonths: ticket.warrantyMonths || 0,
            downPayment: ticket.downPayment || 0,
            isCheckOnly: ticket.isCheckOnly || false,
          },
          outsourcing: {
            enabled: ticket.isOutsourced || false,
            vendorId: ticket.outsourcedVendorId || "",
            cost: ticket.outsourcingCost || 0,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal menyimpan penerimaan unit.");

      const serverCustomer = payload.data.customer as Customer;
      newTicket = { ...ticketData, ...payload.data.ticket } as ServiceTicket;
      setCustomers((prev) =>
        prev.some((customer) => customer.id === serverCustomer.id)
          ? prev
          : [...prev, serverCustomer],
      );
    } else {
      if (customerData) {
        const localCustomerId = generateUUID();
        const localCustomer = {
          ...customerData,
          id: localCustomerId,
          tenantId,
          loyaltyPoints: 0,
          storeCredit: 0,
          referralCode: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
          salesPipelineStage: "WON",
          quotations: [],
        } as Customer;
        setCustomers((prev) => [...prev, localCustomer]);
        ticketData.customerId = localCustomerId;
      }
      const activeTenant = tenants.find((t: Tenant) => t.id === tenantId);
      const ticketPrefix = activeTenant?.settings?.documentConfig?.ticketPrefix || "TKT";
      const ticketNo = `${ticketPrefix}/${new Date().getFullYear().toString().substr(-2)}${(new Date().getMonth() + 1).toString().padStart(2, "0")}/${(services.length + 1).toString().padStart(4, "0")}`;
      newTicket = {
        ...ticketData,
        id: generateUUID(),
        ticketNo,
        tenantId,
        branchId,
        status: ServiceStatus.DITERIMA,
        timeline: [
          {
            status: ServiceStatus.DITERIMA,
            note: ticket.isCheckOnly
              ? "Unit masuk loket pendaftaran (Hanya Pengecekan / Diagnosa Dahulu)"
              : `Unit masuk loket pendaftaran${ticket.downPayment && ticket.downPayment > 0 ? ` (Uang Muka/DP: Rp ${(ticket.downPayment ?? 0).toLocaleString()})` : ""}`,
            timestamp: new Date().toISOString(),
            operator: currentUser.name,
          },
        ],
      } as ServiceTicket;
    }

    setServices((prev) => [newTicket, ...prev]);
    addLog(
      "Create Service Ticket",
      `Membuat tiket servis ${newTicket.ticketNo} untuk ${newTicket.deviceName}`,
      "SERVICE",
    );


    const customer = customers.find((c) => c.id === newTicket.customerId);
    const customerName = customer?.name || customerData?.name || "Pelanggan";
    const customerPhone = customer?.phone || customerData?.phone || "";

    // Dispatch live notification for new repair ticket
    window.dispatchEvent(
      new CustomEvent("live_notification", {
        detail: {
          title: "🔧 Tiket Reparasi Baru",
      text: `Tiket ${newTicket.ticketNo} (${newTicket.deviceName}) berhasil dibuat untuk pelanggan ${customerName}.`,
          message: `Tiket ${newTicket.ticketNo} (${newTicket.deviceName}) berhasil dibuat untuk pelanggan ${customerName}.`,
          category: "repair",
          customerName: customerName,
          phone: customerPhone,
        },
      }),
    );

    return newTicket;
  };

  const updateServiceTicket = (id: string, updates: Partial<ServiceTicket>) => {
    const existing = services.find((s) => s.id === id);
    if (!existing) return;
    verifyScope(existing.tenantId);

    const timeline = updates.timeline
      ? [...updates.timeline]
      : [...existing.timeline];
    if (updates.status && updates.status !== existing.status) {
      timeline.push({
        status: updates.status,
        note: `Pembaruan data servis: Status diubah ke ${updates.status}. ${updates.techDiagnosis ? "Diagnosa: " + updates.techDiagnosis : ""}`,
        timestamp: new Date().toISOString(),
        operator: currentUser.name || "System",
      });

      const customer = customers.find((c) => c.id === existing.customerId);
      const customerName = customer ? customer.name : "Pelanggan";
      const customerPhone = customer ? customer.phone : "";

      // Dispatch live notification
      window.dispatchEvent(
        new CustomEvent("live_notification", {
          detail: {
            title: "🔧 Perubahan Status Tiket",
            text: `Tiket ${existing.ticketNo} (${existing.deviceName}) diubah ke status: ${updates.status}.`,
            message: `Tiket ${existing.ticketNo} (${existing.deviceName}) diubah ke status: ${updates.status}.`,
            category: "repair",
            customerName: customerName,
            phone: customerPhone,
          },
        }),
      );
    } else if (
      updates.techDiagnosis &&
      updates.techDiagnosis !== existing.techDiagnosis
    ) {
      timeline.push({
        status: existing.status,
        note: `Teknisi mengunggah detail pekerjaan. Diagnosa: ${updates.techDiagnosis}.`,
        timestamp: new Date().toISOString(),
        operator: currentUser.name || "System",
      });
    }

    const updatedTicket = { ...existing, ...updates, timeline };

    setServices((prev) => prev.map((s) => (s.id === id ? updatedTicket : s)));
    syncToApi("services", "update", updatedTicket);
    addLog(
      "Update Service Ticket",
      `Memperbarui detail tiket servis ID: ${id}`,
      "SERVICE",
    );

    // Automatically sync updated ticket to server tracking cache
    fetch("/api/service-tracking/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: updatedTicket }),
    }).catch((err) => console.error("Auto-sync update ticket error:", err));
  };

  const triggerCustomerNotification = (
    ticket: ServiceTicket,
    status: ServiceStatus,
    noteText: string,
  ) => {
    try {
      const activeTenant = tenants.find((t) => t.id === (ticket.tenantId || currentTenantId));
      const customer = customers.find((c) => c.id === ticket.customerId);
      const customerName = customer ? customer.name : "Pelanggan";
      const customerPhone = customer ? customer.phone : "+62 812-3456-7890";

      let message = "";
      const device =
        ticket.deviceName || ticket.deviceBrandModel || "Perangkat";
      const tktNo = ticket.ticketNo;
      const note = noteText || "Pembaruan status sistem.";

      switch (status) {
        case ServiceStatus.DIAGNOSA:
          message = `Halo *${customerName}*, perangkat Anda *${device}* dengan No. Tiket *${tktNo}* saat ini dalam tahap *DIAGNOSA* oleh tim teknisi kami. Kami sedang melakukan pengujian menyeluruh. Catatan: ${note}`;
          break;
        case ServiceStatus.ESTIMATE_PENDING:
          message = `Halo *${customerName}*, perbaikan perangkat Anda *${device}* (No. Tiket *${tktNo}*) saat ini ditangguhkan sementara (*ESTIMATE PENDING*). Kami telah menerbitkan Surat Penawaran Biaya Sementara sebesar *Rp ${(ticket.estimatedCost || 0).toLocaleString()}*. Silakan kunjungi portal kami untuk meninjau detail penawaran dan memberikan Persetujuan Digital (Signature): ${window.location.origin}/?tab=service&sub=approve-quote&ticket=${tktNo}`;
          break;
        case ServiceStatus.MENUGGU_APPROVAL:
          message = `Halo *${customerName}*, diagnosa perangkat *${device}* (No. Tiket *${tktNo}*) telah selesai. Estimasi biaya perbaikan adalah *Rp ${(ticket.estimatedCost || 0).toLocaleString()}*. Mohon persetujuan Anda untuk melanjutkan perbaikan. Catatan: ${note}`;
          break;
        case ServiceStatus.SEDANG_DIKERJAKAN:
          message = `Halo *${customerName}*, perbaikan perangkat Anda *${device}* (No. Tiket *${tktNo}*) telah disetujui dan saat ini dalam *PROSES PERBAIKAN* oleh teknisi kami. Catatan: ${note}`;
          break;
        case ServiceStatus.QC:
          message = `Halo *${customerName}*, perbaikan perangkat *${device}* (No. Tiket *${tktNo}*) telah rampung. Unit saat ini sedang dalam tahap pengujian performa *QC/Testing* ketat untuk memastikan semua fungsi kembali normal. Catatan: ${note}`;
          break;
        case ServiceStatus.SELESAI:
        case ServiceStatus.SIAP_DIAMBIL: {
          const expDate = new Date();
          expDate.setMonth(expDate.getMonth() + (ticket.warrantyMonths || 3));
          const expString = expDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const claimUrl = `${window.location.origin}/?tab=service&sub=warranty-claim&ticket=${tktNo}`;
          message = `Halo *${customerName}*, unit perbaikan Anda *${device}* dengan No. Tiket *${tktNo}* telah *SELESAI & SIAP DIAMBIL*! Silakan kunjungi gerai kami untuk pengambilan. Biaya pelunasan: *Rp ${(ticket.estimatedCost || 0).toLocaleString()}*. Catatan: ${note}\n\n*🛡️ KARTU GARANSI DIGITAL OTOMATIS*\n• *Masa Berlaku*: ${ticket.warrantyMonths || 3} Bulan (s/d ${expString})\n• *Syarat Garansi*: Segel utuh, tidak kena cairan/benturan fisik, dan membawa salinan digital ini.\n• *Link Klaim Cepat*: ${claimUrl}`;
          break;
        }
        case ServiceStatus.DIAMBIL:
          message = `Halo *${customerName}*, terima kasih telah melakukan pengambilan unit *${device}* (*${tktNo}*). Pembayaran dinyatakan LUNAS. Garansi perbaikan aktif selama *${ticket.warrantyMonths || 3} bulan*.`;
          break;
        default:
          message = `Halo *${customerName}*, kami menginfokan bahwa status perbaikan unit *${device}* (No. Tiket *${tktNo}*) saat ini berubah menjadi *${status}*. Catatan: ${note}`;
      }

      // Check if estimate sync is active
      const isSyncEstimate =
        activeTenant?.settings?.waConfig?.syncEstimate ?? true;
      if (
        isSyncEstimate &&
        (status === ServiceStatus.MENUGGU_APPROVAL ||
          status === ServiceStatus.ESTIMATE_PENDING)
      ) {
        const partsText =
          ticket.partsUsed && ticket.partsUsed.length > 0
            ? ticket.partsUsed
                .map(
                  (p: any) =>
                    `  - ${p.name || "Sparepart"}: Rp ${(p.totalPrice || 0).toLocaleString()}`,
                )
                .join("\n")
            : "  - Tidak ada penggantian suku cadang";

        const estimateBreakdown = `\n\n*📋 RINCIAN ESTIMASI BIAYA:*\n• *Diagnosa Teknisi*: ${ticket.techDiagnosis || "Pemeriksaan menyeluruh"}\n• *Biaya Jasa*: Rp ${(ticket.estimatedCost || 0).toLocaleString()}\n• *Suku Cadang (Sparepart)*:\n${partsText}\n• *Total Estimasi*: Rp ${(ticket.estimatedCost || 0).toLocaleString()}`;
        message += estimateBreakdown;
      }

      const waSendingMethod =
        activeTenant?.settings?.waConfig?.sendingMethod || "MANUAL";

      if (waSendingMethod === "API") {
        const savedLogs = localStorage.getItem("saas_wa_logs");
        const currentLogs = savedLogs ? JSON.parse(savedLogs) : [];

        const newLog = {
          id: "wa-" + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          recipientName: customerName,
          recipientPhone: customerPhone,
          type: "SERVICE_UPDATE" as const,
          message: message,
          status: "DELIVERED" as const,
          senderName: "Sistem Otomatis",
          channel: "Meta Cloud API",
        };

        const updatedLogs = [newLog, ...currentLogs];
        localStorage.setItem("saas_wa_logs", JSON.stringify(updatedLogs));
      }

      // Dispatch event
      const event = new CustomEvent("live_notification", {
        detail: {
          title:
            waSendingMethod === "API"
              ? "Notifikasi Otomatis Terkirim"
              : "Draf Notifikasi WhatsApp Dibuat",
          message:
            waSendingMethod === "API"
              ? `WhatsApp dikirim otomatis ke ${customerName} (${customerPhone})`
              : `Menunggu pengiriman manual ke ${customerName} (${customerPhone})`,
          text: message,
          status: status,
          customerName: customerName,
          phone: customerPhone,
          category: "whatsapp",
        },
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error("Error in triggerCustomerNotification", err);
    }
  };

  const applyServerServiceTicket = (ticket: ServiceTicket) => {
    setServices((prev) => prev.map((item) => (item.id === ticket.id ? { ...item, ...ticket } : item)));
  };

  const loadMicroComponents = async () => {
    setMicroComponentsLoading(true);
    setMicroComponentsError("");
    try {
      if (!isBackendConfigured()) return microComponents;
      const response = await apiFetch("/api/micro-components");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Gagal memuat komponen mikro.");
      const items = (payload.data || []) as MicroComponent[];
      setMicroComponents(items);
      setProducts((prev) => {
        const microProductIds = new Set(items.map((item) => item.productId).filter(Boolean));
        return prev.map((product) => microProductIds.has(product.id) ? {
          ...product,
          itemType: "MICRO_COMPONENT" as const,
          warehouseStock: Object.fromEntries(items.filter((item) => item.productId === product.id && item.warehouseId).map((item) => [item.warehouseId!, item.stockQty])),
          stockQty: items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.stockQty, 0),
        } : product);
      });
      return items;
    } catch (error: any) {
      setMicroComponentsError(error?.message || "Gagal memuat komponen mikro.");
      throw error;
    } finally {
      setMicroComponentsLoading(false);
    }
  };

  const createMicroComponent = async (data: Omit<MicroComponent, "id" | "tenantId">) => {
    const response = await apiFetch("/api/micro-components", { method: "POST", body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal menambahkan komponen mikro.");
    const component = payload.data as MicroComponent;
    setMicroComponents((prev) => [...prev.filter((item) => !(item.id === component.id && item.warehouseId === component.warehouseId)), component].sort((a, b) => a.name.localeCompare(b.name)));
    setProducts((prev) => component.productId && !prev.some((item) => item.id === component.productId) ? [...prev, {
      id: component.productId, tenantId: component.tenantId, name: component.name, sku: component.sku, barcode: component.sku,
      category: "SPAREPART", itemType: "MICRO_COMPONENT", isActive: true, purchaseCost: component.purchaseCost,
      sellPrice: component.sellPrice, unit: "pcs", minStock: component.minStock, reorderLevel: component.minStock,
      stockQty: component.stockQty, warehouseStock: component.warehouseId ? { [component.warehouseId]: component.stockQty } : {},
      grade: ItemGrade.NEW, isConsignment: false,
    }] : prev);
    return component;
  };

  const updateMicroComponent = async (id: string, data: Partial<MicroComponent>) => {
    const response = await apiFetch(`/api/micro-components/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal memperbarui komponen mikro.");
    const rows = payload.data as MicroComponent[];
    setMicroComponents((prev) => [...prev.filter((item) => item.id !== id), ...rows].sort((a, b) => a.name.localeCompare(b.name)));
    return rows;
  };

  const adjustMicroComponentStock = async (id: string, data: { warehouseId: string; mode: "IN" | "OUT" | "SET"; quantity: number; reason: string; referenceNo?: string; idempotencyKey: string }) => {
    const response = await apiFetch(`/api/micro-components/${id}/stock`, { method: "POST", body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal memperbarui stok komponen.");
    const component = payload.data.component as MicroComponent;
    if (component) setMicroComponents((prev) => prev.map((item) => item.id === id && item.warehouseId === component.warehouseId ? component : item));
    return component;
  };

  const consumeMicroComponentForService = async (componentId: string, data: {
    ticketId: string; warehouseId?: string; quantity: number; chargeable: boolean; unitPrice?: number;
    note?: string; idempotencyKey: string;
  }) => {
    const response = await apiFetch(`/api/micro-components/${componentId}/consume`, { method: "POST", body: JSON.stringify(data) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal memakai komponen mikro.");
    const result = payload.data as { usage: MicroComponentUsage; component: MicroComponent; ticket: ServiceTicket; idempotent: boolean };
    if (result.component) setMicroComponents((prev) => prev.map((item) => item.id === componentId ? { ...item, ...result.component } : item));
    if (result.ticket) applyServerServiceTicket(result.ticket);
    return result;
  };

  const runServiceWorkflow = async (id: string, action: string, body: any) => {
    const response = await apiFetch(`/api/service-receptions/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Workflow servis gagal.");
    const ticket = (payload.data.ticket || payload.data) as ServiceTicket;
    applyServerServiceTicket(ticket);
    return payload.data;
  };

  const requestServicePart = async (id: string, part: { productId: string; warehouseId: string; quantity: number; serialNumber?: string }) => {
    if (!isBackendConfigured()) return;
    const response = await apiFetch(`/api/service-receptions/${id}/parts`, { method: "POST", body: JSON.stringify(part) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal menambahkan spare part.");
    applyServerServiceTicket(payload.data.ticket);
  };

  const cancelServicePart = async (id: string, partId: string) => {
    if (!isBackendConfigured()) return;
    const response = await apiFetch(`/api/service-receptions/${id}/parts/${partId}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal membatalkan spare part.");
    applyServerServiceTicket(payload.data.ticket);
  };

  const patchServiceWork = async (id: string, updates: Record<string, any>) => {
    if (!isBackendConfigured()) {
      updateServiceTicket(id, updates);
      return;
    }
    const response = await apiFetch(`/api/service-receptions/${id}/work`, { method: "PATCH", body: JSON.stringify(updates) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal memperbarui pekerjaan servis.");
    applyServerServiceTicket(payload.data);
  };

  const addApprovedAdditionalCost = async (id: string, data: {
    description: string; amount: number; approvalMethod: "WHATSAPP" | "PHONE" | "IN_PERSON";
    approvedByName?: string; note?: string; proofName?: string; idempotencyKey: string;
  }) => {
    if (!isBackendConfigured()) {
      const ticket = services.find((item) => item.id === id);
      if (!ticket) throw new Error("Tiket tidak ditemukan.");
      updateServiceTicket(id, {
        estimatedCost: (ticket.estimatedCost || 0) + data.amount,
        timeline: [...ticket.timeline, {
          status: ticket.status,
          note: `Tambahan biaya Rp ${data.amount.toLocaleString("id-ID")} untuk ${data.description} disetujui via ${data.approvalMethod}.`,
          timestamp: new Date().toISOString(), operator: currentUser.name,
        }],
      });
      return;
    }
    const response = await apiFetch(`/api/service-receptions/${id}/additional-costs`, {
      method: "POST", body: JSON.stringify(data),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal mencatat tambahan biaya.");
    applyServerServiceTicket(payload.data.ticket);
  };

  const servicePartOrderRequest = async (id: string, path: string, method: string, data?: any) => {
    if (!isBackendConfigured()) throw new Error("Permintaan spare part memerlukan backend aktif.");
    const response = await apiFetch(`/api/service-receptions/${id}/part-orders${path}`, {
      method, body: data ? JSON.stringify(data) : undefined,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Workflow spare part gagal.");
    applyServerServiceTicket(payload.data.ticket);
    return payload.data;
  };
  const createServicePartOrder = (id: string, data: Record<string, any>) => servicePartOrderRequest(id, "", "POST", data);
  const updateServicePartOrder = (id: string, orderId: string, data: Record<string, any>) => servicePartOrderRequest(id, `/${orderId}`, "PATCH", data);
  const receiveServicePartOrder = (id: string, orderId: string, data: Record<string, any>) => servicePartOrderRequest(id, `/${orderId}/arrive`, "POST", data);
  const cancelServicePartOrder = (id: string, orderId: string) => servicePartOrderRequest(id, `/${orderId}/cancel`, "POST");

  const updateServiceStatus = async (
    id: string,
    status: ServiceStatus,
    note: string,
  ) => {
    if (isBackendConfigured()) {
      await runServiceWorkflow(id, "transition", { status, note });
      return;
    }
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated: ServiceTicket = {
            ...s,
            status,
            ...(status === ServiceStatus.MENUGGU_APPROVAL ||
            status === ServiceStatus.ESTIMATE_PENDING
              ? { customerApprovalStatus: "PENDING" as const }
              : {}),
            timeline: [
              ...s.timeline,
              {
                status,
                note,
                timestamp: new Date().toISOString(),
                operator: currentUser.name,
              },
            ],
          };
          setTimeout(
            () => triggerCustomerNotification(updated, status, note),
            50,
          );
          return updated;
        }
        return s;
      }),
    );
    addLog(
      "Update Service Status",
      `Mengubah status servis ID: ${id} menjadi ${status}`,
      "SERVICE",
    );
  };

  const addServiceDiagnostic = async (
    id: string,
    diagnosis: string,
    estCost: number,
    parts: any[],
  ) => {
    if (isBackendConfigured()) {
      await runServiceWorkflow(id, "diagnosis", { diagnosis, estimatedCost: estCost, parts });
      return;
    }
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated: ServiceTicket = {
            ...s,
            techDiagnosis: diagnosis,
            estimatedCost: estCost,
            partsUsed: parts,
            status: ServiceStatus.MENUGGU_APPROVAL,
            customerApprovalStatus: "PENDING" as const,
            timeline: [
              ...s.timeline,
              {
                status: ServiceStatus.DIAGNOSA,
                note: "Pemeriksaan teknisi selesai. Estimasi biaya dibuat.",
                timestamp: new Date().toISOString(),
                operator: currentUser.name,
              },
            ],
          };
          setTimeout(
            () =>
              triggerCustomerNotification(
                updated,
                ServiceStatus.MENUGGU_APPROVAL,
                "Estimasi biaya perbaikan telah dibuat.",
              ),
            50,
          );
          return updated;
        }
        return s;
      }),
    );
    addLog(
      "AI & Technical Diagnose Completed",
      `Diagnosa srv ID: ${id}, Est: Rp${(estCost ?? 0).toLocaleString()}`,
      "SERVICE",
    );
  };

  const approveServiceEstimate = async (
    id: string,
    approved: boolean,
    signatureName?: string,
    signatureText?: string,
  ) => {
    if (isBackendConfigured()) {
      await runServiceWorkflow(id, "approval", { approved, signatureName, signature: signatureText });
      return;
    }
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newStatus = approved
            ? ServiceStatus.SEDANG_DIKERJAKAN
            : ServiceStatus.APPROVAL_DITOLAK;
          const updated: ServiceTicket = {
            ...s,
            customerApprovalStatus: (approved ? "APPROVED" : "REJECTED") as
              "APPROVED" | "REJECTED",
            customerApprovalDate: new Date().toISOString(),
            status: newStatus,
            provisionalSignatureName: signatureName || "",
            provisionalSignature: signatureText || "",
            provisionalApprovedAt: approved ? new Date().toISOString() : "",
            timeline: [
              ...s.timeline,
              {
                status: newStatus,
                note: approved
                  ? `Estimasi disetujui customer (Ttd: ${signatureName || "Pelanggan"}). Pengerjaan dimulai.`
                  : "Estimasi ditolak customer.",
                timestamp: new Date().toISOString(),
                operator: "Pelanggan (Digital Portal)",
              },
            ],
          };
          setTimeout(
            () =>
              triggerCustomerNotification(
                updated,
                newStatus,
                approved
                  ? "Estimasi disetujui, pengerjaan dimulai."
                  : "Estimasi ditolak customer.",
              ),
            50,
          );
          return updated;
        }
        return s;
      }),
    );
    addLog(
      "Estimate Approval Action",
      `Konfirmasi estimasi ID: ${id} disetujui: ${approved} (Oleh: ${signatureName || "N/A"})`,
      "SERVICE",
    );
  };

  const completeServiceQC = async (
    id: string,
    score: number,
    notes: string,
    passed: boolean,
  ) => {
    if (isBackendConfigured()) {
      const ticket = services.find((item) => item.id === id);
      await runServiceWorkflow(id, "qc", {
        score,
        notes,
        passed,
        checklist: ticket?.qcChecklist || [],
        photos: ticket?.qcPhotos || [],
      });
      return;
    }
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = passed
            ? ServiceStatus.SELESAI
            : ServiceStatus.REWORK;
          const updated = {
            ...s,
            qcScore: score,
            qcNotes: notes,
            status: nextStatus,
            timeline: [
              ...s.timeline,
              {
                status: ServiceStatus.QC,
                note: `Quality Control Score: ${score}/100. Status: ${passed ? "PASSED" : "REWORK"}`,
                timestamp: new Date().toISOString(),
                operator: currentUser.name,
              },
            ],
          };
          setTimeout(
            () =>
              triggerCustomerNotification(
                updated,
                nextStatus,
                `Quality Control Score: ${score}/100. ${notes}`,
              ),
            50,
          );
          return updated;
        }
        return s;
      }),
    );
    addLog(
      "Quality Control Audit",
      `QC untuk servis ID ${id}. Score: ${score}`,
      "SERVICE",
    );
  };

  const handoverServiceDevice = async (
    id: string,
    paymentMethod: PaymentMethod,
    details?: { refNo?: string; proofName?: string; tempoDays?: number },
  ) => {
    if (isBackendConfigured()) {
      await runServiceWorkflow(id, "handover", {
        paymentMethod,
        referenceNo: details?.refNo,
        proofName: details?.proofName,
        tempoDays: details?.tempoDays,
        idempotencyKey: `handover-${id}`,
      });
      return;
    }
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          // Calculate ledger transactions
          const taxRate = 11;
          const subtotal = s.estimatedCost;
          const tax = Math.round(subtotal * (taxRate / 100));
          const total = subtotal + tax;

          // Determine target receiving account based on payment method
          let targetAccountId = getCOAAccount("cash", currentTenantId); // Default cash box
          if (paymentMethod === PaymentMethod.TEMPO) {
            const piutangAcc = accounts.find(
              (a) => a.tenantId === currentTenantId && (a as any).branchId === currentBranchId && a.code === "10300",
            ) || accounts.find(
              (a) => a.tenantId === currentTenantId && !(a as any).branchId && a.code === "10300",
            );
            targetAccountId = piutangAcc
              ? piutangAcc.id
              : `coa-${currentTenantId}-10300`;
          } else if (paymentMethod !== PaymentMethod.CASH) {
            targetAccountId = getCOAAccount("bank", currentTenantId); // Bank/Mandiri Transfer for others
          }

          // Automatic double entry ledger posting
          const ledgerRef = s.ticketNo;
          const refString = details?.refNo ? ` Ref: ${details.refNo}` : "";
          const proofString = details?.proofName
            ? ` Bukti: ${details.proofName}`
            : "";
          const tempoString =
            paymentMethod === PaymentMethod.TEMPO
              ? ` (TEMPO Jatuh Tempo ${details?.tempoDays || 30} Hari)`
              : "";

          addJournalEntry(
            ledgerRef,
            `Pelunasan Servis No: ${s.ticketNo} (${paymentMethod})${refString}${proofString}${tempoString}`,
            [
              { accountId: targetAccountId, debit: total, credit: 0 },
              {
                accountId: getCOAAccount("service", currentTenantId),
                debit: 0,
                credit: subtotal,
              }, // Rev
              {
                accountId: getCOAAccount("tax", currentTenantId),
                debit: 0,
                credit: tax,
              }, // Tax payable
            ],
          );

          // 1. Record Cash Transaction / Receivable Logging
          const cashTx: CashTransaction = {
            id: "ctx-" + Math.random().toString(36).substr(2, 9),
            tenantId: currentTenantId,
            branchId: s.branchId || currentBranchId,
            type: "CASH_IN",
            amount: total,
            fromAccountId: getCOAAccount("service", currentTenantId),
            toAccountId: targetAccountId,
            description: `Pelunasan Servis No: ${s.ticketNo} (${paymentMethod})${refString}${tempoString}`,
            timestamp: new Date().toISOString(),
            operator: currentUser.name,
          };
          setCashTransactions((prevCtx) => [cashTx, ...prevCtx]);

          // 2. Automatically reduce stock of repair parts used in this service ticket
          if (s.partsUsed && s.partsUsed.length > 0) {
            setProducts((prevProd) =>
              prevProd.map((p) => {
                const usedPart = s.partsUsed.find(
                  (up: any) => up.productId === p.id,
                );
                if (usedPart) {
                  const nextQty = Math.max(0, p.stockQty - usedPart.quantity);
                  // Check low stock warning
                  if (p.category !== "JASA" && nextQty <= p.minStock) {
                    window.dispatchEvent(
                      new CustomEvent("live_notification", {
                        detail: {
                          title: "⚠️ Peringatan Stok Kritis",
                          text: `Stok untuk produk "${p.name}" (SKU: ${p.sku}) tinggal ${nextQty} ${p.unit}. Batas minimum adalah ${p.minStock}.`,
                          message: `Stok untuk produk "${p.name}" (SKU: ${p.sku}) tinggal ${nextQty} ${p.unit}. Batas minimum adalah ${p.minStock}.`,
                          category: "stock",
                        },
                      }),
                    );
                  }
                  return { ...p, stockQty: nextQty };
                }
                return p;
              }),
            );

            // Log stock movements for each part
            s.partsUsed.forEach((part: any) => {
              const movement: StockMovement = {
                id: "mov-" + Math.random().toString(36).substr(2, 9),
                tenantId: currentTenantId,
                productId: part.productId,
                warehouseId: s.branchId || "wh-mks-1",
                type: "OUT",
                quantity: -part.quantity,
                referenceNo: s.ticketNo,
                note: `Pengurangan stok otomatis (Suku Cadang) untuk servis selesai No. Tiket: ${s.ticketNo}`,
                timestamp: new Date().toISOString(),
              };
              setStockMovements((prevMovements) => [
                movement,
                ...prevMovements,
              ]);
            });
          }

          const timelineNote =
            paymentMethod === PaymentMethod.TEMPO
              ? `Perangkat diserahkan kepada customer. Pembayaran via TEMPO (Piutang Usaha) Jatuh Tempo ${details?.tempoDays || 30} Hari. Suku cadang terpasang dipotong dari inventaris secara otomatis.`
              : `Perangkat diserahkan kepada customer. Pembayaran via ${paymentMethod} LUNAS${refString}${proofString}. Suku cadang terpasang dipotong dari inventaris secara otomatis.`;

          const updated = {
            ...s,
            status: ServiceStatus.DIAMBIL,
            paymentMethod,
            paymentRef: details?.refNo || "",
            paymentProofName: details?.proofName || "",
            tempoDays: details?.tempoDays || 0,
            handoverAt: new Date().toISOString(),
            warrantyEndsAt: new Date(
              Date.now() + s.warrantyMonths * 30 * 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .split("T")[0],
            warrantyCardSent: true,
            warrantyCardUrl: `/warranty/${encodeURIComponent(s.ticketNo)}`,
            invoiceId: s.ticketNo,
            timeline: [
              ...s.timeline,
              {
                status: ServiceStatus.DIAMBIL,
                note: timelineNote,
                timestamp: new Date().toISOString(),
                operator: currentUser.name,
              },
            ],
          };
          setTimeout(
            () =>
              triggerCustomerNotification(
                updated,
                ServiceStatus.DIAMBIL,
                paymentMethod === PaymentMethod.TEMPO
                  ? "Unit telah diserahkan dengan metode tempo."
                  : "Unit telah diserahkan dan lunas.",
              ),
            50,
          );
          return updated;
        }
        return s;
      }),
    );
    addLog(
      "Device Handover Complete",
      `Perangkat servis ID: ${id} telah diambil & tercatat via ${paymentMethod}.`,
      "SERVICE",
    );
  };

  // ==========================================
  // FIELD SERVICE ACTIONS
  // ==========================================

  const checkInFieldService = (
    visitId: string,
    lat: number,
    lng: number,
    address: string,
  ) => {
    const linkedTicketId = fieldVisits.find((v) => v.id === visitId)?.serviceId;
    setFieldVisits((prev) =>
      prev.map((v) =>
        v.id === visitId
          ? { ...v, checkInTime: new Date().toISOString(), checkInLoc: { lat, lng, address } }
          : v,
      ),
    );
    // Jika visit terkait tiket servis, update status ke SEDANG_DIKERJAKAN
    if (linkedTicketId) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === linkedTicketId && s.status !== ServiceStatus.SEDANG_DIKERJAKAN
            ? { ...s, status: ServiceStatus.SEDANG_DIKERJAKAN, timeline: [...(s.timeline || []), { status: ServiceStatus.SEDANG_DIKERJAKAN, note: `Teknisi check-in via Field Service GPS`, timestamp: new Date().toISOString(), operator: "System" }] }
            : s,
        ),
      );
    }
    addLog("Field Service GPS Check-In", `Check-in lok: ${address}${linkedTicketId ? `, tiket: ${linkedTicketId}` : ""}`, "SERVICE");
  };

  const checkOutFieldService = (
    visitId: string,
    lat: number,
    lng: number,
    address: string,
    sig: string,
    report: string,
    proofPhoto?: string,
  ) => {
    setFieldVisits((prev) =>
      prev.map((v) => {
        if (v.id === visitId) {
          // split commission to technician
          const commAmt = Math.round(v.commissionEarned);
          setCommissions((comm) => [
            ...comm,
            {
              id: "comm-" + Math.random().toString(36).substr(2, 9),
              tenantId: currentTenantId,
              branchId: currentBranchId,
              employeeId: v.techId,
              type: "FIELD",
              amount: commAmt,
              status: "PENDING",
              timestamp: new Date().toISOString(),
            },
          ]);

          return {
            ...v,
            checkOutTime: new Date().toISOString(),
            checkOutLoc: { lat, lng, address },
            digitalSignature: sig,
            visitReport: report,
            proofPhotos: proofPhoto ? [proofPhoto] : v.proofPhotos,
          };
        }
        return v;
      }),
    );
    addLog(
      "Field Service GPS Check-Out",
      `Check-out lok: ${address}, visit report submitted.`,
      "SERVICE",
    );
  };

  // ==========================================
  // POS & SHIFT CONTROLLER
  // ==========================================

  const {
    openShift,
    closeShift,
    createPOSTransaction,
    refundTransaction,
  } = useSaaSPOS({
    currentTenantId,
    currentBranchId,
    currentUser,
    shifts,
    transactions,
    warehouses,
    setShifts,
    setTransactions,
    setProducts,
    setCashTransactions,
    syncToApi,
    addLog,
    triggerFraudAlert,
    addJournalEntry,
    getCOAAccount,
    verifyScope,
    tenants,
  } as any);

  // END POS & SHIFT CONTROLLER

  // ==========================================
  // INVENTORY CONTROLLER (extracted to useSaaSInventory hook)
  // ==========================================

  const {
    addInventoryProduct,
    updateInventoryProduct,
    transferProductStock,
    adjustProductStock,
    createInventoryTransfer,
    updateInventoryTransferStatus,
  } = useSaaSInventory({
    currentTenantId,
    products,
    setProducts,
    setStockMovements,
    setInventoryTransfers,
    syncToApi,
    addLog,
    verifyScope,
  });

  // END INVENTORY CONTROLLER

  // ==========================================
  // CRM / CUSTOMER CONTROLLER
  // ==========================================

  const addEmployee = (
    emp: Omit<Employee, "id" | "tenantId" | "attendanceHistory" | "leaves">,
  ) => {
    const id = "emp-" + Math.random().toString(36).substr(2, 9);
    const newEmp: Employee = {
      ...emp,
      id,
      tenantId: currentTenantId,
      attendanceHistory: [],
      leaves: [],
    };
    setEmployees((prev) => [...prev, newEmp]);
    syncModuleRecord("employees", newEmp.id, newEmp, "insert");
    addLog(
      "Add Employee",
      `Menambahkan karyawan baru: ${emp.name} (${emp.position})`,
      "SYSTEM",
    );
  };

  const addCustomer = (cust: Omit<Customer, "id" | "tenantId">): Customer => {
    const id = generateUUID();
    const newCust: Customer = {
      loyaltyPoints: 0,
      storeCredit: 0,
      referralCode: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      salesPipelineStage: "WON",
      quotations: [],
      ...cust,
      id,
      tenantId: currentTenantId,
    };
    setCustomers((prev) => [...prev, newCust]);
    syncToApi("customers", "insert", newCust);
    addLog(
      "Add Customer",
      `Menambahkan pelanggan baru: ${cust.name}`,
      "SERVICE",
    );
    return newCust;
  };

  const updateCustomer = (customerId: string, data: Partial<Customer>) => {
    setCustomers((prev) => {
      const next = prev.map((cust) => {
        if (cust.id !== customerId) return cust;
        const updated = { ...cust, ...data };
        syncToApi("customers", "update", updated);
        return updated;
      });
      return next;
    });
  };

  const updateEmployee = (employeeId: string, data: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const updated = { ...emp, ...data };
        syncModuleRecord("employees", employeeId, updated, "update");
        return updated;
      }),
    );
    const empName =
      employees.find((e) => e.id === employeeId)?.name || "Karyawan";
    addLog("Update Employee", `Mengubah data karyawan ${empName}`, "SYSTEM");
  };

  const requestCashAdvance = (
    employeeId: string,
    data: { amount: number; reason: string; date: string },
  ) => {
    const id = "ca-" + Math.random().toString(36).substr(2, 9);
    const cashAdvance = { id, employeeId, ...data, status: "PENDING" as const };
    syncModuleRecord("cash_advances", id, cashAdvance, "insert");
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const advances = emp.cashAdvances || [];
        return {
          ...emp,
          cashAdvances: [
            ...advances,
            {
              id,
              amount: data.amount,
              reason: data.reason,
              date: data.date,
              status: "PENDING",
            },
          ],
        };
      }),
    );
    addLog(
      "Request Cash Advance",
      `Pengajuan kasbon oleh karyawan ID: ${employeeId} sejumlah Rp ${data.amount.toLocaleString()}`,
      "SYSTEM",
    );
  };

  const approveCashAdvance = (
    employeeId: string,
    advanceId: string,
    status: "APPROVED" | "REJECTED",
    approvedBy: string,
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const advances = emp.cashAdvances || [];
        const updatedAdvances = advances.map((a) => {
          if (a.id !== advanceId) return a;
          const updatedAdvance = { ...a, status, approvedBy };
          syncModuleRecord("cash_advances", advanceId, { ...updatedAdvance, employeeId }, "update");
          return updatedAdvance;
        });
        return {
          ...emp,
          cashAdvances: updatedAdvances,
        };
      }),
    );
    addLog(
      "Approve Cash Advance",
      `Status kasbon ID: ${advanceId} diupdate menjadi ${status}`,
      "SYSTEM",
    );
  };

  const addWorkShift = (shift: Omit<WorkShift, "id" | "tenantId">) => {
    const id = "shift-" + Math.random().toString(36).substr(2, 9);
    const newShift: WorkShift = {
      ...shift,
      id,
      tenantId: currentTenantId,
    };
    setWorkShifts((prev) => [...prev, newShift]);
    syncModuleRecord("work_shifts", newShift.id, newShift, "insert");
    addLog(
      "Add Work Shift",
      `Menambahkan shift kerja baru: ${shift.name} (${shift.startTime}-${shift.endTime})`,
      "SYSTEM",
    );
  };

  const deleteWorkShift = (id: string) => {
    setWorkShifts((prev) => prev.filter((s) => s.id !== id));
    syncModuleRecord("work_shifts", id, { id }, "delete");
    addLog("Delete Work Shift", `Menghapus shift kerja ID: ${id}`, "SYSTEM");
  };

  const updateWorkShift = (id: string, data: Partial<WorkShift>) => {
    setWorkShifts((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...data };
        syncModuleRecord("work_shifts", id, updated, "update");
        return updated;
      }),
    );
    addLog(
      "Update Work Shift",
      `Mengubah data shift kerja ID: ${id}`,
      "SYSTEM",
    );
  };

  const calculateGPSDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const clockInStaff = (
    employeeId: string,
    shiftId: string,
    lat: number,
    lng: number,
    note?: string,
  ) => {
    const todayStr = new Date().toISOString().split("T")[0]; // "2026-06-30" etc.
    const timeStr = new Date()
      .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      .replace(/\./g, ":"); // e.g., "08:15"

    const selectedShift = workShifts.find((s) => s.id === shiftId);
    if (!selectedShift) return;

    const distanceMeters = calculateGPSDistance(
      lat,
      lng,
      selectedShift.latitude,
      selectedShift.longitude,
    );
    const isWithinRange = distanceMeters <= selectedShift.radius;

    let status: "PRESENT" | "LATE" = "PRESENT";
    if (selectedShift.startTime) {
      const [sh, sm] = selectedShift.startTime.split(":").map(Number);
      const [ch, cm] = timeStr.split(":").map(Number);
      if (ch > sh || (ch === sh && cm > sm + 15)) {
        // 15 mins grace period
        status = "LATE";
      }
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;

        const history = [...emp.attendanceHistory];
        const existingIdx = history.findIndex((h) => h.date === todayStr);

        const record = {
          date: todayStr,
          checkIn: timeStr,
          status: status,
          shiftId: shiftId,
          shiftName: selectedShift.name,
          clockInLat: lat,
          clockInLng: lng,
          clockInDistance: Math.round(distanceMeters),
          clockInValid: isWithinRange,
        };

        if (existingIdx >= 0) {
          history[existingIdx] = {
            ...history[existingIdx],
            ...record,
          };
        } else {
          history.push(record);
        }

        return {
          ...emp,
          attendanceHistory: history,
        };
      }),
    );

    addLog(
      "Staff Clock In",
      `Karyawan ID ${employeeId} Clock-In ke shift '${selectedShift.name}' pada ${timeStr}. Jarak GPS: ${Math.round(distanceMeters)}m, Valid: ${isWithinRange}`,
      "SYSTEM",
    );
  };

  const clockOutStaff = (
    employeeId: string,
    lat: number,
    lng: number,
    note?: string,
  ) => {
    const todayStr = new Date().toISOString().split("T")[0]; // "2026-06-30" etc.
    const timeStr = new Date()
      .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      .replace(/\./g, ":"); // e.g., "17:05"

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;

        const history = [...emp.attendanceHistory];
        const existingIdx = history.findIndex((h) => h.date === todayStr);

        if (existingIdx < 0) return emp;

        const existingRecord = history[existingIdx];
        const shiftId = existingRecord.shiftId;
        const selectedShift = workShifts.find((s) => s.id === shiftId);

        let distanceMeters = 0;
        let isWithinRange = true;

        if (selectedShift) {
          distanceMeters = calculateGPSDistance(
            lat,
            lng,
            selectedShift.latitude,
            selectedShift.longitude,
          );
          isWithinRange = distanceMeters <= selectedShift.radius;
        }

        let workHours = 8;
        if (existingRecord.checkIn) {
          const [ih, im] = existingRecord.checkIn.split(":").map(Number);
          const [oh, om] = timeStr.split(":").map(Number);
          const startTotalMinutes = ih * 60 + im;
          const endTotalMinutes = oh * 60 + om;
          if (endTotalMinutes > startTotalMinutes) {
            workHours = Number(
              ((endTotalMinutes - startTotalMinutes) / 60).toFixed(2),
            );
          }
        }

        const record = {
          ...existingRecord,
          checkOut: timeStr,
          clockOutLat: lat,
          clockOutLng: lng,
          clockOutDistance: Math.round(distanceMeters),
          clockOutValid: isWithinRange,
          workHours: workHours,
        };

        history[existingIdx] = record;

        return {
          ...emp,
          attendanceHistory: history,
        };
      }),
    );

    addLog(
      "Staff Clock Out",
      `Karyawan ID ${employeeId} Clock-Out pada ${timeStr}.`,
      "SYSTEM",
    );
  };

  const recordAttendance = (
    employeeId: string,
    date: string,
    checkIn: string,
    checkOut?: string,
    status?: "PRESENT" | "LATE" | "ABSENT" | "LEAVE",
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;

        const history = [...emp.attendanceHistory];
        const existingIdx = history.findIndex((h) => h.date === date);

        const updatedRecord = {
          date,
          checkIn,
          checkOut,
          status: status || "PRESENT",
        };

        if (existingIdx >= 0) {
          history[existingIdx] = {
            ...history[existingIdx],
            ...updatedRecord,
          };
        } else {
          history.push(updatedRecord);
        }

        return {
          ...emp,
          attendanceHistory: history,
        };
      }),
    );
    addLog(
      "Record Attendance",
      `Mencatat presensi karyawan ID: ${employeeId} untuk tanggal ${date}`,
      "SYSTEM",
    );
  };

  const bulkCheckIn = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setEmployees((prev) =>
      prev.map((emp) => {
        if (
          emp.tenantId !== currentTenantId ||
          emp.branchId !== currentBranchId
        )
          return emp;

        const history = [...emp.attendanceHistory];
        const existingIdx = history.findIndex((h) => h.date === todayStr);

        const hasCheckedIn =
          existingIdx >= 0 && history[existingIdx].checkIn !== "-";
        if (hasCheckedIn) return emp; // Skip if already checked in

        const randomMinutes = Math.floor(Math.random() * 25); // between 8:00 and 8:25
        const hour = 8;
        const minStr = randomMinutes.toString().padStart(2, "0");
        const timeStr = `0${hour}:${minStr}`;
        const status = randomMinutes > 20 ? "LATE" : "PRESENT";

        const updatedRecord = {
          date: todayStr,
          checkIn: timeStr,
          checkOut: "17:00",
          status: status as "PRESENT" | "LATE",
        };

        if (existingIdx >= 0) {
          history[existingIdx] = { ...history[existingIdx], ...updatedRecord };
        } else {
          history.push(updatedRecord);
        }

        return { ...emp, attendanceHistory: history };
      }),
    );
    addLog(
      "Bulk Check-In",
      `Presensi cepat seluruh staff untuk tanggal ${todayStr}`,
      "SYSTEM",
    );
  };

  const submitLeave = (
    employeeId: string,
    leave: Omit<Employee["leaves"][number], "id" | "status">,
  ) => {
    const id = "lv-" + Math.random().toString(36).substr(2, 9);
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        return {
          ...emp,
          leaves: [...emp.leaves, { ...leave, id, status: "PENDING" }],
        };
      }),
    );
    addLog(
      "Submit Leave",
      `Pengajuan cuti baru oleh karyawan ID: ${employeeId}`,
      "SYSTEM",
    );
  };

  const approveLeave = (
    employeeId: string,
    leaveId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const updatedLeaves = emp.leaves.map((l) => {
          if (l.id !== leaveId) return l;
          return { ...l, status };
        });

        // If approved, update attendance history for those dates
        let attendanceHistory = [...emp.attendanceHistory];
        const leaveRequest = emp.leaves.find((l) => l.id === leaveId);
        if (status === "APPROVED" && leaveRequest) {
          // Simple mock: add an entry for the start date
          const dateStr = leaveRequest.start;
          const existingIdx = attendanceHistory.findIndex(
            (h) => h.date === dateStr,
          );
          const record = {
            date: dateStr,
            checkIn: "-",
            checkOut: "-",
            status: (leaveRequest.type === "SICK" ? "ABSENT" : "LEAVE") as
              "PRESENT" | "LATE" | "ABSENT" | "LEAVE",
          };
          if (existingIdx >= 0) {
            attendanceHistory[existingIdx] = record;
          } else {
            attendanceHistory.push(record);
          }
        }

        return {
          ...emp,
          leaves: updatedLeaves,
          attendanceHistory,
        };
      }),
    );
    addLog(
      "Approve Leave",
      `Status cuti ID: ${leaveId} diupdate menjadi ${status}`,
      "SYSTEM",
    );
  };

  // ==========================================
  // DOUBLE-ENTRY POSTING SYSTEM
  // ==========================================

  function addJournalEntry(
    refNo: string,
    desc: string,
    lines: { accountId: string; debit: number; credit: number }[],
  ) {
    const id = "jr-" + Math.random().toString(36).substr(2, 9);
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

    if (totalDebit !== totalCredit) {
      throw new Error("Debit dan Kredit harus seimbang!");
    }

    const newEntry: JournalEntry = {
      id,
      tenantId: currentTenantId,
      branchId: currentBranchId,
      entryDate: new Date().toISOString().split("T")[0],
      refNo: refNo,
      description: desc,
      lines,
      isPosted: true,
      postedBy: currentUser.name,
    };

    setJournals((prev) => [newEntry, ...prev]);
    syncToApi("journals", "insert", newEntry);

    // Update balance of the COA accounts
    setAccounts((prev) =>
      prev.map((acc) => {
        const line = lines.find((l) => l.accountId === acc.id);
        if (line) {
          const impact =
            acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE
              ? line.debit - line.credit
              : line.credit - line.debit;
          const updated = {
            ...acc,
            balance: acc.balance + impact,
          };
          syncToApi("accounts", "update", updated);
          return updated;
        }
        return acc;
      }),
    );
  };

  const addCashTransaction = (
    tx: Omit<
      CashTransaction,
      "id" | "tenantId" | "branchId" | "timestamp" | "operator"
    >,
  ) => {
    const newTx: CashTransaction = {
      id: "ctx-" + Math.random().toString(36).substr(2, 9),
      tenantId: currentTenantId,
      branchId: currentBranchId,
      timestamp: new Date().toISOString(),
      operator: currentUser.name,
      ...tx,
    };
    setCashTransactions((prev) => [newTx, ...prev]);

    addLog(
      "Cash Transaction",
      `Mencatat transaksi kas ${tx.type === "CASH_IN" ? "Masuk" : "Keluar"}: Rp ${(tx.amount ?? 0).toLocaleString()} - ${tx.description}`,
      "FINANCE",
    );

    // Double entry accounting lines
    // CASH_IN: debit Cash (toAccountId), credit Rev (fromAccountId)
    // CASH_OUT: debit Expense (toAccountId), credit Cash (fromAccountId)
    try {
      addJournalEntry(newTx.id, `Pencatatan Transaksi: ${tx.description}`, [
        { accountId: tx.toAccountId, debit: tx.amount, credit: 0 },
        { accountId: tx.fromAccountId, debit: 0, credit: tx.amount },
      ]);
    } catch (err) {
      console.error("Error creating journal for cash transaction", err);
    }
  };

  // ==========================================
  // HRD & PAYROLL ENGINE
  // ==========================================

  const generatePayroll = (monthYear: string) => {
    const tenantStaff = employees.filter((e) => e.tenantId === currentTenantId);
    tenantStaff.forEach((e) => {
      // Find commissions
      const employeeComms = commissions.filter(
        (c) => c.employeeId === e.id && c.status === "PENDING",
      );
      const totalComm = employeeComms.reduce((sum, c) => sum + c.amount, 0);

      // Find unpaid approved kasbon
      const approvedKasbon = (e.cashAdvances || []).filter(
        (ca) => ca.status === "APPROVED",
      );
      const totalKasbon = approvedKasbon.reduce(
        (sum, ca) => sum + ca.amount,
        0,
      );

      const gross = e.basicSalary + totalComm;
      const standardDeductions = 150000; // standard deduction BPJS/Tax
      const totalDeductions = standardDeductions + totalKasbon;
      const net = gross - totalDeductions;

      const newPayroll: Payroll = {
        id: "pay-" + Math.random().toString(36).substr(2, 9),
        tenantId: currentTenantId,
        employeeId: e.id,
        monthYear,
        basicSalary: e.basicSalary,
        commissions: totalComm,
        allowances: 250000,
        deductions: totalDeductions,
        netSalary: net,
        status: "PAID",
        paidAt: new Date().toISOString(),
      };

      setPayroll((prev) => [newPayroll, ...prev]);
      syncModuleRecord("payroll", newPayroll.id, newPayroll, "insert");

      // Update cash advances to PAID
      if (approvedKasbon.length > 0) {
        setEmployees((prev) =>
          prev.map((emp) => {
            if (emp.id !== e.id) return emp;
            return {
              ...emp,
              cashAdvances: (emp.cashAdvances || []).map((ca) =>
                ca.status === "APPROVED" ? { ...ca, status: "PAID" } : ca,
              ),
            };
          }),
        );
      }

      // post to double entry ledger
      // For double entry: Debit Gaji (Expense) = gross
      // Credit Kas/Bank (Asset) = net
      // Credit Kasbon (Asset/Piutang) = totalKasbon
      // Credit Pajak/BPJS (Liability) = standardDeductions
      // (For simplicity in the existing code, it was debit net, credit net. Let's make it more accurate or stick to a simple one)
      const journalLines = [
        { accountId: getCOAAccount("bank", currentTenantId), debit: 0, credit: net },
      ];
      if (totalKasbon > 0) {
        journalLines.push({
          accountId: getCOAAccount("bank", currentTenantId),
          debit: 0,
          credit: totalKasbon,
        });
      }
      if (standardDeductions > 0) {
        journalLines.push({
          accountId: getCOAAccount("tax", currentTenantId),
          debit: 0,
          credit: standardDeductions,
        });
      }

      addJournalEntry(
        `PAY-${monthYear}-${e.id}`,
        `Gaji Karyawan: ${e.name}`,
        journalLines,
      );
    });

    addLog(
      "Generate Payroll",
      `Sistem memproses penggajian periodik ${monthYear}`,
      "FINANCE",
    );
  };

  // ==========================================
  // OTHER MODULE WORKFLOWS
  // ==========================================

  const claimWarranty = async (ticketId: string, complaints: string) => {
    if (isBackendConfigured()) {
      try {
        await runServiceWorkflow(ticketId, "transition", { status: "KLAIM_GARANSI", note: `Garansi diklaim: ${complaints}` });
        addLog("Warranty Claim Log", `Klaim garansi pada tiket servis ID: ${ticketId}`, "SERVICE", "MEDIUM");
        return;
      } catch (e: any) {
        console.error("Server warranty claim failed, falling back to local:", e);
      }
    }
    const existing = services.find((s) => s.id === ticketId);
    if (existing) {
      updateServiceTicket(ticketId, {
        status: ServiceStatus.KLAIM_GARANSI,
        timeline: [
          ...existing.timeline,
          {
            status: ServiceStatus.KLAIM_GARANSI,
            note: `Garansi diklaim customer: ${complaints}`,
            timestamp: new Date().toISOString(),
            operator: currentUser.name,
          },
        ],
      });
    }
    addLog(
      "Warranty Claim Log",
      `Klaim garansi pada tiket servis ID: ${ticketId}`,
      "SERVICE",
      "MEDIUM",
    );
  };

  const addSupportMessage = (
    ticketId: string,
    sender: string,
    message: string,
  ) => {
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              messages: [
                ...t.messages,
                { sender, message, timestamp: new Date().toISOString() },
              ],
            }
          : t,
      ),
    );
  };

  const addInternalMessage = (
    sender: string,
    senderRole: string,
    message: string,
    recipientId?: string,
    ticketId?: string,
  ) => {
    const newMessage: InternalMessage = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      tenantId: currentTenantId,
      sender,
      senderRole,
      message,
      timestamp: new Date().toISOString(),
      recipientId,
      ticketId,
    };

    setInternalMessages((prev) => [newMessage, ...prev]);

    // Dispatch live notification custom event
    window.dispatchEvent(
      new CustomEvent("live_notification", {
        detail: {
          title:
            senderRole === "ADMIN"
              ? "📩 Pesan Baru dari Admin"
              : "💬 Pesan Baru",
          text: message,
          message: message,
          category: "chat",
          sender: sender,
          senderRole: senderRole,
          ticketId: ticketId,
          recipientId: recipientId,
        },
      }),
    );

    addLog(
      "Internal Message",
      `Pesan dikirim oleh ${sender} (${senderRole})`,
      "SYSTEM",
      "LOW",
    );
  };

  const updateTaskStatus = (taskId: string, status: ProjectTask["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
  };

  // Marketplace Sync Integration Helpers
  const updateProductStock = (productId: string, newQty: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          if (p.category !== "JASA" && newQty <= p.minStock) {
            window.dispatchEvent(
              new CustomEvent("live_notification", {
                detail: {
                  title: "⚠️ Peringatan Stok Kritis",
                  text: `Stok untuk produk "${p.name}" (SKU: ${p.sku}) tinggal ${newQty} ${p.unit}. Batas minimum adalah ${p.minStock}.`,
                  message: `Stok untuk produk "${p.name}" (SKU: ${p.sku}) tinggal ${newQty} ${p.unit}. Batas minimum adalah ${p.minStock}.`,
                  category: "stock",
                },
              }),
            );
          }
          return { ...p, stockQty: newQty };
        }
        return p;
      }),
    );
    addLog(
      "Stock Synchronized",
      `Produk ID ${productId} disinkronkan. Stok baru: ${newQty}`,
      "INVENTORY",
    );
  };

  const addMarketplaceSale = (
    invoiceNo: string,
    platform: string,
    items: { productId: string; qty: number; price: number }[],
    totalAmount: number,
    adminFee: number,
  ) => {
    // 2. Create POS-like transaction
    const cartItems = items.map((item) => {
      const prod = products.find((p) => p.id === item.productId) || products[0];
      return {
        product: prod,
        qty: item.qty,
        discount: 0,
      };
    });

    const newTx: POSTransaction = {
      id: generateUUID(),
      tenantId: currentTenantId,
      branchId: currentBranchId,
      shiftId: shifts.find((s) => s.branchId === currentBranchId && s.status === "OPEN")?.id || null,
      customerId: customers.find((c) => c.tenantId === currentTenantId)?.id || null,
      invoiceNo,
      items: cartItems.map((c) => ({
        productId: c.product.id,
        name: c.product.name,
        quantity: c.qty,
        unitPrice: c.product.sellPrice,
        discount: 0,
        tax: 0,
        total: c.product.sellPrice * c.qty,
      })),
      subtotal: totalAmount,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: totalAmount,
      paymentMethod: PaymentMethod.E_WALLET, // represent platform wallet
      amountPaid: totalAmount,
      changeAmount: 0,
      timestamp: new Date().toISOString(),
      isRefunded: false,
      notes: `Pesanan Marketplace ${platform} (${invoiceNo}). Biaya admin: Rp${(adminFee ?? 0).toLocaleString()}`,
      depositUsed: 0,
      postedToLedger: true,
    };

    setTransactions((prev) => [newTx, ...prev]);
    syncToApi("transactions", "insert", newTx);

    // 3. Create accounting journal lines
    const bankWalletAccountId = getCOAAccount("cash", currentTenantId); // Kas Utama
    const expenseAccountId = `coa-${currentTenantId}-50100`; // HPP Suku Cadang Terpakai
    const revenueAccountId = getCOAAccount("sales", currentTenantId); // Pendapatan Penjualan Aksesoris

    addJournalEntry(
      invoiceNo,
      `Pendapatan Marketplace ${platform}: ${invoiceNo}`,
      [
        {
          accountId: bankWalletAccountId,
          debit: totalAmount - adminFee,
          credit: 0,
        },
        { accountId: expenseAccountId, debit: adminFee, credit: 0 },
        { accountId: revenueAccountId, debit: 0, credit: totalAmount },
      ],
    );

    // Update Cash balances in COA account for real-time consistency
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === bankWalletAccountId) {
          return { ...acc, balance: acc.balance + (totalAmount - adminFee) };
        }
        if (acc.id === expenseAccountId) {
          return { ...acc, balance: acc.balance + adminFee };
        }
        if (acc.id === revenueAccountId) {
          return { ...acc, balance: acc.balance + totalAmount };
        }
        return acc;
      }),
    );

    addLog(
      "Marketplace Sale Recorded",
      `Pesanan ${invoiceNo} dari ${platform} dicatat. Bersih: Rp ${(totalAmount - adminFee).toLocaleString()}`,
      "FINANCE",
    );
  };

  const reseedCOAAccounts = (tenantId: string, template: string) => {
    let templateAccounts: any[] = [];
    if (template === "repair") {
      templateAccounts = [
        {
          code: "10100",
          name: "Kas Utama",
          type: AccountType.ASSET,
          balance: 15000000,
        },
        {
          code: "10200",
          name: "Bank Mandiri Utama",
          type: AccountType.ASSET,
          balance: 45000000,
        },
        {
          code: "10500",
          name: "Persediaan Suku Cadang Laptop",
          type: AccountType.ASSET,
          balance: 12000000,
        },
        {
          code: "40100",
          name: "Pendapatan Jasa Servis Reparasi",
          type: AccountType.REVENUE,
          balance: 0,
        },
        {
          code: "40200",
          name: "Pendapatan Penjualan Sparepart",
          type: AccountType.REVENUE,
          balance: 0,
        },
        {
          code: "50100",
          name: "Beban Pokok Sparepart (HPP)",
          type: AccountType.EXPENSE,
          balance: 0,
        },
        {
          code: "50200",
          name: "Beban Komisi Teknisi Servis",
          type: AccountType.EXPENSE,
          balance: 0,
        },
      ];
    } else if (template === "saas") {
      templateAccounts = [
        {
          code: "10100",
          name: "Kas Utama",
          type: AccountType.ASSET,
          balance: 20000000,
        },
        {
          code: "10200",
          name: "Bank BCA Bisnis",
          type: AccountType.ASSET,
          balance: 80000000,
        },
        {
          code: "40100",
          name: "Pendapatan Langganan SaaS MRR",
          type: AccountType.REVENUE,
          balance: 0,
        },
        {
          code: "40200",
          name: "Pendapatan Jasa Setup Enterprise",
          type: AccountType.REVENUE,
          balance: 0,
        },
        {
          code: "50100",
          name: "Beban Server Cloud AWS/GCP",
          type: AccountType.EXPENSE,
          balance: 0,
        },
        {
          code: "50200",
          name: "Beban Lisensi Software Pendukung",
          type: AccountType.EXPENSE,
          balance: 0,
        },
      ];
    } else {
      templateAccounts = [
        {
          code: "10100",
          name: "Kas Toko Retail",
          type: AccountType.ASSET,
          balance: 10000000,
        },
        {
          code: "10200",
          name: "Bank BRI Operasional",
          type: AccountType.ASSET,
          balance: 35000000,
        },
        {
          code: "10300",
          name: "Persediaan Barang Dagang",
          type: AccountType.ASSET,
          balance: 28000000,
        },
        {
          code: "40100",
          name: "Pendapatan Penjualan Retail Dagang",
          type: AccountType.REVENUE,
          balance: 0,
        },
        {
          code: "40200",
          name: "Potongan Penjualan / Diskon Promo",
          type: AccountType.REVENUE,
          balance: 0,
        },
        {
          code: "50100",
          name: "Beban Pokok Penjualan (HPP)",
          type: AccountType.EXPENSE,
          balance: 0,
        },
      ];
    }

    const filtered = accounts.filter((acc) => acc.tenantId !== tenantId);
    const seeded = templateAccounts.map((acc) => ({
      id: `coa-${tenantId}-${acc.code}`,
      tenantId: tenantId,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
    }));

    setAccounts([...filtered, ...seeded]);
    addLog(
      "Reseed COA Accounts",
      `Merestart COA dengan templat ${template}`,
      "FINANCE",
    );
  };

  // ==========================================
  // BACKUP & RESTORE STRATEGY
  // ==========================================

  const triggerBackup = () => {
    const backupState = {
      tenants,
      branches,
      warehouses,
      customers,
      products,
      services,
      shifts,
      transactions,
      accounts,
      journals,
      employees,
      vouchers,
      supportTickets,
      tasks,
      auditLogs,
      fraudAlerts,
    };
    addLog(
      "Platform Global Backup",
      "Berhasil mencadangkan seluruh data operasional tenant & sistem.",
      "SYSTEM",
    );
    return backupState;
  };

  const restoreBackup = (backupData: any) => {
    if (!backupData) return;
    if (backupData.tenants) setTenants(backupData.tenants);
    if (backupData.branches) setBranches(backupData.branches);
    if (backupData.warehouses) setWarehouses(backupData.warehouses);
    if (backupData.customers) setCustomers(backupData.customers);
    if (backupData.products) setProducts(backupData.products);
    if (backupData.services) setServices(backupData.services);
    if (backupData.shifts) setShifts(backupData.shifts);
    if (backupData.transactions) setTransactions(backupData.transactions);
    if (backupData.accounts) setAccounts(backupData.accounts);
    if (backupData.journals) setJournals(backupData.journals);
    if (backupData.employees) setEmployees(backupData.employees);
    if (backupData.vouchers) setVouchers(backupData.vouchers);
    if (backupData.supportTickets) setSupportTickets(backupData.supportTickets);
    if (backupData.tasks) setTasks(backupData.tasks);
    if (backupData.auditLogs) setAuditLogs(backupData.auditLogs);
    if (backupData.fraudAlerts) setFraudAlerts(backupData.fraudAlerts);
    addLog(
      "Platform Restoration Complete",
      "Berhasil memulihkan database global ke status cadangan.",
      "SYSTEM",
      "HIGH",
    );
  };

  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    return localStorage.getItem("saas_is_online") !== "false";
  });
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() =>
    parseArray<any>("saas_offline_queue", []),
  );

  const setIsOnline = (online: boolean) => {
    const wasOffline = !isOnline;
    setIsOnlineState(online);
    localStorage.setItem("saas_is_online", String(online));
    if (online && wasOffline && offlineQueue.length > 0) {
      // Trigger custom event to show the Offline Sync Modal
      window.dispatchEvent(new CustomEvent("saas-offline-restored"));
    }
  };

  const addOfflineAction = (action: {
    type: string;
    label: string;
    payload: any;
  }) => {
    const nextQueue = [
      ...offlineQueue,
      {
        ...action,
        id: "off-" + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
      },
    ];
    setOfflineQueue(nextQueue);
    localStorage.setItem("saas_offline_queue", JSON.stringify(nextQueue));
    addLog(
      "Offline Action Queued",
      `Aksi '${action.label}' disimpan di antrean lokal karena mode offline aktif.`,
      "SYSTEM",
      "LOW",
    );
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem("saas_offline_queue");
  };

  const removeOfflineAction = (id: string) => {
    const nextQueue = offlineQueue.filter((x) => x.id !== id);
    setOfflineQueue(nextQueue);
    localStorage.setItem("saas_offline_queue", JSON.stringify(nextQueue));
  };

  const addWorkflow = async (
    wf: Omit<ERPWorkflow, "id" | "executionCount"> & {
      executionCount?: number;
    },
  ) => {
    const newWf: ERPWorkflow = {
      ...wf,
      id: "wf-" + Math.random().toString(36).substr(2, 9),
      executionCount: wf.executionCount ?? 0,
    };
    await syncModuleRecord("workflows", newWf.id, newWf, "insert");
    setWorkflows((prev) => [...prev, newWf]);
    addLog(
      "Add Workflow",
      `Menambahkan alur kerja otomatisasi baru: ${wf.name}`,
      "ADMIN",
    );
  };

  const updateWorkflow = async (id: string, updates: Partial<ERPWorkflow>) => {
    const current = workflows.find((w) => w.id === id);
    if (!current) throw new Error("Workflow tidak ditemukan.");
    const updated = { ...current, ...updates };
    await syncModuleRecord("workflows", id, updated, "update");
    setWorkflows((prev) => prev.map((w) => (w.id === id ? updated : w)));
    addLog(
      "Update Workflow",
      `Memperbarui alur kerja otomatisasi ID ${id}`,
      "ADMIN",
    );
  };

  const deleteWorkflow = async (id: string) => {
    await syncModuleRecord("workflows", id, { id }, "delete");
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    addLog(
      "Delete Workflow",
      `Menghapus alur kerja otomatisasi ID ${id}`,
      "ADMIN",
    );
  };

  const executeWorkflow = async (id: string) => {
    const current = workflows.find((w) => w.id === id);
    if (!current) throw new Error("Workflow tidak ditemukan.");
    const updated = { ...current, executionCount: current.executionCount + 1, lastTriggeredAt: new Date().toISOString() };
    await syncModuleRecord("workflows", id, updated, "update");
    setWorkflows((prev) => prev.map((w) => (w.id === id ? updated : w)));
    // We can fetch the name for the audit log
    const targetWf = workflows.find((w) => w.id === id);
    if (targetWf) {
      addLog(
        "Execute Workflow",
        `Simulasi pemicu otomatis: '${targetWf.name}' dieksekusi dengan aksi ${targetWf.actionType}`,
        "SYSTEM",
        "MEDIUM",
      );
    }
  };

    const updateUserPermissions = (userId: string, permissions: string[]) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions } : u)));
    syncToApi("users", "update", { id: userId, permissions });
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      addLog(
        "Update Permissions",
        `Memperbarui hak akses ${targetUser.name}`,
        "SECURITY",
        "MEDIUM",
      );
    }
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const newPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role, permissions: newPermissions } : u)));
    syncToApi("users", "update", { id: userId, role, permissions: newPermissions });
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      addLog(
        "Assign Role",
        `Mengubah peran ${targetUser.name} menjadi ${role.replace("_", " ")}`,
        "SECURITY",
        "MEDIUM",
      );
    }
  };

  const addUser = async (
    userData: Omit<
      User,
      "id" | "permissions" | "loginHistory" | "activeSessions" | "mfaEnabled"
    >,
  ) => {
    const tenant = tenants.find((t) => t.id === userData.tenantId);
    if (tenant) {
      const existingUsers = users.filter(
        (u) => u.tenantId === userData.tenantId,
      );
      const limit = tenant.limits?.users || 3;
      if (existingUsers.length >= limit) {
        throw new Error(
          `[LIMIT_EXCEEDED] Kuota pengguna staff penuh (${existingUsers.length}/${limit}). Silakan tingkatkan paket langganan Anda melalui menu Billing.`,
        );
      }
    }
    const id = generateUUID();
    const newUser: User = {
      ...userData,
      id,
      permissions: DEFAULT_ROLE_PERMISSIONS[userData.role] || [],
      mfaEnabled: false,
      loginHistory: [],
      activeSessions: [],
    };

    setUsers((prev) => [...prev, newUser]);
    addLog(
      "Create Staff User",
      `Membuat akun login staff baru: ${userData.name} (${userData.role})`,
      "SECURITY",
      "HIGH",
    );
  };

  const deleteUser = async (userId: string) => {
    try {
      if (isBackendConfigured()) {
        setApiLoading(true);
        setApiStatus("Menghapus pengguna dari database...");
        await apiFetch("/api/data/sync", {
          method: "POST",
          body: JSON.stringify({
            table: "users",
            action: "delete",
            data: { id: userId },
            idField: "id",
          }),
        });
      }
    } catch (err: any) {
      console.error("Error deleting user:", err);
      showToast("Gagal menghapus pengguna: " + err.message, "error");
      throw err;
    } finally {
      setApiLoading(false);
      setApiStatus("");
    }
    // Optimistic local delete
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    addLog(
      "Delete Staff User",
      `Menghapus akun login staff ID ${userId}`,
      "SECURITY",
      "HIGH",
    );
  };

  const addBranch = (branchData: Omit<Branch, "id" | "tenantId">): Branch => {
    const tenant = tenants.find((t) => t.id === currentTenantId);
    if (tenant) {
      const existingBranches = branches.filter(
        (b) => b.tenantId === currentTenantId,
      );
      const limit = tenant.limits?.branches || 1;
      if (existingBranches.length >= limit) {
        throw new Error(
          `[LIMIT_EXCEEDED] Kuota cabang penuh (${existingBranches.length}/${limit}). Silakan tingkatkan paket langganan Anda melalui menu Billing.`,
        );
      }
    }
    const newBranch: Branch = {
      ...branchData,
      id: "branch-" + Math.random().toString(36).substr(2, 9),
      tenantId: currentTenantId,
    };
    setBranches((prev) => [...prev, newBranch]);
    syncToApi("branches", "insert", newBranch);
    addLog(
      "Create Branch",
      `Membuat cabang baru: ${newBranch.name}`,
      "SYSTEM",
      "MEDIUM",
    );
    return newBranch;
  };

  const updateBranch = (
    branchId: string,
    branchData: Partial<Omit<Branch, "id" | "tenantId">>,
  ) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch || branch.tenantId !== currentTenantId) {
      throw new Error("Cabang tidak ditemukan.");
    }
    if (branchData.isActive === false && branch.isActive !== false) {
      if (branch.id === currentBranchId) {
        throw new Error("Pindah ke cabang lain sebelum menonaktifkan cabang aktif.");
      }
      const otherActiveBranches = branches.filter(
        (b) => b.tenantId === currentTenantId && b.id !== branchId && b.isActive,
      );
      if (otherActiveBranches.length === 0) {
        throw new Error("Tenant harus memiliki minimal satu cabang aktif.");
      }
      const activeTickets = services.filter(
        (s) => s.branchId === branchId && !["DIAMBIL", "DIBATALKAN", "SELESAI", "KLAIM_GARANSI"].includes(s.status),
      );
      if (activeTickets.length > 0) {
        throw new Error(`Selesaikan atau pindahkan ${activeTickets.length} tiket servis aktif terlebih dahulu.`);
      }
      if (shifts.some((s) => s.branchId === branchId && s.status === "OPEN")) {
        throw new Error("Tutup shift terlebih dahulu sebelum menonaktifkan cabang.");
      }
    }
    setBranches((prev) => {
      const updated = prev.map((b) => {
        if (b.id === branchId) {
          const u = { ...b, ...branchData };
          syncToApi("branches", "update", u);
          return u;
        }
        return b;
      });
      return updated;
    });
    addLog(
      "Update Branch",
      `Memperbarui info cabang ID: ${branchId}`,
      "SYSTEM",
      "MEDIUM",
    );
  };

  const deleteBranch = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) throw new Error("Cabang tidak ditemukan.");
    // Validasi: minimal satu cabang aktif harus tersisa
    const otherActiveBranches = branches.filter(
      (b) => b.tenantId === currentTenantId && b.id !== branchId && b.isActive,
    );
    if (otherActiveBranches.length === 0) {
      throw new Error("Tidak dapat menonaktifkan cabang terakhir. Minimal satu cabang harus aktif.");
    }
    // Validasi: jangan hapus jika ada tiket aktif
    const activeTickets = services.filter(
      (s) => s.branchId === branchId && s.status !== "DIAMBIL" && s.status !== "DIBATALKAN" && s.status !== "SELESAI" && s.status !== "KLAIM_GARANSI",
    );
    if (activeTickets.length > 0) {
      throw new Error(
        `Tidak dapat menghapus cabang "${branch.name}". Masih ada ${activeTickets.length} tiket servis aktif. Selesaikan atau pindahkan tiket terlebih dahulu.`,
      );
    }
    // Validasi: jangan hapus jika ada transaksi POS belum selesai
    const openShifts = shifts.filter((s) => s.branchId === branchId && s.status === "OPEN");
    if (openShifts.length > 0) {
      throw new Error(`Tutup shift terlebih dahulu sebelum menghapus cabang "${branch.name}".`);
    }
    // Soft delete: set isActive = false alih-alih hapus permanen
    setBranches((prev) => prev.map((b) => (b.id === branchId ? { ...b, isActive: false } : b)));
    syncToApi("branches", "update", { id: branchId, is_active: false });
    addLog(
      "Delete Branch",
      `Menonaktifkan cabang ID: ${branchId} (${branch.name}) — soft delete, data tetap aman.`,
      "SYSTEM",
      "MEDIUM",
    );
    // Jika cabang yang dinonaktifkan adalah cabang aktif, pindah ke cabang lain
    if (branchId === currentBranchId) {
      const fallbackBranch = branches.find((b) => b.tenantId === currentTenantId && b.id !== branchId && b.isActive);
      if (fallbackBranch) {
        switchBranch(fallbackBranch.id);
      }
    }
  };

  return (
    <SaaSContext.Provider
      value={{
        tenants,
        currentTenantId,
        currentBranchId,
        currentUser,
        users,
        branches,
        warehouses,
        customers,
        products,
        microComponents,
        microComponentsLoading,
        microComponentsError,
        services,
        fieldVisits,
        shifts,
        transactions,
        accounts,
        setAccounts,
        journals,
        cashTransactions,
        employees,
        payroll,
        commissions,
        vouchers,
        setVouchers,
        supportTickets,
        tasks,
        auditLogs,
        fraudAlerts,
        workflows,
        stockMovements,
        inventoryTransfers,
        workShifts,
        internalMessages,
        apiLoading,
        apiStatus,
        scopedProducts,
        scopedServices,
        scopedTransactions,
        scopedUsers,
        scopedCustomers,
        scopedEmployees,
        scopedAccounts,
        scopedJournals,
        scopedCashTransactions,
        scopedShifts,
        scopedWorkflows,
        scopedWarehouses,
        scopedBranches,
        scopedFieldVisits,
        scopedWorkShifts,
        scopedPayroll,
        scopedCommissions,
        scopedVouchers,
        scopedSupportTickets,
        scopedInternalMessages,
        verifyScope,
        apiFetch,
        switchTenant,
        switchBranch,
        switchRole,
        addTenant,
        updateTenantStatus,
        impersonateTenant,
        exitImpersonate,
        isImpersonating,
        updateTenant,
        addServiceTicket,
        updateServiceTicket,
        loadMicroComponents,
        createMicroComponent,
        updateMicroComponent,
        adjustMicroComponentStock,
        consumeMicroComponentForService,
        requestServicePart,
        cancelServicePart,
        patchServiceWork,
        addApprovedAdditionalCost,
        createServicePartOrder,
        updateServicePartOrder,
        receiveServicePartOrder,
        cancelServicePartOrder,
        updateServiceStatus,
        addServiceDiagnostic,
        approveServiceEstimate,
        completeServiceQC,
        handoverServiceDevice,
        triggerCustomerNotification,
        addCashTransaction,
        checkInFieldService,
        checkOutFieldService,
        openShift,
        closeShift,
        createPOSTransaction,
        refundTransaction,
        addInventoryProduct,
        updateInventoryProduct,
        transferProductStock,
        adjustProductStock,
        createInventoryTransfer,
        updateInventoryTransferStatus,
        addEmployee,
        addCustomer,
        updateCustomer,
        updateEmployee,
        recordAttendance,
        bulkCheckIn,
        submitLeave,
        approveLeave,
        requestCashAdvance,
        approveCashAdvance,
        addWorkShift,
        deleteWorkShift,
        updateWorkShift,
        clockInStaff,
        clockOutStaff,
        addJournalEntry,
        generatePayroll,
        claimWarranty,
        addSupportMessage,
        addInternalMessage,
        updateTaskStatus,
        triggerFraudAlert,
        resolveFraudAlert,
        addWorkflow,
        updateWorkflow,
        deleteWorkflow,
        executeWorkflow,
        updateUserRole,
        updateUserPermissions,
        addUser,
        deleteUser,
        addBranch,
        updateBranch,
        deleteBranch,
        updateProductStock,
        addMarketplaceSale,
        triggerBackup,
        restoreBackup,
        reseedCOAAccounts,
        theme,
        toggleTheme,
        addLog,
        isOnline,
        setIsOnline,
        offlineQueue,
        addOfflineAction,
        clearOfflineQueue,
        removeOfflineAction,
        platformHealth,
        refreshPlatformHealth,
        isAuthenticated,
        loginUser,
        logoutUser,
        updateCurrentUserPassword,
        refreshData,
      }}
    >
      {children}
    </SaaSContext.Provider>
  );
};

export default SaaSProvider;


export const useSaaS = () => {
  const context = useContext(SaaSContext);
  if (context === undefined) {
    throw new Error("useSaaS must be used within a SaaSContext");
  }

  const activeTenant = context?.tenants?.find((t: Tenant) => t.id === context.currentTenantId);

  return {
    ...context,
    activeTenant,
  };
};
