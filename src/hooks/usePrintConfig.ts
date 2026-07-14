import { useSaaS } from "../context/SaaSContext";
import type { PrintConfig } from "../utils/print";

export const usePrintConfig = (): PrintConfig | undefined => {
  const { tenants, currentTenantId } = useSaaS();
  const tenant = tenants.find((t) => t.id === currentTenantId);
  return tenant?.settings?.printConfig;
};
