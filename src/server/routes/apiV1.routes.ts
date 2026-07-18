/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { requireRoles, requireSupabaseJwt, requireTenantScope } from "../../middleware/auth.middleware.js";
import {
  sanctumAuthMiddleware,
  checkAbilities,
  validateBody,
  customerSchema,
  customerUpdateSchema,
  ticketSchema,
  ticketUpdateSchema,
  inventorySchema,
  inventoryUpdateSchema,
  saleSchema,
  createToken,
  getAuthMe,
  listTokens,
  revokeToken,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getSales,
  getSaleById,
  createSale,
} from "../controllers/apiV1.controller.js";

const router = express.Router();

// ==========================================
// A. LARAVEL SANCTUM AUTH ENDPOINTS
// ==========================================

// Token issuance requires a verified application identity and tenant scope.
router.post(
  "/auth/token",
  requireSupabaseJwt,
  requireTenantScope,
  requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"),
  createToken,
);

router.get("/auth/me", sanctumAuthMiddleware, getAuthMe);
router.get("/auth/tokens", sanctumAuthMiddleware, listTokens);
router.delete("/auth/tokens/:id", sanctumAuthMiddleware, revokeToken);

// ==========================================
// B. CORE REST MODULES (SANCTUM PROTECTED)
// ==========================================

// 1. Customer Management
router.get(
  "/customers",
  sanctumAuthMiddleware,
  checkAbilities(["customers:read"]),
  getCustomers,
);
router.get(
  "/customers/:id",
  sanctumAuthMiddleware,
  checkAbilities(["customers:read"]),
  getCustomerById,
);
router.post(
  "/customers",
  sanctumAuthMiddleware,
  checkAbilities(["customers:write"]),
  validateBody(customerSchema),
  createCustomer,
);
router.put(
  "/customers/:id",
  sanctumAuthMiddleware,
  checkAbilities(["customers:write"]),
  validateBody(customerUpdateSchema),
  updateCustomer,
);
router.delete(
  "/customers/:id",
  sanctumAuthMiddleware,
  checkAbilities(["customers:write"]),
  deleteCustomer,
);

// 2. Service Ticketing
router.get(
  "/tickets",
  sanctumAuthMiddleware,
  checkAbilities(["tickets:read"]),
  getTickets,
);
router.get(
  "/tickets/:id",
  sanctumAuthMiddleware,
  checkAbilities(["tickets:read"]),
  getTicketById,
);
router.post(
  "/tickets",
  sanctumAuthMiddleware,
  checkAbilities(["tickets:write"]),
  validateBody(ticketSchema),
  createTicket,
);
router.put(
  "/tickets/:id",
  sanctumAuthMiddleware,
  checkAbilities(["tickets:write"]),
  validateBody(ticketUpdateSchema),
  updateTicket,
);
router.delete(
  "/tickets/:id",
  sanctumAuthMiddleware,
  checkAbilities(["tickets:write"]),
  deleteTicket,
);

// 3. Inventory Control
router.get(
  "/inventory",
  sanctumAuthMiddleware,
  checkAbilities(["inventory:read"]),
  getInventory,
);
router.get(
  "/inventory/:id",
  sanctumAuthMiddleware,
  checkAbilities(["inventory:read"]),
  getInventoryById,
);
router.post(
  "/inventory",
  sanctumAuthMiddleware,
  checkAbilities(["inventory:write"]),
  validateBody(inventorySchema),
  createInventory,
);
router.put(
  "/inventory/:id",
  sanctumAuthMiddleware,
  checkAbilities(["inventory:write"]),
  validateBody(inventoryUpdateSchema),
  updateInventory,
);
router.delete(
  "/inventory/:id",
  sanctumAuthMiddleware,
  checkAbilities(["inventory:write"]),
  deleteInventory,
);

// 4. Sales & POS Transactions
router.get(
  "/sales",
  sanctumAuthMiddleware,
  checkAbilities(["sales:read"]),
  getSales,
);
router.get(
  "/sales/:id",
  sanctumAuthMiddleware,
  checkAbilities(["sales:read"]),
  getSaleById,
);
router.post(
  "/sales",
  sanctumAuthMiddleware,
  checkAbilities(["sales:write"]),
  validateBody(saleSchema),
  createSale,
);

// ==========================================
// C. OPENAPI & SWAGGER DOCUMENTATION
// ==========================================

