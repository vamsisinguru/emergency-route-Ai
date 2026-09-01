import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
|--------------------------------------------------------------------------
| Emergency Route AI
| Personal Emergency Operations Dashboard
|--------------------------------------------------------------------------
*/

/*
 * API base URL.
 *
 * Development (Vite, npm run dev):
 *   Set VITE_API_BASE_URL=http://127.0.0.1:8000 in frontend/.env.development
 *   so the dev server calls the FastAPI backend directly.
 *
 * Production (FastAPI serves the React build):
 *   VITE_API_BASE_URL is unset -> API_BASE = "" -> same-origin requests
 *   e.g. fetch("/predict") resolves to http://127.0.0.1:8000/predict
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const defaultPatient = {
  name: "",
  age: "",
  heart_rate: "",
  spo2: "",
  symptoms: "",
};

function App() {
  const [patient, setPatient] = useState(defaultPatient);
  const [assessment, setAssessment] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [recommended, setRecommended] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [route, setRoute] = useState(null);

  const [loading, setLoading] = useState(false);
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [systemOnline, setSystemOnline] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routeLayer = useRef(null);
  const ambulanceMarker = useRef(null);
  const hospitalMarkers = useRef([]);

  /* Ambulance animation state */
  const [trackingStatus, setTrackingStatus] = useState("IDLE");
  const [trackingProgress, setTrackingProgress] = useState(0);
  const routePointsRef = useRef([]);
  const animFrameRef = useRef(null);
  const animIndexRef = useRef(0);
  const animPausedRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* System health                                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    checkBackend();
    loadHospitals();
  }, []);

  async function checkBackend() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      setSystemOnline(response.ok);
    } catch {
      setSystemOnline(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Hospitals                                                               */
  /* ---------------------------------------------------------------------- */

  async function loadHospitals() {
    try {
      setHospitalLoading(true);

      const response = await fetch(`${API_BASE}/hospitals`);

      if (!response.ok) {
        throw new Error(`Hospital API returned ${response.status}`);
      }

      const data = await response.json();

      const list = Array.isArray(data)
        ? data
        : data.hospitals || data.data || [];

      setHospitals(list);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load hospitals. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setHospitalLoading(false);
    }
  }

  async function loadRecommendation() {
    try {
      const response = await fetch(`${API_BASE}/recommend-hospital`);

      if (!response.ok) return;

      const data = await response.json();

      setRecommended(
        data.hospital ||
          data.recommended_hospital ||
          data
      );
    } catch (err) {
      console.error("Recommendation error:", err);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Emergency assessment                                                    */
  /* ---------------------------------------------------------------------- */

  function updatePatient(field, value) {
    setPatient((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

 async function assessEmergency(e) {
  e.preventDefault();

  setError("");

  if (!patient.name.trim()) {
    setError("Please enter the patient's name.");
    return;
  }

  if (
    !patient.age ||
    Number(patient.age) < 1 ||
    Number(patient.age) > 120
  ) {
    setError("Age must be between 1 and 120.");
    return;
  }

  if (
    !patient.heart_rate ||
    Number(patient.heart_rate) < 30 ||
    Number(patient.heart_rate) > 220
  ) {
    setError("Heart rate must be between 30 and 220 BPM.");
    return;
  }

  if (
    patient.spo2 === "" ||
    Number(patient.spo2) < 0 ||
    Number(patient.spo2) > 100
  ) {
    setError("SpO₂ must be between 0 and 100%.");
    return;
  }

  if (!patient.symptoms.trim()) {
    setError("Please enter the patient's symptoms.");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_name: patient.name,
        age: Number(patient.age),
        heart_rate: Number(patient.heart_rate),
        oxygen_level: Number(patient.spo2),
        symptoms: patient.symptoms,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || `Assessment API returned ${response.status}`
      );
    }

    setAssessment(data);

    await loadHospitals();
    await loadRecommendation();

    setTimeout(() => {
      document
        .getElementById("hospital-section")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 200);
  } catch (err) {
    console.error("Assessment error:", err);

    setError(
      err.message ||
        "Emergency assessment failed. Check that the backend is running."
    );
  } finally {
    setLoading(false);
  }
}

  /* ---------------------------------------------------------------------- */
  /* Route                                                                   */
  /* ---------------------------------------------------------------------- */

  async function selectHospital(hospital) {
    const hospitalId =
      hospital.id ??
      hospital.hospital_id ??
      hospital.hospitalId;

    // Stop any running ambulance animation
    stopAnimation();
    routePointsRef.current = [];

    setSelectedHospital(hospital);
    setRoute(null);
    setRouteLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/route?hospital_id=${hospitalId}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(
          "Route API error:",
          response.status,
          data
        );
        throw new Error(
          data.detail ||
            data.message ||
            `Route API returned ${response.status}`
        );
      }

      if (
        data.status &&
        String(data.status).toUpperCase() !== "SUCCESS"
      ) {
        console.error(
          "Route calculation failed:",
          data.status,
          data
        );
        throw new Error(
          data.message || "Route calculation failed."
        );
      }

      setRoute(data);

      setTimeout(() => {
        document
          .getElementById("route-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err) {
      console.error("Route error:", err);
      setError(
        err.message ||
          "Route calculation failed. Check FastAPI and OSRM connectivity."
      );
    } finally {
      setRouteLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Ambulance animation                                                     */
  /* ---------------------------------------------------------------------- */

  function stopAnimation() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    animPausedRef.current = false;
  }

  function resetTracking() {
    stopAnimation();
    animIndexRef.current = 0;
    setTrackingProgress(0);
    setTrackingStatus("IDLE");

    const points = routePointsRef.current;
    if (points.length && ambulanceMarker.current && mapInstance.current) {
      ambulanceMarker.current.setLatLng(points[0]);
    }
  }

  function startTracking() {
    const points = routePointsRef.current;
    if (!points.length || !ambulanceMarker.current || !mapInstance.current) {
      return;
    }

    stopAnimation();
    animIndexRef.current = 0;
    animPausedRef.current = false;
    setTrackingStatus("EN ROUTE");

    const totalSegments = points.length - 1;
    const speed = 2; // segments per frame (~60fps)

    function step() {
      if (animPausedRef.current) return;

      animIndexRef.current += speed;

      if (animIndexRef.current >= totalSegments) {
        animIndexRef.current = totalSegments;
        ambulanceMarker.current.setLatLng(points[totalSegments]);
        setTrackingProgress(100);
        setTrackingStatus("ARRIVED");
        animFrameRef.current = null;
        return;
      }

      const idx = Math.floor(animIndexRef.current);
      const frac = animIndexRef.current - idx;

      const [lat1, lng1] = points[idx];
      const [lat2, lng2] = points[idx + 1];

      const lat = lat1 + (lat2 - lat1) * frac;
      const lng = lng1 + (lng2 - lng1) * frac;

      ambulanceMarker.current.setLatLng([lat, lng]);

      const progress = Math.round(
        (animIndexRef.current / totalSegments) * 100
      );
      setTrackingProgress(progress);

      animFrameRef.current = requestAnimationFrame(step);
    }

    animFrameRef.current = requestAnimationFrame(step);
  }

  function pauseTracking() {
    if (animFrameRef.current) {
      animPausedRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      setTrackingStatus("PAUSED");
    }
  }

  function resumeTracking() {
    if (!animPausedRef.current) return;
    animPausedRef.current = false;
    setTrackingStatus("EN ROUTE");

    const points = routePointsRef.current;
    if (!points.length) return;

    const totalSegments = points.length - 1;
    const speed = 2;

    function step() {
      if (animPausedRef.current) return;

      animIndexRef.current += speed;

      if (animIndexRef.current >= totalSegments) {
        animIndexRef.current = totalSegments;
        ambulanceMarker.current.setLatLng(points[totalSegments]);
        setTrackingProgress(100);
        setTrackingStatus("ARRIVED");
        animFrameRef.current = null;
        return;
      }

      const idx = Math.floor(animIndexRef.current);
      const frac = animIndexRef.current - idx;

      const [lat1, lng1] = points[idx];
      const [lat2, lng2] = points[idx + 1];

      const lat = lat1 + (lat2 - lat1) * frac;
      const lng = lng1 + (lng2 - lng1) * frac;

      ambulanceMarker.current.setLatLng([lat, lng]);

      const progress = Math.round(
        (animIndexRef.current / totalSegments) * 100
      );
      setTrackingProgress(progress);

      animFrameRef.current = requestAnimationFrame(step);
    }

    animFrameRef.current = requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------------- */
  /* Map                                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: true,
      }).setView([17.6868, 83.2185], 13);

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; OpenStreetMap contributors',
        }
      ).addTo(mapInstance.current);
    }
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    hospitalMarkers.current.forEach((marker) => {
      marker.remove();
    });

    hospitalMarkers.current = [];

    hospitals.forEach((hospital) => {
      const lat = Number(
        hospital.latitude ??
          hospital.lat ??
          hospital.location?.latitude
      );

      const lng = Number(
        hospital.longitude ??
          hospital.lng ??
          hospital.lon ??
          hospital.location?.longitude
      );

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const marker = L.marker([lat, lng])
        .addTo(mapInstance.current)
        .bindPopup(
          `<strong>${escapeHtml(
            hospital.name || "Emergency Hospital"
          )}</strong><br/>Available beds: ${
            hospital.available_beds ?? "N/A"
          }`
        );

      hospitalMarkers.current.push(marker);
    });
  }, [hospitals]);

  useEffect(() => {
    if (!mapInstance.current || !route) return;

    // Stop any running animation when route changes
    stopAnimation();
    setTrackingProgress(0);
    setTrackingStatus("IDLE");

    if (routeLayer.current) {
      routeLayer.current.remove();
    }

    /*
     * Supports common OSRM response formats.
     *
     * Backend (/route) returns route.route.coordinates as
     * [latitude, longitude] pairs (already converted from
     * OSRM's [longitude, latitude]). Raw OSRM geometry is
     * [longitude, latitude], so only swap for that fallback.
     */

    const fromBackend = Boolean(
      route.route?.coordinates || route.coordinates
    );

    let coordinates =
      route.route?.coordinates ||
      route.coordinates ||
      route.geometry?.coordinates ||
      [];

    let latLngs = [];

    if (coordinates.length) {
      latLngs = coordinates.map((point) => {
        if (Array.isArray(point)) {
          return fromBackend
            ? [Number(point[0]), Number(point[1])]
            : [Number(point[1]), Number(point[0])];
        }

        return [
          Number(point.lat),
          Number(point.lng ?? point.lon),
        ];
      });

      routeLayer.current = L.polyline(latLngs, {
        weight: 6,
        color: "#2563eb",
      }).addTo(mapInstance.current);

      mapInstance.current.fitBounds(
        routeLayer.current.getBounds(),
        {
          padding: [40, 40],
        }
      );
    }

    // Store route points for ambulance animation
    routePointsRef.current = latLngs;

    /*
     * Ambulance marker — placed at the start of the route.
     * Uses a divIcon with the ambulance emoji for a clear
     * visual that moves along the OSRM road route.
     */

    if (ambulanceMarker.current) {
      ambulanceMarker.current.remove();
      ambulanceMarker.current = null;
    }

    const startPoint =
      latLngs.length > 0
        ? latLngs[0]
        : null;

    if (startPoint) {
      const ambulanceIcon = L.divIcon({
        className: "ambulance-icon",
        html: "🚑",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      ambulanceMarker.current = L.marker(startPoint, {
        icon: ambulanceIcon,
      })
        .addTo(mapInstance.current)
        .bindPopup("🚑 Ambulance — en route to hospital");
    }
  }, [route]);

  /* ---------------------------------------------------------------------- */
  /* Filtering                                                               */
  /* ---------------------------------------------------------------------- */

  const filteredHospitals = hospitals.filter((hospital) => {
    const name = String(hospital.name || "").toLowerCase();

    const matchesSearch = name.includes(
      search.toLowerCase()
    );

    if (!matchesSearch) return false;

    if (filter === "available") {
      return Number(hospital.available_beds || 0) > 0;
    }

    if (filter === "nearest") {
      return true;
    }

    if (filter === "recommended") {
      const id =
        hospital.id ?? hospital.hospital_id;

      const rid =
        recommended?.id ??
        recommended?.hospital_id ??
        recommended?.hospital?.id;

      return rid != null && String(id) === String(rid);
    }

    return true;
  });

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                              */
  /* ---------------------------------------------------------------------- */

  const totalBeds = hospitals.reduce(
    (sum, hospital) =>
      sum + Number(hospital.available_beds || 0),
    0
  );

  const availableHospitals = hospitals.filter(
    (hospital) =>
      Number(hospital.available_beds || 0) > 0
  ).length;

  /* ---------------------------------------------------------------------- */
  /* UI                                                                      */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="app">
      <style>{styles}</style>

      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✚</div>

          <div>
            <h1>Emergency Route AI</h1>
            <span>
              AI-Powered Emergency Operations Center
            </span>
          </div>
        </div>

        <div className="system-status">
          <span
            className={`status-dot ${
              systemOnline ? "online" : "offline"
            }`}
          />

          {systemOnline
            ? "SYSTEM ONLINE"
            : "SYSTEM OFFLINE"}
        </div>
      </header>

      <main className="container">

        {/* HERO */}
        <section className="hero">
          <div>
            <div className="eyebrow">
              EMERGENCY RESPONSE PLATFORM
            </div>

            <h2>
              Assess. Decide. <span>Route.</span>
            </h2>

            <p>
              Intelligent emergency assessment with
              hospital availability and real-road routing.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() =>
              document
                .getElementById("assessment")
                ?.scrollIntoView({
                  behavior: "smooth",
                })
            }
          >
            + New Emergency Assessment
          </button>
        </section>

        {/* STATS */}
        <section className="stats-grid">
          <Stat
            label="Hospitals"
            value={hospitals.length}
            icon="🏥"
          />

          <Stat
            label="Available Hospitals"
            value={availableHospitals}
            icon="✓"
          />

          <Stat
            label="Available Beds"
            value={totalBeds}
            icon="🛏"
          />

          <Stat
            label="System"
            value={systemOnline ? "ONLINE" : "OFFLINE"}
            icon="●"
          />
        </section>

        {/* ERROR */}
        {error && (
          <div className="error-box">
            <strong>⚠ Attention</strong>
            <span>{error}</span>
            <button onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {/* ASSESSMENT */}
        <section
          id="assessment"
          className="panel"
        >
          <div className="section-heading">
            <div>
              <span className="section-label">
                STEP 01
              </span>

              <h3>Emergency Assessment</h3>

              <p>
                Enter patient vitals and symptoms for
                immediate AI-assisted triage.
              </p>
            </div>

            <div className="ai-badge">
              ✦ AI ENGINE
            </div>
          </div>

          <form
            onSubmit={assessEmergency}
            className="assessment-grid"
          >
            <Input
              label="Patient Name"
              value={patient.name}
              onChange={(e) =>
                updatePatient(
                  "name",
                  e.target.value
                )
              }
              placeholder="Enter patient name"
            />

            <Input
              label="Age"
              type="number"
              value={patient.age}
              onChange={(e) =>
                updatePatient(
                  "age",
                  e.target.value
                )
              }
              placeholder="Years"
            />

            <Input
              label="Heart Rate"
              type="number"
              value={patient.heart_rate}
              onChange={(e) =>
                updatePatient(
                  "heart_rate",
                  e.target.value
                )
              }
              placeholder="BPM"
            />

            <Input
              label="SpO₂"
              type="number"
              value={patient.spo2}
              onChange={(e) =>
                updatePatient(
                  "spo2",
                  e.target.value
                )
              }
              placeholder="%"
            />

            <div className="field full">
              <label>Symptoms</label>

              <textarea
                value={patient.symptoms}
                onChange={(e) =>
                  updatePatient(
                    "symptoms",
                    e.target.value
                  )
                }
                placeholder="Describe the patient's symptoms..."
                rows="4"
              />
            </div>

            <div className="full">
              <button
                type="submit"
                className="primary-btn large"
                disabled={loading}
              >
                {loading
                  ? "ANALYSING EMERGENCY..."
                  : "ASSESS EMERGENCY"}
              </button>
            </div>
          </form>
        </section>

        {/* AI RESULT */}
        {assessment && (
          <section className="result-panel">
            <div className="result-header">
              <div>
                <span className="section-label">
                  AI ASSESSMENT
                </span>

                <h3>
                  Emergency Assessment Result
                </h3>
              </div>

              <div className="critical-badge">
                {String(
                  assessment.priority ||
                    assessment.severity ||
                    assessment.level ||
                    "ASSESSED"
                ).toUpperCase()}
              </div>
            </div>

            <div className="result-grid">
              <ResultCard
                label="Priority"
                value={
                  assessment.priority ||
                  assessment.severity ||
                  assessment.level ||
                  "N/A"
                }
              />

              <ResultCard
                label="Risk Score"
                value={
                  assessment.score ??
                  assessment.risk_score ??
                  assessment.emergency_score ??
                  "N/A"
                }
              />

              <ResultCard
                label="Patient"
                value={
                  assessment.name ||
                  patient.name
                }
              />

              <ResultCard
                label="Action"
                value={
                  assessment.recommended_action ||
                  assessment.action ||
                  "Immediate medical evaluation"
                }
              />
            </div>
          </section>
        )}

        {/* HOSPITALS */}
        <section
          id="hospital-section"
          className="panel"
        >
          <div className="section-heading">
            <div>
              <span className="section-label">
                STEP 02
              </span>

              <h3>Emergency Hospital Network</h3>

              <p>
                Compare nearby hospitals by distance,
                availability and recommendation score.
              </p>
            </div>

            <button
              className="secondary-btn"
              onClick={loadHospitals}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder="Search hospitals..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <div className="filters">
              {[
                ["all", "All"],
                ["available", "Available"],
                ["nearest", "Nearest"],
                ["recommended", "Recommended"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={
                    filter === key
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() =>
                    setFilter(key)
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hospitalLoading ? (
            <div className="empty">
              Loading hospitals...
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="empty">
              No hospitals found.
            </div>
          ) : (
            <div className="hospital-grid">
              {filteredHospitals.map(
                (hospital, index) => {
                  const id =
                    hospital.id ??
                    hospital.hospital_id;

                  const isSelected =
                    selectedHospital &&
                    String(
                      selectedHospital.id ??
                        selectedHospital.hospital_id
                    ) === String(id);

                  return (
                    <div
                      key={id ?? index}
                      className={`hospital-card ${
                        isSelected
                          ? "selected"
                          : ""
                      }`}
                    >
                      <div className="hospital-top">
                        <div className="hospital-number">
                          {String(index + 1).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <span className="available">
                          ● EMERGENCY AVAILABLE
                        </span>
                      </div>

                      <h4>
                        🏥{" "}
                        {hospital.name ||
                          "Emergency Hospital"}
                      </h4>

                      <div className="hospital-data">
                        <Data
                          label="Distance"
                          value={
                            (hospital.distance_km != null
                              ? hospital.distance_km
                              : hospital.distance) != null
                              ? `${
                                  hospital.distance_km != null
                                    ? hospital.distance_km
                                    : hospital.distance
                                } km`
                              : "N/A"
                          }
                        />

                        <Data
                          label="Available Beds"
                          value={
                            hospital.available_beds ??
                            "N/A"
                          }
                        />

                        <Data
                          label="Emergency"
                          value={
                            hospital.emergency_available ??
                            hospital.emergency ??
                            "AVAILABLE"
                          }
                        />

                        <Data
                          label="Recommendation"
                          value={
                            hospital.score != null
                              ? `${hospital.score}/100`
                              : "Available"
                          }
                        />
                      </div>

                      <button
                        className={
                          isSelected
                            ? "route-btn selected-btn"
                            : "route-btn"
                        }
                        onClick={() =>
                          selectHospital(hospital)
                        }
                      >
                        {routeLoading &&
                        isSelected
                          ? "CALCULATING..."
                          : "SELECT & ROUTE →"}
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* MAP + ROUTE */}
        <section
          id="route-section"
          className="panel"
        >
          <div className="section-heading">
            <div>
              <span className="section-label">
                STEP 03
              </span>

              <h3>Live Emergency Route</h3>

              <p>
                Real road route between ambulance and
                selected emergency hospital.
              </p>
            </div>

            {selectedHospital && (
              <div className="destination">
                Destination:{" "}
                <strong>
                  {selectedHospital.name}
                </strong>
              </div>
            )}
          </div>

          {route ? (
            (() => {
              const routeInfo = route.route || route;
              const distance =
                routeInfo.distance_km != null
                  ? routeInfo.distance_km
                  : routeInfo.distance;
              const duration =
                routeInfo.estimated_time_minutes != null
                  ? routeInfo.estimated_time_minutes
                  : routeInfo.duration_minutes != null
                  ? routeInfo.duration_minutes
                  : routeInfo.duration;

              return (
                <div className="route-summary">
                  <RouteStat
                    label="Distance"
                    value={
                      distance != null
                        ? `${distance} km`
                        : "N/A"
                    }
                  />

                  <RouteStat
                    label="Estimated Time"
                    value={
                      duration != null
                        ? `${duration} min`
                        : "N/A"
                    }
                  />

                  <RouteStat
                    label="Destination"
                    value={
                      route.hospital?.name ||
                      selectedHospital?.name ||
                      "Selected Hospital"
                    }
                  />
                </div>
              );
            })()
          ) : (
            <div className="route-placeholder">
              <div className="route-icon">🚑</div>

              <h4>
                Select a hospital to calculate a route
              </h4>

              <p>
                The map will display the ambulance,
                hospital and real road route.
              </p>
            </div>
          )}

          {/* AMBULANCE TRACKING */}
          {route && (
            <div className="tracking-panel">
              <div className="tracking-header">
                <div className="tracking-status">
                  <span
                    className={`status-badge status-${trackingStatus.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {trackingStatus === "ARRIVED"
                      ? "✓ ARRIVED"
                      : trackingStatus === "EN ROUTE"
                      ? "🚑 EN ROUTE"
                      : trackingStatus === "PAUSED"
                      ? "⏸ PAUSED"
                      : "○ READY"}
                  </span>
                </div>

                <div className="tracking-progress-text">
                  Progress: {trackingProgress}%
                </div>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${trackingProgress}%`,
                  }}
                />
              </div>

              <div className="tracking-controls">
                {trackingStatus === "IDLE" && (
                  <button
                    className="track-btn start"
                    onClick={startTracking}
                  >
                    ▶ Start Demo
                  </button>
                )}

                {trackingStatus === "EN ROUTE" && (
                  <button
                    className="track-btn pause"
                    onClick={pauseTracking}
                  >
                    ⏸ Pause
                  </button>
                )}

                {trackingStatus === "PAUSED" && (
                  <button
                    className="track-btn resume"
                    onClick={resumeTracking}
                  >
                    ▶ Resume
                  </button>
                )}

                <button
                  className="track-btn reset"
                  onClick={resetTracking}
                  disabled={trackingStatus === "IDLE"}
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          )}

          <div
            ref={mapRef}
            className="map"
          />
        </section>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small components                                                           */
/* -------------------------------------------------------------------------- */

function Stat({ label, value, icon }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function Data({ label, value }) {
  return (
    <div className="data">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="result-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RouteStat({ label, value }) {
  return (
    <div className="route-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -------------------------------------------------------------------------- */
/* Complete UI styling                                                        */
/* -------------------------------------------------------------------------- */

const styles = `
* {
  box-sizing: border-box;
}

:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color: #e8eefc;
  background: #07101f;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(
      circle at 15% 0%,
      rgba(37, 99, 235, 0.18),
      transparent 35%
    ),
    radial-gradient(
      circle at 90% 20%,
      rgba(14, 165, 233, 0.08),
      transparent 30%
    ),
    #07101f;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app {
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;

  min-height: 76px;
  padding: 14px 5%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-bottom: 1px solid rgba(148, 163, 184, 0.15);

  background: rgba(7, 16, 31, 0.88);
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 44px;
  height: 44px;

  display: grid;
  place-items: center;

  border-radius: 12px;

  background: #ef3340;
  color: white;

  font-size: 25px;
  font-weight: 800;

  box-shadow:
    0 0 30px rgba(239, 51, 64, 0.25);
}

.brand h1 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.4px;
}

.brand span {
  display: block;
  margin-top: 3px;

  color: #8ea1bd;
  font-size: 11px;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;

  color: #aab8cc;
  font-size: 12px;
  font-weight: 700;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 12px #22c55e;
}

.status-dot.offline {
  background: #ef4444;
}

.container {
  width: min(1400px, 92%);
  margin: auto;
  padding: 40px 0 60px;
}

.hero {
  min-height: 300px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;

  padding: 50px;

  border: 1px solid rgba(96, 165, 250, 0.15);
  border-radius: 28px;

  background:
    linear-gradient(
      135deg,
      rgba(30, 64, 175, 0.24),
      rgba(15, 23, 42, 0.92)
    );

  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.22);
}

.eyebrow,
.section-label {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.6px;
}

.hero h2 {
  max-width: 750px;
  margin: 12px 0;

  font-size: clamp(38px, 6vw, 68px);
  line-height: 0.98;
  letter-spacing: -3px;
}

.hero h2 span {
  color: #60a5fa;
}

.hero p {
  max-width: 650px;

  color: #93a4bb;
  font-size: 17px;
  line-height: 1.7;
}

.primary-btn,
.secondary-btn,
.route-btn,
.filter {
  border: 0;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    background 0.2s;
}

.primary-btn {
  padding: 13px 19px;

  border-radius: 11px;

  background: #2563eb;
  color: white;

  font-size: 13px;
  font-weight: 800;

  box-shadow:
    0 12px 30px rgba(37, 99, 235, 0.28);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 16px 35px rgba(37, 99, 235, 0.4);
}

.primary-btn.large {
  width: 100%;
  padding: 16px;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-btn {
  padding: 10px 15px;

  border: 1px solid #30415e;
  border-radius: 10px;

  background: #111d31;
  color: #c7d4e7;

  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);

  gap: 16px;

  margin: 22px 0;
}

.stat {
  display: flex;
  align-items: center;
  gap: 15px;

  padding: 22px;

  border: 1px solid #22324b;
  border-radius: 18px;

  background: #0e1a2d;
}

.stat-icon {
  width: 44px;
  height: 44px;

  display: grid;
  place-items: center;

  border-radius: 12px;

  background: #152642;
  color: #60a5fa;
  font-size: 18px;
}

.stat strong {
  display: block;

  color: #f1f5f9;
  font-size: 25px;
}

.stat span {
  display: block;
  margin-top: 3px;

  color: #7f91ab;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.panel,
.result-panel {
  margin-top: 22px;

  padding: 28px;

  border: 1px solid #1f3049;
  border-radius: 22px;

  background: rgba(14, 26, 45, 0.88);

  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.14);
}

.section-heading,
.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;

  margin-bottom: 25px;
}

.section-heading h3,
.result-header h3 {
  margin: 5px 0;

  font-size: 24px;
  letter-spacing: -0.6px;
}

.section-heading p {
  margin: 0;

  color: #8193ad;
  font-size: 13px;
}

.ai-badge,
.critical-badge {
  padding: 8px 12px;

  border-radius: 999px;

  background: rgba(37, 99, 235, 0.15);
  color: #60a5fa;

  font-size: 10px;
  font-weight: 900;
}

.critical-badge {
  background: rgba(239, 68, 68, 0.13);
  color: #fb7185;
}

.assessment-grid {
  display: grid;
  grid-template-columns:
    repeat(2, 1fr);

  gap: 17px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field.full {
  grid-column: 1 / -1;
}

.field label {
  color: #aab9cc;
  font-size: 12px;
  font-weight: 700;
}

.field input,
.field textarea,
.search {
  width: 100%;

  padding: 13px 14px;

  border: 1px solid #2b3c57;
  border-radius: 10px;

  outline: none;

  background: #091526;
  color: #e8eefc;

  transition: border 0.2s;
}

.field input:focus,
.field textarea:focus,
.search:focus {
  border-color: #3b82f6;
}

.field textarea {
  resize: vertical;
}

.error-box {
  display: flex;
  align-items: center;
  gap: 12px;

  margin: 20px 0;
  padding: 15px;

  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;

  background: rgba(127, 29, 29, 0.25);
  color: #fca5a5;
}

.error-box span {
  flex: 1;
}

.error-box button {
  border: 0;
  background: transparent;
  color: white;
  font-size: 20px;
}

.result-panel {
  border-color: rgba(59, 130, 246, 0.25);

  background:
    linear-gradient(
      135deg,
      rgba(30, 64, 175, 0.18),
      #0e1a2d
    );
}

.result-grid {
  display: grid;
  grid-template-columns:
    repeat(4, 1fr);

  gap: 12px;
}

.result-card {
  min-height: 110px;

  padding: 18px;

  border: 1px solid #263a56;
  border-radius: 14px;

  background: rgba(5, 15, 28, 0.55);
}

.result-card span,
.data span,
.route-stat span {
  display: block;

  margin-bottom: 8px;

  color: #7589a5;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.result-card strong {
  color: #f8fafc;
  font-size: 17px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;

  margin-bottom: 20px;
}

.search {
  max-width: 350px;
}

.filters {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.filter {
  padding: 9px 13px;

  border: 1px solid #263852;
  border-radius: 9px;

  background: #0a1627;
  color: #8799b1;

  font-size: 11px;
  font-weight: 800;
}

.filter.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.hospital-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 16px;
}

.hospital-card {
  padding: 21px;

  border: 1px solid #263952;
  border-radius: 17px;

  background: #0a1627;

  transition:
    transform 0.2s,
    border 0.2s;
}

.hospital-card:hover,
.hospital-card.selected {
  transform: translateY(-2px);
  border-color: #3b82f6;
}

.hospital-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hospital-number {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 900;
}

.available {
  color: #22c55e;
  font-size: 9px;
  font-weight: 900;
}

.hospital-card h4 {
  margin: 18px 0;

  color: #eaf0fa;
  font-size: 17px;
}

.hospital-data {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 8px;

  margin-bottom: 15px;
}

.data {
  padding: 11px;

  border-radius: 9px;

  background: #101e32;
}

.data strong {
  color: #dce7f5;
  font-size: 12px;
}

.route-btn {
  width: 100%;

  padding: 12px;

  border: 1px solid #3168c9;
  border-radius: 9px;

  background: transparent;
  color: #60a5fa;

  font-size: 11px;
  font-weight: 900;
}

.route-btn:hover,
.selected-btn {
  background: #2563eb;
  color: white;
}

.route-summary {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);

  gap: 12px;

  margin-bottom: 15px;
}

.route-stat {
  padding: 16px;

  border-radius: 12px;

  background: #091526;
}

.route-stat strong {
  color: #f1f5f9;
}

.destination {
  padding: 9px 13px;

  border-radius: 9px;

  background: #0b1e34;
  color: #91a5c0;

  font-size: 11px;
}

.destination strong {
  color: #60a5fa;
}

.route-placeholder {
  padding: 35px;
  margin-bottom: 15px;

  text-align: center;

  border: 1px dashed #2b405e;
  border-radius: 14px;

  background: #091526;
}

.route-icon {
  font-size: 35px;
}

.route-placeholder h4 {
  margin: 10px 0 5px;
}

.route-placeholder p {
  margin: 0;
  color: #71849f;
  font-size: 12px;
}

.map {
  width: 100%;
  height: 500px;

  overflow: hidden;

  border-radius: 15px;
  border: 1px solid #2b405c;
}

.empty {
  padding: 45px;

  text-align: center;

  color: #7f91aa;
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 32px;
  }

  .stats-grid,
  .result-grid {
    grid-template-columns:
      repeat(2, 1fr);
  }

  .hospital-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .topbar {
    padding: 12px 4%;
  }

  .system-status {
    display: none;
  }

  .container {
    width: 94%;
    padding-top: 20px;
  }

  .hero {
    min-height: auto;
    padding: 25px;
  }

  .hero h2 {
    font-size: 40px;
  }

  .stats-grid,
  .result-grid,
  .assessment-grid,
  .route-summary {
    grid-template-columns: 1fr;
  }

  .field.full {
    grid-column: auto;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search {
    max-width: none;
  }

  .panel,
  .result-panel {
    padding: 20px;
  }

  .section-heading,
  .result-header {
    flex-direction: column;
  }

  .map {
    height: 400px;
  }
}

/* Ambulance tracking panel */
.tracking-panel {
  margin: 15px 0;
  padding: 20px;

  border: 1px solid #1f3049;
  border-radius: 14px;

  background: #0b1626;
}

.tracking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 12px;
}

.status-badge {
  padding: 6px 14px;

  border-radius: 999px;

  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.status-idle {
  background: rgba(100, 116, 139, 0.2);
  color: #94a3b8;
}

.status-en-route {
  background: rgba(37, 99, 235, 0.2);
  color: #60a5fa;
}

.status-paused {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.status-arrived {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.tracking-progress-text {
  color: #aab8cc;
  font-size: 13px;
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 10px;

  border-radius: 999px;
  background: #091526;
  overflow: hidden;

  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;

  border-radius: 999px;

  background: linear-gradient(
    90deg,
    #2563eb,
    #60a5fa
  );

  transition: width 0.1s linear;
}

.tracking-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.track-btn {
  padding: 10px 18px;

  border: 1px solid #2b3c57;
  border-radius: 9px;

  background: #0e1a2d;
  color: #c7d4e7;

  font-size: 12px;
  font-weight: 800;
}

.track-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.track-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.track-btn.start {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.track-btn.pause {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.track-btn.resume {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.track-btn.reset {
  background: transparent;
}

.ambulance-icon {
  font-size: 24px;
  text-align: center;
  line-height: 32px;
}
`;

export default App;