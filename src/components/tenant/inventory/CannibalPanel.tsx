import * as React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { CannibalWorkshop } from "../../CannibalWorkshop";

export const CannibalPanel = () => (<ErrorBoundary><CannibalWorkshop /></ErrorBoundary>);
