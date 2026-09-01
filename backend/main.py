# ============================================================
# EMERGENCY ROUTE AI
# FastAPI Backend
# ============================================================

from database import connection

from fastapi import (
    FastAPI,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Query,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel, Field

from math import radians, sin, cos, sqrt, atan2

from urllib.request import urlopen
from urllib.parse import quote

from pathlib import Path

import json
import asyncio
import os
from datetime import datetime

# Load .env file if python-dotenv is available (local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Emergency Route AI",
    description=(
        "AI-assisted emergency assessment, "
        "hospital recommendation and real-road routing system."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        # React / Vite
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        "http://localhost:5174",
        "http://127.0.0.1:5174",

        # Previous frontend ports
        "http://localhost:5500",
        "http://127.0.0.1:5500",

        "http://localhost:5501",
        "http://127.0.0.1:5501",

        # VS Code / other local development
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# CONSTANTS
# ============================================================

AMBULANCE_LAT = 17.3850
AMBULANCE_LON = 78.4867

OSRM_BASE_URL = (
    "https://router.project-osrm.org/"
    "route/v1/driving/"
)

# Path to the production React build served by FastAPI.
# main.py lives in backend/, so ../frontend/dist is the build output.
FRONTEND_DIST = (
    Path(__file__).resolve()
    .parent.parent
    / "frontend"
    / "dist"
)


# ============================================================
# REQUEST MODEL
# ============================================================

class EmergencyRequest(BaseModel):

    patient_name: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    age: int = Field(
        ...,
        ge=1,
        le=120
    )

    symptoms: str = Field(
        ...,
        min_length=1,
        max_length=1000
    )

    heart_rate: int = Field(
        ...,
        ge=30,
        le=220
    )

    oxygen_level: int = Field(
        ...,
        ge=0,
        le=100
    )


# ============================================================
# WEBSOCKET CONNECTION MANAGER
# ============================================================

class ConnectionManager:

    def __init__(self):

        self.active_connections = []


    async def connect(
        self,
        websocket: WebSocket
    ):

        await websocket.accept()

        self.active_connections.append(
            websocket
        )


    def disconnect(
        self,
        websocket: WebSocket
    ):

        if websocket in self.active_connections:

            self.active_connections.remove(
                websocket
            )


    async def broadcast(
        self,
        message: dict
    ):

        disconnected = []

        for websocket in self.active_connections:

            try:

                await websocket.send_json(
                    message
                )

            except Exception:

                disconnected.append(
                    websocket
                )


        for websocket in disconnected:

            self.disconnect(
                websocket
            )


manager = ConnectionManager()


# ============================================================
# ROOT — SERVE REACT APP (or JSON fallback if no build)
# ============================================================

@app.get("/")
async def root():

    index_file = FRONTEND_DIST / "index.html"

    if index_file.exists():

        return FileResponse(index_file)

    # Fallback when frontend has not been built yet
    database_status = "CONNECTED"

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                "SELECT 1"
            )

            cursor.fetchone()

    except Exception:

        database_status = "ERROR"


    return {

        "status": "ONLINE",

        "system": "Emergency Route AI",

        "version": "1.0.0",

        "database": database_status,

        "routing": "AVAILABLE",

        "websocket": "READY",

        "message": (
            "Frontend build not found. "
            "Run: cd frontend && npm run build"
        ),

    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health():

    database_status = "CONNECTED"

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                "SELECT 1"
            )

            cursor.fetchone()

    except Exception:

        database_status = "ERROR"


    return {

        "status": "ONLINE",

        "database": database_status,

        "routing": "AVAILABLE",

        "websocket": "READY",

        "timestamp": datetime.utcnow().isoformat(),

    }


# ============================================================
# AI EMERGENCY SCORING
# ============================================================

def calculate_emergency_score(
    request: EmergencyRequest
):

    score = 0

    reasons = []


    # --------------------------------------------------------
    # OXYGEN
    # --------------------------------------------------------

    if request.oxygen_level < 85:

        score += 4

        reasons.append(
            "Severely low oxygen level"
        )

    elif request.oxygen_level < 90:

        score += 3

        reasons.append(
            "Low oxygen level"
        )

    elif request.oxygen_level < 94:

        score += 1

        reasons.append(
            "Reduced oxygen level"
        )


    # --------------------------------------------------------
    # HEART RATE
    # --------------------------------------------------------

    if request.heart_rate > 140:

        score += 4

        reasons.append(
            "Severely elevated heart rate"
        )

    elif request.heart_rate > 120:

        score += 3

        reasons.append(
            "Elevated heart rate"
        )

    elif request.heart_rate > 100:

        score += 1

        reasons.append(
            "Increased heart rate"
        )


    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------

    if request.age >= 65:

        score += 2

        reasons.append(
            "Higher age-related risk"
        )

    elif request.age >= 50:

        score += 1

        reasons.append(
            "Age-related risk factor"
        )


    # --------------------------------------------------------
    # SYMPTOMS
    # --------------------------------------------------------

    symptoms = request.symptoms.lower()


    critical_symptoms = [

        "chest pain",

        "difficulty breathing",

        "shortness of breath",

        "unconscious",

        "severe bleeding",

        "stroke",

        "seizure",

        "cardiac",

        "heart attack",

        "breathing problem",

        "loss of consciousness",

    ]


    moderate_symptoms = [

        "fever",

        "vomiting",

        "dizziness",

        "abdominal pain",

        "weakness",

        "cough",

        "headache",

    ]


    critical_found = False


    for symptom in critical_symptoms:

        if symptom in symptoms:

            score += 3

            reasons.append(
                f"Critical symptom detected: {symptom}"
            )

            critical_found = True

            break


    if not critical_found:

        for symptom in moderate_symptoms:

            if symptom in symptoms:

                score += 1

                reasons.append(
                    f"Symptom detected: {symptom}"
                )

                break


    # --------------------------------------------------------
    # FINAL CLASSIFICATION
    # --------------------------------------------------------

    if score >= 7:

        priority = "CRITICAL"

        risk = "HIGH"

        action = (
            "Immediate medical evaluation required"
        )


    elif score >= 4:

        priority = "HIGH"

        risk = "MEDIUM"

        action = (
            "Urgent medical evaluation recommended"
        )


    else:

        priority = "NORMAL"

        risk = "LOW"

        action = (
            "Routine medical evaluation"
        )


    return {

        "score": score,

        "priority": priority,

        "estimated_risk": risk,

        "recommended_action": action,

        "reasons": reasons,

    }


# ============================================================
# PREDICT EMERGENCY
# ============================================================

@app.post("/predict")
async def predict_emergency(
    request: EmergencyRequest
):

    result = calculate_emergency_score(
        request
    )


    # --------------------------------------------------------
    # SAVE TO DATABASE
    # --------------------------------------------------------

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO emergency_requests
                (
                    patient_name,
                    age,
                    symptoms,
                    heart_rate,
                    oxygen_level,
                    priority,
                    estimated_risk,
                    recommended_action
                )
                VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
                """,

                (
                    request.patient_name,

                    request.age,

                    request.symptoms,

                    request.heart_rate,

                    request.oxygen_level,

                    result["priority"],

                    result["estimated_risk"],

                    result["recommended_action"],
                )
            )

            connection.commit()


    except Exception as error:

        connection.rollback()

        print(
            "Database insert error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Emergency assessment calculated "
                "but database save failed."
            )
        )


    response = {

        "status": "SUCCESS",

        "patient": request.patient_name,

        "priority": result["priority"],

        "estimated_risk": result["estimated_risk"],

        "score": result["score"],

        "recommended_action":
            result["recommended_action"],

        "reasons":
            result["reasons"],

    }


    # --------------------------------------------------------
    # REAL-TIME WEBSOCKET UPDATE
    # --------------------------------------------------------

    await manager.broadcast({

        "type": "NEW_EMERGENCY",

        "data": response,

    })


    return response


# ============================================================
# GET EMERGENCIES
# ============================================================

@app.get("/emergencies")
def get_emergencies():

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    patient_name,
                    age,
                    symptoms,
                    heart_rate,
                    oxygen_level,
                    priority,
                    estimated_risk,
                    recommended_action
                FROM emergency_requests
                ORDER BY id DESC
                LIMIT 50
                """
            )

            rows = cursor.fetchall()


    except Exception as error:

        print(
            "Emergency history error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load emergency history."
        )


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

            "recommended_action": row[8],

        })


    return {

        "status": "SUCCESS",

        "emergencies": emergencies,

    }


# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance(
    lat1,
    lon1,
    lat2,
    lon2
):

    R = 6371.0


    lat1 = radians(
        float(lat1)
    )

    lon1 = radians(
        float(lon1)
    )

    lat2 = radians(
        float(lat2)
    )

    lon2 = radians(
        float(lon2)
    )


    dlat = lat2 - lat1

    dlon = lon2 - lon1


    a = (

        sin(dlat / 2) ** 2

        +

        cos(lat1)
        *
        cos(lat2)
        *
        sin(dlon / 2) ** 2

    )


    c = 2 * atan2(

        sqrt(a),

        sqrt(1 - a)

    )


    return R * c


# ============================================================
# GET HOSPITALS
# ============================================================

@app.get("/hospitals")
def get_hospitals():

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    hospital_name,
                    latitude,
                    longitude,
                    available_beds,
                    emergency_available
                FROM hospitals
                """
            )

            hospitals = cursor.fetchall()


    except Exception as error:

        print(
            "Hospital query error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load hospitals."
        )


    hospital_list = []


    for hospital in hospitals:

        hospital_id = hospital[0]

        hospital_name = hospital[1]

        latitude = float(
            hospital[2]
        )

        longitude = float(
            hospital[3]
        )

        available_beds = hospital[4]

        emergency_available = hospital[5]


        distance = calculate_distance(

            AMBULANCE_LAT,

            AMBULANCE_LON,

            latitude,

            longitude

        )


        hospital_list.append({

            "id": hospital_id,

            "name": hospital_name,

            "latitude": latitude,

            "longitude": longitude,

            "available_beds":
                available_beds,

            "emergency_available":
                emergency_available,

            "distance_km":
                round(distance, 2),

        })


    hospital_list.sort(
        key=lambda item:
            item["distance_km"]
    )


    return {

        "status": "SUCCESS",

        "ambulance": {

            "latitude":
                AMBULANCE_LAT,

            "longitude":
                AMBULANCE_LON,

        },

        "hospitals":
            hospital_list,

    }


# ============================================================
# NEAREST HOSPITAL
# ============================================================

@app.get("/nearest-hospital")
def nearest_hospital():

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    hospital_name,
                    latitude,
                    longitude,
                    available_beds,
                    emergency_available
                FROM hospitals
                WHERE emergency_available = TRUE
                AND available_beds > 0
                """
            )

            hospitals = cursor.fetchall()


    except Exception as error:

        print(
            "Nearest hospital error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to find nearest hospital."
        )


    if not hospitals:

        return {

            "status":
                "NO_HOSPITAL",

            "message":
                "No emergency hospital is currently available."

        }


    nearest = None

    shortest_distance = float(
        "inf"
    )


    for hospital in hospitals:

        distance = calculate_distance(

            AMBULANCE_LAT,

            AMBULANCE_LON,

            hospital[2],

            hospital[3]

        )


        if distance < shortest_distance:

            shortest_distance = distance


            nearest = {

                "hospital_id":
                    hospital[0],

                "hospital_name":
                    hospital[1],

                "latitude":
                    float(hospital[2]),

                "longitude":
                    float(hospital[3]),

                "available_beds":
                    hospital[4],

                "distance_km":
                    round(distance, 2),

                "emergency_available":
                    hospital[5],

            }


    return {

        "status":
            "SUCCESS",

        "ambulance_location": {

            "latitude":
                AMBULANCE_LAT,

            "longitude":
                AMBULANCE_LON,

        },

        "nearest_hospital":
            nearest,

    }


