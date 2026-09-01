import React from 'react';
import { Trophy, Navigation } from 'lucide-react';

export default function HospitalComparison({ hospitals, recommended, onSelect, selectedHospital }) {
  if (!hospitals || hospitals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h2 className="text-lg font-bold text-slate-800">Hospital Comparison</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Hospital</th>
              <th className="px-6 py-4">Distance</th>
              <th className="px-6 py-4">Beds</th>
              <th className="px-6 py-4">Emergency</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hospitals.map((h, idx) => {
              const isRecommended = recommended && recommended.id === h.id;
              const isSelected = selectedHospital && selectedHospital.id === h.id;
              return (
                <tr key={h.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-6 py-4 font-bold text-slate-800">#{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{h.name || h.hospital_name}</div>
                    {isRecommended && (
                      <div className="flex items-center gap-1 text-brand-amber text-xs font-bold mt-1">
                        <Trophy className="w-3 h-3" /> 🏆 RECOMMENDED
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-semibold">{h.distance_km} km</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${h.available_beds > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {h.available_beds}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {h.emergency_available ? (
                      <span className="text-brand-green font-bold text-xs uppercase tracking-wider bg-green-50 px-2 py-1 rounded">Available</span>
                    ) : (
                      <span className="text-brand-red font-bold text-xs uppercase tracking-wider bg-red-50 px-2 py-1 rounded">Unavailable</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-brand-blue">{h.recommendation_score || '-'} / 100</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onSelect(h.id)} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${isSelected ? 'bg-brand-blue text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      <Navigation className="w-4 h-4" />
                      {isSelected ? 'SELECTED' : 'ROUTE'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