// Raw OpenAPI Spec JSON
router.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "KM FixFlow ERP - Unified REST API Specification",
      description:
        "Comprehensive REST API for the KM FixFlow CRM & POS ERP SaaS platform. Integrate and orchestrate operations including customers, service ticketing, warehouses inventory, and cash/POS sales data with enterprise security rules.",
      version: "1.0.0",
      contact: {
        name: "SaaS Dev Team",
        email: "z.komputermakassar@gmail.com",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "Standard Tenancy Root API Gateway",
      },
    ],
    components: {
      securitySchemes: {
        SanctumBearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Enter your Laravel Sanctum Personal Access Token. Example: `km_sanctum_token_owner`",
        },
      },
      schemas: {
        Customer: {
          type: "object",
          properties: {
            id: { type: "string" },
            tenantId: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            segment: { type: "string", enum: ["PERSONAL", "CORPORATE"] },
            companyName: { type: "string" },
            notes: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            loyaltyPoints: { type: "number" },
            storeCredit: { type: "number" },
            totalSpend: { type: "number" },
          },
          required: ["name", "phone"],
        },
        ServiceTicket: {
          type: "object",
          properties: {
            id: { type: "string" },
            tenantId: { type: "string" },
            branchId: { type: "string" },
            ticketNo: { type: "string" },
            customerId: { type: "string" },
            deviceName: { type: "string" },
            deviceBrandModel: { type: "string" },
            deviceCategory: { type: "string" },
            customerComplaints: { type: "string" },
            estimatedCost: { type: "number" },
            customerApprovalStatus: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
            status: { type: "string" },
            warrantyMonths: { type: "number" },
            isOutsourced: { type: "boolean" },
            timeline: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  note: { type: "string" },
                  timestamp: { type: "string" },
                  operator: { type: "string" },
                },
              },
            },
            accessoriesLeft: { type: "array", items: { type: "string" } },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
          required: ["customerId", "deviceName", "customerComplaints"],
        },
        InventoryProduct: {
          type: "object",
          properties: {
            id: { type: "string" },
            tenantId: { type: "string" },
            name: { type: "string" },
            sku: { type: "string" },
            barcode: { type: "string" },
            category: {
              type: "string",
              enum: ["SPAREPART", "AKSESORIS", "JASA", "LAINNYA"],
            },
            purchaseCost: { type: "number" },
            sellPrice: { type: "number" },
            unit: { type: "string" },
            stockQty: { type: "number" },
            grade: { type: "string" },
            isConsignment: { type: "boolean" },
          },
          required: ["name", "sku", "category", "purchaseCost", "sellPrice"],
        },
        POSTransaction: {
          type: "object",
          properties: {
            id: { type: "string" },
            tenantId: { type: "string" },
            branchId: { type: "string" },
            invoiceNo: { type: "string" },
            customerId: { type: "string" },
            subtotal: { type: "number" },
            discountAmount: { type: "number" },
            taxAmount: { type: "number" },
            grandTotal: { type: "number" },
            paymentMethod: { type: "string" },
            amountPaid: { type: "number" },
            changeAmount: { type: "number" },
            timestamp: { type: "string" },
            isRefunded: { type: "boolean" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  name: { type: "string" },
                  quantity: { type: "number" },
                  unitPrice: { type: "number" },
                  total: { type: "number" },
                },
              },
            },
          },
        },
        TokenExchangeRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "owner@komputermakassar.com",
            },
            tokenName: { type: "string", example: "Mobile CRM Key" },
            abilities: {
              type: "array",
              items: { type: "string" },
              example: ["*"],
            },
          },
          required: ["email"],
        },
        TokenExchangeResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            token_type: { type: "string", example: "Bearer" },
            abilities: { type: "array", items: { type: "string" } },
            name: { type: "string" },
            tenantId: { type: "string" },
            branchId: { type: "string" },
            createdAt: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/auth/token": {
        post: {
          summary: "Create Sanctum Personal Access Token",
          description:
            "Generates a Laravel Sanctum-style API Token by checking the credentials (email) of a registered business owner or staff.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenExchangeRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Token generated successfully.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/TokenExchangeResponse",
                  },
                },
              },
            },
            401: {
              description:
                "Unauthenticated: User does not match any register records.",
            },
            422: {
              description: "Unprocessable entity: Email field is required.",
            },
          },
        },
      },
      "/auth/tokens": {
        get: {
          summary: "List Active Personal Access Tokens",
          security: [{ SanctumBearerAuth: [] }],
          responses: {
            200: {
              description:
                "Array of tokens belonging to the authenticated context.",
              content: {
                "application/json": {
                  schema: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
      "/auth/tokens/{id}": {
        delete: {
          summary: "Revoke Personal Access Token",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Token revoked successfully." },
            404: { description: "Token not found." },
          },
        },
      },
      "/customers": {
        get: {
          summary: "List Customers",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "search",
              in: "query",
              schema: { type: "string" },
              description: "Filter by name, email, phone, or company",
            },
            {
              name: "segment",
              in: "query",
              schema: { type: "string", enum: ["PERSONAL", "CORPORATE"] },
            },
          ],
          responses: {
            200: {
              description:
                "List of filtered customers isolated to the authenticated tenant.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Customer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create Customer",
          security: [{ SanctumBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Customer" },
              },
            },
          },
          responses: {
            201: { description: "Customer created successfully." },
            422: { description: "Validation Error." },
          },
        },
      },
      "/customers/{id}": {
        get: {
          summary: "Get Customer Details",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Customer" },
                },
              },
            },
            404: { description: "Customer not found." },
          },
        },
        put: {
          summary: "Update Customer details",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            200: { description: "Customer updated successfully." },
            404: { description: "Customer not found." },
          },
        },
        delete: {
          summary: "Delete Customer",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Customer deleted successfully." },
            404: { description: "Customer not found." },
          },
        },
      },
      "/tickets": {
        get: {
          summary: "List Service Tickets",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              schema: { type: "string" },
              description: "Filter by ticket status",
            },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ServiceTicket" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create Service Ticket",
          security: [{ SanctumBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ServiceTicket" },
              },
            },
          },
          responses: {
            201: { description: "Ticket created." },
          },
        },
      },
      "/tickets/{id}": {
        get: {
          summary: "Get Service Ticket details",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ServiceTicket" },
                },
              },
            },
          },
        },
        put: {
          summary: "Update Ticket Details or Status",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            200: { description: "Ticket updated." },
          },
        },
        delete: {
          summary: "Delete Service Ticket",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Ticket deleted." },
          },
        },
      },
      "/inventory": {
        get: {
          summary: "List Inventory Products",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/InventoryProduct",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Add New Product / Component",
          security: [{ SanctumBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InventoryProduct" },
              },
            },
          },
          responses: {
            201: { description: "Product added." },
          },
        },
      },
      "/inventory/{id}": {
        get: {
          summary: "Get Product Details",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/InventoryProduct" },
                },
              },
            },
          },
        },
        put: {
          summary: "Update Product specifications or stock",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: { 200: { description: "Product updated." } },
        },
        delete: {
          summary: "Delete Product",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "Product deleted." } },
        },
      },
      "/sales": {
        get: {
          summary: "List Sales / POS Transactions",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            { name: "paymentMethod", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/POSTransaction" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create Sales POS Order",
          security: [{ SanctumBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    customerId: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          productId: { type: "string" },
                          quantity: { type: "number" },
                        },
                      },
                    },
                    paymentMethod: { type: "string" },
                    discountAmount: { type: "number" },
                  },
                  required: ["items", "paymentMethod"],
                },
              },
            },
          },
          responses: {
            201: { description: "Transaction completed successfully." },
          },
        },
      },
      "/sales/{id}": {
        get: {
          summary: "Get Sale Order Details",
          security: [{ SanctumBearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/POSTransaction" },
                },
              },
            },
          },
        },
      },
    },
  });
});

// Interactive Swagger UI
router.get("/docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>KM FixFlow ERP - Developer REST API documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; font-family: sans-serif; }
        .branding-header {
          background: #1e293b;
          color: white;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 4px solid #3b82f6;
        }
        .branding-header h1 { margin: 0; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.025em; }
        .branding-header p { margin: 0; font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
        .back-btn {
          color: #3b82f6;
          background: white;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .back-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="branding-header">
        <div>
          <h1>KM FixFlow REST API documentation</h1>
          <p>Multi-Tenant SaaS Gateway • Laravel Sanctum Token Authorization</p>
        </div>
        <a href="/" class="back-btn">&larr; Back to ERP Workspace</a>
      </div>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/v1/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "BaseLayout",
            persistAuthorization: true
          });
        };
      </script>
    </body>
    </html>
  `);
});

export default router;
