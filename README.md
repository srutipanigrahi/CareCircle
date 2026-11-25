# CareCircle – Family Elder-Care Coordination Platform
React + Node.js + Express.js + PostgreSQL. Elders do a daily check-in; family members monitor it and manage medicine schedules and doctor appointments (role-based access, JWT auth).

## Run
1. Create DB: `psql -U postgres -c "CREATE DATABASE carecircle;"` (tables are created automatically on server start)
2. Backend: `cd backend && cp .env.example .env` (set your Postgres password) then `npm install && npm start`
3. Frontend (new terminal): `cd frontend && npm install && npm run dev` → open http://localhost:5173
4. Register an **Elder** first, then register a **Family member** using the elder's email.

## API
POST /api/register, /api/login · GET/POST /api/checkins · GET/POST/DELETE /api/medicines · GET/POST/DELETE /api/appointments
