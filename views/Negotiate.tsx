
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DollarSign, Package, Copy, Check, Search, FileText, Repeat, Handshake, Zap, Sparkles, Star, X, Calculator, TrendingUp, Plus, Minus, Trash2, LayoutGrid, List, History, Users } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { Client, Combo, ComboItem } from '../types';

const QUICK_PRODUCTS: { code: string; name: string; price: number; }[] = [];

interface NegotiationHistoryItem {
  id: string;
  timestamp: number;
  clientName: string;
  productName: string;
  price: number;
  quantity: number;
  type: 'bonus' | 'discount';
  bonusQty: number;
  bonusType: 'same' | 'different';
  bonusProduct: string;
  bonusProductPrice: number;
  targetPrice: number;
}

export const Negotiate: React.FC = () => {
  const { state, userClientStates, addNegotiationLog, addSellOutLog } = useStore();
  const history = useMemo(() => state.negotiationLogs || [], [state.negotiationLogs]);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productName, setProductName] = useState(''); 
  const [quantity, setQuantity] = useState('');
  const [pricePalm, setPricePalm] = useState('');
  const [negotiationType, setNegotiationType] = useState<'bonus' | 'discount'>('bonus');
  const [bonusType, setBonusType] = useState<'same' | 'different'>('same');
  const [bonusProduct, setBonusProduct] = useState(''); 
  const [bonusQty, setBonusQty] = useState('');
  const [bonusProductPrice, setBonusProductPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'combos'>('generator');
  
  // SELL-OUT State
  const [sellOutHead, setSellOutHead] = useState({
    supervisor: '',
    consultor: state.currentUser?.name || '',
    reason: '',
    period: '',
    observation: ''
  });
  
  const [sellOutEntries, setSellOutEntries] = useState([{
    id: '1',
    client: '',
    product: '',
    quantity: '',
    costPrice: '',
    validity: '',
    valuePerUnit: ''
  }]);

  const [sellOutActiveSearch, setSellOutActiveSearch] = useState<{ id: string; type: 'client' | 'product' } | null>(null);
  const [sellOutResult, setSellOutResult] = useState('');
  const [sellOutCopySuccess, setSellOutCopySuccess] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const filteredClients = useMemo(() => {
    // Se estiver pesquisando, busca em todos os clientes
    if (clientSearch) {
      return state.clients.filter(c => 
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
        c.code.includes(clientSearch)
      ).slice(0, 10);
    }

    let clients = state.clients;

    // Se NÃO estiver pesquisando e estiver no modo Gerador (Bonus), 
    // mostra sugestões baseadas em negociados ou favoritados
    if (negotiationType === 'bonus') {
      const negotiatedClientNames = new Set(history.map(h => h.clientName));
      const officialSaleClientNames = new Set(state.salesLogs.filter(s => s.userId === state.currentUser?.id).map(s => s.clientName));
      
      clients = clients.filter(c => {
        const isFavorited = userClientStates[c.id]?.isSaved;
        const hasNegotiated = negotiatedClientNames.has(c.name) || officialSaleClientNames.has(c.name);
        return isFavorited || hasNegotiated;
      });
    }

    return clients.slice(0, 5);
  }, [state.clients, clientSearch, negotiationType, history, userClientStates, state.salesLogs, state.currentUser?.id]);

  const smartProducts = useMemo(() => {
    const historyMap = new Map();
    history.forEach(h => {
      if (!historyMap.has(h.productName)) {
        historyMap.set(h.productName, { name: h.productName, price: h.price, source: 'history', lastDate: h.timestamp });
      }
    });
    QUICK_PRODUCTS.forEach(qp => {
      const fullName = `${qp.code} - ${qp.name}`;
      if (!historyMap.has(fullName)) {
        historyMap.set(fullName, { name: fullName, price: qp.price, source: 'catalog', lastDate: 0 });
      }
    });
    let all = Array.from(historyMap.values());
    if (productName) all = all.filter(p => p.name.toLowerCase().includes(productName.toLowerCase()));
    return all.sort((a, b) => b.lastDate - a.lastDate).slice(0, 8);
  }, [productName, history]);

  const smartActions = useMemo(() => {
    const actions: { label: string; type: 'bonus' | 'discount'; value: any; source: 'history' | 'default' }[] = [];
    
    // 1. Contextual suggestions based on history for this product
    if (productName) {
      const productHistory = history.filter(h => h.productName === productName);
      if (productHistory.length > 0) {
        const seen = new Set();
        productHistory.forEach(h => {
          const key = h.type === 'bonus' ? `bonus-${h.bonusQty}-${h.quantity}` : `disc-${h.targetPrice}`;
          if (!seen.has(key)) {
            seen.add(key);
            actions.push({
              label: h.type === 'bonus' ? `Pague ${h.quantity}, ganhe ${h.bonusQty}` : `Preço R$ ${h.targetPrice}`,
              type: h.type,
              value: h.type === 'bonus' ? { bonusQty: h.bonusQty, quantity: h.quantity } : h.targetPrice,
              source: 'history'
            });
          }
        });
      }
    }

    // 2. Add defaults if few history items
    const defaults: { label: string; type: 'bonus' | 'discount'; value: any; source: 'default' }[] = [
      { label: 'Leve 10, Ganhe 1', type: 'bonus', value: { bonusQty: 1, quantity: 10 }, source: 'default' },
      { label: 'Leve 5, Ganhe 1', type: 'bonus', value: { bonusQty: 1, quantity: 5 }, source: 'default' },
      { label: '10% OFF', type: 'discount', value: 0.90, source: 'default' },
      { label: '15% OFF', type: 'discount', value: 0.85, source: 'default' },
    ];

    defaults.forEach(d => {
      const exists = actions.some(a => a.label === d.label);
      if (!exists && actions.length < 6) {
        actions.push(d);
      }
    });

    return actions.slice(0, 6);
  }, [productName, history]);

  const applyAction = (action: any) => {
    if (action.type === 'bonus') {
      setNegotiationType('bonus');
      setBonusQty(action.value.bonusQty.toString());
      setQuantity(action.value.quantity.toString());
      setBonusType('same');
    } else {
      setNegotiationType('discount');
      if (typeof action.value === 'number') {
        const currentPrice = parseFloat(pricePalm.replace(',', '.')) || 0;
        if (currentPrice > 0) {
          setTargetPrice((currentPrice * action.value).toFixed(2));
        }
      } else {
        setTargetPrice(action.value.toString());
      }
    }
  };

  const genStats = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePalm.replace(',', '.')) || 0;
    const totalValueSystem = qty * price;
    let finalPrice = price;
    let bonusPercentage = 0;
    let bPrice = 0;
    let diffValueTotal = 0;

    if (negotiationType === 'bonus') {
      const bQty = parseFloat(bonusQty) || 0;
      bonusPercentage = qty > 0 ? (bQty / qty) * 100 : 0;
      
      if (bonusType === 'same') {
        bPrice = price;
        diffValueTotal = bQty * price;
        finalPrice = (qty + bQty) > 0 ? (qty * price) / (qty + bQty) : price;
      } else {
        bPrice = parseFloat(bonusProductPrice.replace(',', '.')) || 0;
        diffValueTotal = bQty * bPrice;
        finalPrice = qty > 0 ? (totalValueSystem - diffValueTotal) / qty : price;
      }
    } else {
      const target = parseFloat(targetPrice.replace(',', '.')) || price;
      finalPrice = target;
      diffValueTotal = (price - target) * qty;
      bonusPercentage = price > 0 ? ((price - target) / price) * 100 : 0;
    }
    return { totalValueSystem, finalPrice, bonusPercentage, diffValueTotal, bPrice };
  }, [quantity, pricePalm, bonusQty, targetPrice, negotiationType, bonusType, bonusProductPrice]);

  const handleGenerate = () => {
    if (!selectedClient) return alert("Selecione um cliente");
    if (!productName) return alert("Informe o produto");
    if (!quantity || !pricePalm) return alert("Informe quantidade e preço");

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatPercent = (val: number) => val.toFixed(1).replace('.', ',');
    
    let text = "";

    const consultorLine = `*Consultor:* ${state.currentUser?.userCode ? state.currentUser.userCode + ' - ' : ''}${state.currentUser?.name || ''}\n\n`;

    if (negotiationType === 'bonus') {
      text = "*PROPOSTA COMERCIAL*\n\n" +
             consultorLine +
             `*Cod/Cliente:* ${selectedClient.code} - ${selectedClient.name}\n` +
             `*Cod/Produto:* ${productName.toUpperCase()}\n` +
             `*Quantidade:* ${quantity} und\n` +
             `*Preço Tabela:* R$ ${formatCurrency(parseFloat(pricePalm))}\n` +
             `*Valor do Pedido:* R$ ${formatCurrency(genStats.totalValueSystem)}\n\n` +
             "*CONDIÇÃO*\n" +
             `*Produto bnf:* ${bonusType === 'same' ? productName.toUpperCase() : bonusProduct.toUpperCase()}\n` +
             `*Qtd bnf:* ${bonusQty} und\n` +
             `*Valor bnf:* R$ ${formatCurrency(genStats.bPrice)}\n` +
             `*Percentual:* ${formatPercent(genStats.bonusPercentage)}%\n` +
             "---------------------------------------\n" +
             `*PREÇO FINAL:* R$ ${formatCurrency(genStats.finalPrice)}\n` +
             "---------------------------------------";
    } else {
      text = "*PROPOSTA COMERCIAL*\n\n" +
             consultorLine +
             `*Cod/Cliente:* ${selectedClient.code} - ${selectedClient.name}\n` +
             `*Cod/Produto:* ${productName.toUpperCase()}\n` +
             `*Quantidade:* ${quantity} und\n` +
             `*Preço Tabela:* R$ ${formatCurrency(parseFloat(pricePalm))}\n` +
             `*Valor do Pedido:* R$ ${formatCurrency(genStats.totalValueSystem)}\n\n` +
             "*CONDIÇÃO DIRETO NO PREÇO*\n" +
             `*Preço Alvo:* R$ ${formatCurrency(parseFloat(targetPrice))}\n` +
             `*Investimento:* R$ ${formatCurrency(genStats.diffValueTotal)}\n` +
             `*Percentual:* ${formatPercent(genStats.bonusPercentage)}%\n` +
             "---------------------------------------\n" +
             `*PREÇO FINAL:* R$ ${formatCurrency(genStats.finalPrice)}\n` +
             "---------------------------------------";
    }

    setGeneratedText(text);
    
    const newItem = { 
      timestamp: Date.now(), 
      clientName: selectedClient.name, 
      productName, 
      price: parseFloat(pricePalm), 
      quantity: parseInt(quantity), 
      type: negotiationType, 
      bonusQty: parseInt(bonusQty || '0'), 
      bonusType, 
      bonusProduct, 
      bonusProductPrice: parseFloat(bonusProductPrice || '0'), 
      targetPrice: parseFloat(targetPrice || '0') 
    };
    
    addNegotiationLog(newItem);

    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const generateSellOutText = () => {
    const { supervisor, consultor, reason, period, observation } = sellOutHead;
    
    if (!supervisor || !consultor || !reason || !period || sellOutEntries.some(e => !e.client || !e.product || !e.quantity || !e.validity || !e.valuePerUnit)) {
      alert("Por favor, preencha todos os campos do cabeçalho e de todos os itens da solicitação.");
      return;
    }

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const formatDate = (dateStr: string) => {
      if (!dateStr || !dateStr.includes('-')) return dateStr;
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}`;
    };

    let totalInvestment = 0;
    const entriesText = sellOutEntries.map((e) => {
      const qty = parseFloat(e.quantity) || 0;
      const vPU = parseFloat(e.valuePerUnit.replace(',', '.')) || 0;
      const subtotal = qty * vPU;
      totalInvestment += subtotal;

      return `Cód/Cliente: ${e.client.toUpperCase()}\n\n` +
             `Cod/Produto: ${e.product.toUpperCase()}\n` +
             `Validade: ${formatDate(e.validity)}\n` +
             `Quantidade: ${e.quantity} und\n` +
             `Sell-out por unidade: R$ ${formatCurrency(vPU)}\n` +
             `Valor total da ação: R$ ${formatCurrency(subtotal)}`;
    }).join('\n\n---\n\n');

    const text = `SOLICITAÇÃO DE SELL-OUT \n\n` +
                 `Supervisor: ${supervisor.toUpperCase()}\n` +
                 `Cód/Consultor: ${consultor.toUpperCase()}\n\n` +
                 entriesText + 
                 `\n\nMotivo da solicitação: ${reason.toUpperCase()}\n` +
                 `Período da ação: ${period.toUpperCase()}\n` +
                 `Observação: ${observation.toUpperCase()}`;

    setSellOutResult(text);
    
    addSellOutLog({
      timestamp: Date.now(),
      supervisor,
      consultor,
      period,
      reason,
      observation,
      entries: sellOutEntries
    });
  };

  const addSellOutEntry = () => {
    setSellOutEntries([...sellOutEntries, {
      id: Date.now().toString(),
      client: '',
      product: '',
      quantity: '',
      costPrice: '',
      validity: '',
      valuePerUnit: ''
    }]);
  };

  const removeSellOutEntry = (id: string) => {
    if (sellOutEntries.length > 1) {
      setSellOutEntries(sellOutEntries.filter(e => e.id !== id));
    }
  };

  const updateSellOutEntry = (id: string, field: string, value: string) => {
    setSellOutEntries(sellOutEntries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 px-1">
        <div className="pt-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Negociação
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Estratégias e Simuladores</p>
        </div>

        {/* Modern Tab Bar */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.5rem] w-full">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'generator' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xl' : 'text-slate-500'}`}
          >
            <Calculator size={14} /> Simulador
          </button>
          <button 
            onClick={() => setActiveTab('combos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'combos' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xl' : 'text-slate-500'}`}
          >
            <Package size={14} /> SELL-OUT
          </button>
        </div>
      </div>

      {activeTab === 'generator' ? (
        <div className="grid grid-cols-1 gap-6 px-1">
          <div className="space-y-6">
            {/* Step 1: Client Selection */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative z-30">
               <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600"><Users size={16}/></div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Cliente</label>
               </div>
               <div className="relative">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                 <input 
                   type="text" 
                   value={clientSearch} 
                   onChange={(e) => { setClientSearch(e.target.value); setIsClientDropdownOpen(true); }} 
                   onFocus={() => setIsClientDropdownOpen(true)} 
                   className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-black" 
                   placeholder="Nome ou código do PDV..." 
                 />
                 {isClientDropdownOpen && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl max-h-60 overflow-y-auto z-40 p-2">
                     {filteredClients.map(c => (
                       <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(c.name); setIsClientDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                         <p className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">{c.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">COD: {c.code}</p>
                       </button>
                     ))}
                   </div>
                 )}
               </div>
            </div>

            {/* Step 2: Product Details */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative z-20">
               <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600"><Package size={16}/></div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto & Preço</label>
               </div>
               
               <div className="space-y-4">
                 <div className="relative">
                   <input 
                     type="text" 
                     value={productName} 
                     onChange={(e) => { setProductName(e.target.value); setIsProductDropdownOpen(true); }} 
                     onFocus={() => setIsProductDropdownOpen(true)} 
                     className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-black uppercase" 
                     placeholder="Buscar SKU no catálogo..." 
                   />
                   {isProductDropdownOpen && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl max-h-60 overflow-y-auto z-40 p-2">
                       {smartProducts.map((p, i) => (
                         <button key={i} onClick={() => { setProductName(p.name); setIsProductDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex justify-between items-center group">
                           <div className="min-w-0 pr-4">
                              <p className="font-black text-xs text-slate-700 dark:text-slate-300 truncate uppercase group-hover:text-brand-600 transition-colors">{p.name}</p>
                              {p.source === 'history' && <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">HISTÓRICO</span>}
                           </div>

                         </button>
                       ))}
                     </div>
                   )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Quantidade</span>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden h-[60px] border-2 border-transparent focus-within:border-brand-500/30 focus-within:ring-8 focus-within:ring-brand-500/5 transition-all group shadow-sm">
                          <button onClick={() => { const v = Math.max(0, (parseInt(quantity) || 0) - 1); setQuantity(v.toString()); }} className="px-5 text-slate-300 hover:text-brand-600 active:scale-90 transition-all">
                              <Minus size={18} strokeWidth={3} />
                          </button>
                          <input type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-transparent border-none text-center p-0 text-xl font-black outline-none focus:ring-0 tabular-nums text-slate-900 dark:text-white" />
                          <button onClick={() => { const v = (parseInt(quantity) || 0) + 1; setQuantity(v.toString()); }} className="px-5 text-slate-300 hover:text-brand-600 active:scale-90 transition-all">
                              <Plus size={18} strokeWidth={3} />
                          </button>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Preço Tabela</span>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm group-focus-within:text-brand-500 transition-colors">R$</span>
                        <input type="number" step="0.01" value={pricePalm} onChange={(e) => setPricePalm(e.target.value)} className="w-full pl-10 pr-4 h-[60px] bg-slate-50 dark:bg-slate-950 border-2 border-transparent rounded-2xl text-lg font-black outline-none focus:border-brand-500/30 focus:ring-8 focus:ring-brand-500/5 transition-all tabular-nums text-slate-900 dark:text-white" />
                      </div>
                   </div>
                 </div>
               </div>
            </div>

            {/* Step 3: Investment Condition */}
            <div className="bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl text-white">
                <div className="flex items-center gap-2 mb-6 text-brand-400">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Configurar Oferta</span>
                </div>

                <div className="flex bg-white/5 p-1.5 rounded-[1.25rem] border border-white/5 mb-8">
                    <button 
                        onClick={() => setNegotiationType('bonus')} 
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${negotiationType === 'bonus' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Bonificação
                    </button>
                    <button 
                        onClick={() => setNegotiationType('discount')} 
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${negotiationType === 'discount' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Desconto
                    </button>
                </div>
              
                {negotiationType === 'bonus' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase ml-2 tracking-widest">Qtd Brinde</span>
                           <div className="flex items-center bg-white/5 rounded-2xl h-[54px] sm:h-[60px] border border-white/5 group focus-within:border-brand-500/50 transition-all">
                                <button onClick={() => { const v = Math.max(0, (parseInt(bonusQty) || 0) - 1); setBonusQty(v.toString()); }} className="px-3 sm:px-4 text-white/40 hover:text-white transition-all">
                                    <Minus size={16} strokeWidth={3} />
                                </button>
                                <input type="number" value={bonusQty} onChange={(e) => setBonusQty(e.target.value)} className="w-full bg-transparent text-center p-0 text-base sm:text-xl font-black outline-none focus:ring-0 tabular-nums" />
                                <button onClick={() => { const v = (parseInt(bonusQty) || 0) + 1; setBonusQty(v.toString()); }} className="px-3 sm:px-4 text-white/40 hover:text-white transition-all">
                                    <Plus size={16} strokeWidth={3} />
                                </button>
                           </div>
                        </div>
                        <div className="space-y-1.5">
                           <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase ml-2 tracking-widest">Tipo</span>
                           <select value={bonusType} onChange={(e) => setBonusType(e.target.value as any)} className="w-full px-3 sm:px-4 h-[54px] sm:h-[60px] bg-white/5 rounded-2xl text-[9px] sm:text-[10px] font-black outline-none border border-white/5 uppercase appearance-none cursor-pointer focus:ring-1 focus:ring-brand-500">
                              <option value="same">Mesmo SKU</option>
                              <option value="different">SKU Diferente</option>
                           </select>
                        </div>
                    </div>
                    
                    {bonusType === 'different' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4">
                           <div className="space-y-1.5">
                                <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase ml-2 tracking-widest">Produto Brinde</span>
                                <input value={bonusProduct} onChange={e => setBonusProduct(e.target.value)} placeholder="NOME DO SKU" className="w-full px-4 h-11 sm:h-[50px] bg-white/5 rounded-xl text-[10px] sm:text-xs font-black outline-none border border-white/5 uppercase" />
                           </div>
                           <div className="space-y-1.5">
                                <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase ml-2 tracking-widest">Preço</span>
                                <input type="number" step="0.01" value={bonusProductPrice} onChange={e => setBonusProductPrice(e.target.value)} className="w-full px-4 h-11 sm:h-[50px] bg-white/5 rounded-xl text-[10px] sm:text-xs font-black outline-none border border-white/5 tabular-nums" />
                           </div>
                        </div>
                    )}

                    <div className="pt-4 sm:pt-6 border-t border-white/5">
                        <div className="flex justify-between items-baseline">
                            <div className="space-y-1">
                                <p className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Preço Líquido</p>
                                <p className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums tracking-tighter">R$ {genStats.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[8px] sm:text-[10px] font-black bg-brand-500/20 text-brand-400 px-2 sm:px-3 py-1 rounded-full border border-brand-500/20">{genStats.bonusPercentage.toFixed(1).replace('.', ',')}% DESC</span>
                            </div>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-1.5">
                       <span className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase ml-2 tracking-widest">Alvo Desejado</span>
                       <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 text-lg sm:text-xl font-black">R$</span>
                            <input type="number" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="w-full pl-16 pr-6 h-16 sm:h-[80px] bg-white/5 border border-white/5 rounded-[1.5rem] text-3xl sm:text-4xl font-black outline-none focus:ring-2 focus:ring-brand-500 tabular-nums tracking-tighter" />
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 px-2">
                        <span className="text-indigo-300 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Impacto</span>
                        <span className="text-emerald-400 font-black text-xl sm:text-2xl">-{genStats.bonusPercentage.toFixed(1).replace('.', ',')}%</span>
                    </div>
                  </div>
                )}
            </div>



            <button 
                onClick={handleGenerate} 
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black h-[72px] rounded-[1.75rem] shadow-[0_20px_50px_rgba(37,99,235,0.25)] flex items-center justify-center transition-all active:scale-[0.98] uppercase px-8 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <FileText size={20} strokeWidth={3} className="shrink-0" />
                    <span className="text-[13px] tracking-[0.15em] leading-tight text-center">Gerar Script de Negociação</span>
                </div>
            </button>

            {/* Output Panel */}
            {generatedText && (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6" ref={resultRef}>
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Script Gerado</h3>
                    <button 
                        onClick={() => { if (generatedText) { navigator.clipboard.writeText(generatedText); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); } }} 
                        className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase ${copySuccess ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-brand-600'}`}
                    >
                        {copySuccess ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                    </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <textarea 
                        readOnly 
                        value={generatedText} 
                        className="w-full h-60 bg-transparent border-none text-xs font-black text-slate-800 dark:text-slate-300 resize-none leading-relaxed outline-none" 
                        spellCheck={false}
                    />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 px-1 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-8">
            {/* Cabeçalho da Solicitação */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600"><TrendingUp size={20}/></div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-none">Solicitação de SELL-OUT</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dados Gerais da Ação</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Supervisor</label>
                  <input 
                    value={sellOutHead.supervisor} 
                    onChange={e => setSellOutHead({...sellOutHead, supervisor: e.target.value})} 
                    placeholder="Nome do Supervisor"
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Consultor</label>
                  <input 
                    value={sellOutHead.consultor} 
                    onChange={e => setSellOutHead({...sellOutHead, consultor: e.target.value})} 
                    placeholder="Seu Nome"
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Período da Ação</label>
                  <input 
                    value={sellOutHead.period} 
                    onChange={e => setSellOutHead({...sellOutHead, period: e.target.value})} 
                    placeholder="Ex: 01/05 a 15/05"
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Motivo</label>
                  <input 
                    value={sellOutHead.reason} 
                    onChange={e => setSellOutHead({...sellOutHead, reason: e.target.value})} 
                    placeholder="Ex: DATA CURTA / GIRO"
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Observação</label>
                  <input 
                    value={sellOutHead.observation} 
                    onChange={e => setSellOutHead({...sellOutHead, observation: e.target.value})} 
                    placeholder="Espaço para observações adicionais"
                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Lista de Itens */}
            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itens da Solicitação</span>
                <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{sellOutEntries.length} {sellOutEntries.length === 1 ? 'ITEM' : 'ITENS'}</span>
              </div>

              <div className="space-y-8">
                {sellOutEntries.map((entry, idx) => (
                  <div key={entry.id} className="relative bg-slate-50 dark:bg-slate-950/20 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-in slide-in-from-right-4 duration-300">
                    <div className="absolute -top-3 left-8 bg-brand-600 text-white text-[9px] font-black px-4 py-1 rounded-full shadow-lg">ITEM {idx + 1}</div>
                    {sellOutEntries.length > 1 && (
                      <button 
                        onClick={() => removeSellOutEntry(entry.id)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-slate-800 text-red-400 rounded-full shadow-md flex items-center justify-center hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                      {/* Cliente */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Cod/Cliente</label>
                        <div className="relative">
                          <input 
                            value={entry.client} 
                            onChange={e => {
                              updateSellOutEntry(entry.id, 'client', e.target.value);
                              setClientSearch(e.target.value);
                              setSellOutActiveSearch({ id: entry.id, type: 'client' });
                            }} 
                            onFocus={() => {
                              setSellOutActiveSearch({ id: entry.id, type: 'client' });
                              setIsClientDropdownOpen(true);
                            }}
                            placeholder="Buscar Cliente..."
                            className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                          />
                          {sellOutActiveSearch?.id === entry.id && sellOutActiveSearch?.type === 'client' && isClientDropdownOpen && filteredClients.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto">
                              {filteredClients.map(c => (
                                <button 
                                  key={c.id} 
                                  onClick={() => {
                                    updateSellOutEntry(entry.id, 'client', `${c.code} - ${c.name}`);
                                    setIsClientDropdownOpen(false);
                                    setSellOutActiveSearch(null);
                                  }} 
                                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                  <p className="font-black text-[10px] text-slate-800 dark:text-white uppercase truncate">{c.name}</p>
                                  <p className="text-[8px] font-bold text-slate-400">COD: {c.code}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Produto */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Cod/Produto</label>
                        <div className="relative">
                          <input 
                            value={entry.product} 
                            onChange={e => {
                              updateSellOutEntry(entry.id, 'product', e.target.value);
                              setProductName(e.target.value);
                              setSellOutActiveSearch({ id: entry.id, type: 'product' });
                            }} 
                            onFocus={() => {
                              setSellOutActiveSearch({ id: entry.id, type: 'product' });
                              setIsProductDropdownOpen(true);
                            }}
                            placeholder="Buscar Produto..."
                            className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" 
                          />
                          {sellOutActiveSearch?.id === entry.id && sellOutActiveSearch?.type === 'product' && isProductDropdownOpen && smartProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto">
                              {smartProducts.map((p, i) => (
                                <button 
                                  key={i} 
                                  onClick={() => {
                                    updateSellOutEntry(entry.id, 'product', p.name);
                                    setIsProductDropdownOpen(false);
                                    setSellOutActiveSearch(null);
                                  }} 
                                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                  <p className="font-black text-[10px] text-slate-800 dark:text-white uppercase truncate">{p.name}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Blocos de Valor e Data */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Quantidade</label>
                          <input type="number" value={entry.quantity} onChange={e => updateSellOutEntry(entry.id, 'quantity', e.target.value)} placeholder="0" className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 tabular-nums" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Validade</label>
                          <input type="date" value={entry.validity} onChange={e => updateSellOutEntry(entry.id, 'validity', e.target.value)} className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 uppercase" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Custo Cli.</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">R$</span>
                            <input type="number" step="0.01" value={entry.costPrice} onChange={e => updateSellOutEntry(entry.id, 'costPrice', e.target.value)} placeholder="0,00" className="w-full h-12 pl-8 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 tabular-nums" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sell-out</label>
                            <div className="flex gap-1">
                              {[25, 50].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => {
                                    const cost = parseFloat(entry.costPrice.replace(',', '.')) || 0;
                                    if (cost > 0) {
                                      updateSellOutEntry(entry.id, 'valuePerUnit', (cost * (pct / 100)).toFixed(2));
                                    }
                                  }}
                                  className="text-[7px] font-black bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded hover:bg-brand-500 hover:text-white transition-all"
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">R$</span>
                            <input type="number" step="0.01" value={entry.valuePerUnit} onChange={e => updateSellOutEntry(entry.id, 'valuePerUnit', e.target.value)} placeholder="0,00" className="w-full h-12 pl-8 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-brand-500 tabular-nums" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={addSellOutEntry}
                className="w-full py-5 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-600 hover:border-brand-500 transition-all flex items-center justify-center gap-3 group shadow-sm"
              >
                <Plus size={18} strokeWidth={4} className="group-hover:rotate-90 transition-transform" /> Adicionar Mais Itens
              </button>
            </div>

            <div className="pt-4">
              <button 
                onClick={generateSellOutText}
                className="w-full h-16 bg-brand-600 hover:bg-brand-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <FileText size={18} /> Gerar Solicitação Completa
              </button>
            </div>
          </div>

          {sellOutResult && (
            <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-[10px] text-white/40 uppercase tracking-widest">Script para WhatsApp</h3>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(sellOutResult);
                    setSellOutCopySuccess(true);
                    setTimeout(() => setSellOutCopySuccess(false), 2000);
                  }}
                  className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase ${sellOutCopySuccess ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-400 bg-white/5 border border-white/5 hover:text-white'}`}
                >
                  {sellOutCopySuccess ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
              <div className="bg-white/5 rounded-3xl border border-white/5 p-6">
                <pre className="text-[11px] sm:text-xs font-black text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                  {sellOutResult}
                </pre>
              </div>
            </div>
          )}

          {state.sellOutLogs && state.sellOutLogs.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] p-6 sm:p-8 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-slate-400" />
                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Últimas Solicitações (Clique para reutilizar)</h3>
              </div>
              <div className="space-y-3">
                {state.sellOutLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-brand-500 transition-colors shadow-sm" onClick={() => {
                    setSellOutHead({
                      supervisor: log.supervisor,
                      consultor: log.consultor,
                      reason: log.reason,
                      period: log.period,
                      observation: log.observation
                    });
                    setSellOutEntries(log.entries);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">{log.entries.length} {log.entries.length === 1 ? 'Item' : 'Itens'}</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{log.entries.map(e => e.client).join(', ')}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate mt-1">Motivo: {log.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
