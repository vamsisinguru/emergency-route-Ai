import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Activity, Bed, Building } from 'lucide-react';

export default function DashboardStats({ stats }) {
  if (!stats) return <div className="animate-pulse bg-slate-200 h-24 rounded-xl"></div>;

  const statCards = [
    { label: 'Total Emergencies', value: stats.total_emergencies, icon: Activity, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
    { label: 'Critical Cases', value: stats.critical_cases, icon: AlertCircle, color: 'text-brand-red', bg: 'bg-brand-red/10' },
    { label: 'High Risk Cases', value: stats.high_risk_cases, icon: AlertTriangle, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
    { label: 'Normal Cases', value: stats.normal_cases, icon: CheckCircle, color: 'text-brand-green', bg: 'bg-brand-green/10' },
    { label: 'Emergency Hospitals', value: stats.emergency_hospitals, icon: Building, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Available Beds', value: stats.available_beds, icon: Bed, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, idx) => (
        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{stat.label}</p>
          <p className={`text-2xl font-black ${idx === 1 ? 'text-brand-red' : idx === 2 ? 'text-brand-amber' : 'text-slate-800'}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
