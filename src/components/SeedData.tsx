import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Database, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';

export default function SeedData() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'unauthorized'>('idle');

  const seed = async () => {
    if (!auth.currentUser) {
      setStatus('unauthorized');
      return;
    }
    // Only admin can seed
    if (auth.currentUser.email !== 'barakamichaelklg@gmail.com') {
      setStatus('unauthorized');
      return;
    }
    setStatus('loading');
    try {
      // 1. Seed Pharmacies
      const pharmacies = [
        { name: "Pharmacie de la Place Mulamba", neighborhood: "Ibanda", lat: -2.502, lng: 28.865, status: "certified", phone: "+243 812 345 678", address: "Place Mulamba, Av. P.E. Lumumba", rating: 4.8 },
        { name: "Pharmacie du Marché Kadutu", neighborhood: "Kadutu", lat: -2.515, lng: 28.850, status: "certified", phone: "+243 998 765 432", address: "Marché Central de Kadutu", rating: 4.5 },
        { name: "Pharmacie Bagira Centre", neighborhood: "Bagira", lat: -2.480, lng: 28.840, status: "certified", phone: "+243 854 321 098", address: "Place de l'Indépendance, Bagira", rating: 4.2 },
        { name: "Pharmacie de l'Essence", neighborhood: "Ibanda", lat: -2.520, lng: 28.870, status: "certified", phone: "+243 821 112 233", address: "Quartier Essence, Route d'Uvira", rating: 4.6 },
        { name: "Pharmacie Saint-Luc (Nguba)", neighborhood: "Ibanda", lat: -2.508, lng: 28.875, status: "certified", phone: "+243 810 000 111", address: "Av. Nguba, Ibanda", rating: 4.7 },
        { name: "Pharmacie de la Paix", neighborhood: "Ibanda", lat: -2.500, lng: 28.862, status: "certified", phone: "+243 815 555 666", address: "Av. P.E. Lumumba, Face à la Poste", rating: 4.9 },
        { name: "Pharmacie du Sud", neighborhood: "Ibanda", lat: -2.505, lng: 28.868, status: "certified", phone: "+243 990 123 456", address: "Av. P.E. Lumumba, Nyawera", rating: 4.4 },
        { name: "Pharmacie de la Victoire", neighborhood: "Kadutu", lat: -2.510, lng: 28.855, status: "certified", phone: "+243 822 333 444", address: "Av. Industrielle, Kadutu", rating: 4.3 },
        { name: "Pharmacie de la Cathédrale", neighborhood: "Ibanda", lat: -2.495, lng: 28.860, status: "certified", phone: "+243 814 444 555", address: "Av. de la Cathédrale, Ibanda", rating: 4.7 },
        { name: "Pharmacie de l'Hôpital Provincial", neighborhood: "Ibanda", lat: -2.498, lng: 28.863, status: "certified", phone: "+243 813 333 222", address: "Av. Michombero, Ibanda", rating: 4.6 },
        { name: "Pharmacie du Collège Alfajiri", neighborhood: "Ibanda", lat: -2.503, lng: 28.866, status: "certified", phone: "+243 811 222 333", address: "Av. du Collège, Ibanda", rating: 4.5 },
        { name: "Pharmacie de la Botte", neighborhood: "Ibanda", lat: -2.492, lng: 28.861, status: "certified", phone: "+243 819 999 888", address: "Quartier La Botte, Ibanda", rating: 4.8 },
        { name: "Pharmacie de Panzi", neighborhood: "Ibanda", lat: -2.535, lng: 28.845, status: "certified", phone: "+243 817 777 666", address: "Quartier Panzi, Route d'Uvira", rating: 4.4 }
      ];

      for (const p of pharmacies) {
        const path = 'pharmacies';
        try {
          const q = query(collection(db, path), where('name', '==', p.name));
          const existing = await getDocs(q);
          if (existing.empty) await addDoc(collection(db, path), p);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      // 2. Seed Medications
      const medications = [
        { 
          name: "Coartem (Artémisinine)", 
          molecule: "Artemether + Lumefantrine", 
          standardPrice: 12000, 
          category: "Paludisme", 
          description: "Traitement curatif du paludisme à Plasmodium falciparum.", 
          imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Paracétamol 500mg", 
          molecule: "Paracétamol", 
          standardPrice: 2500, 
          category: "Douleur", 
          description: "Antalgique et antipyrétique pour douleurs légères à modérées.", 
          imageUrl: "https://images.unsplash.com/photo-1550572017-4f3b204003c2?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Amoxicilline 500mg", 
          molecule: "Amoxicilline", 
          standardPrice: 8500, 
          category: "Antibio", 
          description: "Antibiotique de la famille des bétalactamines.", 
          imageUrl: "https://images.unsplash.com/photo-1471864190281-ad5f9f81ce4c?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Insuline Humaine", 
          molecule: "Insuline", 
          standardPrice: 45000, 
          category: "Diabète", 
          description: "Hormone pour le contrôle de la glycémie.", 
          imageUrl: "https://images.unsplash.com/photo-1628348070830-289f0923171b?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Ibuprofène 400mg", 
          molecule: "Ibuprofène", 
          standardPrice: 3500, 
          category: "Douleur", 
          description: "Anti-inflammatoire non stéroïdien (AINS).", 
          imageUrl: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Ciprofloxacine 500mg", 
          molecule: "Ciprofloxacine", 
          standardPrice: 15000, 
          category: "Antibio", 
          description: "Antibiotique de la famille des fluoroquinolones.", 
          imageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Metformine 850mg", 
          molecule: "Metformine", 
          standardPrice: 12000, 
          category: "Diabète", 
          description: "Antidiabétique oral de la famille des biguanides.", 
          imageUrl: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Quinine 300mg", 
          molecule: "Quinine", 
          standardPrice: 5000, 
          category: "Paludisme", 
          description: "Traitement du paludisme grave ou résistant.", 
          imageUrl: "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Azithromycine 500mg", 
          molecule: "Azithromycine", 
          standardPrice: 18000, 
          category: "Antibio", 
          description: "Antibiotique macrolide pour diverses infections.", 
          imageUrl: "https://images.unsplash.com/photo-1583947581924-860bda6a5a0e?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Diclofénac 50mg", 
          molecule: "Diclofénac", 
          standardPrice: 4000, 
          category: "Douleur", 
          description: "Anti-inflammatoire pour douleurs articulaires.", 
          imageUrl: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Glibenclamide 5mg", 
          molecule: "Glibenclamide", 
          standardPrice: 6000, 
          category: "Diabète", 
          description: "Sulfonylurée pour le diabète de type 2.", 
          imageUrl: "https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=800" 
        },
        { 
          name: "Artesunate Injectable", 
          molecule: "Artesunate", 
          standardPrice: 25000, 
          category: "Paludisme", 
          description: "Traitement d'urgence du paludisme sévère.", 
          imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=800" 
        }
      ];

      for (const m of medications) {
        const path = 'medications';
        try {
          const q = query(collection(db, path), where('name', '==', m.name));
          const existing = await getDocs(q);
          if (existing.empty) {
            const docRef = await addDoc(collection(db, path), m);
            
            // Seed some stocks for each medication
            const pharms = await getDocs(collection(db, 'pharmacies'));
            for (const p of pharms.docs) {
              await addDoc(collection(db, 'stocks'), {
                pharmacyId: p.id,
                medicationId: docRef.id,
                quantity: Math.floor(Math.random() * 50) + 10,
                price: m.standardPrice + (Math.floor(Math.random() * 2000) - 1000)
              });
            }
          } else {
            // Force update image to ensure we have the latest ones
            const docRef = doc(db, 'medications', existing.docs[0].id);
            await updateDoc(docRef, { imageUrl: m.imageUrl });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }

      setStatus('success');
    } catch (error) {
      console.error("Seeding error:", error);
      setStatus('error');
    }
  };

  useEffect(() => {
    const checkAndSeed = async () => {
      if (auth.currentUser?.email === 'barakamichaelklg@gmail.com' && status === 'idle') {
        await seed();
      }
    };
    checkAndSeed();
  }, [auth.currentUser, status]);

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm space-y-4 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
          <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Données de Démo</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Initialisation de Bukavu</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {status === 'loading' ? "Importation automatique en cours..." : "Cliquez sur le bouton ci-dessous pour peupler votre base de données avec des pharmacies certifiées et des médicaments essentiels à Bukavu."}
      </p>

      <button 
        onClick={seed}
        disabled={status === 'loading' || status === 'success'}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 disabled:opacity-50 transition-all active:scale-95"
      >
        {status === 'loading' ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : status === 'success' ? (
          <><CheckCircle2 className="w-5 h-5" /> Données Importées</>
        ) : status === 'error' ? (
          <><AlertCircle className="w-5 h-5" /> Erreur de Permissions</>
        ) : status === 'unauthorized' ? (
          <><LogIn className="w-5 h-5" /> Connectez-vous d'abord</>
        ) : (
          "Importer les données de démo"
        )}
      </button>

      {status === 'unauthorized' && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold text-center uppercase tracking-wider">
          Seul l'administrateur (barakamichaelklg@gmail.com) peut importer les données.
        </p>
      )}
    </div>
  );
}
