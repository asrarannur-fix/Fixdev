import * as React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { PurchaseManager } from "../../PurchaseManager";

export const ProcurementPanel = () => (<ErrorBoundary><PurchaseManager /></ErrorBoundary>);
