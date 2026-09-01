import React from 'react';
import { Activity, Radio } from 'lucide-react';

export default function Header({ wsStatus }) {
  return (
    <header className="bg-brand-dark text-white sticky top-0 z-50 shadow-lg border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Emergency Route AI</h1>
            <p className="text-xs text-slate-400 font-medium">Emergency Operations Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${wsStatus === 'LIVE' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
             <Radio className={`w-4 h-4 ${wsStatus === 'LIVE' ? 'animate-pulse' : ''}`} />
             <span className="text-xs font-bold">{wsStatus}</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
            DEMO MODE
          </div>
        </div>
      </div>
    </header>
  );
}
