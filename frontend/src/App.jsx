import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { wsService } from './services/websocket';
import Header from './components/Header';
import DashboardStats from './components/DashboardStats';
import EmergencyAssessment from './components/EmergencyAssessment';
import HospitalMap from './components/HospitalMap';
import HospitalComparison from './components/HospitalComparison';
import EmergencyHistory from './components/EmergencyHistory';
import Analytics from './components/Analytics';

function App() {
  const [stats, setStats] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [rankedHospitals, setRankedHospitals] = useState([]);
  const [recommendedHospital, setRecommendedHospital] = useState(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState({ latitude: 17.3850, longitude: 78.4867 });
  const [route, setRoute] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [wsStatus, setWsStatus] = useState('CONNECTING');

  useEffect(() => {
    loadAllData();

    wsService.connect();
    
    const unsubStatus = wsService.subscribe('connection_status', (data) => setWsStatus(data.status));
    const unsubEmergency = wsService.subscribe('emergency_created', () => {
      loadEmergencies();
      loadStats();
    });
    
    return () => {
      unsubStatus();
      unsubEmergency();
    };
  }, []);

  const loadAllData = async () => {
    await Promise.all([loadStats(), loadEmergencies(), loadHospitals()]);
  };

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadEmergencies = async () => {
    try {
      const data = await api.getEmergencies();
      setEmergencies(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHospitals = async () => {
    try {
      const data = await api.getRecommendedHospital();
      if (data.status === 'SUCCESS') {
        setHospitals(data.ranked_hospitals || []);
        setRankedHospitals(data.ranked_hospitals || []);
        setRecommendedHospital(data.recommended_hospital);
        if (data.ambulance) {
            setAmbulanceLocation(data.ambulance);
        }
      } else {
        const fallback = await api.getHospitals();
        setHospitals(fallback.hospitals || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssessmentComplete = async () => {
    await loadAllData();
  };

  const handleSelectHospital = async (hospitalId) => {
    try {
      const routeData = await api.calculateRoute(hospitalId);
      if (routeData.status === 'SUCCESS') {
        setSelectedHospital(routeData.hospital);
        setRoute(routeData.route);
        // Start Demo Tracking automatically or manually later
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header wsStatus={wsStatus} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Dashboard Stats */}
        <DashboardStats stats={stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EmergencyAssessment onComplete={handleAssessmentComplete} />
          
          <div className="space-y-8">
             <HospitalMap 
                ambulanceLocation={ambulanceLocation} 
                hospitals={hospitals} 
                route={route} 
                selectedHospital={selectedHospital} 
             />
             <Analytics stats={stats} />
          </div>
        </div>

        <HospitalComparison 
            hospitals={rankedHospitals} 
            recommended={recommendedHospital} 
            onSelect={handleSelectHospital} 
            selectedHospital={selectedHospital}
        />
        
        <EmergencyHistory emergencies={emergencies} />

      </main>
    </div>
  );
}

export default App;
