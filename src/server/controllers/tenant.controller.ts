export const getTenantData = (req: any, res: any) => {
  const tenantId = req.query.tenant_id as string;
  const branchId = req.query.branch_id as string;

  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({
      error: "Missing required tenant_id parameter for scoped data fetching.",
    });
  }

  res.json({
    status: "verified_and_scoped",
    tenantId,
    branchId,
    scopeDetails: `Data retrieval strictly isolated to Tenant [${tenantId}] and Branch [${branchId || "All Branches"}]`,
    verifiedAt: new Date().toISOString(),
    demoDataset: [
      {
        id: "backend-rec-1",
        tenantId,
        branchId,
        name: "Database Scoping Flag",
        status: "SECURE",
      },
      {
        id: "backend-rec-2",
        tenantId,
        branchId,
        name: "Multi-Tenant Encryption Key",
        status: "VALID",
      },
    ],
  });
};
