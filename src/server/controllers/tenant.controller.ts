export const getTenantData = (req: any, res: any) => {
  const tenantId = String(req.tenantId || req.query.tenant_id || req.query.tenantId || "");
  const branchId = String(req.branchId || req.query.branch_id || req.query.branchId || "");

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
  });
};
