import React from "react";
import { CRMTab } from "./CRMTab";

export const CustomersTab: React.FC<{ activeSubTab: string }> = () => (
  <CRMTab activeSubTab="customers" />
);
