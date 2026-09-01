# 🚑 Emergency Route AI

> An intelligent emergency-response platform that assesses emergency severity, recommends the most suitable hospital, calculates real road-based routes, and visualizes ambulance movement in real time.

![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8+-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Leaflet](https://img.shields.io/badge/Map-Leaflet%20%2B%20OSM-199900?logo=leaflet&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [How It Works](#3-how-it-works)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Application Workflow](#6-application-workflow)
7. [AI Emergency Assessment](#7-ai-emergency-assessment)
8. [Hospital Recommendation](#8-hospital-recommendation)
9. [Route & Navigation](#9-route--navigation)
10. [Real-Time Ambulance Tracking](#10-real-time-ambulance-tracking)
11. [Database](#11-database)
12. [API Endpoints](#12-api-endpoints)
13. [Project Structure](#13-project-structure)
14. [Installation & Setup](#14-installation--setup)
15. [Environment Variables](#15-environment-variables)
16. [Running the Application](#16-running-the-application)
17. [Production Build](#17-production-build)
18. [Future Enhancements](#18-future-enhancements)
19. [Screenshots](#19-screenshots)
20. [Author](#20-author)

---

## 1. Project Overview

**Emergency Route AI** is a full-stack emergency operations command center built to assist in critical medical response scenarios. It combines a rule-based emergency severity engine, a hospital recommendation system, real-road routing via OSRM, and an interactive Leaflet map with live ambulance tracking — all served from a single integrated application URL.

The platform is designed for scenarios where every second matters: a patient's vitals and symptoms are assessed instantly, the nearest and most capable hospital is recommended, and a real road route is calculated and visualized with estimated arrival time.

---

## 2. Key Features

| Feature | Description |
|---|---|
| **Emergency Assessment** | Rule-based scoring of patient vitals (heart rate, SpO₂, age) and symptoms to classify severity |
| **Priority Classification** | Categorizes emergencies as `CRITICAL`, `HIGH`, or `NORMAL` with risk levels |
| **Hospital Recommendation** | Scores hospitals by distance, bed availability, and emergency department status |
| **Hospital Search & Filter** | Search by name, filter by availability, nearest, or recommended |
| **Nearest Hospital** | Automatically identifies the closest hospital with available emergency beds |
| **OSRM Road Routing** | Calculates actual road routes (not straight lines) between ambulance and hospital |
| **Distance & ETA** | Displays route distance in kilometers and estimated travel time in minutes |
| **Interactive Map** | Leaflet + OpenStreetMap with route polyline, ambulance marker, and hospital markers |
| **Ambulance Tracking** | Animated ambulance icon that moves along the actual OSRM road route with live progress |
| **Real-Time WebSocket** | Live updates broadcast to all connected clients on new emergencies and route changes |
| **Emergency Records** | All assessed emergencies are stored and retrievable for history |
| **Responsive Dashboard** | Clean, dark-themed UI that works across screen sizes |

---

## 3. How It Works

```mermaid
flowchart TD
    A[Patient Vitals & Symptoms] --> B[POST /predict]
    B --> C{Emergency Assessment}
    C -->|score| D[Priority: CRITICAL / HIGH / NORMAL]
    D --> E[Hospital Recommendation]
    E --> F[User Selects Hospital]
    F --> G[GET /route?hospital_id=ID]
    G --> H[OSRM Road Route]
    H --> I[Leaflet Map Display]
    I --> J[Ambulance Tracking Animation]
    J --> K[ARRIVED at Hospital]
    B --> L[WebSocket Broadcast]
    G --> L
```

---

## 4. System Architecture

```mermaid
flowchart LR
    Browser[Browser<br/>http://127.0.0.1:8000] --> FastAPI[FastAPI Backend]
    FastAPI -->|serves| ReactBuild[React Production Build<br/>frontend/dist]
    FastAPI -->|API endpoints| Endpoints[/predict, /hospitals,<br/>/route, /ws, etc.]
    FastAPI -->|queries| PostgreSQL[(PostgreSQL / Supabase)]
    FastAPI -->|requests| OSRM[OSRM Routing Service]
    FastAPI -->|broadcasts| WS[WebSocket /ws]
    ReactBuild -->|Leaflet| OSM[OpenStreetMap Tiles]
```

The application runs as a **single integrated service**: FastAPI serves the React production build and all API endpoints from the same origin (`http://127.0.0.1:8000`), eliminating the need for separate frontend/backend URLs in production mode.

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Leaflet 1.9 |
| **Backend** | FastAPI, Uvicorn, Python 3.12+ |
| **Database** | PostgreSQL (local or Supabase) |
| **Database Driver** | psycopg3 |
| **Routing Engine** | OSRM (Open Source Routing Machine) |
| **Maps** | Leaflet + OpenStreetMap tiles |
| **Real-Time** | WebSockets (FastAPI native) |
| **Deployment** | Render (backend + frontend), Supabase (database) |

---

## 6. Application Workflow

1. **Emergency Assessment** — Enter patient name, age, heart rate, SpO₂, and symptoms
2. **AI Scoring** — The backend calculates an emergency score based on vitals and symptom keywords
3. **Priority Result** — The dashboard displays the priority level, risk score, and recommended action
4. **Hospital Network** — Hospitals load automatically, sorted by distance with bed availability
5. **Recommendation** — The system highlights the best hospital based on a composite score
6. **Hospital Selection** — Click any hospital to calculate the road route
7. **Route Visualization** — The Leaflet map displays the OSRM road route with distance and ETA
8. **Ambulance Tracking** — Click "Start Demo" to animate the ambulance along the route
9. **Arrival** — Progress reaches 100% and status changes to "ARRIVED"

---

## 7. AI Emergency Assessment

The emergency scoring engine (`calculate_emergency_score()`) evaluates multiple factors:

| Factor | Condition | Points |
|---|---|---|
| **Oxygen Level** | < 85% | +4 (severe) |
| | < 90% | +3 (low) |
| | < 94% | +1 (reduced) |
| **Heart Rate** | > 140 BPM | +4 (severe) |
| | > 120 BPM | +3 (elevated) |
| | > 100 BPM | +1 (increased) |
| **Age** | >= 65 | +2 |
| | >= 50 | +1 |
| **Critical Symptoms** | chest pain, difficulty breathing, stroke, seizure, cardiac, etc. | +3 |
| **Moderate Symptoms** | fever, vomiting, dizziness, headache, etc. | +1 |

**Classification:**

| Score | Priority | Risk | Action |
|---|---|---|---|
| >= 7 | CRITICAL | HIGH | Immediate medical evaluation required |
| >= 4 | HIGH | MEDIUM | Urgent medical evaluation recommended |
| < 4 | NORMAL | LOW | Routine medical evaluation |

---

## 8. Hospital Recommendation

The recommendation engine (`/recommend-hospital`) scores each hospital using:

- **Distance Score** (40 max) — closer hospitals score higher
- **Bed Availability Score** (30 max) — more available beds score higher
- **Emergency Service Score** (30 max) — hospitals with emergency departments only

Hospitals without emergency departments receive a score of 0. Results include human-readable reasons for each recommendation.

---

## 9. Route & Navigation

Route calculation uses the **OSRM public routing API** to compute actual road routes:

- **Endpoint:** `GET /route?hospital_id=<ID>`
- **Distance:** returned in kilometers (converted from meters)
- **ETA:** returned in minutes (converted from seconds)
- **Coordinates:** GeoJSON geometry converted from `[lon, lat]` to `[lat, lon]` for Leaflet
- **Polyline:** rendered on the Leaflet map with the actual road path

The route is never a straight line — it follows real roads.

---

## 10. Real-Time Ambulance Tracking

The ambulance tracking feature animates the ambulance icon along the actual OSRM route coordinates:

- **Start Demo** — begins the animation using `requestAnimationFrame`
- **Pause / Resume** — control the animation mid-route
- **Reset** — returns the ambulance to the starting position
- **Progress Bar** — live 0% to 100% progress indicator
- **Status Badges** — `READY` -> `EN ROUTE` -> `PAUSED` -> `ARRIVED`
- **Smooth Interpolation** — the ambulance moves smoothly between route points, not teleporting

When a different hospital is selected, the current animation stops, the previous route is cleared, and the new route loads with the ambulance reset to the start.

---

## 11. Database

The application uses PostgreSQL with two tables:

### `hospitals`
| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Hospital ID |
| `hospital_name` | VARCHAR(255) | Hospital name |
| `latitude` | DECIMAL(10,8) | Latitude |
| `longitude` | DECIMAL(11,8) | Longitude |
| `available_beds` | INTEGER | Available bed count |
| `emergency_available` | BOOLEAN | Has emergency department |

### `emergency_requests`
| Column | Type | Description |
|---|---|---|
| `id` | SERIAL PK | Record ID |
| `patient_name` | VARCHAR(255) | Patient name |
| `age` | INTEGER | Patient age |
| `symptoms` | TEXT | Reported symptoms |
| `heart_rate` | INTEGER | BPM |
| `oxygen_level` | INTEGER | SpO2 % |
| `priority` | VARCHAR(50) | CRITICAL / HIGH / NORMAL |
| `estimated_risk` | VARCHAR(50) | HIGH / MEDIUM / LOW |
| `recommended_action` | TEXT | Suggested action |
| `created_at` | TIMESTAMPTZ | Timestamp |

Schema and seed data are in `supabase/schema.sql` and `supabase/seed.sql`.

---

## 12. API Endpoints

### `GET /`
Serves the React production build (`index.html`). Falls back to a JSON status response if the frontend has not been built.

### `GET /health`
```json
{
  "status": "ONLINE",
  "database": "CONNECTED",
  "routing": "AVAILABLE",
  "websocket": "READY",
  "timestamp": "2026-09-01T18:29:04.795913"
}
```

### `POST /predict`
Assesses emergency severity from patient vitals and symptoms.

**Request:**
```json
{
  "patient_name": "Ravi Kumar",
  "age": 64,
  "heart_rate": 118,
  "oxygen_level": 89,
  "symptoms": "Chest pain and difficulty breathing"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "patient": "Ravi Kumar",
  "priority": "CRITICAL",
  "estimated_risk": "HIGH",
  "score": 8,
  "recommended_action": "Immediate medical evaluation required",
  "reasons": [
    "Low oxygen level",
    "Increased heart rate",
    "Age-related risk factor",
    "Critical symptom detected: chest pain"
  ]
}
```

### `GET /emergencies`
Returns the 50 most recent emergency records, ordered by newest first.

**Response:**
```json
{
  "status": "SUCCESS",
  "emergencies": [
    {
      "id": 39,
      "patient_name": "Ravi Kumar",
      "age": 64,
      "symptoms": "Chest pain and difficulty breathing",
      "heart_rate": 118,
      "oxygen_level": 89,
      "priority": "CRITICAL",
      "estimated_risk": "HIGH",
      "recommended_action": "Immediate medical evaluation required"
    }
  ]
}
```

### `GET /hospitals`
Returns all hospitals sorted by distance from the ambulance.

**Response:**
```json
{
  "status": "SUCCESS",
  "ambulance": { "latitude": 17.385, "longitude": 78.4867 },
  "hospitals": [
    {
      "id": 2,
      "name": "Apollo Emergency Center",
      "latitude": 17.3715,
      "longitude": 78.4917,
      "available_beds": 8,
      "emergency_available": true,
      "distance_km": 1.59
    }
  ]
}
```

### `GET /nearest-hospital`
Returns the closest hospital with available emergency beds.

**Response:**
```json
{
  "status": "SUCCESS",
  "ambulance_location": { "latitude": 17.385, "longitude": 78.4867 },
  "nearest_hospital": {
    "hospital_id": 2,
    "hospital_name": "Apollo Emergency Center",
    "latitude": 17.3715,
    "longitude": 78.4917,
    "available_beds": 8,
    "distance_km": 1.59,
    "emergency_available": true
  }
}
```

### `GET /recommend-hospital`
Returns all hospitals ranked by a composite recommendation score.

**Response:**
```json
{
  "status": "SUCCESS",
  "recommended_hospital": {
    "id": 4,
    "name": "Government General Hospital",
    "latitude": 17.363,
    "longitude": 78.474,
    "available_beds": 20,
    "emergency_available": true,
    "distance_km": 2.79,
    "score": 72.1,
    "reasons": [
      "Reasonable road distance",
      "High bed availability",
      "Emergency service available"
    ]
  },
  "hospitals": [ ... ]
}
```

### `GET /route?hospital_id=<ID>`
Calculates the real road route from the ambulance to the specified hospital using OSRM.

**Response:**
```json
{
  "status": "SUCCESS",
  "ambulance": { "latitude": 17.385, "longitude": 78.4867 },
  "hospital": {
    "id": 1,
    "name": "City Emergency Hospital",
    "latitude": 17.3984,
    "longitude": 78.4766,
    "available_beds": 12,
    "emergency_available": true
  },
  "route": {
    "distance_km": 2.13,
    "estimated_time_minutes": 4,
    "coordinates": [[17.384885, 78.486691], [17.384871, 78.486872], "..."]
  }
}
```

> Coordinates are `[latitude, longitude]` pairs ready for Leaflet.

### `WebSocket /ws`
Real-time communication channel.

**Connection message:**
```json
{ "type": "CONNECTION", "status": "CONNECTED", "message": "..." }
```

**Broadcast events:**

| Event Type | Trigger |
|---|---|
| `NEW_EMERGENCY` | After `POST /predict` succeeds |
| `ROUTE_UPDATED` | After `GET /route` succeeds |
| `HEARTBEAT` | Periodic keepalive (30s timeout) |
| `PONG` | Response to client messages |

### `GET /docs`
Interactive Swagger UI documentation.

---

## 13. Project Structure

```
emergency-route-ai/
├── backend/
│   ├── main.py              # FastAPI application (API + WebSocket + static serving)
│   ├── database.py          # PostgreSQL connection
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Backend env var template
│   └── venv/                # Python virtual environment (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React application
│   │   ├── main.jsx         # React entry point
│   │   ├── index.css        # Global styles
│   │   ├── components/      # Reusable UI components
│   │   └── services/
│   │       ├── api.js       # API client
│   │       └── websocket.js # WebSocket client
│   ├── index.html           # Vite HTML entry
│   ├── package.json         # Node dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind config
│   ├── .env.development     # Dev env vars (gitignored)
│   ├── .env.example         # Frontend env var template
│   └── dist/                # Production build output (gitignored)
│
├── supabase/
│   ├── schema.sql           # Database schema
│   └── seed.sql             # Demo hospital data
│
├── start.sh                 # One-command startup script
├── render.yaml              # Render deployment config
├── .gitignore
└── README.md
```

---

## 14. Installation & Setup

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** and **npm**
- **PostgreSQL** (local install or Supabase account)

### Step 1 — Database

Create a PostgreSQL database named `emergency_route_ai` and run the schema scripts:

```bash
psql -d emergency_route_ai -f supabase/schema.sql
psql -d emergency_route_ai -f supabase/seed.sql
```

Or run the SQL files in the Supabase SQL Editor.

### Step 2 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env from the example
cp .env.example .env
# Edit .env with your database connection string
```

### Step 3 — Frontend

```bash
cd frontend
npm install
```

---

## 15. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/emergency_route_ai` |
| `OSRM_URL` | OSRM routing service URL | `https://router.project-osrm.org` |
| `AMBULANCE_LAT` | Ambulance starting latitude | `17.3850` |
| `AMBULANCE_LON` | Ambulance starting longitude | `78.4867` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,http://127.0.0.1:5173` |

### Frontend (`frontend/.env.development`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL (dev only) | `http://127.0.0.1:8000` |
| `VITE_WS_URL` | WebSocket URL (optional, auto-detected) | `ws://127.0.0.1:8000/ws` |

> **Production note:** When FastAPI serves the React build, `VITE_API_BASE_URL` should be **unset** so the frontend uses same-origin relative paths (e.g., `fetch("/predict")`).

---

## 16. Running the Application

### Option A — Integrated Production Mode (Recommended)

Build the frontend once, then run everything from FastAPI on a single URL:

```bash
# Build the React frontend
cd frontend
npm run build

# Start FastAPI (serves React + API + WebSocket)
cd ../backend
source venv/bin/activate
python main.py
```

Open **http://127.0.0.1:8000** — the complete application loads from one URL.

### Option B — One-Command Startup

```bash
./start.sh
```

This script builds the frontend, activates the backend venv, and starts FastAPI. It also opens the browser automatically on macOS.

### Option C — Development Mode (Separate Servers)

For development with hot reload:

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend (Vite dev server)
cd frontend
npm run dev
```

- Frontend: **http://localhost:5173**
- Backend: **http://127.0.0.1:8000**
- API docs: **http://127.0.0.1:8000/docs**

> The Vite dev server proxies `/api` requests to the backend. The frontend `.env.development` file sets `VITE_API_BASE_URL=http://127.0.0.1:8000` for direct API calls.

---

## 17. Production Build

### Build the frontend

```bash
cd frontend
npm run build
```

This generates `frontend/dist/` with the production-optimized React bundle.

### Verify the build

After building, FastAPI automatically serves:
- `GET /` -> `frontend/dist/index.html`
- `GET /assets/*` -> Vite-generated JS/CSS bundles
- `GET /<unknown-path>` -> SPA fallback to `index.html` (except API routes)

### Deployment (Render + Supabase)

1. **Supabase** — Create a project, run `supabase/schema.sql` and `supabase/seed.sql`, copy the connection string
2. **Render** — Use `render.yaml` to deploy. The build command installs frontend deps, builds React, and installs Python deps. FastAPI serves everything from one URL.
3. Set `DATABASE_URL` in Render environment variables to your Supabase connection string

---

## 18. Future Enhancements

- Real-time GPS integration with physical ambulance tracking devices
- Live traffic data integration for more accurate ETA calculations
- Transition from rule-based scoring to a trained machine learning model
- Mobile-responsive companion app for field responders
- Real-time hospital bed management dashboard
- Analytics dashboard with emergency trends and response time metrics
- Authentication and role-based access control
- Multi-ambulance fleet tracking with route optimization

---

## 19. Screenshots

> _Add screenshots here after running the application._

```
<!-- Example: -->
<!-- ![Dashboard](screenshots/dashboard.png) -->
<!-- ![Route Map](screenshots/route-map.png) -->
<!-- ![Ambulance Tracking](screenshots/tracking.png) -->
```

---

## 20. Author

**Vamsi Krishna Singuru**

Personal project — built as a full-stack emergency response platform demonstrating real-time routing, AI-assisted triage, and interactive map visualization.

---

*This project uses the public OSRM demo server for routing and OpenStreetMap tiles for map display.*
