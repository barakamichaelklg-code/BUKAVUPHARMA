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
    <div className="max-w-6xl mx-auto space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 bg-[#EFECE5] dark:bg-[#1C1C1B] border border-slate-200/50 dark:border-white/5 shadow-sm min-h-[320px] flex items-center">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full border border-slate-200 dark:border-white/10"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-widest uppercase">Pharmacies Certifiées de Bukavu</span>
          </motion.div>
          
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.05] font-display"
            >
              Votre santé, à portée<br />de main à <span className="text-emerald-600 dark:text-emerald-500 italic">Bukavu</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 dark:text-slate-400 max-w-md font-medium leading-relaxed"
            >
              Recherchez, localisez et commandez vos médicaments en toute sécurité auprès des meilleures pharmacies locales.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Search Bar - Claude UI Style */}
      <div className="relative max-w-3xl mx-auto -mt-10 px-4">
        <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none z-10">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <input
          id="main-search"
          type="text"
          placeholder="Rechercher un médicament ou une pharmacie..."
          className="w-full pl-14 pr-8 py-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Seed Data (Only for dev/demo) */}
      {isAdmin && <SeedData />}

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex justify-end px-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-lg shadow-slate-200 dark:shadow-none hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Ajouter un médicament
          </button>
        </div>
      )}

      {/* Quick Categories */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Catégories populaires</h3>
        </div>
        <div className="flex flex-wrap gap-3 px-4 overflow-x-auto pb-2 scrollbar-none">
          {['Paludisme', 'Douleur', 'Antibiotiques', 'Diabète', 'Vitamines', 'Pédiatrie'].map((cat) => {
            const isSelected = selectedCategory === (cat === 'Antibiotiques' ? 'Antibio' : cat);
            const actualCat = cat === 'Antibiotiques' ? 'Antibio' : cat;
            return (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(isSelected ? null : actualCat)}
                className={cn(
                  "flex items-center gap-2.5 px-6 py-4 rounded-[1.25rem] border transition-all active:scale-[0.98] whitespace-nowrap font-semibold text-sm",
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-lg shadow-slate-900/10 dark:shadow-white/10" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                )}
              >
                <Pill className={cn("w-4 h-4", isSelected ? "text-emerald-400 dark:text-emerald-500" : "text-emerald-600 dark:text-emerald-500")} />
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Medications */}
      <section className="space-y-8 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
            {selectedCategory ? `Résultats pour ${selectedCategory}` : "Médicaments essentiels"}
          </h2>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {filteredMeds.length} produits
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMeds.length > 0 ? (
            filteredMeds.map((med, index) => (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -6 }}
                className="group card-premium overflow-hidden flex flex-col h-full bg-white dark:bg-slate-950"
              >
                <Link to={`/product/${med.id}`} className="flex flex-col h-full">
                  <div className="relative aspect-[4/5] bg-slate-50 dark:bg-slate-900 overflow-hidden border-b border-slate-100 dark:border-white/5">
                    {med.imageUrl && med.imageUrl !== '❓' ? (
                      <img 
                        src={med.imageUrl} 
                        alt={med.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                        <Pill className="w-12 h-12 text-slate-300 dark:text-slate-800" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteMedication(e, med.id)}
                        className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all shadow-sm z-30 backdrop-blur-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.15em] mb-1">{med.molecule}</p>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{med.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{med.description || "Indication thérapeutique"}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Prix estimé</span>
                        <span className="font-bold text-slate-900 dark:text-white text-xl">{med.standardPrice.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">FC</span></span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-900 dark:text-white font-bold text-lg font-display">Aucun médicament trouvé</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Réessayez avec d'autres mots-clés ou catégories.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Pharmacies */}
      <section className="space-y-8 px-4 pb-12">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight">Pharmacies à proximité</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Vérifiez la disponibilité en temps réel</p>
          </div>
          <Link to="/map" className="button-premium px-5 py-3 !rounded-[1rem] !text-sm">
            <MapPin className="w-4 h-4" />
            Explorer
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPharmacies.slice(0, 4).map((pharmacy) => (
            <Link 
              to={`/pharmacy/${pharmacy.id}`} 
              key={pharmacy.id}
              className="group card-premium p-6 flex items-center gap-6 hover:border-emerald-500/30 transition-all cursor-pointer"
            >
              <div className="w-16 h-16 bg-[#EFECE5] dark:bg-emerald-950/30 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <MapPin className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xl truncate font-display">{pharmacy.name}</h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Certifié
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {pharmacy.neighborhood}
                  </span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5 font-bold uppercase tracking-tight">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Ouvert 24/7
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 transition-all">
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          ))}
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
