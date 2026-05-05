import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  Lock, 
  Mail, 
  Loader2, 
  Eye, 
  EyeOff, 
  Target, 
  TrendingUp, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [regPass, setRegPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Preencha os campos de acesso.'); return; }
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await signIn(email, password);
      // Auth state change will automatically redirect via App.tsx
    } catch (err: any) {
      const msg = err?.message || 'Erro ao fazer login.';
      if (msg.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirme seu email antes de entrar. Verifique sua caixa de entrada.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !regEmail || !regPass || !confirmPass) { setError('Preencha todos os campos do formulário.'); return; }
    if (regPass.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (regPass !== confirmPass) { setError('As senhas não coincidem.'); return; }
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const fullName = `${firstName} ${lastName}`;
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=6366f1&color=fff&bold=true`;
      
      await signUp(regEmail, regPass, {
        name: fullName,
        avatar,
        userCode,
      });

      setSuccess('Conta criada com sucesso! Você já está logado.');
      // Auth state change will automatically redirect via App.tsx
    } catch (err: any) {
      const msg = err?.message || 'Erro ao criar conta.';
      if (msg.includes('User already registered')) {
        setError('Este email já está cadastrado. Tente fazer login.');
      } else if (msg.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (msg.includes('Unable to validate email')) {
        setError('Email inválido. Verifique o formato.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30 overflow-x-hidden">
      {/* Visual Side Panel - Desktop Only */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_top,#4f46e5_0,transparent_40%)] opacity-40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_right_bottom,#3b82f6_0,transparent_40%)] opacity-40"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 p-20 max-w-2xl">
           <motion.div 
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
             className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-white/10 mb-10 shadow-2xl"
           >
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]"></div>
              <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.4em] font-mono">Performance em Tempo Real</span>
           </motion.div>
           
           <motion.h1 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="text-8xl font-black text-white mb-8 tracking-tighter leading-[0.85] drop-shadow-2xl"
           >
             A META<br/> 
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-500">CONQUISTADA.</span>
           </motion.h1>
           
           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.4 }}
             className="text-xl text-slate-400 font-medium leading-relaxed mb-12 max-w-lg"
           >
             A plataforma inteligente para consultores que não aceitam nada menos que a excelência. Dados precisos, rotas otimizadas e resultados exponenciais.
           </motion.p>
           
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.6 }}
             className="grid grid-cols-2 gap-6"
           >
              {[
                { icon: Target, title: 'Foco Total', desc: 'Gestão por PDV', color: 'text-brand-400' },
                { icon: TrendingUp, title: 'Performance', desc: 'Forecast em tempo real', color: 'text-emerald-400' }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 hover:bg-white/10 transition-colors group cursor-default shadow-xl">
                   <item.icon className={`${item.color} mb-5 group-hover:scale-110 transition-transform`} size={38} />
                   <h3 className="font-black text-white text-lg tracking-tight mb-2">{item.title}</h3>
                   <p className="text-xs text-slate-500 font-black uppercase tracking-widest leading-none">{item.desc}</p>
                </div>
              ))}
           </motion.div>
        </div>
      </div>

      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-16 relative overflow-hidden bg-white dark:bg-slate-950">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] aspect-square bg-brand-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] aspect-square bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-12 relative z-10"
        >
           {/* Header & Logo */}
           <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl mb-10 shadow-2xl shadow-brand-600/40 ring-4 ring-brand-500/10"
              >
                M
              </motion.div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">
                {isRegistering ? 'FAÇA PARTE' : 'BEM-VINDO'}
              </h2>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">
                <ShieldCheck size={14} className="text-brand-500" /> MetaCheck
              </div>
           </div>

           {/* Auth Toggle Tabs */}
           <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1.5 rounded-[2rem] backdrop-blur-sm shadow-inner overflow-hidden relative border border-slate-100 dark:border-slate-800">
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-xl"
                initial={false}
                animate={{ x: isRegistering ? '100%' : '0%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <button 
                onClick={() => { setIsRegistering(false); setError(''); setSuccess(''); }} 
                className={`relative z-10 flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${!isRegistering ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                ENTRAR
              </button>
              <button 
                onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); }} 
                className={`relative z-10 flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${isRegistering ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}
              >
                CADASTRAR
              </button>
           </div>

           <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-5 rounded-2xl flex items-center gap-4 text-red-600 dark:text-red-400 text-xs font-bold leading-tight shadow-sm"
                >
                   <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-xl text-red-600">
                     <AlertCircle size={20} />
                   </div>
                   {error}
                </motion.div>
              )}
           </AnimatePresence>

           <AnimatePresence mode="wait">
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-5 rounded-2xl flex items-center gap-4 text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-tight shadow-sm"
                >
                   <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-xl text-emerald-600">
                     <ShieldCheck size={20} />
                   </div>
                   {success}
                </motion.div>
              )}
           </AnimatePresence>

           <AnimatePresence mode="wait">
             {!isRegistering ? (
               <motion.form 
                 key="login"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 onSubmit={handleLoginSubmit} 
                 className="space-y-6"
               >
                 <div className="space-y-8">
                   <div className="group space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-4 tracking-[0.2em] group-focus-within:text-brand-500 transition-colors flex items-center gap-2">
                        <Mail size={12} /> Email de Acesso
                     </label>
                     <div className="relative">
                        <input 
                          disabled={isLoading} 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          className="w-full px-8 h-[76px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] font-bold text-lg outline-none focus:ring-8 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm" 
                          placeholder="consultor@metacheck.com"
                        />
                     </div>
                   </div>

                   <div className="group space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-4 tracking-[0.2em] group-focus-within:text-brand-500 transition-colors flex items-center gap-2">
                        <Lock size={12} /> Chave de Segurança
                     </label>
                     <div className="relative">
                        <input 
                          disabled={isLoading} 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="w-full px-8 pr-16 h-[76px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] font-bold text-lg outline-none focus:ring-8 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm" 
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors">
                          {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                        </button>
                     </div>
                   </div>
                 </div>

                 <motion.button 
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.99 }}
                   disabled={isLoading} 
                   type="submit" 
                   className="w-full h-24 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 disabled:opacity-50 text-white font-black rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 relative group overflow-hidden"
                 >
                    {isLoading ? (
                      <Loader2 size={28} className="animate-spin text-white" />
                    ) : (
                      <>
                        Entrar 
                        <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:translate-x-1 transition-transform">
                          <ChevronRight size={20} />
                        </span>
                      </>
                    )}
                 </motion.button>
               </motion.form>
             ) : (
               <motion.form 
                 key="register"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 onSubmit={handleRegisterSubmit} 
                 className="space-y-6"
               >
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Nome</label>
                      <input disabled={isLoading} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" placeholder="João"/>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Sobrenome</label>
                      <input disabled={isLoading} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" placeholder="Silva"/>
                   </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Email Profissional</label>
                    <input disabled={isLoading} type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" placeholder="seuemail@empresa.com"/>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Código do Usuário</label>
                    <input 
                      disabled={isLoading} 
                      type="text" 
                      value={userCode} 
                      onChange={(e) => setUserCode(e.target.value.replace(/\D/g, ''))} 
                      className="w-full px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" 
                      placeholder="SOMENTE NÚMEROS"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Senha</label>
                       <input disabled={isLoading} type="password" value={regPass} onChange={(e) => setRegPass(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" placeholder="••••••••"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Confirmar</label>
                       <input disabled={isLoading} type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-sm outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm" placeholder="••••••••"/>
                    </div>
                 </div>

                 <div className="text-[10px] text-slate-400 dark:text-slate-600 font-medium ml-3">
                   Mínimo de 6 caracteres para a senha.
                 </div>

                 <motion.button 
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.99 }}
                   disabled={isLoading} 
                   type="submit" 
                   className="w-full h-20 bg-slate-950 dark:bg-brand-500 disabled:opacity-50 text-white font-black rounded-[2rem] shadow-xl transition-all text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 mt-6 active:scale-[0.98]"
                 >
                    {isLoading ? <Loader2 size={24} className="animate-spin text-white" /> : <>Criar Minha Conta <Zap size={20} className="text-brand-400 fill-brand-400" /></>}
                 </motion.button>
               </motion.form>
             )}
           </AnimatePresence>

           <div className="pt-10 flex flex-col items-center gap-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none">@ 2026 METACHECK V 1.0</p>
           </div>
        </motion.div>
      </div>

      {/* Floating Elements for extra flair */}
      <div className="fixed top-20 left-20 w-32 h-32 bg-brand-500/5 blur-[80px] pointer-events-none"></div>
      <div className="fixed bottom-20 right-20 w-40 h-40 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
    </div>
  );
};
