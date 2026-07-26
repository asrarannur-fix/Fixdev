import { useCallback, useState, useRef } from 'react';
import { useSaaS } from '../context/SaaSContext';

export interface RentalCatalogItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  model?: string;
  rate_per_day: number;
  deposit_amount: number;
  specifications?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RentalDevice {
  id: string;
  catalog_id: string;
  branch_id?: string;
  serial_number: string;
  imei_or_mac?: string;
  condition: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
  current_location?: string;
  purchase_date?: string;
  purchase_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  catalog_name?: string;
}

export interface RentalContract {
  id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  device_id: string;
  device_name: string;
  device_category?: string;
  start_date: string;
  end_date: string;
  actual_return_date?: string;
  duration_days: number;
  rate_per_day: number;
  total_rent_amount: number;
  deposit_amount: number;
  deposit_paid: number;
  deposit_refunded_amount: number;
  damage_deduction_amount: number;
  damage_notes?: string;
  status: 'DRAFT' | 'ACTIVE' | 'OVERDUE' | 'RETURNED' | 'CANCELLED' | 'EXTENDED' | 'DISPUTED';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalContractWithEvents extends RentalContract {
  events: RentalContractEvent[];
  payments: RentalPayment[];
  inspections: RentalInspection[];
}

export interface RentalContractEvent {
  id: string;
  contract_id: string;
  event_type:
    | 'CREATED'
    | 'ACTIVATED'
    | 'EXTENDED'
    | 'RETURNED'
    | 'OVERDUE'
    | 'CANCELLED'
    | 'DAMAGE_REPORTED'
    | 'DEPOSIT_REFUNDED'
    | 'PAYMENT_RECEIVED'
    | 'INSPECTION_DONE'
    | 'CATALOG_CREATED'
    | 'DEVICE_CREATED';
  description: string;
  metadata?: Record<string, unknown>;
  user_id?: string;
  created_at: string;
}

export interface RentalPayment {
  id: string;
  contract_id: string;
  payment_type: 'DEPOSIT' | 'RENT' | 'REFUND' | 'DAMAGE_FEE' | 'LATE_FEE';
  amount: number;
  payment_method: 'CASH' | 'TRANSFER' | 'QRIS' | 'CARD' | 'EWALLET';
  reference_number?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface RentalInspection {
  id: string;
  contract_id: string;
  inspection_type: 'PRE_RENTAL' | 'POST_RETURN' | 'PERIODIC' | 'DAMAGE_CLAIM';
  condition_before?: string;
  condition_after?: string;
  damage_description?: string;
  damage_photos?: string[];
  estimated_repair_cost?: number;
  status: string;
  inspector_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalStats {
  active_contracts: number;
  overdue_contracts: number;
  total_devices: number;
  available_devices: number;
  rented_devices: number;
  maintenance_devices: number;
  total_revenue: number;
  pending_deposits: number;
  avg_rental_duration: number;
}

export interface OverdueContract {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_phone?: string;
  device_name: string;
  end_date: string;
  days_overdue: number;
  rate_per_day: number;
  deposit_amount: number;
  total_rent_amount: number;
}

export interface CreateContractInput {
  customerId: string;
  deviceId: string;
  startDate?: string;
  endDate: string;
  depositAmount?: number;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'QRIS' | 'CARD' | 'EWALLET';
  notes?: string;
}

export interface ReturnContractInput {
  damageDeductionAmount?: number;
  damageNotes?: string;
}

export interface ExtendContractInput {
  additionalDays: number;
}

function readJsonResponse<T>(response: Response): Promise<T> {
  const text = response.text();
  return text.then((t) => (t ? JSON.parse(t) : ({} as T)));
}

interface UseRentalApiReturn {
  loading: boolean;
  error: string | null;
  // Catalog
  listCatalog: (params?: { activeOnly?: boolean; category?: string }) => Promise<any>;
  getCatalog: (id: string) => Promise<any>;
  createCatalog: (data: Partial<RentalCatalogItem>) => Promise<any>;
  updateCatalog: (id: string, data: Partial<RentalCatalogItem>) => Promise<any>;
  deleteCatalog: (id: string) => Promise<any>;
  // Devices
  listDevices: (params?: {
    status?: string;
    catalogId?: string;
    available?: boolean;
  }) => Promise<any>;
  getDevice: (id: string) => Promise<any>;
  createDevice: (data: Partial<RentalDevice>) => Promise<any>;
  updateDevice: (id: string, data: Partial<RentalDevice>) => Promise<any>;
  deleteDevice: (id: string) => Promise<any>;
  // Contracts
  listContracts: (params?: {
    status?: string;
    customerId?: string;
    deviceId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => Promise<any>;
  getContract: (id: string) => Promise<any>;
  getContractWithEvents: (id: string) => Promise<any>;
  createContract: (data: CreateContractInput) => Promise<any>;
  returnContract: (contractId: string, data: ReturnContractInput) => Promise<any>;
  extendContract: (contractId: string, data: ExtendContractInput) => Promise<any>;
  cancelContract: (id: string) => Promise<any>;
  // Payments
  listPayments: (params?: { contractId?: string; paymentType?: string }) => Promise<any>;
  createPayment: (data: {
    contractId: string;
    paymentType: RentalPayment['payment_type'];
    amount: number;
    paymentMethod: RentalPayment['payment_method'];
    referenceNumber?: string;
    notes?: string;
  }) => Promise<any>;
  // Inspections
  listInspections: (params?: { contractId?: string; inspectionType?: string }) => Promise<any>;
  createInspection: (data: {
    contractId: string;
    inspectionType: RentalInspection['inspection_type'];
    conditionBefore?: string;
    conditionAfter?: string;
    damageDescription?: string;
    damagePhotos?: string[];
    estimatedRepairCost?: number;
  }) => Promise<any>;
  updateInspection: (id: string, data: Partial<RentalInspection>) => Promise<any>;
  // Stats
  getRentalStats: () => Promise<any>;
  getOverdueContracts: () => Promise<any>;
}

export function useRentalApi(): UseRentalApiReturn {
  const { currentTenantId, currentBranchId } = useSaaS();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<((endpoint: string, options?: RequestInit) => Promise<any>) | null>(
    null
  );

  const baseUrl = '/api/rental';

  function readJsonResponse<T>(response: Response): Promise<T> {
    return response.text().then((t) => (t ? JSON.parse(t) : ({} as T)));
  }

  // Initialize request function once
  if (!requestRef.current) {
    requestRef.current = (endpoint: string, options: RequestInit = {}) => {
      const url = `${baseUrl}${endpoint}`;
      const token = localStorage.getItem('fixdev_token');
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || `HTTP ${res.status}`);
        }
        return readJsonResponse(res);
      });
    };
  }

