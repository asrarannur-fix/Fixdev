import * as React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { TradeInCalculator } from "../../TradeInCalculator";

export const TradeInPanel = () => (<ErrorBoundary><TradeInCalculator /></ErrorBoundary>);
