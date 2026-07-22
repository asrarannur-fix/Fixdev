// RBAC Middleware for Complaint Templates
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";

// Define permissions for complaint templates
export const COMPLAINT_TEMPLATE_PERMISSIONS = {
  VIEW: "complaint_templates:view",
  CREATE: "complaint_templates:create",
  EDIT: "complaint_templates:edit",
  DELETE: "complaint_templates:delete",
} as const;

// Role-based access matrix for complaint templates
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
    COMPLAINT_TEMPLATE_PERMISSIONS.CREATE,
    COMPLAINT_TEMPLATE_PERMISSIONS.EDIT,
    COMPLAINT_TEMPLATE_PERMISSIONS.DELETE,
  ],
  OWNER: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
    COMPLAINT_TEMPLATE_PERMISSIONS.CREATE,
    COMPLAINT_TEMPLATE_PERMISSIONS.EDIT,
    COMPLAINT_TEMPLATE_PERMISSIONS.DELETE,
  ],
  ADMIN: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
    COMPLAINT_TEMPLATE_PERMISSIONS.CREATE,
    COMPLAINT_TEMPLATE_PERMISSIONS.EDIT,
    COMPLAINT_TEMPLATE_PERMISSIONS.DELETE,
  ],
  MANAGER: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
    COMPLAINT_TEMPLATE_PERMISSIONS.CREATE,
    COMPLAINT_TEMPLATE_PERMISSIONS.EDIT,
  ],
  TEKNISI: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
  ],
  KASIR: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
  ],
  SALES: [
    COMPLAINT_TEMPLATE_PERMISSIONS.VIEW,
  ],
  HR: [],
  CUSTOMER: [],
  ANONYMOUS: [],
};

// Check if user has permission
export const hasComplaintTemplatePermission = (
  userRole: string,
  permission: string
): boolean => {
  const rolePerms = ROLE_PERMISSIONS[userRole] || [];
  return rolePerms.includes(permission);
};

// Middleware: Require specific permission
export const requireComplaintTemplatePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.authActor?.role || "ANONYMOUS";
    
    if (!hasComplaintTemplatePermission(userRole, permission)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `You don't have permission to ${permission}`,
      });
    }

    next();
  };
};

// Middleware: Check if user can edit default templates (only SUPER_ADMIN, OWNER)
export const canEditDefaultTemplates = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userRole = req.authActor?.role || "ANONYMOUS";
  
  if (!["SUPER_ADMIN", "OWNER"].includes(userRole)) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Only Super Admin and Owner can edit default templates",
    });
  }

  next();
};