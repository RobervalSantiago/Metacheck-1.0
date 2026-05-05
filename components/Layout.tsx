
import React, { useState } from 'react';
import { View } from '../types';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Settings, LogOut, Building2, Sun, Moon, Handshake, ClipboardCheck } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentView, setCurrentView, state, isDarkMode, toggleTheme } = useStore();
  const { signOut } = useAuth();
  const currentUser = state.currentUser;
  const [imgError, setImgError] = useState(false);

  if (!currentUser) return null;

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => setCurrentView(view)}
        className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all ${
          isActive 
            ? 'text-brand-600 dark:text-brand-400' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
        }`}
      >
        <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-brand-50 dark:bg-brand-900/40' : 'bg-transparent'}`}>
            <Icon size={20} strokeWidth={isActive ? 3 : 2} />
        </div>
        <span className={`text-[9px] font-black mt-1 tracking-widest uppercase ${isActive ? 'opacity-100' : 'opacity-50'}`}>{label}</span>
      </button>
    );
  };

  const UserAvatar = ({ className }: { className: string }) => {
     if (imgError || !currentUser.avatar) {
         return (
             <div className={`${className} bg-brand-600 text-white flex items-center justify-center font-bold`}>
                 {currentUser.name.charAt(0)}
             </div>
         );
     }
     return (
         <img 
            src={currentUser.avatar} 
            className={`${className} object-cover`} 
            alt="User" 
            onError={() => setImgError(true)}
         />
     );
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative overflow-x-hidden">
      
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-screen z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">M</div>
          <span className="font-black text-slate-900 dark:text-white tracking-tighter text-2xl">MetaCheck</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === 'dashboard' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setCurrentView('clients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === 'clients' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Building2 size={20} />
            <span>Carteira</span>
          </button>
          <button 
            onClick={() => setCurrentView('negotiate')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === 'negotiate' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Handshake size={20} />
            <span>Negociar</span>
          </button>
          <button 
            onClick={() => setCurrentView('peds')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentView === 'peds' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <ClipboardCheck size={20} />
            <span>PED's</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <button onClick={() => setCurrentView('profile')} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
              <UserAvatar className="w-full h-full" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Vendedor</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
              title="Alterar Tema"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Modern BEES-style Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex justify-between items-center px-4 z-40 w-full">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2 group outline-none"
          >
             <div className="w-9 h-9 bg-brand-600 rounded-[12px] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-brand-500/20 group-active:scale-90 transition-transform">M</div>
             <div className="flex flex-col">
                <span className="font-black text-slate-900 dark:text-white tracking-tight text-base leading-none">MetaCheck</span>
                <span className="text-[8px] font-black text-brand-600 uppercase tracking-widest leading-none mt-1">Sales Force</span>
             </div>
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme} 
              className="w-10 h-10 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl hover:text-brand-500 active:scale-90 transition-all border border-slate-100 dark:border-slate-700/50"
              title="Alterar Tema"
            >
               {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => signOut()} 
              className="w-10 h-10 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl hover:text-red-500 active:scale-90 transition-all border border-slate-100 dark:border-slate-700/50"
              title="Sair"
            >
               <LogOut size={18} />
            </button>
            <button onClick={() => setCurrentView('profile')} className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-90 transition-all" title="Perfil">
              <UserAvatar className="w-full h-full" />
            </button>
          </div>
        </header>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 overflow-x-hidden pt-20 sm:pt-24 lg:pt-12 pb-24 lg:pb-12 px-4 sm:px-6 md:px-8 lg:px-12 w-full max-w-[640px] md:max-w-3xl lg:max-w-7xl mx-auto custom-scrollbar">
          {children}
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-50 h-[calc(72px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(0,0,0,0.08)] w-full px-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Início" />
          <NavItem view="clients" icon={Building2} label="Carteira" />
          <NavItem view="peds" icon={ClipboardCheck} label="PED's" />
          <NavItem view="negotiate" icon={Handshake} label="Negociar" />
        </nav>
      </div>
    </div>
  );
};
