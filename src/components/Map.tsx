import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ShieldCheck, Phone, Navigation, Info, Search, Pill, Crosshair } from 'lucide-react';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Pharmacy, Medication, Stock } from '../types';
import { Link } from 'react-router-dom';

export default function MapView() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacyMeds, setPharmacyMeds] = useState<(Medication & { price: number, stockId: string })[]>([]);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [isLoadingMeds, setIsLoadingMeds] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const path = 'pharmacies';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
      setPharmacies(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  const requestLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError("Impossible de récupérer votre position.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!selectedPharmacy) {
      setPharmacyMeds([]);
      setMedSearchQuery('');
      return;
    }

    setIsLoadingMeds(true);
    const path = 'stocks';
    const q = query(collection(db, path), where('pharmacyId', '==', selectedPharmacy.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const stockData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stock));
      
      const medsWithPrices = await Promise.all(
        stockData.map(async (s) => {
          const medPath = `medications/${s.medicationId}`;
          try {
            const mDoc = await getDoc(doc(db, 'medications', s.medicationId));
            if (mDoc.exists()) {
              return { ...mDoc.data(), id: mDoc.id, price: s.price, stockId: s.id } as Medication & { price: number, stockId: string };
            }
            return null;
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, medPath);
            return null;
          }
        })
      );
      
      setPharmacyMeds(medsWithPrices.filter(Boolean) as (Medication & { price: number, stockId: string })[]);
      setIsLoadingMeds(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setIsLoadingMeds(false);
    });

    return () => unsubscribe();
  }, [selectedPharmacy]);

  return (
    <div className="relative h-[calc(100vh-12rem)] overflow-hidden font-sans transition-colors duration-500">
      {/* Map Placeholder - In a real app, use Google Maps or Leaflet */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px:24px] flex items-center justify-center">
        
        {/* User Location Button */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={requestLocation}
            disabled={locationLoading}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-3 rounded-[1.5rem] shadow-sm border border-slate-200/60 dark:border-white/10 hover:shadow-md transition-all active:scale-95 text-slate-700 dark:text-slate-200"
          >
            {locationLoading ? (
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Crosshair className={`w-5 h-5 ${userLocation ? 'text-emerald-500' : ''}`} />
            )}
            <span className="font-semibold text-sm">
              {userLocation ? "Localisé" : "Me localiser"}
            </span>
          </button>
          {locationError && (
            <div className="absolute top-full mt-2 right-0 bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg shadow-sm whitespace-nowrap">
              {locationError}
            </div>
          )}
        </div>

        <div className="text-slate-300 dark:text-slate-800 text-center space-y-4">
          <div className="w-20 h-20 bg-white dark:bg-[#201F1E] rounded-[2rem] shadow-sm flex items-center justify-center mx-auto border border-slate-200/60 dark:border-white/5">
            <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-bold text-slate-500 dark:text-slate-400 font-display">Carte Interactive de Bukavu</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">Ibanda • Kadutu • Bagira</p>
          </div>
        </div>

        {/* User Marker */}
        {userLocation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute z-10"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute animate-ping w-12 h-12 bg-blue-400/30 rounded-full" />
              <div className="p-2.5 bg-blue-500 rounded-full shadow-lg border-2 border-white dark:border-slate-900 z-10">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <div className="absolute top-full mt-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-md whitespace-nowrap">
                Vous êtes ici
              </div>
            </div>
          </motion.div>
        )}

        {/* Mock Markers */}
        {pharmacies.map((p, i) => (
          <div
            key={p.id}
            className={`absolute ${selectedPharmacy?.id === p.id ? 'z-50' : 'z-10'}`}
            style={{
              left: `${25 + (i * 18) % 55}%`,
              top: `${20 + (i * 22) % 45}%`
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* The Marker */}
              <motion.button
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: i * 0.05 
                }}
                onClick={() => setSelectedPharmacy(p)}
                whileHover={{ scale: 1.1, y: -4 }}
                className={`p-2.5 rounded-2xl shadow-sm border transition-all duration-300 ${
                  selectedPharmacy?.id === p.id 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-110" 
                    : "bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 group"
                }`}
              >
                <MapPin className={`w-5 h-5 ${
                  selectedPharmacy?.id === p.id ? "text-white dark:text-slate-900" : "text-emerald-600 dark:text-emerald-500"
                }`} />
                {p.status === 'certified' && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center border border-slate-200/60 dark:border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                )}
                
                {/* Tooltip on hover if not selected */}
                {selectedPharmacy?.id !== p.id && (
                  <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <div className="bg-slate-900 dark:bg-emerald-600 text-white text-[10px] font-medium px-2 py-1 rounded-lg shadow-md">
                      {p.name}
                    </div>
                  </div>
                )}
              </motion.button>
              
              {/* Interactive Popup */}
              {selectedPharmacy?.id === p.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full mb-3 w-64 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-xl border border-slate-200/60 dark:border-white/10 p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-2">
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.neighborhood}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedPharmacy(null); }}
                      className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const hour = new Date().getHours();
                      const isAlwaysOpen = p.name.includes('24');
                      const isOpen = isAlwaysOpen || ((hour >= 8 && hour < 21) && p.id.length % 3 !== 0);
                      return isOpen ? (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-500/20">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                          Ouvert
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-red-200/50 dark:border-red-500/20">
                          <span className="w-1 h-1 bg-red-500 rounded-full" />
                          Fermé
                        </span>
                      );
                    })()}
                  </div>
                  
                  <Link 
                    to={`/pharmacy/${p.id}`}
                    className="block w-full py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-[1rem] text-xs font-semibold text-center hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors shadow-sm"
                  >
                    Voir tous les détails
                  </Link>
                  
                  {/* Triangle pointer */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 rotate-45 border-b border-r border-slate-200/60 dark:border-white/10"></div>
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