# ============================================================
# HOSPITAL RECOMMENDATION
# ============================================================

@app.get("/recommend-hospital")
def recommend_hospital():

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    hospital_name,
                    latitude,
                    longitude,
                    available_beds,
                    emergency_available
                FROM hospitals
                """
            )

            hospitals = cursor.fetchall()


    except Exception as error:

        print(
            "Recommendation query error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to recommend hospital."
        )


    if not hospitals:

        return {

            "status":
                "NO_HOSPITAL",

            "message":
                "No hospitals found."

        }


    candidates = []


    for hospital in hospitals:

        hospital_id = hospital[0]

        name = hospital[1]

        latitude = float(
            hospital[2]
        )

        longitude = float(
            hospital[3]
        )

        beds = int(
            hospital[4]
        )

        emergency_available = bool(
            hospital[5]
        )


        distance = calculate_distance(

            AMBULANCE_LAT,

            AMBULANCE_LON,

            latitude,

            longitude

        )


        # ----------------------------------------------------
        # SCORE
        # ----------------------------------------------------

        distance_score = max(

            0,

            40 - (
                distance * 10
            )

        )


        bed_score = min(

            30,

            beds * 1.5

        )


        emergency_score = (

            30
            if emergency_available
            else 0

        )


        total_score = (

            distance_score

            +

            bed_score

            +

            emergency_score

        )


        if not emergency_available:

            total_score = 0


        reasons = []


        if distance <= 2:

            reasons.append(
                "Very close to ambulance"
            )

        elif distance <= 5:

            reasons.append(
                "Reasonable road distance"
            )

        else:

            reasons.append(
                "Longer travel distance"
            )


        if beds >= 15:

            reasons.append(
                "High bed availability"
            )

        elif beds >= 5:

            reasons.append(
                "Beds currently available"
            )

        else:

            reasons.append(
                "Limited bed availability"
            )


        if emergency_available:

            reasons.append(
                "Emergency service available"
            )


        candidates.append({

            "id":
                hospital_id,

            "name":
                name,

            "latitude":
                latitude,

            "longitude":
                longitude,

            "available_beds":
                beds,

            "emergency_available":
                emergency_available,

            "distance_km":
                round(distance, 2),

            "score":
                round(
                    min(total_score, 100),
                    1
                ),

            "reasons":
                reasons,

        })


    candidates.sort(

        key=lambda item:
            item["score"],

        reverse=True

    )


    recommended = candidates[0]


    return {

        "status":
            "SUCCESS",

        "recommended_hospital":
            recommended,

        "hospitals":
            candidates,

    }


# ============================================================
# REAL ROAD ROUTE
# ============================================================

@app.get("/route")
async def calculate_route(

    hospital_id: int | None = Query(
        default=None
    )

):

    # --------------------------------------------------------
    # IF HOSPITAL ID IS PROVIDED
    # USE SELECTED HOSPITAL
    #
    # OTHERWISE USE NEAREST AVAILABLE HOSPITAL
    # --------------------------------------------------------

    try:

        with connection.cursor() as cursor:

            if hospital_id is not None:

                cursor.execute(
                    """
                    SELECT
                        id,
                        hospital_name,
                        latitude,
                        longitude,
                        available_beds,
                        emergency_available
                    FROM hospitals
                    WHERE id = %s
                    """,
                    (hospital_id,)
                )

            else:

                cursor.execute(
                    """
                    SELECT
                        id,
                        hospital_name,
                        latitude,
                        longitude,
                        available_beds,
                        emergency_available
                    FROM hospitals
                    WHERE emergency_available = TRUE
                    AND available_beds > 0
                    """
                )


            rows = cursor.fetchall()


    except Exception as error:

        print(
            "Route database error:",
            error
        )

        raise HTTPException(

            status_code=500,

            detail=
                "Unable to load hospital for routing."

        )


    # --------------------------------------------------------
    # SELECT HOSPITAL
    # --------------------------------------------------------

    if hospital_id is not None:

        if not rows:

            return {

                "status":
                    "HOSPITAL_NOT_FOUND",

                "message":
                    "Selected hospital was not found."

            }


        selected = rows[0]


        if not selected[5] or selected[4] <= 0:

            return {

                "status":
                    "HOSPITAL_UNAVAILABLE",

                "message":
                    "Selected hospital is currently unavailable."

            }


    else:

        if not rows:

            return {

                "status":
                    "NO_HOSPITAL",

                "message":
                    "No emergency hospital is currently available."

            }


        selected = None

        shortest_distance = float(
            "inf"
        )


        for hospital in rows:

            distance = calculate_distance(

                AMBULANCE_LAT,

                AMBULANCE_LON,

                hospital[2],

                hospital[3]

            )


            if distance < shortest_distance:

                shortest_distance = distance

                selected = hospital


    # --------------------------------------------------------
    # HOSPITAL DATA
    # --------------------------------------------------------

    selected_hospital_id = selected[0]

    hospital_name = selected[1]

    hospital_lat = float(
        selected[2]
    )

    hospital_lon = float(
        selected[3]
    )

    available_beds = selected[4]

    emergency_available = bool(
        selected[5]
    )


    # --------------------------------------------------------
    # OSRM URL
    # --------------------------------------------------------

    start = (

        f"{AMBULANCE_LON},"
        f"{AMBULANCE_LAT}"

    )


    end = (

        f"{hospital_lon},"
        f"{hospital_lat}"

    )


    route_url = (

        OSRM_BASE_URL

        +

        quote(start)

        +

        ";"

        +

        quote(end)

        +

        "?overview=full"
        "&geometries=geojson"

    )


    # --------------------------------------------------------
    # REQUEST OSRM
    # --------------------------------------------------------

    try:

        with urlopen(
            route_url,
            timeout=15
        ) as response:

            route_data = json.loads(

                response
                .read()
                .decode("utf-8")

            )


    except Exception as error:

        print(
            "OSRM error:",
            error
        )

        return {

            "status":
                "ROUTE_ERROR",

            "message":
                "Unable to calculate road route.",

            "error":
                str(error),

        }


    # --------------------------------------------------------
    # OSRM RESPONSE CHECK
    # --------------------------------------------------------

    if route_data.get(
        "code"
    ) != "Ok":

        return {

            "status":
                "ROUTE_ERROR",

            "message":
                "Routing service could not calculate a route.",

        }


    if not route_data.get(
        "routes"
    ):

        return {

            "status":
                "ROUTE_ERROR",

            "message":
                "No road route was returned."

        }


    route = route_data[
        "routes"
    ][0]


    # --------------------------------------------------------
    # DISTANCE
    # --------------------------------------------------------

    distance_km = round(

        route["distance"]
        / 1000,

        2

    )


    # --------------------------------------------------------
    # TIME
    # --------------------------------------------------------

    duration_minutes = round(

        route["duration"]
        / 60

    )


    # --------------------------------------------------------
    # COORDINATES
    #
    # OSRM returns:
    #
    # [longitude, latitude]
    #
    # Leaflet expects:
    #
    # [latitude, longitude]
    # --------------------------------------------------------

    map_coordinates = []


    for coordinate in (

        route["geometry"]
        ["coordinates"]

    ):

        longitude = coordinate[0]

        latitude = coordinate[1]


        map_coordinates.append([

            latitude,

            longitude,

        ])


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    result = {

        "status":
            "SUCCESS",

        "ambulance": {

            "latitude":
                AMBULANCE_LAT,

            "longitude":
                AMBULANCE_LON,

        },

        "hospital": {

            "id":
                selected_hospital_id,

            "name":
                hospital_name,

            "latitude":
                hospital_lat,

            "longitude":
                hospital_lon,

            "available_beds":
                available_beds,

            "emergency_available":
                emergency_available,

        },

        "route": {

            "distance_km":
                distance_km,

            "estimated_time_minutes":
                duration_minutes,

            "coordinates":
                map_coordinates,

        },

    }


    # --------------------------------------------------------
    # BROADCAST ROUTE UPDATE
    # --------------------------------------------------------

    try:

        await manager.broadcast({

            "type":
                "ROUTE_UPDATED",

            "data":
                result,

        })

    except Exception as error:

        print(
            "WebSocket broadcast error:",
            error
        )


    return result


# ============================================================
# WEBSOCKET
# ============================================================

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket
):

    await manager.connect(
        websocket
    )


    try:

        await websocket.send_json({

            "type":
                "CONNECTION",

            "status":
                "CONNECTED",

            "message":
                "Emergency Route AI real-time connection established.",

        })


        while True:

            try:

                message = await asyncio.wait_for(

                    websocket.receive_text(),

                    timeout=30

                )


                if message:

                    await websocket.send_json({

                        "type":
                            "PONG",

                        "timestamp":
                            datetime.utcnow()
                            .isoformat(),

                    })


            except asyncio.TimeoutError:

                await websocket.send_json({

                    "type":
                        "HEARTBEAT",

                    "timestamp":
                        datetime.utcnow()
                        .isoformat(),

                })


    except WebSocketDisconnect:

        manager.disconnect(
            websocket
        )


    except Exception as error:

        print(
            "WebSocket error:",
            error
        )

        manager.disconnect(
            websocket
        )


# ============================================================
# STATIC ASSETS + SPA FALLBACK
#
# Mounted AFTER all API routes and the WebSocket endpoint so
# that /predict, /hospitals, /route, /ws, /docs, etc. are
# matched first and never intercepted by the catch-all.
# ============================================================

if FRONTEND_DIST.exists():

    # Serve Vite-generated assets (JS, CSS, images) directly
    assets_dir = FRONTEND_DIST / "assets"

    if assets_dir.exists():

        app.mount(
            "/assets",
            StaticFiles(directory=assets_dir),
            name="frontend-assets",
        )


    # Serve other top-level static files (favicon, robots.txt, etc.)
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):

        # Never intercept API or framework-internal paths.
        # These are already matched by explicit routes above,
        # but this guard prevents index.html from being served
        # for paths that look like API attempts.
        api_prefixes = (
            "predict",
            "hospitals",
            "route",
            "recommend-hospital",
            "nearest-hospital",
            "emergencies",
            "health",
            "docs",
            "openapi",
            "redoc",
            "ws",
        )

        first_segment = (
            full_path.split("/")[0]
            if full_path
            else ""
        )

        for prefix in api_prefixes:
            if first_segment == prefix or first_segment.startswith(prefix + "-"):
                raise HTTPException(
                    status_code=404,
                    detail="Not found.",
                )

        # Serve an exact static file if it exists
        candidate = FRONTEND_DIST / full_path

        if candidate.is_file():
            return FileResponse(candidate)

        # SPA fallback: return index.html for client-side routing
        index_file = FRONTEND_DIST / "index.html"

        if index_file.exists():
            return FileResponse(index_file)

        raise HTTPException(
            status_code=404,
            detail="Frontend build not found.",
        )


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(

        "main:app",

        host="127.0.0.1",

        port=8000,

        reload=True

    )