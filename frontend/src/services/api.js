const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
    getHealth: () => fetch(`${API_BASE}/health`).then(res => res.json()),
    
    predictEmergency: (data) => fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json()),

    getEmergencies: () => fetch(`${API_BASE}/emergencies`).then(res => res.json()),
    
    getHospitals: () => fetch(`${API_BASE}/hospitals`).then(res => res.json()),
    
    getNearestHospital: () => fetch(`${API_BASE}/nearest-hospital`).then(res => res.json()),
    
    getRecommendedHospital: () => fetch(`${API_BASE}/recommend-hospital`).then(res => res.json()),
    
    calculateRoute: (hospitalId) => fetch(`${API_BASE}/route?hospital_id=${hospitalId}`).then(res => res.json()),
    
    getStats: () => fetch(`${API_BASE}/stats`).then(res => res.json())
};
