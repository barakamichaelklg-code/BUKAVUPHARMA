import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, ShieldCheck, ChevronRight, Pill } from 'lucide-react';
import { collection, onSnapshot, query, where, deleteDoc, doc, addDoc, FirestoreError } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Pharmacy, Medication } from '../types';
import { Link } from 'react-router-dom';
import SeedData from './SeedData';
import { cn } from '../lib/utils';
import { Trash2, Plus, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

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

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

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
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 gradient-emerald shadow-figma-lg dark:shadow-emerald-900/20">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Santé Certifiée</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white font-display leading-tight">
              Trouvez vos <br /> médicaments
            </h1>
            <p className="text-emerald-50 text-sm font-medium opacity-90">
              En toute sécurité à Bukavu
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group -mt-14 z-20 px-2">
        <div className="absolute inset-y-0 left-7 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
          id="main-search"
          type="text"
          placeholder="Rechercher un médicament..."
          className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl shadow-figma-lg dark:shadow-black/20 focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-display text-lg text-slate-900 dark:text-white"
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
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Catégories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {['Paludisme', 'Douleur', 'Antibio', 'Diabète'].map((cat) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={cn(
                "flex flex-col items-center gap-3 p-3.5 rounded-3xl border transition-all active:scale-95 shadow-figma group",
                selectedCategory === cat 
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20" 
                  : "bg-white dark:bg-slate-900 border-slate-50 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-emerald-100 dark:hover:border-emerald-500/30"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                selectedCategory === cat ? "bg-white/20" : "bg-emerald-50 dark:bg-emerald-950/30 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/20"
              )}>
                <Pill className={cn("w-6 h-6", selectedCategory === cat ? "text-white" : "text-emerald-600")} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider font-display">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Certified Pharmacies */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Pharmacies Certifiées</h2>
          <Link to="/map" className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
            Voir tout <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {filteredPharmacies.length > 0 ? (
            filteredPharmacies.slice(0, 3).map((pharmacy) => (
              <motion.div
                key={pharmacy.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-figma flex items-center gap-5 hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-colors"
              >
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate text-base">{pharmacy.name}</h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/30" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{pharmacy.neighborhood} • {pharmacy.address}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">Ouvert</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">• {pharmacy.rating} ★</span>
                  </div>
                </div>
                <Link to="/map" className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 italic bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              Aucune pharmacie trouvée...
            </div>
          )}
        </div>
      </section>

      {/* Featured Medications */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">
          {selectedCategory ? `Médicaments: ${selectedCategory}` : "Médicaments Essentiels"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredMeds.length > 0 ? (
            filteredMeds.map((med) => (
              <motion.div
                key={med.id}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-figma hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-all"
              >
                <Link to={`/product/${med.id}`} className="group block space-y-3">
                  <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-figma transition-all duration-500">
                    {med.imageUrl && med.imageUrl !== '❓' ? (
                      <img 
                        src={med.imageUrl} 
                        alt={med.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
                        }}
                      />
                    ) : (
                      <img 
                        src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                        alt={med.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteMedication(e, med.id)}
                        className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white backdrop-blur-md rounded-xl transition-all opacity-0 group-hover:opacity-100 z-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="px-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600 transition-colors">{med.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{med.molecule}</p>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{med.standardPrice.toLocaleString()} FC</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                  <span className="font-bold text-emerald-600 text-sm">{med.standardPrice.toLocaleString()} FC</span>
                  <Link to={`/product/${med.id}`} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 transition-all active:scale-90">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-slate-400 italic bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              Aucun médicament trouvé...
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
