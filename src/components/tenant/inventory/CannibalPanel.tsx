import * as React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { CannibalWorkshop } from "../../CannibalWorkshop";
import { useSaaS } from "../../../context/SaaSContext";

export const CannibalPanel = () => {
  const { currentTenantId } = useSaaS();

  // Guard: jangan render CannibalWorkshop sampai context tenant siap,
  // mencegah localStorage key undefined & warehouses undefined crash.
  if (!currentTenantId) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Memuat modul cannibal...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CannibalWorkshop />
    </ErrorBoundary>
  );
};
