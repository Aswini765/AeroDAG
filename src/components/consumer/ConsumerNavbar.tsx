import React, { useState } from 'react';
import {
  Plane,
  Building,
  Train,
  Bus,
  Car,
  Sparkles,
  MapPin,
  Luggage,
  Compass,
  Palmtree,
  User,
  ShieldCheck,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { Currency } from '../../types/travelBooking';

export type NavTabType =
  | 'home'
  | 'planner'
  | 'flights'
  | 'hotels'
  | 'trains'
  | 'buses'
  | 'cabs'
  | 'activities'
  | 'holidays'
  | 'trip'
  | 'mytrips'
  | 'profile';

interface ConsumerNavbarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  onOpenObservability: () => void;
  hasConfirmedTrip: boolean;
}

export const ConsumerNavbar: React.FC<ConsumerNavbarProps> = ({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  onOpenObservability,
  hasConfirmedTrip
}) => {
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const currenciesList: Array<{ code: Currency; label: string; symbol: string }> = [
    { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'EUR', label: 'Euro', symbol: '€' },
    { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
    { code: 'AED', label: 'UAE Dirham', symbol: 'AED' },
    { code: 'JPY', label: 'Japanese Yen', symbol: '¥' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 via-teal-400 to-emerald-400 p-0.5 shadow-md shadow-teal-500/20 group-hover:scale-105 transition">
                <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Plane className="h-4.5 w-4.5 text-teal-400 transform -rotate-45" />
                </div>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                  Aero<span className="text-teal-400">DAG</span>
                </span>
                <span className="hidden sm:block text-[9px] text-slate-400 tracking-wider font-medium uppercase">
                  India &bull; International Travel
                </span>
              </div>
            </button>

            {/* Main Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1 font-medium text-xs">
              <button
                onClick={() => setActiveTab('planner')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 border cursor-pointer ${
                  activeTab === 'planner'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-500/10 font-bold'
                    : 'bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border-teal-500/30'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                <span>AI Trip Planner</span>
              </button>

              <button
                onClick={() => setActiveTab('flights')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'flights'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Plane className="h-3.5 w-3.5 text-sky-400" />
                <span>Flights</span>
              </button>

              <button
                onClick={() => setActiveTab('hotels')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'hotels'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Building className="h-3.5 w-3.5 text-emerald-400" />
                <span>Hotels</span>
              </button>

              <button
                onClick={() => setActiveTab('trains')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'trains'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Train className="h-3.5 w-3.5 text-amber-400" />
                <span>Trains</span>
              </button>

              <button
                onClick={() => setActiveTab('buses')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'buses'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Bus className="h-3.5 w-3.5 text-rose-400" />
                <span>Buses</span>
              </button>

              <button
                onClick={() => setActiveTab('cabs')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'cabs'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Car className="h-3.5 w-3.5 text-yellow-400" />
                <span>Cabs</span>
              </button>

              <button
                onClick={() => setActiveTab('activities')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'activities'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-indigo-400" />
                <span>Activities</span>
              </button>

              <button
                onClick={() => setActiveTab('holidays')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'holidays'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Palmtree className="h-3.5 w-3.5 text-emerald-400" />
                <span>Holidays</span>
              </button>

              <button
                onClick={() => setActiveTab('trip')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'trip'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-purple-400" />
                <span>Workspace</span>
              </button>

              <button
                onClick={() => setActiveTab('mytrips')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 relative cursor-pointer ${
                  activeTab === 'mytrips'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Luggage className="h-3.5 w-3.5 text-amber-400" />
                <span>My Trips</span>
                {hasConfirmedTrip && (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 absolute top-2 right-1.5"></span>
                )}
              </button>
            </nav>
          </div>

          {/* Right Controls: Currency Switcher & Profile & Observability */}
          <div className="flex items-center gap-3">
            {/* Currency Dropdown Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-teal-300 transition cursor-pointer"
              >
                <span>
                  {currenciesList.find((c) => c.code === currency)?.symbol} {currency}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showCurrencyDropdown && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50">
                  {currenciesList.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                        currency === c.code ? 'text-teal-300 font-bold bg-slate-800/60' : 'text-slate-300'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-slate-400">{c.symbol} {c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Tab */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-850'
              }`}
              title="User Profile & Preferences"
            >
              <User className="h-4 w-4" />
            </button>

            {/* Discrete Developer / Portfolio Observability Link */}
            <button
              onClick={onOpenObservability}
              title="View Under-the-Hood Micro-Agent Architecture & Telemetry"
              className="text-xs text-slate-400 hover:text-teal-300 px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center gap-1.5 transition font-mono cursor-pointer"
            >
              <Cpu className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden 2xl:inline text-[11px]">System Architecture</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

