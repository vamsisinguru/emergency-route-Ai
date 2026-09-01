# Emergency Route AI

**AI-Powered Emergency Response Command Center**

A comprehensive emergency response dashboard that provides AI-assisted patient triage, intelligent hospital recommendations, and real-time ambulance routing using OpenStreetMap and OSRM.

---

## 🚨 Overview

Emergency Route AI is a professional prototype system designed to assist emergency medical responders in making rapid, data-driven decisions. The system evaluates patient vitals and symptoms to determine emergency priority, recommends optimal hospitals based on multiple factors, and calculates real road routes for ambulance navigation.

**⚠️ Important Disclaimer:** This is an AI-assisted decision-support prototype, not a medical diagnosis system. Always consult qualified healthcare professionals for medical decisions.

---

## ✨ Features

### 🏥 Patient Assessment
- **AI-Assisted Triage**: Rule-based emergency scoring engine that evaluates:
  - Oxygen saturation (SpO2)
  - Heart rate
  - Age-related risk factors
  - Critical and moderate symptoms
- **Risk Classification**: Categorizes patients as CRITICAL, URGENT, or NORMAL
- **Recommended Actions**: Provides immediate medical evaluation recommendations
- **Case History**: Maintains database of all emergency assessments with timestamps

### 🏥 Hospital Intelligence
- **Real-Time Availability**: Shows hospitals with emergency services and available beds
- **Smart Recommendations**: Multi-factor scoring (0-100 scale) considering:
  - Travel distance
  - Available bed capacity
  - Emergency department availability
  - Estimated travel time
- **Hospital Comparison**: Ranked comparison table with transparent scoring
- **Search & Filter**: Quickly find hospitals by name or filter by availability/distance/recommendation

### 🚑 Routing & Navigation
- **Real Road Routes**: Uses OSRM (Open Source Routing Machine) for actual road networks
- **Interactive Maps**: Leaflet.js powered maps with OpenStreetMap tiles
- **Route Visualization**: Displays ambulance location, hospital destination, and route path
- **Travel Estimates**: Provides distance and estimated time of arrival
- **Route Command Center**: Professional dashboard showing live route status

### 📍 Demo Features
- **Live GPS Tracking**: Simulated ambulance movement along calculated routes
- **Emergency Corridor**: Visual representation of the emergency response chain
- **Progress Tracking**: Real-time progress updates during demo scenarios
- **Demo Mode Indicator**: Clearly labeled prototype functionality

### 📊 Analytics Dashboard
- **Emergency Statistics**: Critical, high-risk, and normal case percentages
- **Hospital Metrics**: Available hospitals and total bed capacity
- **Patient Metrics**: Average SpO2 and vital statistics
- **Visual Progress Bars**: Clear visualization of key metrics

---

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Python 3.x
- FastAPI - Modern web framework for APIs
- PostgreSQL - Relational database for persistent storage
- Pydantic - Data validation using Python type annotations
- OSRM API - Open-source routing engine
- Haversine Formula - Distance calculations

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Leaflet.js - Interactive maps
- OpenStreetMap - Map tiles and geospatial data
- Lucide Icons - Professional icon library
- Responsive design with mobile support

**Database:**
- PostgreSQL with tables:
  - `emergency_requests` - Patient assessment records
  - `hospitals` - Hospital information and availability

### System Flow

```
Frontend Dashboard
    ↓
FastAPI Backend
    ↓
PostgreSQL Database
    ↓
OSRM Routing Service
    ↓
Leaflet Map Display
```

---

## 📦 Installation

### Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- Node.js (optional, for frontend development)

### Backend Setup

1. **Clone the repository**
   ```bash
   cd /path/to/emergeny\ route\ Ai
   ```

2. **Set up Python virtual environment**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database**
   
   Create a PostgreSQL database:
   ```sql
   CREATE DATABASE emergency_route_ai;
   ```

   Update `database.py` with your connection string:
   ```python
   import psycopg
   
   connection = psycopg.connect(
       "dbname=emergency_route_ai user=your_username password=your_password"
   )
   ```

