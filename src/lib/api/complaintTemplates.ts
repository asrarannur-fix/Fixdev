// Complaint Templates API Service
// SPDX-License-Identifier: Apache-2.0

import { api } from "./client";

export interface ComplaintTemplate {
  id: string;
  tenantId: string;
  label: string;
  value: string;
  category: string;
  deviceType: string[];
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintTemplateInput {
  label: string;
  value: string;
  category?: string;
  deviceType?: string[];
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateComplaintTemplateInput extends CreateComplaintTemplateInput {
  id: string;
}

// Get all templates for current tenant
export const getComplaintTemplates = async (): Promise<ComplaintTemplate[]> => {
  const response = await api.get("/complaint-templates");
  return response.data;
};

// Get single template by ID
export const getComplaintTemplateById = async (id: string): Promise<ComplaintTemplate> => {
  const response = await api.get(`/complaint-templates/${id}`);
  return response.data;
};

// Get templates by category
export const getComplaintTemplatesByCategory = async (category: string): Promise<ComplaintTemplate[]> => {
  const response = await api.get(`/complaint-templates/category/${category}`);
  return response.data;
};

// Create new template
export const createComplaintTemplate = async (data: CreateComplaintTemplateInput): Promise<ComplaintTemplate> => {
  const response = await api.post("/complaint-templates", data);
  return response.data;
};

// Update template
export const updateComplaintTemplate = async (data: UpdateComplaintTemplateInput): Promise<ComplaintTemplate> => {
  const response = await api.put(`/complaint-templates/${data.id}`, data);
  return response.data;
};

// Delete template
export const deleteComplaintTemplate = async (id: string): Promise<void> => {
  await api.delete(`/complaint-templates/${id}`);
};

// Track template usage
export const useComplaintTemplate = async (id: string): Promise<ComplaintTemplate> => {
  const response = await api.post(`/complaint-templates/${id}/use`);
  return response.data;
};

// Bulk import templates
export const bulkImportComplaintTemplates = async (templates: CreateComplaintTemplateInput[]): Promise<ComplaintTemplate[]> => {
  const response = await api.post("/complaint-templates/bulk-import", { templates });
  return response.data;
};