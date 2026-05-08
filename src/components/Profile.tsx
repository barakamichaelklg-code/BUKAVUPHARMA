import React, { useState, useEffect } from 'react';
import { User, updateProfile, updatePassword } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, History, LogOut, Heart, ShoppingBag, 
  ChevronRight, User as UserIcon, ShieldCheck,
  ArrowLeft, Save, Lock, Phone, UserCircle,
  CreditCard, Calendar, CheckCircle2, Clock, XCircle, Info
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, Timestamp, FirestoreError } from 'firebase/firestore';
import { cn } from '../lib/utils';

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

function StatsBadge({ icon, value, label, color }: { icon: React.ReactNode, value: string, label: string, color: 'emerald' | 'slate' }) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/50 dark:border-white/5 shadow-sm text-center space-y-3"
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2",
        color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-50 dark:bg-white/5 text-slate-400"
      )}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 dark:text-white font-display leading-none">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

function ProfileButton({ icon, label, desc, onClick, as: Component = 'button', ...props }: any) {
  return (
    <Component 
      onClick={onClick}
      className="w-full p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-[1.75rem] text-left flex items-center justify-between group hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none hover:border-emerald-500/30 transition-all active:scale-[0.98] transition-all duration-300"
      {...props}
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors duration-300">
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        <div>
          <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">{label}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">{desc}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-all duration-300 group-hover:translate-x-1" />
    </Component>
  );
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
          className="max-w-4xl mx-auto space-y-12 font-sans transition-colors duration-500"
        >
          {/* Profile Header */}
          <div className="flex flex-col items-center space-y-6 pt-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-[#E8E2D2] dark:bg-[#2A2A2A] rounded-[3rem] flex items-center justify-center overflow-hidden border-4 border-white dark:border-white/5 shadow-2xl transition-transform duration-700 group-hover:scale-105">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 group-hover:bg-slate-800 transition-colors">
                    <span className="text-4xl font-bold text-white font-display">
                      {user.displayName?.[0] || user.email?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-emerald-600 rounded-[1.25rem] shadow-xl flex items-center justify-center border-4 border-[#FAF9F6] dark:border-[#121212]">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                {profile?.name || user.displayName || 'Citoyen Bukavu'}
              </h2>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.email}</span>
                <span className="w-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Membre Vérifié</span>
              </div>
            </div>
          </div>

          {/* New Stats Board */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsBadge icon={<ShoppingBag className="w-5 h-5" />} value={orders.length.toString()} label="Commandes" color="emerald" />
            <StatsBadge icon={<Heart className="w-5 h-5" />} value="4" label="Favoris" color="slate" />
            <StatsBadge icon={<Clock className="w-5 h-5" />} value="24/7" label="Support" color="slate" />
            <StatsBadge icon={<CreditCard className="w-5 h-5" />} value="Wallet" label="Paiement" color="slate" />
          </div>

          {/* Menu Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-2">Mon Compte</h3>
              <div className="space-y-3">
                <ProfileButton 
                  onClick={() => setView('settings')}
                  icon={<Settings className="w-5 h-5" />}
                  label="Paramètres de sécurité"
                  desc="Gérer votre profil et mot de passe"
                />
                <ProfileButton 
                  onClick={() => setView('history')}
                  icon={<History className="w-5 h-5" />}
                  label="Historique d'achats"
                  desc="Consulter vos anciennes commandes"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-2">Aide & Contact</h3>
              <div className="space-y-3">
                <ProfileButton 
                  as="a"
                  href="https://wa.me/243979307569"
                  icon={<Phone className="w-5 h-5" />}
                  label="Assistance Prioritaire"
                  desc="Contacter un pharmacien conseil"
                />
                <ProfileButton 
                  as="a"
                  href="#"
                  icon={<Info className="w-5 h-5" />}
                  label="À propos du réseau"
                  desc="Certifications et engagement qualité"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col items-center gap-6">
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-3 px-8 py-4 text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/5 rounded-2xl transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              Se déconnecter de la session
            </button>
            
            <p className="text-[10px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-[0.3em]">
              Bukavu Health Network • v1.0.4
            </p>
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

