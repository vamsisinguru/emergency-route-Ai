import os
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from math import radians, sin, cos, sqrt, atan2
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from database import get_connection

# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Emergency Route AI",
    description="AI-assisted emergency assessment and hospital routing system",
    version="1.0.0"
)

# ============================================================
# CORS
# ============================================================
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allow_origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    allow_origins = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "*" # Allow all for local fallback if not specified in PROD
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REQUEST MODEL
# ============================================================

class EmergencyRequest(BaseModel):
    patient_name: str
    age: int
    symptoms: str
    heart_rate: int
    oxygen_level: int

# ============================================================
# WEBSOCKET MANAGER
# ============================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # We can broadcast received data to others, e.g., ambulance position
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
@app.get("/health")
def health_check():
    db_status = "DISCONNECTED"
    try:
        conn = get_connection()
        conn.close()
        db_status = "CONNECTED"
    except Exception:
        pass

    return {
        "status": "ONLINE",
        "database": db_status,
        "routing": "AVAILABLE",
        "websocket": "READY",
        "system": "Emergency Route AI",
        "version": "1.0.0"
    }

# ============================================================
# AI EMERGENCY SCORING ENGINE
# ============================================================

def calculate_emergency_score(request: EmergencyRequest):
    score = 0
    reasons = []

    if request.oxygen_level < 85:
        score += 4
        reasons.append("Severely low oxygen level")
    elif request.oxygen_level < 90:
        score += 3
        reasons.append("Low oxygen level")
    elif request.oxygen_level < 94:
        score += 1
        reasons.append("Reduced oxygen level")

    if request.heart_rate > 140:
        score += 4
        reasons.append("Severely elevated heart rate")
    elif request.heart_rate > 120:
        score += 3
        reasons.append("Elevated heart rate")
    elif request.heart_rate > 100:
        score += 1
        reasons.append("Increased heart rate")

    if request.age >= 65:
        score += 2
        reasons.append("Higher age-related risk")
    elif request.age >= 50:
        score += 1
        reasons.append("Age-related risk factor")

    symptoms = request.symptoms.lower()
    critical_symptoms = ["chest pain", "difficulty breathing", "shortness of breath", "unconscious", "severe bleeding", "stroke", "seizure", "cardiac", "heart attack"]
    moderate_symptoms = ["fever", "vomiting", "dizziness", "abdominal pain", "weakness", "cough"]

    critical_found = False
    for symptom in critical_symptoms:
        if symptom in symptoms:
            score += 3
            reasons.append(f"Critical symptom detected: {symptom}")
            critical_found = True
            break

    if not critical_found:
        for symptom in moderate_symptoms:
            if symptom in symptoms:
                score += 1
                reasons.append(f"Symptom detected: {symptom}")
                break

    score = min(score, 10)

    if score >= 7:
        priority = "CRITICAL"
        risk = "HIGH"
        action = "Immediate medical evaluation required"
    elif score >= 4:
        priority = "URGENT"
        risk = "MODERATE"
        action = "Urgent medical evaluation recommended"
    else:
        priority = "NORMAL"
        risk = "LOW"
        action = "Routine medical evaluation"

    return {
        "score": score,
        "priority": priority,
        "risk": risk,
        "action": action,
        "reasons": reasons
    }

# ============================================================
# EMERGENCY ASSESSMENT
# ============================================================

@app.post("/predict")
async def predict_emergency(request: EmergencyRequest):
    assessment = calculate_emergency_score(request)
    
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO emergency_requests
                (patient_name, age, symptoms, heart_rate, oxygen_level, priority, estimated_risk, recommended_action)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (request.patient_name, request.age, request.symptoms, request.heart_rate, request.oxygen_level, assessment["priority"], assessment["risk"], assessment["action"])
            )
            conn.commit()
            
    # Notify via websocket
    await manager.broadcast(json.dumps({
        "type": "emergency_created",
        "data": assessment
    }))

    return {
        "patient": request.patient_name,
        "age": request.age,
        "priority": assessment["priority"],
        "estimated_risk": assessment["risk"],
        "emergency_score": assessment["score"],
        "score_out_of": 10,
        "risk_factors": assessment["reasons"],
        "recommended_action": assessment["action"]
    }

# ============================================================
# RECENT EMERGENCIES
# ============================================================

