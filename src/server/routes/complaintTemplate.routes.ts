// Complaint Templates Routes
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";
import * as complaintTemplateController from "../controllers/complaintTemplate.controller.js";
import {
  requireComplaintTemplatePermission,
  canEditDefaultTemplates,
  COMPLAINT_TEMPLATE_PERMISSIONS,
} from "../../middleware/rbac.middleware.js";

const router = Router();

// GET /api/complaint-templates - Get all templates
router.get(
  "/",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.VIEW),
  complaintTemplateController.getComplaintTemplates
);

// GET /api/complaint-templates/:id - Get single template
router.get(
  "/:id",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.VIEW),
  complaintTemplateController.getComplaintTemplateById
);

// GET /api/complaint-templates/category/:category - Get by category
router.get(
  "/category/:category",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.VIEW),
  complaintTemplateController.getComplaintTemplatesByCategory
);

// POST /api/complaint-templates - Create template
router.post(
  "/",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.CREATE),
  complaintTemplateController.createComplaintTemplate
);

// PUT /api/complaint-templates/:id - Update template
router.put(
  "/:id",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.EDIT),
  canEditDefaultTemplates,
  complaintTemplateController.updateComplaintTemplate
);

// DELETE /api/complaint-templates/:id - Delete template
router.delete(
  "/:id",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.DELETE),
  canEditDefaultTemplates,
  complaintTemplateController.deleteComplaintTemplate
);

// POST /api/complaint-templates/:id/use - Track usage
router.post(
  "/:id/use",
  requireComplaintTemplatePermission(COMPLAINT_TEMPLATE_PERMISSIONS.VIEW),
  complaintTemplateController.useComplaintTemplate
);

export default router;