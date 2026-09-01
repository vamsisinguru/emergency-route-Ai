import React from 'react';

export default function EmergencyHistory({ emergencies }) {
  if (!emergencies || emergencies.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h2 className="text-lg font-bold text-slate-800">Emergency History</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Age</th>
              <th className="px-6 py-4">Heart Rate</th>
              <th className="px-6 py-4">SpO2</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Risk</th>
              <th className="px-6 py-4">Symptoms</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emergencies.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-400">#{e.id}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{e.patient_name}</td>
                <td className="px-6 py-4">{e.age}</td>
                <td className="px-6 py-4 font-medium">{e.heart_rate} BPM</td>
                <td className="px-6 py-4 font-medium">{e.oxygen_level}%</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : e.priority === 'URGENT' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {e.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${e.estimated_risk === 'HIGH' ? 'bg-red-100 text-red-700' : e.estimated_risk === 'MODERATE' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {e.estimated_risk}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-xs truncate" title={e.symptoms}>{e.symptoms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