  const request = requestRef.current;

  // Catalog
  const listCatalog = useCallback((params?: { activeOnly?: boolean; category?: string }) => {
    setLoading(true);
    setError(null);
    const searchParams = new URLSearchParams();
    if (params?.activeOnly !== undefined) searchParams.set('activeOnly', String(params.activeOnly));
    if (params?.category) searchParams.set('category', params.category);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/catalog${query}`).finally(() => setLoading(false));
  }, []);

  const getCatalog = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/catalog/${id}`).finally(() => setLoading(false));
  }, []);

  const createCatalog = useCallback((data: Partial<RentalCatalogItem>) => {
    setLoading(true);
    setError(null);
    return request('/catalog', { method: 'POST', body: JSON.stringify(data) }).finally(() =>
      setLoading(false)
    );
  }, []);

  const updateCatalog = useCallback((id: string, data: Partial<RentalCatalogItem>) => {
    setLoading(true);
    setError(null);
    return request(`/catalog/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).finally(() =>
      setLoading(false)
    );
  }, []);

  const deleteCatalog = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/catalog/${id}`, { method: 'DELETE' }).finally(() => setLoading(false));
  }, []);

  // Devices
  const listDevices = useCallback(
    (params?: { status?: string; catalogId?: string; available?: boolean }) => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.catalogId) searchParams.set('catalogId', params.catalogId);
      if (params?.available !== undefined) searchParams.set('available', String(params.available));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/devices${query}`).finally(() => setLoading(false));
    },
    []
  );

  const getDevice = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/devices/${id}`).finally(() => setLoading(false));
  }, []);

  const createDevice = useCallback((data: Partial<RentalDevice>) => {
    setLoading(true);
    setError(null);
    return request('/devices', { method: 'POST', body: JSON.stringify(data) }).finally(() =>
      setLoading(false)
    );
  }, []);

  const updateDevice = useCallback((id: string, data: Partial<RentalDevice>) => {
    setLoading(true);
    setError(null);
    return request(`/devices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).finally(() =>
      setLoading(false)
    );
  }, []);

  const deleteDevice = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/devices/${id}`, { method: 'DELETE' }).finally(() => setLoading(false));
  }, []);

  // Contracts
  const listContracts = useCallback(
    (params?: {
      status?: string;
      customerId?: string;
      deviceId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.customerId) searchParams.set('customerId', params.customerId);
      if (params?.deviceId) searchParams.set('deviceId', params.deviceId);
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/contracts${query}`)
        .then((response) => response.data ?? response)
        .finally(() => setLoading(false));
    },
    []
  );

  const getContract = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${id}`).finally(() => setLoading(false));
  }, []);

  const getContractWithEvents = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${id}/details`).finally(() => setLoading(false));
  }, []);

  const createContract = useCallback((data: CreateContractInput) => {
    setLoading(true);
    setError(null);
    return request('/contracts', { method: 'POST', body: JSON.stringify(data) }).finally(() =>
      setLoading(false)
    );
  }, []);

  const returnContract = useCallback((contractId: string, data: ReturnContractInput) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${contractId}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).finally(() => setLoading(false));
  }, []);

  const extendContract = useCallback((contractId: string, data: ExtendContractInput) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${contractId}/extend`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).finally(() => setLoading(false));
  }, []);

  const cancelContract = useCallback((id: string) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${id}/cancel`, { method: 'POST' }).finally(() => setLoading(false));
  }, []);

  // Payments
  const listPayments = useCallback((params?: { contractId?: string; paymentType?: string }) => {
    setLoading(true);
    setError(null);
    const searchParams = new URLSearchParams();
    if (params?.contractId) searchParams.set('contractId', params.contractId);
    if (params?.paymentType) searchParams.set('paymentType', params.paymentType);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/payments${query}`).finally(() => setLoading(false));
  }, []);

  const createPayment = useCallback(
    (data: {
      contractId: string;
      paymentType: RentalPayment['payment_type'];
      amount: number;
      paymentMethod: RentalPayment['payment_method'];
      referenceNumber?: string;
      notes?: string;
    }) => {
      setLoading(true);
      setError(null);
      return request('/payments', { method: 'POST', body: JSON.stringify(data) }).finally(() =>
        setLoading(false)
      );
    },
    []
  );

  // Inspections
  const listInspections = useCallback(
    (params?: { contractId?: string; inspectionType?: string }) => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (params?.contractId) searchParams.set('contractId', params.contractId);
      if (params?.inspectionType) searchParams.set('inspectionType', params.inspectionType);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/inspections${query}`).finally(() => setLoading(false));
    },
    []
  );

  const createInspection = useCallback(
    (data: {
      contractId: string;
      inspectionType: RentalInspection['inspection_type'];
      conditionBefore?: string;
      conditionAfter?: string;
      damageDescription?: string;
      damagePhotos?: string[];
      estimatedRepairCost?: number;
    }) => {
      setLoading(true);
      setError(null);
      return request('/inspections', { method: 'POST', body: JSON.stringify(data) }).finally(() =>
        setLoading(false)
      );
    },
    []
  );

  const updateInspection = useCallback((id: string, data: Partial<RentalInspection>) => {
    setLoading(true);
    setError(null);
    return request(`/inspections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).finally(
      () => setLoading(false)
    );
  }, []);

  // Stats & Overdue
  const getRentalStats = useCallback(() => {
    setLoading(true);
    setError(null);
    return request('/contracts/stats').finally(() => setLoading(false));
  }, []);

  const getOverdueContracts = useCallback(() => {
    setLoading(true);
    setError(null);
    return request('/contracts/overdue').finally(() => setLoading(false));
  }, []);

  return {
    loading,
    error,
    // Catalog
    listCatalog,
    getCatalog,
    createCatalog,
    updateCatalog,
    deleteCatalog,
    // Devices
    listDevices,
    getDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    // Contracts
    listContracts,
    getContract,
    getContractWithEvents,
    createContract,
    returnContract,
    extendContract,
    cancelContract,
    // Payments
    listPayments,
    createPayment,
    // Inspections
    listInspections,
    createInspection,
    updateInspection,
    // Stats
    getRentalStats,
    getOverdueContracts,
  };
}
