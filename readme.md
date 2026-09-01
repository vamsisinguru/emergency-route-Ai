# Emergency Route AI

AI-Powered Emergency Response Platform for Hospital Assessment and Routing.

## Project Overview

Emergency Route AI is a comprehensive Emergency Operations Command Center application designed to assess emergency medical situations using rule-based decision support, recommend the most suitable hospital based on real-time availability and distance, and provide live routing for emergency response vehicles.

## Architecture

The application is built using a modern decoupled architecture:

- **Frontend**: React + Vite + Tailwind CSS (Deployable to Vercel)
- **Backend**: FastAPI + Python (Deployable to Render)
- **Database**: PostgreSQL (Deployable to Supabase)
- **Real-time**: WebSocket (FastAPI -> Frontend)
- **Routing Engine**: OSRM (Open Source Routing Machine)
- **Maps**: Leaflet + OpenStreetMap

### System Flow
1. User submits patient vitals on the Vercel Frontend.
2. The Vercel Frontend sends an API request to the Render Backend (`POST /predict`).
3. The Backend assesses the emergency severity and saves it to the Supabase PostgreSQL database.
4. The Backend broadcasts the new emergency via WebSocket to all connected clients.
5. The Frontend fetches available hospitals (`GET /recommend-hospital`).
6. The user selects a hospital, and the Backend fetches a live route from OSRM (`GET /route`).
7. The route is displayed on the Leaflet Map with real-time ETA and distance.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Leaflet
- **Backend**: Python 3, FastAPI, Uvicorn, Psycopg3, Websockets, Python-dotenv
- **Database**: PostgreSQL (Supabase)
- **Routing**: OSRM API

## Database Schema

The database consists of two primary tables:

- `hospitals`: Stores hospital details, location, and bed availability.
- `emergency_requests`: Stores assessed emergency cases, patient details, vitals, and calculated risk scores.

See `supabase/schema.sql` and `supabase/seed.sql` for table definitions and demo data.

## Local Setup

### 1. Database (Local or Supabase)
You can use a local PostgreSQL instance or a Supabase project. Create a database named `emergency_route_ai` and run the SQL scripts in `supabase/`.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file based on .env.example
# Start the server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install

# Start the Vite development server (proxies API to backend)
npm run dev
```
Open `http://localhost:5173` in your browser.

## Deployment Instructions

### 1. Supabase (Database)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`.
3. Run the contents of `supabase/seed.sql` to populate demo hospitals.
4. Go to Project Settings -> Database and copy the Connection String (URI).

### 2. Render (Backend)
1. Create a new Web Service on [Render](https://render.com).
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `.` (leave empty, we use render.yaml)
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string.
   - `ALLOWED_ORIGINS`: Your upcoming Vercel frontend URL (e.g., `https://emergency-route-ai.vercel.app`).
5. Deploy. Copy the backend URL (e.g., `https://emergency-route-ai.onrender.com`).

### 3. Vercel (Frontend)
1. Create a new Project on [Vercel](https://vercel.com).
2. Connect your GitHub repository.
3. Set the **Framework Preset** to Vite.
4. Set the **Root Directory** to `frontend`.
5. Add Environment Variables:
   - `VITE_API_BASE_URL`: Your Render backend URL (e.g., `https://emergency-route-ai.onrender.com`)
   - `VITE_WS_URL`: Your Render websocket URL (e.g., `wss://emergency-route-ai.onrender.com/ws`)
6. Deploy.

## API Documentation

- `GET /health` - System health check.
- `POST /predict` - Submits vitals, returns AI-assisted emergency score.
- `GET /emergencies` - Returns recent emergency history.
- `GET /hospitals` - Returns all available hospitals sorted by distance.
- `GET /recommend-hospital` - Returns hospitals ranked by a custom scoring algorithm (distance, beds, emergency dept).
- `GET /route?hospital_id={id}` - Returns OSRM routing data (distance, ETA, GeoJSON path) from the ambulance to the hospital.
- `GET /stats` - Returns dashboard statistics.

## WebSocket Documentation

Connect to `/ws`. The server broadcasts JSON messages.
Example event:
```json
{
  "type": "emergency_created",
  "data": { "score": 8, "priority": "CRITICAL" }
}
```

## Demo Flow
1. Open the Vercel deployed URL.
2. In the "New Emergency Assessment" panel, enter details:
   - Patient: Ravi Kumar
   - Age: 64
   - Heart Rate: 118
   - SpO2: 89
   - Symptoms: Chest pain and difficulty breathing
3. Click "ASSESS EMERGENCY". See the "CRITICAL / HIGH RISK" assessment.
4. Scroll to "Hospital Comparison". View the Recommended hospital (e.g., Care Emergency Hospital).
5. Click "ROUTE" on the recommended hospital.
6. The map will load the real-world road route, showing ETA and distance.

## Future Scope
- Integration with real-time GPS tracking devices on ambulances.
- Real-time traffic integration for more accurate ETA.
- Transitioning the rule-based assessment engine to a trained Machine Learning model.
