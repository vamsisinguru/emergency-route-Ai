import React from 'react';

export default function Analytics({ stats }) {
  if (!stats) return null;

  const total = stats.total_emergencies || 1; // avoid div by 0
  const critPct = Math.round((stats.critical_cases / total) * 100);
  const highPct = Math.round((stats.high_risk_cases / total) * 100);
  const normPct = Math.round((stats.normal_cases / total) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h2 className="text-lg font-bold text-slate-800">Analytics</h2>
      </div>
      <div className="p-6 space-y-6">
        <div>
           <div className="flex justify-between text-sm font-semibold mb-2">
             <span className="text-brand-red">Critical ({critPct}%)</span>
           </div>
           <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="bg-brand-red h-full rounded-full transition-all" style={{width: `${critPct}%`}}></div>
           </div>
        </div>
        <div>
           <div className="flex justify-between text-sm font-semibold mb-2">
             <span className="text-brand-amber">High Risk ({highPct}%)</span>
           </div>
           <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="bg-brand-amber h-full rounded-full transition-all" style={{width: `${highPct}%`}}></div>
           </div>
        </div>
        <div>
           <div className="flex justify-between text-sm font-semibold mb-2">
             <span className="text-brand-green">Normal ({normPct}%)</span>
           </div>
           <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="bg-brand-green h-full rounded-full transition-all" style={{width: `${normPct}%`}}></div>
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
           <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Avg Heart Rate</p>
              <p className="text-xl font-black text-slate-800">{stats.avg_heart_rate} BPM</p>
           </div>
           <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Avg SpO2</p>
              <p className="text-xl font-black text-slate-800">{stats.avg_spo2}%</p>
           </div>
        </div>
      </div>
    </div>
  );
}
