import React from "react";
import { useSaaS } from "../../context/SaaSContext";

interface WhiteLabelGateProps {
  children: React.ReactNode;
}

export const WhiteLabelGate: React.FC<WhiteLabelGateProps> = ({ children }) => {
  const { activeTenant } = useSaaS();
  
  const isWhiteLabel = activeTenant?.branding?.whiteLabelEnabled === true;
  
  if (isWhiteLabel) {
    return null;
  }
  
  return <>{children}</>;
};