5. **Create database tables**
   ```sql
   -- Emergency requests table
   CREATE TABLE emergency_requests (
       id SERIAL PRIMARY KEY,
       patient_name VARCHAR(255) NOT NULL,
       age INTEGER NOT NULL,
       symptoms TEXT NOT NULL,
       heart_rate INTEGER NOT NULL,
       oxygen_level INTEGER NOT NULL,
       priority VARCHAR(50) NOT NULL,
       estimated_risk VARCHAR(50) NOT NULL,
       recommended_action TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Hospitals table
   CREATE TABLE hospitals (
       id SERIAL PRIMARY KEY,
       hospital_name VARCHAR(255) NOT NULL,
       latitude DECIMAL(10, 8) NOT NULL,
       longitude DECIMAL(11, 8) NOT NULL,
       available_beds INTEGER DEFAULT 0,
       emergency_available BOOLEAN DEFAULT TRUE
   );

   -- Insert sample hospitals
   INSERT INTO hospitals (hospital_name, latitude, longitude, available_beds, emergency_available) VALUES
   ('City Emergency Hospital', 17.3984, 78.4766, 12, TRUE),
   ('Apollo Emergency Center', 17.3715, 78.4917, 8, TRUE),
   ('Care Emergency Hospital', 17.4010, 78.4698, 5, TRUE),
   ('Government General Hospital', 17.3630, 78.4740, 20, TRUE);
   ```

6. **Start the FastAPI server**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### Frontend Setup

1. **Serve the frontend**
   
   The frontend is a single HTML file that can be served in multiple ways:

   **Option 1: Using Python's built-in server**
   ```bash
   cd backend
   python3 -m http.server 5501
   ```

   **Option 2: Using VS Code Live Server extension**
   - Install the "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

   **Option 3: Using any static file server**
   ```bash
   npx serve backend -p 5501
   ```

2. **Access the application**
   
   Open your browser and navigate to:
   ```
   http://127.0.0.1:5501/index.html
   ```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory (optional, currently using hardcoded values):

```env
DATABASE_URL=postgresql://username:password@localhost/emergency_route_ai
OSRM_URL=https://router.project-osrm.org
AMBULANCE_LAT=17.3850
AMBULANCE_LON=78.4867
FRONTEND_URL=http://127.0.0.1:5501
```

See `.env.example` for reference.

### CORS Configuration

The backend is configured to accept requests from:
- `http://127.0.0.1:5500`
- `http://localhost:5500`
- `http://127.0.0.1:5501`
- `http://localhost:5501`

To add more origins, modify the `CORSMiddleware` configuration in `main.py`.

---

## 📡 API Documentation

Once the backend is running, access the interactive API documentation at:

**Swagger UI**: http://127.0.0.1:8000/docs  
**ReDoc**: http://127.0.0.1:8000/redoc

### API Endpoints

#### Health Check
```http
GET /
```
Returns system status and version.

#### Emergency Assessment
```http
POST /predict
Content-Type: application/json

{
  "patient_name": "John Doe",
  "age": 45,
  "symptoms": "Chest pain and difficulty breathing",
  "heart_rate": 120,
  "oxygen_level": 88
}
```
Returns emergency assessment with priority, risk level, and recommended action.

#### Get Emergency Cases
```http
GET /emergencies
```
Returns the 10 most recent emergency assessments.

#### Get Available Hospitals
```http
GET /hospitals
```
Returns all available emergency hospitals with distance from ambulance.

#### Get Nearest Hospital
```http
GET /nearest-hospital
```
Returns the nearest available emergency hospital.

#### Get Hospital Recommendation
```http
GET /recommend-hospital
```
Returns ranked hospital recommendations with scoring (0-100 scale) and reasons.

#### Calculate Route
```http
GET /route?hospital_id=3
```
Calculates real road route from ambulance to specified hospital using OSRM.

---

## 🧪 Testing

### API Testing

Use the provided test cases in the Swagger UI or use curl:

```bash
# Health check
curl http://127.0.0.1:8000/

# Emergency assessment
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Ravi Kumar",
    "age": 64,
    "symptoms": "Chest pain and difficulty breathing",
    "heart_rate": 118,
    "oxygen_level": 89
  }'

# Get emergencies
curl http://127.0.0.1:8000/emergencies

# Get hospitals
curl http://127.0.0.1:8000/hospitals

# Get nearest hospital
curl http://127.0.0.1:8000/nearest-hospital

# Get recommendation
curl http://127.0.0.1:8000/recommend-hospital

# Calculate route
curl http://127.0.0.1:8000/route?hospital_id=1
```

### Frontend Testing

1. **Patient Assessment**
   - Test with critical patient (low SpO2, high heart rate, critical symptoms)
   - Test with normal patient (normal vitals, mild symptoms)
   - Test form validation (empty fields, invalid ranges)

2. **Hospital Selection**
   - Test hospital cards display correctly
   - Test search functionality
   - Test filter buttons (All, Available, Nearest, Recommended)
   - Test selecting different hospitals (Apollo, City, Care, Government)

