import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Phone, Lock, ShieldCheck } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
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
      console.log("Starting Google login...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Google login successful:", user.email);
      
      // Create user document if it doesn't exist
      const userPath = `users/${user.uid}`;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            name: user.displayName || 'Utilisateur',
            email: user.email,
            phone: user.phoneNumber || '',
            role: 'user' // Default role
          });
        }
      } catch (err: any) {
        console.error("Firestore user creation error (non-fatal):", err);
      }
    } catch (err: any) {
      console.error("Login error details:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Le popup de connexion a été bloqué par votre navigateur. Veuillez autoriser les fenêtres surgissantes pour ce site.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("La fenêtre de connexion a été fermée avant la fin de l'opération.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // This often happens if the user clicks twice quickly
        console.log("Popup request cancelled due to another request.");
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setError(`Ce domaine (${currentDomain}) n'est pas autorisé. Veuillez l'ajouter dans la console Firebase (Authentification > Paramètres > Domaines autorisés).`);
      } else {
        setError(`Erreur de connexion : ${err.message || "Impossible de se connecter avec Google"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-8 space-y-10 font-sans transition-colors duration-500">
      <div className="text-center space-y-5">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-20 h-20 bg-emerald-600 rounded-[1.5rem] mx-auto flex items-center justify-center shadow-md relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <ShieldCheck className="w-10 h-10 text-white relative z-10" />
        </motion.div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight font-display">Bienvenue</h1>
          <p className="text-sm text-slate-500 max-w-[260px] mx-auto font-medium leading-relaxed">
            Accédez aux pharmacies certifiées de Bukavu et achetez vos médicaments en toute sécurité.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto space-y-6">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-[1.2rem] text-sm font-medium flex items-center gap-3"
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          )}
          <span className="font-display text-base">{loading ? "Connexion..." : "Continuer avec Google"}</span>
        </motion.button>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/60 dark:border-white/10"></div>
          </div>
          <span className="relative px-5 bg-[#FAF9F6] dark:bg-[#1A1A1A] text-xs font-semibold text-slate-400 uppercase tracking-widest">Ou via téléphone</span>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="tel" 
              placeholder="Numéro de téléphone"
              className="w-full pl-14 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm font-medium placeholder:text-slate-400 text-slate-900 dark:text-white"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setError("La connexion par téléphone n'est pas encore disponible. Veuillez utiliser Google.")}
            className="w-full py-4 bg-emerald-600 text-white rounded-[1.5rem] font-medium hover:bg-emerald-700 transition-all font-display text-lg shadow-sm"
          >
            {isLogin ? "Se connecter" : "Créer un compte"}
          </motion.button>
        </div>
      </div>

      <p className="text-sm text-slate-500 font-medium">
        {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors hover:underline"
        >
          {isLogin ? "S'inscrire" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}
