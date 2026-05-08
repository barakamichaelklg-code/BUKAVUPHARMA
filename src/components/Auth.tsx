import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, Phone, CheckCircle2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || 'Utilisateur',
          email: user.email,
          phone: user.phoneNumber || '',
          role: 'user'
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError("Le popup de connexion a été bloqué par votre navigateur.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("La fenêtre de connexion a été fermée.");
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`Ce domaine (${currentDomain}) n'est pas autorisé. Veuillez l'ajouter dans la console Firebase (Authentification > Paramètres > Domaines autorisés).`);
      } else {
        setError(`Erreur de connexion : ${err.message || "Impossible de se connecter"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-[420px] space-y-10">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-[#EFECE5] dark:bg-emerald-950/30 rounded-[1.5rem] mx-auto flex items-center justify-center border border-slate-200/50 dark:border-white/5"
          >
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
              {isLogin ? "Bon retour parmi nous" : "Créer votre compte"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Accédez au réseau de santé certifié de Bukavu.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-3"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              )}
              <span className="font-display">{loading ? "Chargement..." : "Continuer avec Google"}</span>
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
              </div>
              <span className="relative px-4 bg-[#FAF9F6] dark:bg-[#1A1A1A] text-[10px] font-bold text-slate-400 uppercase tracking-widest block mx-auto w-fit">Ou par numéro</span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input 
                  type="tel" 
                  placeholder="Ex: +243..."
                  className="w-full h-14 pl-12 pr-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
              <button 
                onClick={() => setError("Connexion par téléphone en maintenance. Utilisez Google.")}
                className="w-full h-14 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] font-display text-lg"
              >
                Suivant
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest"
          >
            {isLogin ? "Nouveau ici ? Créer un compte" : "Déjà membre ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
