import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, ShieldCheck, Pill, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { auth, db } from '../firebase';
import { Order } from '../types';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, FirestoreError } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

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
    const codes = {
      mpesa: `*1122#`,
      airtel: `*501#`,
      orange: `*144#`
    };
    
    // Copy number first for convenience
    navigator.clipboard.writeText(order.pharmacyPhone);
    
    // Open dialer
    const code = codes[network].replace('#', '%23');
    window.location.href = `tel:${code}`;
    
    setSelectedNetwork(network);
    setPaymentStep('instructions');
  };

  const handleConfirmPayment = async () => {
    if (!payingOrder) return;
    setIsConfirming(true);
    const path = `orders/${payingOrder.id}`;
    try {
      await updateDoc(doc(db, 'orders', payingOrder.id), {
        status: 'paid'
      });
      setPayingOrder(null);
      setPaymentStep('network');
      setSelectedNetwork(null);
      alert("Paiement confirmé ! Votre commande est en cours de traitement par la pharmacie.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Votre Panier</h1>
        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
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
              className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-figma space-y-5 hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.15em]">Commande #{order.id.slice(0, 8)}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">{order.pharmacyName || "Pharmacie Bukavu"}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/30" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <CreditCard className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Payer au: <span className="text-emerald-600 font-bold">{order.pharmacyPhone || "N/A"}</span>
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(order.pharmacyPhone);
                        alert("Numéro copié !");
                      }}
                      className="text-[8px] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors uppercase font-bold"
                    >
                      Copier
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider shadow-sm",
                    order.status === 'paid' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  )}>
                    {order.status === 'paid' ? 'Payé' : order.status === 'pending' ? 'En attente' : order.status}
                  </span>
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => setOrderToDelete(order.id)}
                      className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-white/5">
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
                      <span className="font-bold text-slate-900 dark:text-white">{item.price.toLocaleString()} FC</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-5 border-t border-slate-50 dark:border-white/5 flex justify-between items-center">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total à payer</p>
                  <p className="text-xl font-black text-emerald-600 font-display">{order.total.toLocaleString()} FC</p>
                </div>
                {order.status === 'pending' ? (
                  <button 
                    onClick={() => setPayingOrder(order)}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-2"
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
        <div className="flex flex-col items-center justify-center py-24 space-y-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10">
          <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center shadow-inner">
            <ShoppingCart className="w-10 h-10 text-slate-200 dark:text-slate-800" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-slate-900 dark:text-white font-bold text-lg font-display">Votre panier est vide</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Trouvez vos médicaments en quelques clics.</p>
          </div>
          <Link to="/" className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 active:scale-95 transition-all">
            Commencer mes achats
          </Link>
        </div>
      )}

      {/* Mobile Money Info */}
      <div className="p-8 bg-emerald-950 rounded-[2.5rem] text-white space-y-5 relative overflow-hidden shadow-figma-lg group">
        <div className="relative z-10 space-y-3">
          <h3 className="font-bold text-xl font-display">Paiement Sécurisé</h3>
          <p className="text-emerald-100/60 text-xs leading-relaxed font-medium max-w-[80%]">
            Utilisez M-Pesa, Airtel Money ou Orange Money pour vos achats. 
            Vos transactions sont protégées par cryptage de bout en bout.
          </p>
          <div className="flex gap-3 pt-3">
            <div className="px-3 py-1.5 bg-white/10 rounded-lg flex items-center justify-center text-[9px] font-bold tracking-widest border border-white/5">M-PESA</div>
            <div className="px-3 py-1.5 bg-white/10 rounded-lg flex items-center justify-center text-[9px] font-bold tracking-widest border border-white/5">AIRTEL</div>
            <div className="px-3 py-1.5 bg-white/10 rounded-lg flex items-center justify-center text-[9px] font-bold tracking-widest border border-white/5">ORANGE</div>
          </div>
        </div>
        <CreditCard className="absolute -right-6 -bottom-6 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-8 space-y-6 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">Supprimer la commande ?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Cette action est irréversible. Voulez-vous vraiment retirer ce médicament de votre panier ?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setOrderToDelete(null)}
                  className="py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="py-4 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-100 dark:shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center"
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
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-8 shadow-2xl overflow-hidden relative"
            >
              {paymentStep === 'network' ? (
                <>
                  <div className="space-y-2 text-center">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">Choisir votre réseau</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Le numéro de la pharmacie sera copié et le code USSD sera lancé.
                    </p>
                    <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Montant à envoyer</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{payingOrder.total.toLocaleString()} FC</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => handleDial('mpesa', payingOrder)}
                      className="p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white font-black text-xs">M-PESA</div>
                        <span className="font-bold text-slate-900 dark:text-white">Vodacom M-Pesa</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-600">*1122#</span>
                    </button>

                    <button 
                      onClick={() => handleDial('airtel', payingOrder)}
                      className="p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-xs">AIRTEL</div>
                        <span className="font-bold text-slate-900 dark:text-white">Airtel Money</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-red-600">*501#</span>
                    </button>

                    <button 
                      onClick={() => handleDial('orange', payingOrder)}
                      className="p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xs">ORANGE</div>
                        <span className="font-bold text-slate-900 dark:text-white">Orange Money</span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 group-hover:text-orange-600">*144#</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setPayingOrder(null)}
                    className="w-full py-4 text-slate-400 dark:text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto">
                      <CreditCard className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">Instructions de paiement</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Veuillez suivre ces étapes sur votre téléphone
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Lancez le code USSD</p>
                          <div className="flex items-center gap-3">
                            <code className="text-lg font-black text-emerald-600">{selectedNetwork && getNetworkCode(selectedNetwork)}</code>
                            <button 
                              onClick={() => {
                                const code = selectedNetwork && getNetworkCode(selectedNetwork);
                                if (code) {
                                  window.location.href = `tel:${code.replace('#', '%23')}`;
                                }
                              }}
                              className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm active:scale-90 transition-all"
                            >
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Envoyez le montant exact</p>
                          <p className="text-lg font-black text-emerald-600">{payingOrder.total.toLocaleString()} FC</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Au numéro de la pharmacie</p>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-black text-emerald-600">{payingOrder.pharmacyPhone}</p>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(payingOrder.pharmacyPhone);
                                alert("Numéro copié !");
                              }}
                              className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm active:scale-90 transition-all"
                            >
                              <Copy className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={handleConfirmPayment}
                      disabled={isConfirming}
                      className="w-full py-4.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isConfirming ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          J'ai effectué le paiement
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setPaymentStep('network');
                        setSelectedNetwork(null);
                      }}
                      className="w-full py-4 text-slate-400 dark:text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