3. **Route Calculation**
   - Test route calculation for each hospital
   - Verify map displays correctly
   - Verify route information is accurate
   - Verify hospital selection updates route correctly

4. **Demo Tracking**
   - Test start/pause/reset functionality
   - Verify ambulance marker moves along route
   - Check progress bar updates

5. **Analytics**
   - Verify statistics load correctly
   - Check progress bars display accurately

---

## 🗄️ Database Schema

### emergency_requests
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| patient_name | VARCHAR(255) | Patient name |
| age | INTEGER | Patient age |
| symptoms | TEXT | Patient symptoms |
| heart_rate | INTEGER | Heart rate in BPM |
| oxygen_level | INTEGER | Oxygen saturation (SpO2) |
| priority | VARCHAR(50) | Emergency priority (CRITICAL/URGENT/NORMAL) |
| estimated_risk | VARCHAR(50) | Risk level (HIGH/MODERATE/LOW) |
| recommended_action | TEXT | Recommended medical action |
| created_at | TIMESTAMP | Record creation timestamp |

### hospitals
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| hospital_name | VARCHAR(255) | Hospital name |
| latitude | DECIMAL(10,8) | Geographic latitude |
| longitude | DECIMAL(11,8) | Geographic longitude |
| available_beds | INTEGER | Number of available beds |
| emergency_available | BOOLEAN | Emergency department availability |

---

## 🎯 Demo Flow

1. **Open Dashboard**: Navigate to http://127.0.0.1:5501/index.html
2. **View Statistics**: Observe emergency response statistics and hospital availability
3. **Enter Patient Data**: Fill in patient information (name, age, heart rate, SpO2, symptoms)
4. **Assess Emergency**: Click "ASSESS EMERGENCY" to generate AI assessment
5. **Review Results**: View priority, risk level, and recommended action with risk factors
6. **Select Hospital**: Choose from available hospitals based on distance, beds, and recommendation
7. **View Route**: See real road route on interactive map with route command center
8. **Start Demo**: Click "Start Demo" to simulate ambulance movement
9. **Monitor Progress**: Watch ambulance move along route with real-time updates
10. **Review Analytics**: Check emergency statistics and hospital metrics

---

## 🔒 Security Considerations

- **Input Validation**: All user inputs are validated using Pydantic models
- **SQL Injection**: Parameterized queries prevent SQL injection
- **XSS Prevention**: HTML escaping prevents cross-site scripting
- **CORS**: Configured to allow only specific origins
- **Error Handling**: Sensitive information not exposed in error messages

---

## ⚠️ Limitations

1. **Demo Data**: Hospital locations and ambulance position are hardcoded for demonstration
2. **No Real GPS**: Demo tracking uses simulated movement, not real GPS data
3. **OSRM Dependency**: Routing depends on public OSRM service availability
4. **Single Region**: Currently configured for Hyderabad, India region
5. **Rule-Based AI**: Uses rule-based scoring, not machine learning models
6. **No Authentication**: No user authentication or authorization implemented
7. **Single User**: Not designed for concurrent multi-user scenarios
8. **Demo Mode**: System is clearly labeled as a prototype/demo

---

## 🚀 Future Improvements

- [ ] Add real GPS integration for ambulance tracking
- [ ] Implement machine learning models for improved triage
- [ ] Add user authentication and role-based access
- [ ] Support multiple regions and dynamic ambulance locations
- [ ] Add real-time hospital bed availability updates
- [ ] Implement websockets for real-time updates
- [ ] Add mobile app companion
- [ ] Integrate with real emergency dispatch systems
- [ ] Add historical analytics and reporting
- [ ] Implement offline mode for areas with poor connectivity
- [ ] Add traffic-aware routing
- [ ] Implement hospital admission workflow
- [ ] Cloud deployment and production monitoring

---

## 📄 License

This project is a prototype for educational and demonstration purposes.

---

## 🤝 Contributing

This is a demonstration project. For production use, significant enhancements would be needed including proper security, scalability, and integration with real emergency systems.

---

## 📞 Support

For questions or issues with this prototype, please refer to the API documentation at http://127.0.0.1:8000/docs when the backend is running.

---

## 🙏 Acknowledgments

- **FastAPI** - Modern Python web framework
- **Leaflet.js** - Open-source JavaScript library for interactive maps
- **OpenStreetMap** - Free map of the world
- **OSRM** - Open Source Routing Machine
- **PostgreSQL** - Powerful open-source database
- **Lucide** - Beautiful icon library

---

**Remember**: This is a prototype system for demonstration purposes only. In real emergency situations, always follow established medical protocols and consult qualified healthcare professionals.
