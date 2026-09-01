import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function HospitalMap({ ambulanceLocation, hospitals, route, selectedHospital }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([ambulanceLocation.latitude, ambulanceLocation.longitude], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
  }, [ambulanceLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add Ambulance
    const ambIcon = L.divIcon({
        className: 'bg-brand-red text-white font-bold text-xs rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white',
        html: '🚑',
        iconSize: [32, 32]
    });
    const ambMarker = L.marker([ambulanceLocation.latitude, ambulanceLocation.longitude], { icon: ambIcon }).addTo(map)
      .bindPopup("<b>Ambulance (Demo)</b>");
    markersRef.current.push(ambMarker);

    // Add Hospitals
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

  }, [ambulanceLocation, hospitals, selectedHospital]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !route) return;

    if (routeLayerRef.current) {
        routeLayerRef.current.remove();
    }

    const latlngs = route.coordinates.map(c => [c[0], c[1]]);
    routeLayerRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 6, opacity: 0.8 }).addTo(map);

    map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });

  }, [route]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h2 className="text-lg font-bold text-slate-800">Live Route Map</h2>
      </div>
      <div ref={mapRef} className="flex-1 w-full min-h-[400px] z-0"></div>
    </div>
  );
}
