# PRD - Store_site-v13

## Source
- Repo: https://github.com/aymenkssi/Store_site-v13.git
- Loaded on: 2026-01-17

## Stack
- Backend: FastAPI (Python), MongoDB (Motor)
- Frontend: React (CRA + Craco)
- Auth: JWT + Google OAuth
- Email: Resend

## Environment Variables Configured
- /app/backend/.env:
  - MONGO_URL, DB_NAME, CORS_ORIGINS (protected, preserved)
  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (user-provided)
  - RESEND_API_KEY (user-provided)
  - COOKIE_SECURE=false (dev mode for preview)
- /app/frontend/.env: REACT_APP_BACKEND_URL preserved

## Status
- Backend running on :8001 (supervisor) - /api/ returns Hello World OK
- Frontend running on :3000 (supervisor) - HTTP 200 OK
- MongoDB running locally

## Next Action Items
- User to validate the loaded site and request further changes/features
