import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { wsService } from '../services/websocket';

export default function HospitalMap({ ambulanceLocation, hospitals, route, selectedHospital }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(ambulanceLocation);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const ambMarkerRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([ambulanceLocation.latitude, ambulanceLocation.longitude], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (ambMarkerRef.current) {
        ambMarkerRef.current.remove();
        ambMarkerRef.current = null;
    }

    const ambIcon = L.divIcon({
        className: 'bg-brand-red text-white font-bold text-xs rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white',
        html: '🚑',
        iconSize: [32, 32]
    });
    ambMarkerRef.current = L.marker([currentLocation.latitude, currentLocation.longitude], { icon: ambIcon, zIndexOffset: 1000 }).addTo(map)
      .bindPopup("<b>Ambulance (Demo)</b>");

    hospitals.forEach(h => {
        const isSelected = selectedHospital && selectedHospital.id === h.id;
        const hospIcon = L.divIcon({
            className: `${isSelected ? 'bg-brand-blue border-brand-amber border-4 w-10 h-10' : 'bg-slate-800 border-white border-2 w-8 h-8'} text-white font-bold text-xs rounded-full flex items-center justify-center shadow-lg`,
            html: '🏥',
            iconSize: isSelected ? [40, 40] : [32, 32]
        });
        const marker = L.marker([h.latitude, h.longitude], { icon: hospIcon }).addTo(map)
          .bindPopup(`<b>${h.name || h.hospital_name}</b><br/>Beds: ${h.available_beds}`);
        markersRef.current.push(marker);
    });

  }, [currentLocation, hospitals, selectedHospital]);

  // Update Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !route) return;

    if (routeLayerRef.current) {
        routeLayerRef.current.remove();
    }

    const latlngs = route.coordinates.map(c => [c[0], c[1]]);
    routeLayerRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 6, opacity: 0.8 }).addTo(map);

    if (!isLiveTracking) {
        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
        setTimeLeft(route.estimated_time_minutes);
    }
  }, [route, isLiveTracking]);

  // Live Tracking Logic
  const startLiveTracking = () => {
    if (!route || !route.coordinates || route.coordinates.length === 0) return;
    
    setIsLiveTracking(true);
    let step = 0;
    const totalSteps = route.coordinates.length;
    const totalTime = route.estimated_time_minutes;
    
    if (animationRef.current) clearInterval(animationRef.current);
    
    animationRef.current = setInterval(() => {
        step += 1;
        if (step >= totalSteps) {
            clearInterval(animationRef.current);
            setIsLiveTracking(false);
            setProgress(100);
            setTimeLeft(0);
            return;
        }
        
        const [lat, lon] = route.coordinates[step];
        setCurrentLocation({ latitude: lat, longitude: lon });
        
        const currentProgress = Math.round((step / totalSteps) * 100);
        setProgress(currentProgress);
        setTimeLeft(Math.max(1, Math.round(totalTime * (1 - (step / totalSteps)))));
        
        // Broadcast over websocket for realism
        wsService.sendMessage(JSON.stringify({
            type: 'ambulance_update',
            data: { latitude: lat, longitude: lon, progress: currentProgress }
        }));
        
        if (mapInstanceRef.current && step % 5 === 0) {
             mapInstanceRef.current.panTo([lat, lon]);
        }
    }, 500); // move every 500ms
  };
  
  useEffect(() => {
      return () => {
          if (animationRef.current) clearInterval(animationRef.current);
      }
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full relative">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center z-10">
        <h2 className="text-lg font-bold text-slate-800">Live Route Map</h2>
        {route && !isLiveTracking && progress < 100 && (
            <button 
                onClick={startLiveTracking}
                className="bg-brand-red text-white px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors animate-pulse"
            >
                START LIVE TRACKING (DEMO)
            </button>
        )}
      </div>
      
      {isLiveTracking && (
          <div className="absolute top-16 left-4 right-4 z-[400] bg-white/90 backdrop-blur border border-slate-200 rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800 text-sm">AMBULANCE EN ROUTE (SIMULATED)</span>
                  <span className="font-bold text-brand-blue text-sm">ETA: {timeLeft} min</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div className="bg-brand-blue h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium text-right">{progress}% completed</div>
          </div>
      )}
      
      <div ref={mapRef} className="flex-1 w-full min-h-[400px] z-0"></div>
    </div>
  );
}
