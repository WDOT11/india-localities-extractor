import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader2, MapPin } from 'lucide-react';
import type { Locality, District, ExtractJob } from './types';
import Papa from 'papaparse';

interface DashboardStats {
  total: number;
  attractions: number;
  hospitality: number;
  pincodes: number;
}

export default function App() {
  const [selectedCity, setSelectedCity] = useState("Pilani");
  const [selectedState, setSelectedState] = useState("Rajasthan");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ExtractJob | null>(null);
  
  const [districtData, setDistrictData] = useState<District | null>(null);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [filteredLocalities, setFilteredLocalities] = useState<Locality[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");

  const pollInterval = useRef<number | NodeJS.Timeout | null>(null);

  // Check if Google Maps API key is configured
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY;
  const hasValidKey = Boolean(apiKey) && apiKey !== 'YOUR_API_KEY';

  const stats: DashboardStats = {
    total: localities.length,
    attractions: localities.filter(l => l.locality_type?.toLowerCase().includes('historical') || l.locality_type?.toLowerCase().includes('tourist') || l.locality_type?.toLowerCase().includes('temple')).length,
    hospitality: localities.filter(l => l.locality_type?.toLowerCase().includes('hotel') || l.locality_type?.toLowerCase().includes('restaurant') || l.locality_type?.toLowerCase().includes('cafe')).length,
    pincodes: new Set(localities.filter(l => l.pincode).map(l => l.pincode)).size,
  };

  const types = ["All", ...new Set(localities.map(l => l.locality_type).filter(Boolean))];

  useEffect(() => {
    let result = localities;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(l => 
        l.locality_name?.toLowerCase().includes(lower) || 
        l.pincode?.includes(lower)
      );
    }
    if (filterType !== "All") {
      result = result.filter(l => l.locality_type === filterType);
    }
    setFilteredLocalities(result);
  }, [searchTerm, filterType, localities]);

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 font-sans p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <MapPin className="text-red-500 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-slate-900">Google Maps API Key Required</h2>
          <p className="text-sm text-slate-600 mb-6 text-left">We have upgraded to the real Google Maps API to fetch accurate localities! Please add your API key to continue.</p>
          <div className="text-left text-sm text-slate-700 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Get an API Key</a></p>
            <p><strong>Step 2:</strong> Add your key as a secret:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600">
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right context menu)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
              <li>Paste your API key & press <strong>Enter</strong></li>
            </ul>
          </div>
          <p className="text-xs text-slate-500 mt-6 italic">The app will automatically rebuild once the secret is applied.</p>
        </div>
      </div>
    );
  }

  const generateData = async () => {
    if (!selectedCity) return;

    setLocalities([]);
    setDistrictData(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const res = await axios.post('/api/extract', {
        stateName: selectedState || 'India',
        stateCode: 'NA',
        districtName: selectedCity,
        districtCode: 'NA',
      });

      setJobId(res.data.jobId);
      startPolling(res.data.jobId, false, res.data.districtId);
    } catch (err) {
      console.error(err);
      alert("Failed to start data generation.");
    }
  };

  const generateAllLocalitiesOneClick = async () => {
    if (!selectedCity) return;

    setLocalities([]);
    setDistrictData(null);
    
    try {
      const res = await axios.post('/api/extract', {
        stateName: selectedState || 'India',
        stateCode: 'NA',
        districtName: selectedCity,
        districtCode: 'NA',
      });

      setJobId(res.data.jobId);
      startPolling(res.data.jobId, true, res.data.districtId); // True to auto-download later
    } catch (err) {
      console.error(err);
      alert("Failed to start one-click generation.");
    }
  };

  const startPolling = (jobId: string, autoDownload: boolean, districtId: number) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    // Initial fetch to clear out any state and show immediate feedback
    if (districtId) {
      fetchData(districtId, false);
    }
    
    let lastProgress = -1;

    pollInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/status/${jobId}`);
        setJobStatus(res.data);
        
        if (districtId && res.data.progress > lastProgress && res.data.progress < 100) {
            lastProgress = res.data.progress;
            fetchData(districtId, false);
        }

        if (res.data.progress === 100) {
          clearInterval(pollInterval.current as NodeJS.Timeout);
          fetchData(res.data.districtId || districtId, autoDownload);
        } else if (res.data.progress === 0 && res.data.status.startsWith("Failed")) {
          clearInterval(pollInterval.current as NodeJS.Timeout);
        }
      } catch (err: any) {
        console.error(err);
        if (err.response?.status === 404) {
          clearInterval(pollInterval.current as NodeJS.Timeout);
          setJobStatus({ status: 'Failed: Job not found (Server might have restarted)', progress: 0 });
        }
      }
    }, 2000);
  };

  const fetchData = async (districtId: number, autoDownload: boolean) => {
    try {
      const res = await axios.get(`/api/data/${districtId}`);
      setDistrictData(res.data.district);
      setLocalities(res.data.localities);

      if (autoDownload) {
        exportCSV(res.data.district, res.data.localities);
        exportJSON(res.data.district, res.data.localities);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load results.");
    }
  };

  const exportCSV = (dData = districtData, lData = localities) => {
    if (!dData) return;
    
    const csvData = lData.map(l => ({
      "State Code": dData.state_code,
      "State Name": dData.state_name,
      "District Code": dData.district_code,
      "District Name": dData.district_name,
      "Pincode": l.pincode || '',
      "Locality Name": l.locality_name,
      "Locality Type": l.locality_type || '',
      "Latitude": l.latitude || '',
      "Longitude": l.longitude || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${dData.district_name.toLowerCase()}_localities.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (dData = districtData, lData = localities) => {
    if (!dData) return;
    
    const jsonOutput = {
      state_code: dData.state_code,
      state_name: dData.state_name,
      district_code: dData.district_code,
      district_name: dData.district_name,
      localities: lData.map(l => ({
        pincode: l.pincode || '',
        locality_name: l.locality_name,
        type: l.locality_type || '',
        latitude: l.latitude,
        longitude: l.longitude
      }))
    };

    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${dData.district_name.toLowerCase()}_localities.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <nav className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            IndiLocate <span className="text-indigo-600">Data</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">V1.2.0 Stable</div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 overflow-hidden">
             <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=f8fafc`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <section className="grid grid-cols-12 gap-4 shrink-0">
          <div className="col-span-12 md:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-end gap-6">
            <div className="flex-1 w-full grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">City Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Pilani"
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">State (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Rajasthan"
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={generateData}
                disabled={!selectedCity || (jobStatus?.progress !== undefined && jobStatus.progress < 100)}
                className="h-11 px-8 bg-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-1 sm:flex-none"
              >
                Generate Data
              </button>
              <button 
                onClick={generateAllLocalitiesOneClick}
                disabled={!selectedCity || (jobStatus?.progress !== undefined && jobStatus.progress < 100)}
                className="h-11 px-5 bg-amber-500 text-white rounded-lg font-semibold text-sm shadow-md shadow-amber-100 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 flex-1 sm:flex-none"
                title="1-Click Fetch & Download"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span className="hidden sm:inline">1-Click Fast DL</span>
              </button>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center min-h-[96px]">
            {jobStatus ? (
              <>
                <div className="flex justify-between items-start mb-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processing Queue</label>
                  <span className="text-[10px] font-bold text-indigo-600">{jobStatus.progress}% COMPLETE</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${jobStatus.progress}%` }}></div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500 font-medium italic truncate flex items-center gap-1.5">
                   {jobStatus.progress < 100 && <Loader2 className="w-3 h-3 animate-spin text-indigo-500"/>} 
                   {jobStatus.status}
                </p>
              </>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-slate-400">
                 <span className="text-[11px] font-medium tracking-wider uppercase">No Active Tasks</span>
              </div>
            )}
          </div>
        </section>

        {districtData || localities.length > 0 ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 shrink-0">
              <StatCard title="Total Places" value={stats.total} subtext="Total Records" />
              <StatCard title="Attractions" value={stats.attractions} subtext="Historical/Tourist" />
              <StatCard title="Hospitality" value={stats.hospitality} subtext="Hotels/Cafes" />
              <StatCard title="Pincodes" value={stats.pincodes} subtext="Registered Zones" />
              <StatCard title="Sources" value={new Set(localities.map(l => l.source)).size} subtext="Geo-API Verified" />
            </section>

            <section className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search localities..." 
                      className="h-9 w-48 sm:w-64 pl-9 pr-4 text-xs bg-white border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-3 top-2.5 opacity-30">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                  </div>
                  <select 
                    className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md outline-none cursor-pointer"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                  >
                     {types.map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportCSV()} className="flex items-center gap-2 h-9 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> 
                    Export CSV
                  </button>
                  <button onClick={() => exportJSON()} className="flex items-center gap-2 h-9 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> 
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 bg-slate-50 whitespace-nowrap">Locality Name</th>
                      <th className="px-4 py-4 bg-slate-50 whitespace-nowrap">Type</th>
                      <th className="px-4 py-4 bg-slate-50 whitespace-nowrap">Pincode</th>
                      <th className="px-4 py-4 bg-slate-50 whitespace-nowrap">Coordinates</th>
                      <th className="px-4 py-4 bg-slate-50 whitespace-nowrap">Source</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {filteredLocalities.map((loc, i) => {
                      let pillStyle = "bg-slate-100 text-slate-600";
                      const t = loc.locality_type?.toLowerCase() || '';
                      if(t.includes('hotel') || t.includes('cafe') || t.includes('restaurant')) pillStyle = "bg-rose-50 text-rose-700";
                      else if(t.includes('historical') || t.includes('tourist')) pillStyle = "bg-amber-50 text-amber-700";
                      else if(t.includes('temple')) pillStyle = "bg-indigo-50 text-indigo-700";
                      else pillStyle = "bg-emerald-50 text-emerald-700";

                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-semibold text-slate-700">{loc.locality_name}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${pillStyle}`}>
                              {loc.locality_type || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-500 whitespace-nowrap">{loc.pincode || '-'}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {loc.latitude ? `${loc.latitude.toFixed(4)}, ${loc.longitude?.toFixed(4)}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">{loc.source}</td>
                        </tr>
                      );
                    })}
                    {filteredLocalities.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No localities found matching the search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[11px] text-slate-500 font-medium italic shrink-0">
                <span>Showing {filteredLocalities.length} {filteredLocalities.length === 1 ? 'record' : 'records'}</span>
                {districtData && <span>City: {districtData.district_name}, {districtData.state_name}</span>}
              </div>
            </section>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="text-center text-slate-400">
               <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-3" />
               <p className="font-medium text-sm">Enter a city and generate data to view places</p>
            </div>
          </div>
        )}
      </main>

      <footer className="h-12 bg-slate-800 text-slate-400 flex items-center justify-between px-8 text-xs shrink-0">
        <div className="flex gap-6">
          <span>API Status: <span className="text-emerald-400">Connected</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span>Database Ready</span>
          </div>
          <div className="w-px h-3 bg-slate-700"></div>
          <span>&copy; {new Date().getFullYear()} Administrative Intelligence Unit</span>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ title, value, subtext }: { title: string, value: number | string, subtext: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-0.5">{title}</div>
      <div className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-1 px-0.5">{value}</div>
      <div className="text-[10px] text-slate-400 font-medium px-0.5 pt-1 border-t border-slate-50/50 mt-1">{subtext}</div>
    </div>
  );
}

