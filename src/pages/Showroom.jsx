import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Battery, Award, MapPin, Phone, MessageCircle, Mail } from 'lucide-react';
import { MD_CONFIG } from '../utils/apiConfig';
import { openWhatsApp } from '../utils/smartUtils';

export default function Showroom() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950 to-slate-900" style={{ paddingBottom: 100 }}>
      {/* Hero */}
      <div className="px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl gradient-green mb-6 pulse-green">
          <Zap size={48} className="text-white" />
        </div>
        <h1 className="text-5xl font-bold text-green-400 mb-3">{MD_CONFIG.brandName}</h1>
        <p className="text-xl text-slate-300 mb-2">{MD_CONFIG.tagline}</p>
        <p className="text-sm text-slate-400">🌱 Zero Emission • ⚡ Future of Mobility</p>

        <div className="flex gap-3 justify-center mt-8">
          <button onClick={() => openWhatsApp(MD_CONFIG.phone, 'Hi! Mujhe MD Automobile ke baare mein janna hai')} className="btn btn-primary flex items-center gap-2">
            <MessageCircle size={18} /> WhatsApp Us
          </button>
          <a href={`tel:${MD_CONFIG.phone}`} className="btn btn-secondary flex items-center gap-2">
            <Phone size={18} /> Call Now
          </a>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 py-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-green-400 mb-8">Why MD Automobile?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Feature icon={Battery} title="1-Year Warranty" desc="Battery, Motor, Controller — सब 1 साल warranty में cover। Reliable after-sales service।" />
          <Feature icon={Zap} title="Up to 80 km Range" desc="Long-range performance for daily commute. Charge once, ride all week." />
          <Feature icon={Award} title="₹15,000 Govt Subsidy" desc="FAME-II + State subsidies. Save big on your purchase." />
        </div>
      </div>

      {/* Models showcase placeholder */}
      <div className="px-4 py-12 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-green-400 mb-8">Our Lineup</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {['MD Automobile Sprint', 'MD Automobile Eco', 'MD Automobile Pro'].map(model => (
              <div key={model} className="card text-center">
                <div className="w-full h-32 bg-slate-800 rounded mb-3 flex items-center justify-center">
                  <Zap size={48} className="text-green-400" />
                </div>
                <div className="font-bold text-lg">{model}</div>
                <div className="text-xs text-slate-400 mt-1">Starting from ₹85,000*</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">*After government subsidies</p>
        </div>
      </div>

      {/* Contact */}
      <div className="px-4 py-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-green-400 mb-8">Visit Us</h2>
        <div className="card text-center space-y-3">
          <div className="flex items-center justify-center gap-2"><MapPin size={18} /> {MD_CONFIG.address}</div>
          <div className="flex items-center justify-center gap-2"><Phone size={18} /> {MD_CONFIG.phone}</div>
          <div className="flex items-center justify-center gap-2"><Mail size={18} /> {MD_CONFIG.email}</div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-500 py-8">
        © 2026 {MD_CONFIG.brandName} • <Link to="/login" className="text-green-400 hover:underline">Staff Login</Link>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="card card-hover">
      <Icon size={32} className="text-green-400 mb-3" />
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  );
}
