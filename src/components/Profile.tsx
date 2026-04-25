import React, { useState, useEffect } from 'react';
import { User, updateProfile, updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, History, LogOut, Heart, ShoppingBag, 
  ChevronRight, User as UserIcon, ShieldCheck,
  ArrowLeft, Save, Lock, Phone, UserCircle,
  CreditCard, Calendar, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, Timestamp, FirestoreError } from 'firebase/firestore';

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

interface UserProfile {
  name: string;
  phone: string;
  email: string;
  role: string;
}

interface Order {
  id: string;
  total: number;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  createdAt: Timestamp;
  items: any[];
  pharmacyId: string;
}

export default function Profile({ user }: { user: User }) {
  const { isDarkMode } = useTheme();
  const [view, setView] = useState<'main' | 'settings' | 'history'>('main');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Settings Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    const fetchProfile = async () => {
      const path = `users/${user.uid}`;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setNewName(data.name);
          setNewPhone(data.phone);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    };
    fetchProfile();
  }, [user.uid]);

  useEffect(() => {
    if (view === 'history') {
      const fetchOrders = async () => {
        setLoading(true);
        const path = 'orders';
        try {
          const q = query(
            collection(db, path),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const ordersData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Order[];
          setOrders(ordersData);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, path);
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [view, user.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    const path = `users/${user.uid}`;
    try {
      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: newName,
        phone: newPhone
      });

      // Update Auth Profile
      await updateProfile(user, { displayName: newName });

      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      setProfile(prev => prev ? { ...prev, name: newName, phone: newPhone } : null);
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
      setNewPassword('');
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('operationType')) {
        throw error;
      }
      console.error("Update error:", error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Veuillez vous reconnecter pour changer votre mot de passe.' });
      } else {
        setMessage({ type: 'error', text: 'Une erreur est survenue lors de la mise à jour.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <ShoppingBag className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulé';
      case 'delivered': return 'Livré';
      default: return status;
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
      {view === 'settings' ? (
        <motion.div 
          key="settings"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-6 space-y-8 min-h-screen transition-colors duration-500"
        >
          <div className="flex items-center gap-4">
            <button onClick={() => setView('main')} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90">
              <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Paramètres du compte</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {message.text && (
              <div className={`p-4 rounded-2xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nom complet</label>
                <div className="relative group">
                  <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="tel" 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ex: +243..."
                    className="w-full pl-14 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nouveau mot de passe (optionnel)</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    className="w-full pl-14 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4.5 bg-emerald-600 text-white rounded-3xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all font-display text-lg flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </form>
        </motion.div>
      ) : view === 'history' ? (
        <motion.div 
          key="history"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-6 space-y-8 min-h-screen transition-colors duration-500"
        >
          <div className="flex items-center gap-4">
            <button onClick={() => setView('main')} className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90">
              <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Historique des paiements</h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Chargement...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto">
                <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun paiement trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl shadow-figma space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Commande #{order.id.slice(-6).toUpperCase()}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          <Calendar className="w-3 h-3" />
                          {order.createdAt instanceof Timestamp 
                            ? order.createdAt.toDate().toLocaleDateString('fr-FR') 
                            : new Date(order.createdAt as any).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-600 font-display">{order.total.toLocaleString()} FC</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        {getStatusIcon(order.status)}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{getStatusLabel(order.status)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div 
          key="main"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="p-6 space-y-10 font-sans min-h-screen transition-colors duration-500"
        >
          {/* Profile Header */}
          <div className="flex flex-col items-center space-y-5">
            <div className="relative group">
              <div className="w-28 h-28 bg-emerald-100 dark:bg-emerald-900/30 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-figma-lg group-hover:scale-105 transition-transform duration-500">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600">
                <span className="text-3xl font-bold text-white font-display">
                  {user.displayName?.[0] || user.email?.[0]}
                </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white dark:bg-slate-800 rounded-2xl shadow-figma flex items-center justify-center border border-slate-100 dark:border-white/10">
                <UserIcon className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                {profile?.name || user.displayName || 'Utilisateur'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide">{user.email}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <motion.div 
              whileHover={{ y: -2 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 shadow-sm text-center space-y-3 group hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-[1rem] flex items-center justify-center mx-auto mb-1">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-display">{orders.length}</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Commandes</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -2 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 shadow-sm text-center space-y-3 group hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[1rem] flex items-center justify-center mx-auto mb-1">
                <Heart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-display">4</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Favoris</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 shadow-sm text-center space-y-3 group hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[1rem] flex items-center justify-center mx-auto mb-1">
                <ShieldCheck className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-display">1</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Comptes</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 shadow-sm text-center space-y-3 group hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[1rem] flex items-center justify-center mx-auto mb-1">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-display">24h</p>
              <p className="text-xs text-slate-500 font-medium tracking-wide">Support</p>
            </motion.div>
          </div>

          {/* Menu Options */}
          <div className="space-y-4 max-w-2xl mx-auto w-full">
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Paramètres</h3>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setView('settings')}
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] text-slate-700 dark:text-slate-200 hover:shadow-md transition-all text-left flex items-center justify-between shadow-sm group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[1rem] flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                    <Settings className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-500" />
                  </div>
                  <span className="text-base font-medium">Paramètres du compte</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors" />
              </button>

              <button 
                onClick={() => setView('history')}
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] text-slate-700 dark:text-slate-200 hover:shadow-md transition-all text-left flex items-center justify-between shadow-sm group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[1rem] flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                    <History className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-500" />
                  </div>
                  <span className="text-base font-medium">Historique des paiements</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors" />
              </button>

              <a 
                href="https://wa.me/243979307569" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] text-slate-700 dark:text-slate-200 hover:shadow-md transition-all text-left flex items-center justify-between shadow-sm group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-[1rem] flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                    <Phone className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-500" />
                  </div>
                  <span className="text-base font-medium">Support Client (WhatsApp)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors" />
              </a>
            </div>

            <div className="pt-6">
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 text-rose-600 dark:text-rose-400 rounded-[1.5rem] font-medium hover:shadow-md transition-all text-center flex items-center justify-center gap-3 active:scale-[0.98] shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-base">Se déconnecter</span>
              </button>
            </div>
          </div>

          {/* Version Info */}
          <div className="text-center pt-4">
            <p className="text-[10px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-widest">PharmaBukavu v1.0.4</p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto">
                <LogOut className="w-10 h-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-display">Déconnexion</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => auth.signOut()}
                  className="py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-600 transition-all active:scale-95"
                >
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

