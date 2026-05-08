import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Map as MapIcon, ShoppingCart, User, Search, Pill, Moon, Sun, MapPin, Mail, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleSearchClick = () => {
    const searchInput = document.getElementById('main-search');
    if (searchInput) {
      searchInput.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500 bg-[#FAF9F6] dark:bg-[#121212]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F6]/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5">
        <div className="max-w-6xl mx-auto h-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-none transition-transform active:scale-95">
              <Pill className="text-white dark:text-slate-900 w-5 h-5" />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-display">PharmaBukavu</h1>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em]">Réseau Certifié</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all active:scale-95"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleSearchClick}
              className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all active:scale-95 hidden sm:block"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-24 pb-32">
        <div className="px-4 sm:px-6">
          <Outlet />
        </div>
        
        {/* Global Footer */}
        <footer className="mt-20 py-16 border-t border-slate-100 dark:border-white/5">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center">
                  <Pill className="text-white dark:text-slate-900 w-4 h-4" />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white font-display">PharmaBukavu</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs font-medium">
                La première plateforme de recherche et commande de médicaments certifiés à Bukavu, Sud-Kivu.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest text-[10px]">Contact</h4>
              <ul className="space-y-3 text-slate-500 dark:text-slate-400 font-medium">
                <li className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Bukavu, RDC
                </li>
                <li>
                  <a href="mailto:contact@pharmabukavu.cd" className="flex items-center gap-3 hover:text-emerald-600 transition-colors">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    contact@pharmabukavu.cd
                  </a>
                </li>
                <li>
                  <a href="tel:+243979307569" className="flex items-center gap-3 hover:text-emerald-600 transition-colors">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    +243 979 307 569
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <h4 className="font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest text-[10px]">Newsletter</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Recevez des alertes sur la disponibilité des médicaments essentiels.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="votre@email.com"
                  className="flex-1 h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 outline-none focus:border-emerald-500 transition-all font-medium"
                />
                <button className="px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-emerald-600 transition-all">
                  Ok
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-slate-50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            <span>© {new Date().getFullYear()} PharmaBukavu</span>
            <div className="flex gap-8">
              <a href="#" className="hover:text-emerald-600 transition-colors">Mentions Légales</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Confidentialité</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(calc(100%-2rem),480px)] z-50">
        <div className="bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl rounded-[2rem] h-20 px-8 flex justify-between items-center shadow-2xl shadow-slate-900/20 dark:shadow-none border border-white/10 dark:border-slate-900/10">
          <NavButton to="/" icon={<Home className="w-6 h-6" />} />
          <NavButton to="/map" icon={<MapIcon className="w-6 h-6" />} />
          <NavButton to="/messages" icon={<MessageCircle className="w-6 h-6" />} label="Messages" />
          <NavButton to="/cart" icon={<ShoppingCart className="w-6 h-6" />} />
          <NavButton to="/profile" icon={<User className="w-6 h-6" />} />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ to, icon, label }: { to: string; icon: React.ReactNode; label?: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative flex items-center justify-center w-12 h-12 transition-all duration-500 rounded-2xl group",
          isActive 
            ? "text-emerald-400 dark:text-emerald-600 scale-110" 
            : "text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900"
        )
      }
    >
      {icon}
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full opacity-0 group-[.active]:opacity-100 transition-opacity" />
    </NavLink>
  );
}
