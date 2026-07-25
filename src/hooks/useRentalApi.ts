import { useCallback, useState, useRef } from 'react';
import { useSaaS } from '../context/SaaSContext';

export interface RentalCatalogItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  daily_rate: number;
  deposit_amount: number;
  specifications?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RentalDevice {
  id: string;
  catalog_id: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  condition_notes?: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED';
  current_contract_id?: string;
  purchased_at?: string;
  purchase_cost?: number;
  warranty_until?: string;
  created_at: string;
  updated_at: string;
  catalog?: RentalCatalogItem;
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
  start_date: string;
  end_date: string;
  actual_return_date?: string;
  duration_days: number;
  daily_rate: number;
  total_rent: number;
  deposit_amount: number;
  deposit_paid: number;
  status: 'DRAFT' | 'ACTIVE' | 'OVERDUE' | 'RETURNED' | 'CANCELLED' | 'EXTENDED';
  damage_deduction?: number;
  damage_notes?: string;
  notes?: string;
  created_by: string;
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
    | 'INSPECTION_DONE';
  description: string;
  metadata?: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface RentalPayment {
  id: string;
  contract_id: string;
  payment_type: 'DEPOSIT' | 'RENT' | 'REFUND' | 'DAMAGE_FEE' | 'EXTENSION';
  amount: number;
  payment_method: 'CASH' | 'TRANSFER' | 'QRIS' | 'CARD' | 'OTHER';
  reference_number?: string;
  notes?: string;
  received_by: string;
  received_at: string;
  created_at: string;
}

export interface RentalInspection {
  id: string;
  contract_id: string;
  inspection_type: 'PRE_RENTAL' | 'POST_RETURN' | 'PERIODIC';
  condition_rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  checklist_items: Record<string, boolean>;
  notes?: string;
  photos?: string[];
  inspected_by: string;
  inspected_at: string;
  created_at: string;
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
  daily_rate: number;
  deposit_amount: number;
  total_rent: number;
}

export interface CreateContractInput {
  customer_id: string;
  device_id: string;
  start_date: string;
  duration_days: number;
  daily_rate: number;
  deposit_amount: number;
  notes?: string;
}

export interface ReturnContractInput {
  contract_id: string;
  damage_deduction?: number;
  damage_notes?: string;
  actual_return_date?: string;
}

export interface ExtendContractInput {
  contract_id: string;
  additional_days: number;
}

function readJsonResponse<T>(response: Response): Promise<T> {
  const text = response.text();
  return text.then((t) => (t ? JSON.parse(t) : ({} as T)));
}

interface UseRentalApiReturn {
  loading: boolean;
  error: string | null;
  // Catalog
  listCatalog: (params?: { active?: boolean; category?: string }) => Promise<any>;
  getCatalog: (id: string) => Promise<any>;
  createCatalog: (data: Partial<RentalCatalogItem>) => Promise<any>;
  updateCatalog: (id: string, data: Partial<RentalCatalogItem>) => Promise<any>;
  deleteCatalog: (id: string) => Promise<any>;
  // Devices
  listDevices: (params?: { status?: string; catalog_id?: string }) => Promise<any>;
  getDevice: (id: string) => Promise<any>;
  createDevice: (data: Partial<RentalDevice>) => Promise<any>;
  updateDevice: (id: string, data: Partial<RentalDevice>) => Promise<any>;
  deleteDevice: (id: string) => Promise<any>;
  // Contracts
  listContracts: (params?: {
    status?: string;
    customer_id?: string;
    device_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) => Promise<any>;
  getContract: (id: string) => Promise<any>;
  getContractWithEvents: (id: string) => Promise<any>;
  createContract: (data: CreateContractInput) => Promise<any>;
  returnContract: (data: ReturnContractInput) => Promise<any>;
  extendContract: (data: ExtendContractInput) => Promise<any>;
  cancelContract: (id: string) => Promise<any>;
  // Payments
  listPayments: (params?: { contract_id?: string; payment_type?: string }) => Promise<any>;
  createPayment: (data: {
    contract_id: string;
    payment_type: RentalPayment['payment_type'];
    amount: number;
    payment_method: RentalPayment['payment_method'];
    reference_number?: string;
    notes?: string;
  }) => Promise<any>;
  // Inspections
  listInspections: (params?: { contract_id?: string; inspection_type?: string }) => Promise<any>;
  createInspection: (data: {
    contract_id: string;
    inspection_type: RentalInspection['inspection_type'];
    condition_rating: RentalInspection['condition_rating'];
    checklist_items: Record<string, boolean>;
    notes?: string;
    photos?: string[];
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
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
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
  const listCatalog = useCallback((params?: { active?: boolean; category?: string }) => {
    setLoading(true);
    setError(null);
    const searchParams = new URLSearchParams();
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
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
  const listDevices = useCallback((params?: { status?: string; catalog_id?: string }) => {
    setLoading(true);
    setError(null);
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.catalog_id) searchParams.set('catalog_id', params.catalog_id);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/devices${query}`).finally(() => setLoading(false));
  }, []);

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
      customer_id?: string;
      device_id?: string;
      from_date?: string;
      to_date?: string;
      page?: number;
      limit?: number;
    }) => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.customer_id) searchParams.set('customer_id', params.customer_id);
      if (params?.device_id) searchParams.set('device_id', params.device_id);
      if (params?.from_date) searchParams.set('from_date', params.from_date);
      if (params?.to_date) searchParams.set('to_date', params.to_date);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/contracts${query}`).finally(() => setLoading(false));
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

  const returnContract = useCallback((data: ReturnContractInput) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${data.contract_id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).finally(() => setLoading(false));
  }, []);

  const extendContract = useCallback((data: ExtendContractInput) => {
    setLoading(true);
    setError(null);
    return request(`/contracts/${data.contract_id}/extend`, {
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
  const listPayments = useCallback((params?: { contract_id?: string; payment_type?: string }) => {
    setLoading(true);
    setError(null);
    const searchParams = new URLSearchParams();
    if (params?.contract_id) searchParams.set('contract_id', params.contract_id);
    if (params?.payment_type) searchParams.set('payment_type', params.payment_type);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/payments${query}`).finally(() => setLoading(false));
  }, []);

  const createPayment = useCallback(
    (data: {
      contract_id: string;
      payment_type: RentalPayment['payment_type'];
      amount: number;
      payment_method: RentalPayment['payment_method'];
      reference_number?: string;
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
    (params?: { contract_id?: string; inspection_type?: string }) => {
      setLoading(true);
      setError(null);
      const searchParams = new URLSearchParams();
      if (params?.contract_id) searchParams.set('contract_id', params.contract_id);
      if (params?.inspection_type) searchParams.set('inspection_type', params.inspection_type);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return request(`/inspections${query}`).finally(() => setLoading(false));
    },
    []
  );

  const createInspection = useCallback(
    (data: {
      contract_id: string;
      inspection_type: RentalInspection['inspection_type'];
      condition_rating: RentalInspection['condition_rating'];
      checklist_items: Record<string, boolean>;
      notes?: string;
      photos?: string[];
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
