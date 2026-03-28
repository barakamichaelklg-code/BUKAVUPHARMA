import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Phone, Lock, ShieldCheck } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user document if it doesn't exist
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
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-8 space-y-10 font-sans transition-colors duration-500">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-figma-lg shadow-emerald-200 dark:shadow-emerald-900/20 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <ShieldCheck className="w-12 h-12 text-white relative z-10" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight font-display">Bienvenue</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[260px] mx-auto font-medium leading-relaxed">
            Accédez aux pharmacies certifiées de Bukavu et achetez vos médicaments en toute sécurité.
          </p>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto space-y-6">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          className="w-full py-4.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-4 shadow-figma hover:bg-slate-50 dark:hover:bg-white/5 hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span className="font-display">Continuer avec Google</span>
        </motion.button>

        <div className="relative flex items-center justify-center py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
          </div>
          <span className="relative px-5 bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Ou via téléphone</span>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="tel" 
              placeholder="Numéro de téléphone"
              className="w-full pl-14 pr-5 py-4.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-3xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-figma font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4.5 bg-emerald-600 text-white rounded-3xl font-bold shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all font-display text-lg"
          >
            {isLogin ? "Se connecter" : "Créer un compte"}
          </motion.button>
        </div>
      </div>

      <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
        {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="ml-2 text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors underline-offset-4 hover:underline"
        >
          {isLogin ? "S'inscrire" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}
