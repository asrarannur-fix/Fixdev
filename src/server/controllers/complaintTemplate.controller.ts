// Complaint Templates Controller
// SPDX-License-Identifier: Apache-2.0

import { getPool } from "../../lib/db.js";
import { logger } from "../../lib/logger.js";

async function safeQuery(sql: string, params: any[]): Promise<any[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (err: any) {
    logger.debug({ err: err.message, sql }, "Query skipped (table may not exist)");
    return [];
  } finally {
    client.release();
  }
}

// GET /api/complaint-templates - Get all templates for tenant
export const getComplaintTemplates = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  try {
    const templates = await safeQuery(
      `SELECT * FROM complaint_templates 
       WHERE tenant_id = $1 
       ORDER BY is_default DESC, category, label`,
      [tenantId]
    );

    res.json(templates);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch complaint templates");
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

// GET /api/complaint-templates/:id - Get single template
export const getComplaintTemplateById = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  const { id } = req.params;

  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  try {
    const templates = await safeQuery(
      `SELECT * FROM complaint_templates 
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(templates[0]);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch complaint template");
    res.status(500).json({ error: "Failed to fetch template" });
  }
};

// POST /api/complaint-templates - Create new template
export const createComplaintTemplate = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  
  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  const { label, value, category, deviceType, isActive, isDefault } = req.body;

  if (!label || !value) {
    return res.status(400).json({ error: "Label and value are required" });
  }

  try {
    const templates = await safeQuery(
      `INSERT INTO complaint_templates 
       (tenant_id, label, value, category, device_type, is_active, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tenantId,
        label,
        value,
        category || "hardware",
        deviceType || [],
        isActive ?? true,
        isDefault ?? false,
      ]
    );

    res.status(201).json(templates[0]);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to create complaint template");
    res.status(500).json({ error: "Failed to create template" });
  }
};

// PUT /api/complaint-templates/:id - Update template
export const updateComplaintTemplate = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  const { id } = req.params;

  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  const { label, value, category, deviceType, isActive, isDefault } = req.body;

  try {
    const templates = await safeQuery(
      `UPDATE complaint_templates 
       SET label = $1, value = $2, category = $3, device_type = $4, 
           is_active = $5, is_default = $6, updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8
       RETURNING *`,
      [
        label,
        value,
        category,
        deviceType,
        isActive,
        isDefault,
        id,
        tenantId,
      ]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(templates[0]);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to update complaint template");
    res.status(500).json({ error: "Failed to update template" });
  }
};

// DELETE /api/complaint-templates/:id - Delete template
export const deleteComplaintTemplate = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  const { id } = req.params;

  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  try {
    const templates = await safeQuery(
      `DELETE FROM complaint_templates 
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [id, tenantId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to delete complaint template");
    res.status(500).json({ error: "Failed to delete template" });
  }
};

// POST /api/complaint-templates/:id/use - Increment usage count
export const useComplaintTemplate = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  const { id } = req.params;

  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  try {
    const templates = await safeQuery(
      `UPDATE complaint_templates 
       SET usage_count = usage_count + 1
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(templates[0]);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to increment template usage");
    res.status(500).json({ error: "Failed to update usage count" });
  }
};

// GET /api/complaint-templates/category/:category - Get templates by category
export const getComplaintTemplatesByCategory = async (req: any, res: any) => {
  const tenantId = req.tenantId || req.dbTenantId;
  const { category } = req.params;

  if (!tenantId || tenantId === "unknown") {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  try {
    const templates = await safeQuery(
      `SELECT * FROM complaint_templates 
       WHERE tenant_id = $1 AND category = $2 AND is_active = true
       ORDER BY is_default DESC, label`,
      [tenantId, category]
    );

    res.json(templates);
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to fetch templates by category");
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};