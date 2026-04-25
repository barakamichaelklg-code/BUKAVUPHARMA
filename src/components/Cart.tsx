import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, ShieldCheck, Pill, CheckCircle2, Copy, ExternalLink, Phone } from 'lucide-react';
import { auth, db } from '../firebase';
import { Order } from '../types';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, FirestoreError } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { paymentService } from '../services/paymentService';

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

export default function Cart() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'network' | 'instructions'>('network');
  const [selectedNetwork, setSelectedNetwork] = useState<'mpesa' | 'airtel' | 'orange' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  const handleDial = (network: 'mpesa' | 'airtel' | 'orange', order: Order) => {
    setSelectedNetwork(network);
    setPaymentError(null);
    setPaymentPhone(auth.currentUser?.phoneNumber || '');
    setPaymentStep('instructions');
  };

  const handleConfirmPayment = async () => {
    if (!payingOrder || !selectedNetwork || !paymentPhone) {
      setPaymentError("Veuillez entrer votre numéro de téléphone.");
      return;
    }
    
    setIsConfirming(true);
    setPaymentError(null);
    
    try {
      const response = await paymentService.processPayment({
        network: selectedNetwork,
        phoneNumber: paymentPhone,
        amount: payingOrder.total,
        currency: 'CDF',
        merchantId: payingOrder.pharmacyId, // Use pharmacy ID as merchant ID
        orderId: payingOrder.id
      });

      if (response.success) {
        await updateDoc(doc(db, 'orders', payingOrder.id), {
          status: 'paid'
        });
        setPayingOrder(null);
        setPaymentStep('network');
        setSelectedNetwork(null);
        alert(`Paiement ${selectedNetwork.toUpperCase()} réussi ! Votre commande est en cours de traitement.`);
      } else {
        setPaymentError(response.message || "Le paiement a échoué. Veuillez réessayer.");
      }
    } catch (error) {
      console.error(error);
      setPaymentError("Une erreur inattendue est survenue.");
    } finally {
      setIsConfirming(false);
    }
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    const path = `orders/${orderToDelete}`;
    try {
      await deleteDoc(doc(db, 'orders', orderToDelete));
      setOrderToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const path = 'orders';
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  const getNetworkCode = (network: 'mpesa' | 'airtel' | 'orange') => {
    const codes = { mpesa: '*1122#', airtel: '*501#', orange: '*144#' };
    return codes[network];
  };

  const getNetworkName = (network: 'mpesa' | 'airtel' | 'orange') => {
    const names = { mpesa: 'Vodacom M-Pesa', airtel: 'Airtel Money', orange: 'Orange Money' };
    return names[network];
  };

  return (
    <div className="p-5 space-y-8 font-sans transition-colors duration-500 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">Votre Panier</h1>
        <span className="bg-[#EFECE5] dark:bg-[#1A1A1A] text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-[1rem] text-[10px] font-semibold uppercase tracking-widest shadow-sm border border-slate-200/60 dark:border-white/5">
          {orders.length} Commandes
        </span>
      </div>

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/60 dark:border-white/10 shadow-sm space-y-5 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">Commande #{order.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">{order.pharmacyName || "Pharmacie Bukavu"}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-50 dark:fill-emerald-950/30" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CreditCard className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <p className="text-[10px] text-slate-500 font-medium">
                      Payer au: <span className="text-emerald-700 dark:text-emerald-500 font-bold">{order.pharmacyPhone || "N/A"}</span>
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(order.pharmacyPhone);
                        alert("Numéro copié !");
                      }}
                      className="text-[8px] bg-slate-50 dark:bg-[#1A1A1A] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-[0.4rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase font-bold border border-slate-200/60 dark:border-white/5"
                    >
                      Copier
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] px-3 py-1.5 rounded-[1rem] font-semibold uppercase tracking-widest shadow-sm",
                    order.status === 'paid' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  )}>
                    {order.status === 'paid' ? 'Payé' : order.status === 'pending' ? 'En attente' : order.status}
                  </span>
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => setOrderToDelete(order.id)}
                      className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/50 dark:bg-[#201F1E] p-4 rounded-[1.5rem] border border-slate-100/50 dark:border-white/5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-[1rem] flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-white/5">
                      {item.imageUrl && item.imageUrl !== '❓' ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800";
                          }}
                        />
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                          alt={item.name} 
                          className="w-full h-full object-cover opacity-80"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div className="flex-1 flex justify-between text-sm items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white font-display text-lg">{item.price.toLocaleString()} FC</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-5 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">Total à payer</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white font-display">{order.total.toLocaleString()} FC</p>
                </div>
                {order.status === 'pending' ? (
                  <button 
                    onClick={() => setPayingOrder(order)}
                    className="px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white rounded-[1.5rem] font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Payer
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" /> Confirmé
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200/80 dark:border-white/10">
          <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-10 h-10 text-slate-400 dark:text-slate-600" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-900 dark:text-white font-bold text-xl font-display">Votre panier est vide</p>
            <p className="text-sm text-slate-500 font-medium tracking-wide">Trouvez vos médicaments en quelques clics.</p>
          </div>
          <Link to="/" className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-medium shadow-sm transition-all hover:shadow-md">
            Commencer mes achats
          </Link>
        </div>
      )}

      {/* Mobile Money Info */}
      <div className="p-8 bg-[#211E1A] dark:bg-[#1A1A1A] rounded-[2rem] text-slate-100 space-y-5 relative overflow-hidden shadow-md group dark:border dark:border-white/5">
        <div className="relative z-10 space-y-3">
          <h3 className="font-bold text-xl font-display tracking-tight text-white">Paiement Sécurisé</h3>
          <p className="text-slate-400 text-sm leading-relaxed max-w-[80%]">
            Utilisez M-Pesa, Airtel Money ou Orange Money pour vos achats. 
            Vos transactions sont protégées par cryptage de bout en bout.
          </p>
          <div className="flex gap-2 pt-3">
            <div className="px-3 py-1.5 bg-white/5 rounded-[0.5rem] flex items-center justify-center text-[9px] font-semibold tracking-widest border border-white/10 uppercase text-slate-300">M-PESA</div>
            <div className="px-3 py-1.5 bg-white/5 rounded-[0.5rem] flex items-center justify-center text-[9px] font-semibold tracking-widest border border-white/10 uppercase text-slate-300">AIRTEL</div>
            <div className="px-3 py-1.5 bg-white/5 rounded-[0.5rem] flex items-center justify-center text-[9px] font-semibold tracking-widest border border-white/10 uppercase text-slate-300">ORANGE</div>
          </div>
        </div>
        <CreditCard className="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 rotate-12 transition-transform duration-700" />
      </div>

       {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-8 space-y-6 shadow-sm border border-slate-200/60 dark:border-white/10 text-center"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">Supprimer la commande ?</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Cette action est irréversible. Voulez-vous vraiment retirer ce médicament de votre panier ?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setOrderToDelete(null)}
                  className="py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-[1.5rem] font-semibold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200/60 dark:border-white/5"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="py-4 bg-red-600 text-white rounded-[1.5rem] font-semibold text-sm shadow-sm hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Supprimer"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Network Selection Modal */}
      <AnimatePresence>
        {payingOrder && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-8 shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden relative"
            >
              {paymentStep === 'network' ? (
                <>
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Choisir votre réseau</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Le numéro de la pharmacie sera copié et le code USSD sera lancé.
                    </p>
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-[#201F1E] rounded-[1.5rem] border border-slate-200/60 dark:border-white/5">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Montant à envoyer</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white font-display mt-1">{payingOrder.total.toLocaleString()} FC</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => handleDial('mpesa', payingOrder)}
                      className="p-5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] flex items-center justify-between hover:border-emerald-500 hover:shadow-sm transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500 rounded-[1rem] flex items-center justify-center text-white font-black text-[10px]">M-PESA</div>
                        <span className="font-semibold text-slate-900 dark:text-white">Vodacom M-Pesa</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-600">*1122#</span>
                    </button>

                    <button 
                      onClick={() => handleDial('airtel', payingOrder)}
                      className="p-5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] flex items-center justify-between hover:border-red-500 hover:shadow-sm transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-[1rem] flex items-center justify-center text-white font-black text-[10px]">AIRTEL</div>
                        <span className="font-semibold text-slate-900 dark:text-white">Airtel Money</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-red-600">*501#</span>
                    </button>

                    <button 
                      onClick={() => handleDial('orange', payingOrder)}
                      className="p-5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 rounded-[1.5rem] flex items-center justify-between hover:border-orange-500 hover:shadow-sm transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-[1rem] flex items-center justify-center text-white font-black text-[10px]">ORANGE</div>
                        <span className="font-semibold text-slate-900 dark:text-white">Orange Money</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-orange-600">*144#</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setPayingOrder(null)}
                    className="w-full py-4 text-slate-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-[#EFECE5] dark:bg-[#201F1E] rounded-[1.5rem] flex items-center justify-center mx-auto shadow-sm">
                      <Phone className="w-10 h-10 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Confirmation</h3>
                      <p className="text-sm text-slate-500 font-medium">
                        Entrez votre numéro pour recevoir l'invite de paiement sur votre téléphone.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 dark:bg-[#1A1A1A] rounded-[1.5rem] border border-slate-200/60 dark:border-white/5 space-y-4">
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900 dark:text-white">Numéro de téléphone</label>
                        <input
                          type="tel"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                          placeholder="+243..."
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 rounded-[1rem] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-semibold text-slate-500">Montant</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white font-display">{payingOrder.total.toLocaleString()} FC</span>
                      </div>
                      
                      {paymentError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-[1rem]">
                          {paymentError}
                        </div>
                      )}

                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={handleConfirmPayment}
                      disabled={isConfirming}
                      className="w-full py-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-900 rounded-[1.5rem] font-medium shadow-sm hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isConfirming ? (
                        <div className="w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Confirmer et Payer
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setPaymentStep('network');
                        setSelectedNetwork(null);
                        setPaymentError(null);
                      }}
                      className="w-full py-4 text-slate-400 dark:text-slate-500 font-semibold text-xs uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
