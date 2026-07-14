import * as React from "react";
import { ErrorBoundary } from "../../ErrorBoundary";
import { AssetManager } from "../../AssetManager";

export const AssetsPanel = ({ currentTenantId }: { currentTenantId: string }) => (<ErrorBoundary><AssetManager key={currentTenantId} /></ErrorBoundary>);
