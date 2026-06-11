import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowLeft, ShieldCheck, Info, CreditCard, Truck, CheckCircle2, ShoppingCart, Pill, MapPin } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, deleteDoc, FirestoreError } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Medication, Stock, Pharmacy } from '../types';
import { serverTimestamp } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { getMedicationImage } from './Dashboard';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [med, setMed] = useState<Medication | null>(null);
  const [stocks, setStocks] = useState<(Stock & { pharmacy: Pharmacy })[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
      <div className="glass sticky top-0 z-50 p-4 flex items-center gap-4 border-b border-slate-200/60 dark:border-white/5">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[0.8rem] transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display tracking-tight">Détails du produit</h2>
        {isAdmin && (
          <button 
            onClick={handleDelete}
            className="ml-auto p-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-[0.8rem] hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 md:p-8 space-y-12 pb-40 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full aspect-[4/5] bg-white dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group border border-slate-200/60 dark:border-white/5"
          >
            <img 
              src={getMedicationImage(med.imageUrl, med.category)} 
              alt={med.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
          </motion.div>

          <div className="space-y-10 py-4">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                  {med.category}
                </span>
                <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{med.molecule}</span>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white font-display leading-tight tracking-tight">{med.name}</h1>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-500 font-display">{med.standardPrice.toLocaleString()} <span className="text-lg font-bold text-slate-400">FC</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-3">
                Description du produit
                <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-serif italic">
                "{med.description || "Indication thérapeutique à confirmer auprès d'un spécialiste."}"
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center gap-3 font-medium text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Qualité certifiée
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center gap-3 font-medium text-sm">
                  <Info className="w-5 h-5 text-emerald-600" />
                  Guide d'utilisation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Availability */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Points de vente à Bukavu</h3>
            <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stocks.length > 0 ? (
              stocks.map((s) => (
                <div key={s.id} className="group card-premium p-6 flex items-center justify-between hover:border-emerald-500/30">
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#EFECE5] dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <Link to={`/pharmacy/${s.pharmacyId}`} className="font-bold text-slate-900 dark:text-white text-xl font-display hover:text-emerald-600 dark:hover:text-emerald-400 truncate">
                          {s.pharmacy.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.pharmacy.neighborhood}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end gap-3">
                    <span className="font-bold text-slate-900 dark:text-white text-2xl font-display">{s.price.toLocaleString()} FC</span>
                    <button 
                      onClick={() => handlePurchase(s)}
                      disabled={buying || success}
                      className={cn(
                        "button-premium !py-2.5 !px-5 !rounded-xl !text-xs !shadow-none",
                        success && "!bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900"
                      )}
                    >
                      {success ? (
                        <><CheckCircle2 className="w-4 h-4" /> Ajouté</>
                      ) : buying ? (
                        "..."
                      ) : (
                        <><ShoppingCart className="w-4 h-4" /> Commander</>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem]">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-900 dark:text-white font-bold text-lg font-display">Momentanément indisponible</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Revenez plus tard ou consultez d'autres produits similaires.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-24 left-0 right-0 p-5 glass border-t border-slate-200/60 dark:border-white/5 flex gap-4">
        <button 
          onClick={() => stocks.length > 0 && handlePurchase(stocks[0])}
          disabled={buying || success || stocks.length === 0}
          className="flex-[3] py-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-[1.5rem] font-medium flex items-center justify-center gap-3 shadow-sm hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {success ? (
            <><CheckCircle2 className="w-5 h-5" /> Ajouté au panier</>
          ) : buying ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <><ShoppingCart className="w-5 h-5" /> Ajouter au panier</>
          )}
        </button>
        <button className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[1.5rem] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200/60 dark:border-white/10 shadow-sm">
          <Truck className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
