import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowLeft, ShieldCheck, Info, CreditCard, Truck, CheckCircle2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, deleteDoc, FirestoreError } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Medication, Stock, Pharmacy } from '../types';
import { serverTimestamp } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

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

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [med, setMed] = useState<Medication | null>(null);
  const [stocks, setStocks] = useState<(Stock & { pharmacy: Pharmacy })[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Voulez-vous vraiment supprimer ce médicament ?')) {
      const path = `medications/${id}`;
      try {
        await deleteDoc(doc(db, 'medications', id));
        navigate('/');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchMed = async () => {
      const path = `medications/${id}`;
      try {
        const docRef = doc(db, 'medications', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMed({ id: docSnap.id, ...docSnap.data() } as Medication);
        }
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    };

    fetchMed();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const path = 'stocks';
    const q = query(collection(db, path), where('medicationId', '==', id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const stockData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stock));
      
      const stocksWithPharmacies = await Promise.all(
        stockData.map(async (s) => {
          const pPath = `pharmacies/${s.pharmacyId}`;
          try {
            const pDoc = await getDoc(doc(db, 'pharmacies', s.pharmacyId));
            return { ...s, pharmacy: { id: pDoc.id, ...pDoc.data() } as Pharmacy };
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, pPath);
            return { ...s, pharmacy: {} as Pharmacy }; // Fallback
          }
        })
      );
      
      setStocks(stocksWithPharmacies);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [id]);

  const handlePurchase = async (stock: Stock & { pharmacy: Pharmacy }) => {
    if (!auth.currentUser) {
      navigate('/auth');
      return;
    }

    setBuying(true);
    const path = 'orders';
    try {
      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        pharmacyId: stock.pharmacyId,
        pharmacyName: stock.pharmacy.name,
        pharmacyPhone: stock.pharmacy.phone,
        items: [{
          medicationId: stock.medicationId,
          name: med?.name,
          quantity: 1,
          price: stock.price,
          imageUrl: med?.imageUrl
        }],
        total: stock.price,
        status: 'pending',
        deliveryType: 'pickup',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => navigate('/cart'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Chargement...</div>;
  if (!med) return <div className="p-8 text-center text-slate-400">Médicament non trouvé</div>;

  return (
    <div className="min-h-screen transition-colors duration-500">
      {/* Header */}
      <div className="glass sticky top-0 z-50 p-4 flex items-center gap-4 border-b border-slate-100/50 dark:border-white/10">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90">
          <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">Détails du produit</h2>
        {isAdmin && (
          <button 
            onClick={handleDelete}
            className="ml-auto p-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-90"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6 space-y-8 pb-40 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="w-full aspect-square bg-emerald-50 dark:bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center shadow-figma-lg dark:shadow-emerald-900/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 dark:from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {med.imageUrl && med.imageUrl !== '❓' ? (
              <img 
                src={med.imageUrl} 
                alt={med.name} 
                className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
                }}
              />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                alt={med.name} 
                className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-500 opacity-80"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-xl uppercase tracking-[0.1em]">
                  {med.category}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-display">{med.standardPrice.toLocaleString()} FC</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display leading-tight">{med.name}</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">{med.molecule}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base font-display">
                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Description
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {med.description || "Aucune description disponible pour ce médicament. Veuillez consulter un pharmacien certifié pour plus d'informations."}
              </p>
            </div>
          </div>
        </div>

        {/* Availability */}
        <section className="space-y-5">
          <h3 className="font-bold text-slate-900 dark:text-white text-base font-display">Disponibilité à Bukavu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.length > 0 ? (
              stocks.map((s) => (
                <div key={s.id} className="p-5 rounded-3xl border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 shadow-figma text-slate-900 dark:text-white flex items-center justify-between hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-colors">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-base truncate">{s.pharmacy.name}</span>
                      {s.pharmacy.status === 'certified' && <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-500/10 flex-shrink-0" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest truncate">{s.pharmacy.neighborhood}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Tél: {s.pharmacy.phone}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2 flex-shrink-0 ml-4">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{s.price.toLocaleString()} FC</p>
                    <button 
                      onClick={() => handlePurchase(s)}
                      disabled={buying || success}
                      className="text-[10px] bg-emerald-600 text-white px-4 py-1.5 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 active:scale-90 transition-all"
                    >
                      {success ? "Prêt !" : buying ? "..." : "Acheter"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center text-slate-400 dark:text-slate-600 text-sm italic bg-slate-50/50 dark:bg-white/5">
                Actuellement en rupture de stock dans les pharmacies partenaires.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-24 left-0 right-0 p-5 glass border-t border-slate-100/50 dark:border-white/10 flex gap-4">
        <button 
          onClick={() => stocks.length > 0 && handlePurchase(stocks[0])}
          disabled={buying || success || stocks.length === 0}
          className="flex-[3] py-4.5 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {success ? (
            <><CheckCircle2 className="w-6 h-6" /> Commande Passée</>
          ) : buying ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><CreditCard className="w-6 h-6" /> Mobile Money</>
          )}
        </button>
        <button className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-95 shadow-figma">
          <Truck className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
