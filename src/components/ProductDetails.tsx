import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowLeft, ShieldCheck, Info, CreditCard, Truck, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, deleteDoc, FirestoreError } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Medication, Stock, Pharmacy } from '../types';
import { serverTimestamp } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

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
      <div className="p-6 space-y-8 pb-40 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="w-full aspect-square bg-[#EFECE5] dark:bg-[#201F1E] rounded-[2rem] flex items-center justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {med.imageUrl && med.imageUrl !== '❓' ? (
              <img 
                src={med.imageUrl} 
                alt={med.name} 
                className="w-full h-full object-cover relative z-10"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
                }}
              />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                alt={med.name} 
                className="w-full h-full object-cover relative z-10 opacity-80"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-[1rem] uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                  {med.category}
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-display">{med.standardPrice.toLocaleString()} FC</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white font-display leading-[1.1] tracking-tight">{med.name}</h1>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-[0.2em]">{med.molecule}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg font-display">
                <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-[0.6rem] flex items-center justify-center border border-slate-200/60 dark:border-white/5 shadow-sm">
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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">Disponibilité à Bukavu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.length > 0 ? (
              stocks.map((s) => (
                <div key={s.id} className="p-5 rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white flex items-center justify-between hover:shadow-md transition-all">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/pharmacy/${s.pharmacyId}`} className="font-semibold text-slate-900 dark:text-white text-base truncate tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        {s.pharmacy.name}
                      </Link>
                      {s.pharmacy.status === 'certified' && <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-50 dark:fill-emerald-500/10 flex-shrink-0" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-widest truncate">{s.pharmacy.neighborhood}</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-500 font-semibold tracking-widest font-mono">Tél: {s.pharmacy.phone}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2 flex-shrink-0 ml-4">
                    <p className="font-bold text-slate-900 dark:text-white font-display text-lg">{s.price.toLocaleString()} FC</p>
                    <button 
                      onClick={() => handlePurchase(s)}
                      disabled={buying || success}
                      className="text-[10px] bg-slate-900 dark:bg-emerald-600 text-white px-4 py-2 rounded-[1rem] font-semibold uppercase tracking-widest disabled:opacity-50 shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      {success ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Ajouté</>
                      ) : buying ? (
                        "..."
                      ) : (
                        <><ShoppingCart className="w-3.5 h-3.5" /> Ajouter au panier</>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 rounded-[1.5rem] border border-dashed border-slate-200/80 dark:border-white/10 text-center text-slate-400 dark:text-slate-500 text-sm italic bg-slate-50/50 dark:bg-[#1A1A1A]">
                Actuellement en rupture de stock dans les pharmacies partenaires.
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
