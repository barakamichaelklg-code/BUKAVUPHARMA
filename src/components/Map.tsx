import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ShieldCheck, Phone, Navigation, Info, Search, Pill, Crosshair, XCircle, ChevronRight } from 'lucide-react';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Pharmacy, Medication, Stock } from '../types';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

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
    <div className="relative h-[calc(100vh-12rem)] overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-[#F5F2EA] dark:bg-[#121212]">
      {/* Map Placeholder */}
      <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:32px:32px] flex items-center justify-center">
        
        {/* User Location Button */}
        <div className="absolute top-6 right-6 z-20">
          <button 
            onClick={requestLocation}
            disabled={locationLoading}
            className="flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-[1.5rem] shadow-xl border border-slate-200/50 dark:border-white/10 hover:shadow-2xl transition-all active:scale-[0.98] text-slate-900 dark:text-white font-bold"
          >
            {locationLoading ? (
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Crosshair className={cn("w-5 h-5", userLocation ? 'text-emerald-500' : 'text-slate-400')} />
            )}
            <span className="text-sm">
              {userLocation ? "Ma Position" : "Me localiser"}
            </span>
          </button>
        </div>

        <div className="text-slate-300 dark:text-slate-800 text-center space-y-6 max-w-sm">
          <div className="w-24 h-24 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] shadow-sm flex items-center justify-center mx-auto border border-white dark:border-white/5 backdrop-blur-sm">
            <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-slate-400 dark:text-slate-600 font-display transition-colors">Réseau Pharmaceutique de Bukavu</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-700">Exploration Interactive</p>
          </div>
        </div>

        {/* User Marker */}
        {userLocation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute z-10"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute animate-ping w-16 h-16 bg-emerald-500/20 rounded-full" />
              <div className="p-3 bg-emerald-600 rounded-full shadow-2xl border-4 border-white dark:border-slate-900 z-10">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Markers */}
        {pharmacies.map((p, i) => (
          <div
            key={p.id}
            className={`absolute ${selectedPharmacy?.id === p.id ? 'z-50' : 'z-10'}`}
            style={{
              left: `${20 + (i * 15) % 60}%`,
              top: `${15 + (i * 25) % 55}%`
            }}
          >
            <div className="relative flex flex-col items-center">
              <motion.button
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: i * 0.03 }}
                onClick={() => setSelectedPharmacy(p)}
                className={cn(
                  "p-3 rounded-[1.25rem] shadow-lg transition-all duration-500 border-2",
                  selectedPharmacy?.id === p.id 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white scale-125" 
                    : "bg-white dark:bg-slate-900 border-white dark:border-white/10 hover:scale-105 active:scale-95"
                )}
              >
                <MapPin className="w-5 h-5" />
                {p.status === 'certified' && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                )}
              </motion.button>
              
              {selectedPharmacy?.id === p.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full mb-4 w-[280px] bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-white/10 p-6 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
                  
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight leading-tight">{p.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{p.neighborhood}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPharmacy(null); }}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Ouvert
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bukavu, RDC</span>
                    </div>
                    
                    <Link 
                      to={`/pharmacy/${p.id}`}
                      className="button-premium w-full !rounded-2xl !py-3 !text-sm flex items-center justify-center gap-2"
                    >
                      Explorer l'inventaire
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  {/* Arrow */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-950 rotate-45 border-b border-r border-slate-200/50 dark:border-white/10" />
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

