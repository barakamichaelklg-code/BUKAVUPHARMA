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
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500 bg-transparent">
      {/* Header */}
      <header className="bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 dark:border-white/5 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-[0.8rem] flex items-center justify-center shadow-md">
              <Pill className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-display transition-colors duration-500">PharmaBukavu</h1>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[0.8rem] transition-all active:scale-95"
              aria-label="Basculer le thème"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleSearchClick}
              className="p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[0.8rem] transition-all active:scale-95"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-32 transition-colors duration-500 flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        
        {/* Global Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 pb-8">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium mb-2">
            <Pill className="w-5 h-5 text-emerald-600" />
            <span>PharmaBukavu</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2 hover:text-emerald-600 transition-colors">
              <MapPin className="w-4 h-4" />
              <span>Bukavu, RDC</span>
            </div>
            
            <a href="mailto:barakamichaelklg@gmail.com" className="flex items-center gap-2 hover:text-emerald-600 transition-colors">
              <Mail className="w-4 h-4" />
              <span>barakamichaelklg@gmail.com</span>
            </a>
            
            <a href="https://wa.me/243979307569" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-emerald-600 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>+243 979 307 569</span>
            </a>
          </div>
          
          <div className="text-xs mt-4 opacity-70">
            © {new Date().getFullYear()} PharmaBukavu. Tous droits réservés.
          </div>
        </footer>
      </main>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md border-t border-slate-200/60 dark:border-white/5 z-50 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-colors duration-500">
        <div className="max-w-7xl mx-auto flex justify-around items-center h-20 px-4">
          <NavButton to="/" icon={<Home className="w-6 h-6" />} label="Accueil" />
          <NavButton to="/map" icon={<MapIcon className="w-6 h-6" />} label="Carte" />
          <NavButton to="/messages" icon={<MessageCircle className="w-6 h-6" />} label="Messages" />
          <NavButton to="/cart" icon={<ShoppingCart className="w-6 h-6" />} label="Panier" />
          <NavButton to="/profile" icon={<User className="w-6 h-6" />} label="Profil" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1.5 px-4 py-2 transition-all relative group",
          isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        )
      }
    >
      <div className="relative">
        {icon}
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full opacity-0 group-[.active]:opacity-100 transition-opacity shadow-sm" />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors duration-500">{label}</span>
    </NavLink>
  );
}
