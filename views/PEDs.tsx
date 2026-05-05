import React, { useState, useMemo } from 'react';
import { useStore } from '../contexts/StoreContext';
import { 
  Search, ClipboardCheck, Check, Info, Filter, MapPin, 
  Star, Settings, Plus, X, Trash2, RotateCcw, 
  AlertTriangle, ChevronDown, ListChecks, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PED } from '../types';
import { getPeriodKey } from '../services/timeService';

export const PEDs: React.FC = () => {
  const { 
    state, userClientStates, addPED, updatePED, 
    removePED, toggleActivePED, togglePEDTask, resetPEDData 
  } = useStore();
  
  const [view, setView] = useState<'execution' | 'management'>('execution');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'pending' | 'completed'>('all');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [deletePedConfirmation, setDeletePedConfirmation] = useState<{ isOpen: boolean, ped: PED | null }>({ isOpen: false, ped: null });
  const [focusedPedId, setFocusedPedId] = useState<string | null>(state.activePedIds[0] || (state.peds[0]?.id || null));
  
  // Modal states
  const [isCreating, setIsCreating] = useState(false);
  const [editingPed, setEditingPed] = useState<PED | null>(null);
  
  // Local state for PED form
  const [tempPedName, setTempPedName] = useState('');
  const [tempPedPeriod, setTempPedPeriod] = useState<PED['period']>('Mensal');
  const [tempPedItems, setTempPedItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState('');

  const activePed = useMemo(() => {
    return state.peds.find(p => p.id === focusedPedId) || state.peds[0] || null;
  }, [state.peds, focusedPedId]);

  const clientsWithPED = useMemo(() => {
    if (!activePed) return [];
    
    return state.clients.map(client => {
      const uiState = userClientStates[client.id] || { pedTasks: {} };
      const periodKey = getPeriodKey(activePed.period);
      const checkedItems = (uiState.pedTasks?.[activePed.id] as any)?.[periodKey] || [];
      const progress = activePed.items.length > 0 ? (checkedItems.length / activePed.items.length) * 100 : 0;
      
      return {
        ...client,
        checkedCount: checkedItems.length,
        progress,
        isCompleted: progress >= 100 && activePed.items.length > 0,
        isSaved: uiState.isSaved
      };
    });
  }, [state.clients, userClientStates, activePed]);

  const filteredClients = useMemo(() => {
    return clientsWithPED.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           client.code.includes(searchTerm);
      const matchesSegment = selectedSegment === 'all' || 
                            (selectedSegment === 'pending' && !client.isCompleted) ||
                            (selectedSegment === 'completed' && client.isCompleted);
      return matchesSearch && matchesSegment;
    });
  }, [clientsWithPED, searchTerm, selectedSegment]);

  const openCreateModal = () => {
    setTempPedName('');
    setTempPedPeriod('Mensal');
    setTempPedItems([]);
    setEditingPed(null);
    setIsCreating(true);
  };

  const openEditModal = (ped: PED) => {
    setEditingPed(ped);
    setTempPedName(ped.name);
    setTempPedPeriod(ped.period || 'Mensal');
    setTempPedItems(ped.items);
    setIsCreating(true);
  };

  const handleSavePED = () => {
    if (!tempPedName.trim() || tempPedItems.length === 0) return;
    
    if (editingPed) {
      updatePED(editingPed.id, { name: tempPedName, period: tempPedPeriod, items: tempPedItems });
    } else {
      addPED(tempPedName, tempPedItems, tempPedPeriod);
    }
    setIsCreating(false);
  };

  const addItemToTemplate = () => {
    if (newItemInput.trim() && !tempPedItems.includes(newItemInput.trim().toUpperCase())) {
      setTempPedItems([...tempPedItems, newItemInput.trim().toUpperCase()]);
      setNewItemInput('');
    }
  };

  const removeItemFromTemplate = (index: number) => {
    setTempPedItems(tempPedItems.filter((_, i) => i !== index));
  };

  // Shared Modals
  const modals = (
    <>
      <AnimatePresence>
        {isCreating && (
          <PEDModal 
            isOpen={isCreating} 
            onClose={() => setIsCreating(false)}
            tempPedName={tempPedName}
            setTempPedName={setTempPedName}
            tempPedPeriod={tempPedPeriod}
            setTempPedPeriod={setTempPedPeriod}
            tempPedItems={tempPedItems}
            newItemInput={newItemInput}
            setNewItemInput={setNewItemInput}
            addItemToTemplate={addItemToTemplate}
            removeItemFromTemplate={removeItemFromTemplate}
            handleSavePED={handleSavePED}
            isEditing={!!editingPed}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isResetting && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsResetting(false)}
               className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
             >
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                   <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Zerar Progressos?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-8 leading-relaxed">
                   Isso irá limpar todos os checklists marcados em todos os PDVs para o programa atual.
                </p>
                <div className="flex flex-col gap-3">
                   <button 
                     onClick={() => {
                        resetPEDData();
                        setIsResetting(false);
                     }}
                     className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 transition-all uppercase text-[10px] tracking-widest active:scale-95"
                   >
                      Sim, Zerar Tudo
                   </button>
                   <button 
                     onClick={() => setIsResetting(false)}
                     className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-2xl transition-all uppercase text-[10px] tracking-widest"
                   >
                      Cancelar
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletePedConfirmation.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-white/5 text-center">
               <div className="relative w-32 h-32 mx-auto mb-10">
                  <div className="absolute inset-0 bg-red-500/20 rounded-[3rem] animate-ping duration-1000"></div>
                  <div className="relative w-32 h-32 bg-red-600 text-white rounded-[3rem] flex items-center justify-center shadow-2xl transform hover:rotate-12 transition-transform">
                     <Trash2 size={56} strokeWidth={2.5} />
                  </div>
               </div>
               
               <h3 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">REMOVER?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 font-bold uppercase tracking-widest leading-relaxed">
                  Confirma a exclusão do programa <br/>
                  <span className="text-slate-950 dark:text-white block mt-2">{deletePedConfirmation.ped?.name}</span>
                </p>

                <div className="grid grid-cols-1 gap-3 mt-12">
                  <button 
                    onClick={() => { 
                      if(deletePedConfirmation.ped) { 
                        removePED(deletePedConfirmation.ped.id); 
                        setDeletePedConfirmation({ isOpen: false, ped: null }); 
                      } 
                    }} 
                    className="w-full h-20 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-red-500/40 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Trash2 size={16} /> Confirmar
                  </button>
                  <button 
                    onClick={() => setDeletePedConfirmation({ isOpen: false, ped: null })} 
                    className="w-full h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
               </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  // If no PEDs exist at all, force setup mode
  if (state.peds.length === 0 && !isCreating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 font-bold">
          <ClipboardCheck size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Configure seu PED</h1>
        <p className="text-slate-500 text-sm max-w-xs mb-8 font-medium leading-relaxed">
          Crie agora o seu Programa de Excelência. Você poderá criar múltiplos programas para diferentes cenários.
        </p>
        <button 
          onClick={openCreateModal}
          className="bg-brand-600 hover:bg-brand-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-brand-500/20 transition-all uppercase text-xs tracking-widest active:scale-95"
        >
          Criar Primeiro PED
        </button>

        {modals}
      </div>
    );
  }

  // Management View (Listing all PEDs)
  if (view === 'management') {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('execution')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Voltar</span>
          </button>
          <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tight uppercase">Meus Programas</h1>
          <button 
            onClick={openCreateModal}
            className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="grid gap-4">
          {state.peds.map(ped => (
            <div key={ped.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${state.activePedIds.includes(ped.id) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                    <ClipboardCheck size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{ped.name}</h3>
                       <div className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[6px] font-black uppercase tracking-widest text-slate-500">{ped.period}</div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ped.items.length} Itens no checklist</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openEditModal(ped)}
                    className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={() => {
                        setDeletePedConfirmation({ isOpen: true, ped });
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    toggleActivePED(ped.id);
                  }}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    state.activePedIds.includes(ped.id) 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  {state.activePedIds.includes(ped.id) ? 'Programa Ativo' : 'Ativar Programa'}
                </button>
                <button 
                  onClick={() => {
                    setFocusedPedId(ped.id);
                    setView('execution');
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Ver Execução
                </button>
              </div>
            </div>
          ))}
        </div>

        {modals}
      </div>
    );
  }

  // Execution View
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
              <ClipboardCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight uppercase truncate max-w-[200px]">
                  {activePed?.name || 'PED'}
                </h1>
                <div className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 border border-emerald-500/20">
                  {activePed?.period}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo Agora</p>
                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsResetting(true)}
              title="Zerar Checklist"
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-sm"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={() => setView('management')}
              title="Gerenciar Programas"
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-brand-500 transition-all shadow-sm"
            >
              <ListChecks size={20} />
            </button>
          </div>
        </div>

        {/* Active PED Selection for switching quickly */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {state.peds.map(p => (
            <button 
              key={p.id}
              onClick={() => setFocusedPedId(p.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                focusedPedId === p.id 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : (state.activePedIds.includes(p.id) 
                      ? 'bg-white dark:bg-slate-900 border-emerald-500/30 text-emerald-600' 
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400')
              }`}
            >
              {p.name} {state.activePedIds.includes(p.id) && '✓'}
            </button>
          ))}
          <button 
            onClick={openCreateModal}
            className="whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 flex items-center gap-1"
          >
            <Plus size={10} /> Novo
          </button>
        </div>

        {/* Global Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <ClipboardCheck size={80} className="text-emerald-500" />
           </div>
           <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-between items-end">
                 <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cobertura do Programa</span>
                    <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter tabular-nums text-emerald-600">
                       {Math.round(clientsWithPED.reduce((acc, c) => acc + c.progress, 0) / (clientsWithPED.length || 1))}%
                    </h2>
                 </div>
                 <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">PDVs Excelentes</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                       {clientsWithPED.filter(c => c.isCompleted).length} / {clientsWithPED.length}
                    </p>
                 </div>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                 <div 
                   className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                   style={{ width: `${clientsWithPED.reduce((acc, c) => acc + c.progress, 0) / (clientsWithPED.length || 1)}%` }}
                 ></div>
              </div>
           </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar PDV na carteira..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-brand-500/20 outline-none font-bold text-sm tracking-tight transition-all shadow-sm"
          />
        </div>
        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
           <button onClick={() => setSelectedSegment('all')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedSegment === 'all' ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>TUDO</button>
           <button onClick={() => setSelectedSegment('pending')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedSegment === 'pending' ? 'bg-white dark:bg-emerald-800/20 text-emerald-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>PENDENTES</button>
           <button onClick={() => setSelectedSegment('completed')} className={`whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedSegment === 'completed' ? 'bg-white dark:bg-indigo-800/20 text-indigo-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>CONCLUÍDO</button>
        </div>
      </div>

      {/* Client List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 border rounded-[3rem] border-dashed border-slate-200 dark:border-slate-800">
             <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-4"><Filter size={32}/></div>
             <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Nenhum PDV encontrado</p>
          </div>
        ) : (
          filteredClients.map(client => {
            const isExpanded = expandedClientId === client.id;
            return (
              <div key={client.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${isExpanded ? 'border-brand-500/30' : 'border-slate-100 dark:border-slate-800'}`}>
                 <button 
                   onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                   className="w-full text-left p-6 flex items-center justify-between group"
                 >
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-sm shadow-lg transform group-hover:rotate-3 transition-transform relative`}>
                          {client.name.charAt(0)}
                          {client.isSaved && (
                             <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-md border border-amber-100">
                                <Star size={8} className="text-amber-500" fill="currentColor"/>
                             </div>
                          )}
                       </div>
                       <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">ID #{client.code}</span>
                             {client.isCompleted && <div className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-[6px] font-black uppercase tracking-widest">OK</div>}
                          </div>
                          <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight leading-none truncate max-w-[150px] sm:max-w-[200px]">{client.name}</h3>
                          <p className="text-[8px] font-bold text-slate-400 flex items-center gap-1 mt-1 uppercase tracking-widest">
                             <MapPin size={8} /> {client.city}
                          </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                       <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Status</p>
                          <p className={`text-xs sm:text-sm font-black tabular-nums ${client.isCompleted ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                             {Math.round(client.progress)}%
                          </p>
                       </div>
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-brand-50 text-brand-500 rotate-180' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                          <ChevronDown size={16} strokeWidth={3} />
                       </div>
                    </div>
                 </button>

                 <AnimatePresence>
                    {isExpanded && activePed && (
                       <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: 0.3, ease: 'easeInOut' }}
                       >
                          <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                {activePed.items.map((item) => {
                                   const periodKey = getPeriodKey(activePed.period);
                                   const isChecked = ((userClientStates[client.id]?.pedTasks?.[activePed.id] as any)?.[periodKey] || []).includes(item);
                                   return (
                                      <button 
                                        key={item} 
                                        onClick={() => togglePEDTask(client.id, activePed.id, item)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group/item ${
                                          isChecked 
                                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' 
                                            : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/20'
                                        }`}
                                      >
                                         <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                           isChecked 
                                             ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                             : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                         }`}>
                                            {isChecked && <Check size={12} strokeWidth={4} />}
                                         </div>
                                         <span className={`text-[9px] font-black uppercase tracking-widest flex-1 truncate ${isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                                            {item}
                                         </span>
                                      </button>
                                   );
                                })}
                             </div>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {modals}
    </div>
  );
};

// Modal Component Helper
interface PEDModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempPedName: string;
  setTempPedName: (val: string) => void;
  tempPedPeriod: PED['period'];
  setTempPedPeriod: (val: PED['period']) => void;
  tempPedItems: string[];
  newItemInput: string;
  setNewItemInput: (val: string) => void;
  addItemToTemplate: () => void;
  removeItemFromTemplate: (idx: number) => void;
  handleSavePED: () => void;
  isEditing: boolean;
}

const PEDModal: React.FC<PEDModalProps> = ({
  onClose, tempPedName, setTempPedName, tempPedPeriod, setTempPedPeriod, tempPedItems,
  newItemInput, setNewItemInput, addItemToTemplate,
  removeItemFromTemplate, handleSavePED, isEditing
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         onClick={onClose}
         className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
       />
       <motion.div 
         initial={{ opacity: 0, scale: 0.9, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.9, y: 20 }}
         className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
       >
          <div className="p-8 border-b border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                     {isEditing ? 'Editar PED' : 'Novo PED'}
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuração do Programa</p>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nome do Programa</label>
                    <input 
                      value={tempPedName}
                      onChange={e => setTempPedName(e.target.value.toUpperCase())}
                      placeholder="EX: CAMPANHA DE VERÃO"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Período</label>
                    <select 
                      value={tempPedPeriod}
                      onChange={e => setTempPedPeriod(e.target.value as any)}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500 uppercase h-[52px] sm:h-[60px]"
                    >
                      <option value="Mensal">Mensal</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist de Itens</label>
                      <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{tempPedItems.length} Itens</span>
                   </div>
                   
                   <div className="flex gap-2">
                      <input 
                        value={newItemInput}
                        onChange={e => setNewItemInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && addItemToTemplate()}
                        placeholder="Novo item do checklist..."
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                   />
                      <button 
                        onClick={addItemToTemplate}
                        className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20"
                      >
                         <Plus size={24} />
                      </button>
                   </div>

                   <div className="max-h-52 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                      {tempPedItems.map((item, idx) => (
                         <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 group/row">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black text-[10px]">
                               {idx + 1}
                            </div>
                            <span className="flex-1 font-black text-xs text-slate-700 dark:text-slate-300 tracking-tight">{item}</span>
                            <button 
                              onClick={() => removeItemFromTemplate(idx)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                      ))}
                      {tempPedItems.length === 0 && (
                         <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum item adicionado</p>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>

          <div className="p-8 bg-slate-50 dark:bg-slate-950/50">
             <button 
               onClick={handleSavePED}
               disabled={!tempPedName.trim() || tempPedItems.length === 0}
               className="w-full py-5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-400 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 transition-all uppercase text-xs tracking-widest active:scale-95"
             >
                {isEditing ? 'Atualizar Programa' : 'Criar Programa'}
             </button>
          </div>
       </motion.div>
    </div>
  );
};
