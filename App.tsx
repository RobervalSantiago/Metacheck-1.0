
import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Admin } from './views/Admin';
import { Clients } from './views/Clients';
import { Profile } from './views/Profile';
import { Login } from './views/Login';
import { Negotiate } from './views/Negotiate';
import { PEDs } from './views/PEDs';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { syncTimeWithServer } from './services/timeService';
import { Loader2 } from 'lucide-react';

// Outermost wrapper: Auth first, then Store
const AppWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </AuthProvider>
  );
};

// Loading screen while checking auth session
const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-brand-600/40 ring-4 ring-brand-500/10 animate-pulse">
        M
      </div>
      <Loader2 size={32} className="animate-spin text-brand-500" />
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
    </div>
  </div>
);

// Main App Component
const App: React.FC = () => {
  const { user, loading } = useAuth();
  const { 
    state, currentView,
    addActivationLog, addClient, removeClient, updateGoal, updateUser, updateClientUIState, resetMonthlyData,
    currentGoal, userSales, userActivations, userClientStates
  } = useStore();

  useEffect(() => {
    syncTimeWithServer();
  }, []);

  // Show loading while checking auth session
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated -> show login
  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      {currentView === 'dashboard' && (
        <Dashboard
          user={user}
          clients={state.clients}
          goal={currentGoal}
          sales={userSales}
          activations={userActivations}
          clientStates={userClientStates}
        />
      )}

      {currentView === 'clients' && (
        <Clients
          clients={state.clients}
          onAddClient={addClient}
          onRemoveClient={removeClient}
        />
      )}

      {currentView === 'negotiate' && (
        <Negotiate />
      )}

      {currentView === 'peds' && (
        <PEDs />
      )}

      {currentView === 'admin' && (
        <Admin
          users={state.users}
          goals={state.goals}
          onUpdateGoal={updateGoal}
          onUpdateUser={updateUser}
        />
      )}

      {currentView === 'profile' && (
        <Profile
          user={user}
          onUpdateUser={updateUser}
          goal={currentGoal}
          onUpdateGoal={updateGoal}
          onResetData={resetMonthlyData}
        />
      )}
    </Layout>
  );
};

export default AppWrapper;