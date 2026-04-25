import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, ShieldCheck, Phone, Navigation, Info, Search, Pill } from 'lucide-react';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Pharmacy, Medication, Stock } from '../types';

export default function MapView() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacyMeds, setPharmacyMeds] = useState<(Medication & { price: number, stockId: string })[]>([]);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [isLoadingMeds, setIsLoadingMeds] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'pharmacies'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
      setPharmacies(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedPharmacy) {
      setPharmacyMeds([]);
      setMedSearchQuery('');
      return;
    }

    setIsLoadingMeds(true);
    const q = query(collection(db, 'stocks'), where('pharmacyId', '==', selectedPharmacy.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const stockData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stock));
      
      const medsWithPrices = await Promise.all(
        stockData.map(async (s) => {
          try {
            const mDoc = await getDoc(doc(db, 'medications', s.medicationId));
            if (mDoc.exists()) {
              return { ...mDoc.data(), id: mDoc.id, price: s.price, stockId: s.id } as Medication & { price: number, stockId: string };
            }
            return null;
          } catch (error) {
            console.error("Error fetching medication:", error);
            return null;
          }
        })
      );
      
      setPharmacyMeds(medsWithPrices.filter(Boolean) as (Medication & { price: number, stockId: string })[]);
      setIsLoadingMeds(false);
    }, (error) => {
      console.error("Error fetching stocks:", error);
      setIsLoadingMeds(false);
    });

    return () => unsubscribe();
  }, [selectedPharmacy]);

  return (
    <div className="relative h-[calc(100vh-12rem)] overflow-hidden font-sans transition-colors duration-500">
      {/* Map Placeholder - In a real app, use Google Maps or Leaflet */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px:24px] flex items-center justify-center">
        <div className="text-slate-300 dark:text-slate-800 text-center space-y-4">
          <div className="w-20 h-20 bg-white dark:bg-[#201F1E] rounded-[2rem] shadow-sm flex items-center justify-center mx-auto border border-slate-200/60 dark:border-white/5">
            <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-bold text-slate-500 dark:text-slate-400 font-display">Carte Interactive de Bukavu</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">Ibanda • Kadutu • Bagira</p>
          </div>
        </div>

        {/* Mock Markers */}
        {pharmacies.map((p, i) => (
          <motion.button
            key={p.id}
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: i * 0.05 
            }}
            onClick={() => setSelectedPharmacy(p)}
            className="absolute group z-10"
            style={{
              left: `${25 + (i * 18) % 55}%`,
              top: `${20 + (i * 22) % 45}%`
            }}
          >
            <div className="relative flex flex-col items-center">
              <motion.div 
                whileHover={{ scale: 1.1, y: -4 }}
                className={`p-2.5 rounded-2xl shadow-sm border transition-all duration-300 ${
                  selectedPharmacy?.id === p.id 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-110" 
                    : "bg-white dark:bg-[#1A1A1A] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <MapPin className={`w-5 h-5 ${
                  selectedPharmacy?.id === p.id ? "text-white dark:text-slate-900" : "text-emerald-600 dark:text-emerald-500"
                }`} />
              </motion.div>
              
              {p.status === 'certified' && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center border border-slate-200/60 dark:border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              )}
              
              {/* Tooltip on hover */}
              <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                <div className="bg-slate-900 dark:bg-emerald-600 text-white text-[10px] font-medium px-2 py-1 rounded-lg shadow-md">
                  {p.name}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Pharmacy Detail Card */}
      {selectedPharmacy && (
        <div className="absolute bottom-6 left-6 right-6 z-50 flex justify-center">
          <motion.div
            initial={{ y: 150, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 150, opacity: 0, scale: 0.95 }}
            className="w-full max-w-xl bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl rounded-[2rem] shadow-lg border border-slate-200/60 dark:border-white/10 p-7 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                    {selectedPharmacy.name}
                  </h3>
                  {selectedPharmacy.status === 'certified' && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Certifiée</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{selectedPharmacy.neighborhood} • {selectedPharmacy.address}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPharmacy(null)}
                className="w-10 h-10 bg-slate-50 dark:bg-slate-800/50 rounded-[1rem] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all border border-slate-200/60 dark:border-white/5"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.a 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                href={`tel:${selectedPharmacy.phone}`}
                className="flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-[1.5rem] font-medium text-sm shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-900 rounded-[1rem] flex items-center justify-center border border-slate-100 dark:border-white/5">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-display">Appeler</span>
              </motion.a>
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPharmacy.lat},${selectedPharmacy.lng}`, '_blank')}
                className="flex items-center justify-center gap-3 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-medium text-sm shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-8 h-8 bg-white/20 dark:bg-black/10 rounded-[1rem] flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-white dark:text-slate-900" />
                </div>
                <span className="font-display">Itinéraire</span>
              </motion.button>
            </div>

            {/* Search Medications */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un médicament disponible..."
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#201F1E] border border-slate-200/60 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Medication List */}
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {isLoadingMeds ? (
                  <div className="text-center py-4 text-sm text-slate-400">Chargement des médicaments...</div>
                ) : pharmacyMeds.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-400">Aucun médicament en stock</div>
                ) : (
                  pharmacyMeds
                    .filter(m => m.name.toLowerCase().includes(medSearchQuery.toLowerCase()) || m.molecule.toLowerCase().includes(medSearchQuery.toLowerCase()))
                    .map(med => (
                      <div key={med.stockId} className="flex items-center justify-between p-3 bg-white dark:bg-[#201F1E] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 dark:bg-[#1A1A1A] rounded-[1rem] flex items-center justify-center border border-slate-100 dark:border-white/5">
                            <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{med.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{med.molecule}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 dark:text-white font-display text-lg">{med.price} FC</p>
                        </div>
                      </div>
                    ))
                )}
                {pharmacyMeds.length > 0 && pharmacyMeds.filter(m => m.name.toLowerCase().includes(medSearchQuery.toLowerCase()) || m.molecule.toLowerCase().includes(medSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-4 text-sm text-slate-400">Aucun résultat pour "{medSearchQuery}"</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
