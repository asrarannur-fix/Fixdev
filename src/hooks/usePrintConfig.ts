import { useSaaS } from '../context/SaaSContext';
import { resolvePrintConfig, type PrintConfig } from '../utils/print';

export const usePrintConfig = (): PrintConfig | undefined => {
  const { tenants, currentTenantId, currentBranchId } = useSaaS();
  const tenant = tenants.find((t) => t.id === currentTenantId);
  return resolvePrintConfig(tenant?.settings?.printConfig, currentBranchId);
};