@app.get("/emergencies")
def get_emergencies():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, patient_name, age, symptoms, heart_rate, oxygen_level, priority, estimated_risk, recommended_action
                FROM emergency_requests ORDER BY id DESC LIMIT 20
                """
            )
            rows = cursor.fetchall()

    emergencies = []
    for row in rows:
        emergencies.append({
            "id": row[0],
            "patient_name": row[1],
            "age": row[2],
            "symptoms": row[3],
            "heart_rate": row[4],
            "oxygen_level": row[5],
            "priority": row[6],
            "estimated_risk": row[7],
            "recommended_action": row[8]
        })
    return emergencies

# ============================================================
# STATS
# ============================================================
@app.get("/stats")
def get_stats():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*), COUNT(CASE WHEN priority='CRITICAL' THEN 1 END), COUNT(CASE WHEN estimated_risk='HIGH' THEN 1 END), COUNT(CASE WHEN priority='NORMAL' THEN 1 END), AVG(heart_rate), AVG(oxygen_level) FROM emergency_requests")
            row = cursor.fetchone()
            
            cursor.execute("SELECT COUNT(*), SUM(available_beds) FROM hospitals WHERE emergency_available = TRUE")
            h_row = cursor.fetchone()
            
    return {
        "total_emergencies": row[0] or 0,
        "critical_cases": row[1] or 0,
        "high_risk_cases": row[2] or 0,
        "normal_cases": row[3] or 0,
        "avg_heart_rate": round(row[4] or 0, 1),
        "avg_spo2": round(row[5] or 0, 1),
        "emergency_hospitals": h_row[0] or 0,
        "available_beds": h_row[1] or 0
    }

# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

# ============================================================
# LIST ALL AVAILABLE HOSPITALS
# ============================================================

AMBULANCE_LAT = float(os.getenv("AMBULANCE_LAT", "17.3850"))
AMBULANCE_LON = float(os.getenv("AMBULANCE_LON", "78.4867"))

@app.get("/hospitals")
def get_hospitals():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, hospital_name, latitude, longitude, available_beds, emergency_available FROM hospitals")
            hospitals = cursor.fetchall()

    result = []
    for hospital in hospitals:
        distance = calculate_distance(AMBULANCE_LAT, AMBULANCE_LON, hospital[2], hospital[3])
        result.append({
            "id": hospital[0],
            "name": hospital[1],
            "latitude": float(hospital[2]),
            "longitude": float(hospital[3]),
            "available_beds": hospital[4],
            "emergency_available": hospital[5],
            "distance_km": round(distance, 2)
        })

    result.sort(key=lambda x: x["distance_km"])
    return {
        "status": "SUCCESS",
        "ambulance": {"latitude": AMBULANCE_LAT, "longitude": AMBULANCE_LON},
        "hospitals": result
    }

# ============================================================
# NEAREST HOSPITAL
# ============================================================

@app.get("/nearest-hospital")
def nearest_hospital():
    data = get_hospitals()
    hospitals = data.get("hospitals", [])
    available = [h for h in hospitals if h["emergency_available"] and h["available_beds"] > 0]
    
    if not available:
        return {"status": "NO_HOSPITAL", "message": "No emergency hospital is currently available."}
        
    return {
        "status": "SUCCESS",
        "ambulance_location": data["ambulance"],
        "nearest_hospital": available[0]
    }

# ============================================================
# SMART HOSPITAL RECOMMENDATION
# ============================================================

@app.get("/recommend-hospital")
def recommend_hospital():
    data = get_hospitals()
    hospitals = [h for h in data.get("hospitals", []) if h["emergency_available"] and h["available_beds"] > 0]

    if not hospitals:
        return {"status": "NO_HOSPITAL", "message": "No emergency hospital is currently available."}

    ranked_hospitals = []
    for hospital in hospitals:
        base_score = 50
        distance_score = max(0, 30 * (1 - min(hospital["distance_km"] / 10, 1)))
        beds_score = min(20, (hospital["available_beds"] / 30) * 20)
        
        final_score = base_score + distance_score + beds_score
        final_score = max(0, min(100, round(final_score, 1)))

        hospital["recommendation_score"] = final_score
        ranked_hospitals.append(hospital)

    ranked_hospitals.sort(key=lambda x: x["recommendation_score"], reverse=True)
    recommended = ranked_hospitals[0]

    reasons = []
    if recommended["distance_km"] < 3:
        reasons.append("Short travel distance")
    if recommended["available_beds"] >= 10:
        reasons.append("High bed capacity")
    if recommended["emergency_available"]:
        reasons.append("Emergency department available")
    if recommended["recommendation_score"] >= 80:
        reasons.append("High overall suitability")

    return {
        "status": "SUCCESS",
        "ambulance": data["ambulance"],
        "recommended_hospital": recommended,
        "ranked_hospitals": ranked_hospitals,
        "recommendation_reasons": reasons
    }

# ============================================================
# REAL ROAD ROUTE
# ============================================================

@app.get("/route")
def calculate_route(hospital_id: int):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, hospital_name, latitude, longitude, available_beds, emergency_available FROM hospitals WHERE id = %s", (hospital_id,))
            hospital = cursor.fetchone()

    if not hospital:
        return {"status": "HOSPITAL_NOT_FOUND", "message": "Selected hospital was not found."}

    hospital_lat = float(hospital[2])
    hospital_lon = float(hospital[3])
    
    if not hospital[5] or hospital[4] <= 0:
        return {"status": "HOSPITAL_UNAVAILABLE", "message": "Selected hospital is currently unavailable."}

    osrm_base_url = os.getenv("OSRM_URL", "https://router.project-osrm.org")
    url = f"{osrm_base_url}/route/v1/driving/{AMBULANCE_LON},{AMBULANCE_LAT};{hospital_lon},{hospital_lat}?overview=full&geometries=geojson"

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok":
            return {"status": "ROUTE_ERROR", "message": "Unable to calculate road route."}

        route = data["routes"][0]
        distance_km = round(route["distance"] / 1000, 2)
        estimated_time_minutes = round(route["duration"] / 60)

        coordinates = [[point[1], point[0]] for point in route["geometry"]["coordinates"]]

        return {
            "status": "SUCCESS",
            "ambulance": {"latitude": AMBULANCE_LAT, "longitude": AMBULANCE_LON},
            "hospital": {
                "id": hospital[0],
                "name": hospital[1],
                "latitude": hospital_lat,
                "longitude": hospital_lon,
                "available_beds": hospital[4],
                "emergency_available": hospital[5]
            },
            "route": {
                "distance_km": distance_km,
                "estimated_time_minutes": estimated_time_minutes,
                "coordinates": coordinates
            }
        }
    except Exception as e:
        return {"status": "ROUTE_ERROR", "message": "Unable to calculate road route.", "error": str(e)}
