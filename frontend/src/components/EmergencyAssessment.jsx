import React, { useState } from 'react';
import { api } from '../services/api';
import { ShieldAlert, Info } from 'lucide-react';

export default function EmergencyAssessment({ onComplete }) {
  const [formData, setFormData] = useState({
    patient_name: '',
    age: '',
    heart_rate: '',
    oxygen_level: '',
    symptoms: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const err = {};
    if (!formData.patient_name) err.patient_name = "Required";
    if (!formData.age || formData.age < 1 || formData.age > 120) err.age = "Invalid age";
    if (!formData.heart_rate || formData.heart_rate < 30 || formData.heart_rate > 220) err.heart_rate = "Invalid rate";
    if (!formData.oxygen_level || formData.oxygen_level < 0 || formData.oxygen_level > 100) err.oxygen_level = "Invalid SpO2";
    if (!formData.symptoms) err.symptoms = "Required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await api.predictEmergency({
        ...formData,
        age: parseInt(formData.age),
        heart_rate: parseInt(formData.heart_rate),
        oxygen_level: parseInt(formData.oxygen_level)
      });
      setResult(data);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to connect to AI assessment service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">New Emergency Assessment</h2>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Patient Name</label>
            <input type="text" className={`w-full border ${errors.patient_name ? 'border-brand-red bg-red-50' : 'border-slate-300'} rounded-lg p-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all`} value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Age</label>
              <input type="number" className={`w-full border ${errors.age ? 'border-brand-red bg-red-50' : 'border-slate-300'} rounded-lg p-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all`} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Heart Rate (BPM)</label>
              <input type="number" className={`w-full border ${errors.heart_rate ? 'border-brand-red bg-red-50' : 'border-slate-300'} rounded-lg p-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all`} value={formData.heart_rate} onChange={e => setFormData({...formData, heart_rate: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">SpO2 (%)</label>
              <input type="number" className={`w-full border ${errors.oxygen_level ? 'border-brand-red bg-red-50' : 'border-slate-300'} rounded-lg p-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all`} value={formData.oxygen_level} onChange={e => setFormData({...formData, oxygen_level: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Symptoms</label>
            <textarea rows="3" className={`w-full border ${errors.symptoms ? 'border-brand-red bg-red-50' : 'border-slate-300'} rounded-lg p-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all`} value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-brand-red to-red-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'ANALYZING EMERGENCY...' : 'ASSESS EMERGENCY'}
          </button>
        </form>

        {result && (
          <div className="mt-8 border-t border-slate-200 pt-6">
             <div className="flex items-center gap-2 mb-4">
                 <ShieldAlert className="text-brand-blue w-5 h-5" />
                 <h3 className="font-bold text-slate-800">AI EMERGENCY ASSESSMENT</h3>
             </div>
             
             <div className={`p-6 rounded-xl border-2 text-center mb-6 ${result.priority === 'CRITICAL' ? 'bg-red-50 border-brand-red' : result.priority === 'URGENT' ? 'bg-amber-50 border-brand-amber' : 'bg-green-50 border-brand-green'}`}>
                <h2 className={`text-3xl font-black mb-2 ${result.priority === 'CRITICAL' ? 'text-brand-red' : result.priority === 'URGENT' ? 'text-brand-amber' : 'text-brand-green'}`}>
                  {result.priority}
                </h2>
                <p className={`font-semibold ${result.priority === 'CRITICAL' ? 'text-red-700' : result.priority === 'URGENT' ? 'text-amber-700' : 'text-green-700'}`}>
                   {result.estimated_risk} RISK
                </p>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Emergency Score</span>
                   <strong className="text-lg text-slate-800">{result.emergency_score} / 10</strong>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                   <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Factors</span>
                   <ul className="text-sm text-slate-700 list-disc list-inside">
                     {result.risk_factors.map((f, i) => <li key={i}>{f}</li>)}
                   </ul>
                </div>
             </div>
             
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <span className="block text-xs font-bold text-amber-700 uppercase mb-1">Recommended Action</span>
                <strong className="text-amber-900">{result.recommended_action}</strong>
             </div>

             <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4" />
                <p>AI-ASSISTED DECISION SUPPORT. This is NOT a medical diagnosis.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
