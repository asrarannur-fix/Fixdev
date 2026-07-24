# Changelog

## 2026-07-23
- **Backend Workflow Improvement:**
  - Refactored `server.ts` to modularize API routes.
  - Created `src/server/routes/auth.routes.ts` for authentication and invitation related endpoints.
  - Created `src/server/routes/whatsapp.routes.ts` for WhatsApp API related endpoints.
  - Created `src/server/routes/system.routes.ts` for shared system endpoints (bootstrap, data sync, QZ-related).
  - Removed redundant rate limiter definitions from `server.ts`.
  - Ensured all relevant controllers and middleware are correctly imported and used in the new router files.
- **Frontend Workflow Improvement:**
  - Removed redundant `useEffect` for URL parameter-based navigation in `src/App.tsx`.
- **Pending Refactor:**
  - Identified `src/context/SaaSContext.tsx` for future modularization to improve maintainability and reduce re-renders.
