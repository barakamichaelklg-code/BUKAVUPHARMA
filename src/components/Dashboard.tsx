import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, ShieldCheck, ChevronRight, Pill } from 'lucide-react';
import { collection, onSnapshot, query, where, deleteDoc, doc, addDoc, FirestoreError } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Pharmacy, Medication } from '../types';
import { Link } from 'react-router-dom';
import SeedData from './SeedData';
import { cn } from '../lib/utils';
import { Trash2, Plus, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    molecule: '',
    category: 'Douleur',
    standardPrice: 0,
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    setIsAdmin(auth.currentUser?.email === 'barakamichaelklg@gmail.com');
  }, [auth.currentUser]);

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'medications';
    try {
      await addDoc(collection(db, path), newMed);
      setShowAddModal(false);
      setNewMed({
        name: '',
        molecule: '',
        category: 'Douleur',
        standardPrice: 0,
        description: '',
        imageUrl: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteMedication = async (e: React.MouseEvent, medId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce médicament ?')) {
      const path = `medications/${medId}`;
      try {
        await deleteDoc(doc(db, 'medications', medId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  useEffect(() => {
    const path = 'pharmacies';
    const q = query(collection(db, path), where('status', '==', 'certified'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
      setPharmacies(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const path = 'medications';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
      setMedications(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  const filteredPharmacies = pharmacies.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMeds = medications.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.molecule.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? m.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-5 space-y-10 font-sans transition-colors duration-500 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-10 gradient-emerald shadow-sm dark:border dark:border-white/5 border flex flex-col justify-center min-h-[280px]">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-slate-400/5 dark:bg-white/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-400/5 dark:bg-emerald-400/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span className="text-[11px] font-black text-slate-700 dark:text-white tracking-widest uppercase">Santé Certifiée RDC</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1] font-display">
              Trouvez vos médicaments<br />en un instant
            </h1>
            <p className="text-slate-600 dark:text-slate-300 max-w-xs text-base font-medium leading-relaxed">
              Explorez les pharmacies de Bukavu et trouvez ce qu'il vous faut.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar - Claude UI Style */}
      <div className="relative group -mt-8 z-20 px-6 max-w-4xl mx-auto">
        <div className="absolute inset-y-0 left-12 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
          id="main-search"
          type="text"
          placeholder="Rechercher un médicament ou une pharmacie..."
          className="w-full pl-16 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans text-base text-slate-900 dark:text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Seed Data (Only for dev/demo) */}
      {isAdmin && <SeedData />}

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex justify-end px-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Ajouter un médicament
          </button>
        </div>
      )}

      {/* Quick Categories */}
      <div className="space-y-4 px-2 max-w-5xl mx-auto">
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Catégories</h3>
        <div className="flex flex-wrap gap-3">
          {['Paludisme', 'Douleur', 'Antibio', 'Diabète'].map((cat) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-full border transition-all active:scale-[0.98]",
                selectedCategory === cat 
                  ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md" 
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 shadow-sm"
              )}
            >
              <Pill className={cn("w-4 h-4", selectedCategory === cat ? "text-emerald-400 dark:text-emerald-600" : "text-slate-400")} />
              <span className="text-sm font-medium">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Certified Pharmacies */}
      <section className="space-y-6 max-w-5xl mx-auto px-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">Pharmacies Certifiées</h2>
          <Link to="/map" className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            Voir sur la carte <ChevronRight className="w-4 h-4 text-emerald-500" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPharmacies.length > 0 ? (
            filteredPharmacies.slice(0, 3).map((pharmacy) => (
              <motion.div
                key={pharmacy.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-[1.25rem] flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                  </div>
                  {(() => {
                    const hour = new Date().getHours();
                    // Basic logic: open 8h-21h. We add a pseudo-random check based on ID length to simulate some closed pharmacies for demo purposes.
                    const isAlwaysOpen = pharmacy.name.includes('24');
                    const isOpen = isAlwaysOpen || ((hour >= 8 && hour < 21) && pharmacy.id.length % 3 !== 0);
                    return isOpen ? (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-500/20">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Ouvert
                      </span>
                    ) : (
                      <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-red-200/50 dark:border-red-500/20">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Fermé
                      </span>
                    );
                  })()}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{pharmacy.name}</h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{pharmacy.neighborhood}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-slate-400 text-center font-medium bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/50 dark:border-white/5">
              Aucune pharmacie trouvée dans votre secteur.
            </div>
          )}
        </div>
      </section>

      {/* Featured Medications */}
      <section className="space-y-6 max-w-5xl mx-auto px-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
          {selectedCategory ? `Catégorie: ${selectedCategory}` : "Médicaments Essentiels"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredMeds.length > 0 ? (
            filteredMeds.map((med) => (
              <motion.div
                key={med.id}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <Link to={`/product/${med.id}`} className="group flex-1 flex flex-col">
                  <div className="relative w-full aspect-square bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] mb-4 overflow-hidden border border-slate-100 dark:border-white/5 isolate">
                    {med.imageUrl && med.imageUrl !== '❓' ? (
                      <img 
                        src={med.imageUrl} 
                        alt={med.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
                        }}
                      />
                    ) : (
                      <img 
                        src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                        alt={med.name} 
                        className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        style={{ filter: 'grayscale(0.5)' }}
                      />
                    )}
                    
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteMedication(e, med.id)}
                        className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-900/90 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-xl transition-all shadow-sm z-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug">{med.name}</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">{med.molecule}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{med.standardPrice.toLocaleString()} FC</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors text-slate-400">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-slate-400 text-center font-medium bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200/50 dark:border-white/5">
              Aucun médicament ne correspond à votre recherche.
            </div>
          )}
        </div>
      </section>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">Nouveau Médicament</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ajoutez un produit à la base de données.</p>
                </div>

                <form onSubmit={handleAddMedication} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                      <input 
                        required
                        type="text" 
                        value={newMed.name}
                        onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                        placeholder="ex: Coartem"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Molécule</label>
                      <input 
                        required
                        type="text" 
                        value={newMed.molecule}
                        onChange={(e) => setNewMed({...newMed, molecule: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                        placeholder="ex: Artemether"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                      <select 
                        value={newMed.category}
                        onChange={(e) => setNewMed({...newMed, category: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      >
                        {['Paludisme', 'Douleur', 'Antibio', 'Diabète', 'Autre'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Prix Standard (FC)</label>
                      <input 
                        required
                        type="number" 
                        value={newMed.standardPrice}
                        onChange={(e) => setNewMed({...newMed, standardPrice: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">URL de l'image</label>
                    <input 
                      type="url" 
                      value={newMed.imageUrl}
                      onChange={(e) => setNewMed({...newMed, imageUrl: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      rows={3}
                      value={newMed.description}
                      onChange={(e) => setNewMed({...newMed, description: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white resize-none"
                      placeholder="Description du médicament..."
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Enregistrer le médicament
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
