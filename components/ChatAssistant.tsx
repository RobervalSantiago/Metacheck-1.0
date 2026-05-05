
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2, Bot, User, Trash2, Mic, MicOff } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { createChatSession, prepareContext } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  { label: '📊 Resumo do Dia', prompt: 'Me dê um resumo executivo da minha performance hoje.' },
  { label: '🎯 Falta para a Meta', prompt: 'Quanto exatamente falta para bater a meta do ciclo e qual o ritmo necessário?' },
  { label: '🤝 Dica de Negociação', prompt: 'Analise meu cenário atual e me dê dicas para negociar melhor com clientes difíceis.' },
  { label: '📉 Indústrias', prompt: 'Quais indústrias estão com performance baixa?' },
  { label: '🚀 Motivação', prompt: 'Me dê uma frase curta de motivação para vendas.' },
];

const SESSION_KEY = 'metacheck_chat_history';

// Extend window interface for SpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const ChatAssistant: React.FC = () => {
  const { state, currentGoal, userSales, userActivations } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Load initial messages from Session Storage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return [{ 
      id: '1', 
      sender: 'bot', 
      text: `Olá, ${state.currentUser?.name.split(' ')[0] || 'Vendedor'}! Sou seu Coach de Vendas.\n\nToque em uma das opções abaixo ou digite sua dúvida para começarmos a bater essa meta! 🚀`,
      timestamp: new Date().toISOString()
    }];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Dynamic Suggestions State
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial chat creation
  useEffect(() => {
    if (isOpen && !chatSessionRef.current && state.currentUser) {
      initChat();
    }
  }, [isOpen, state.currentUser]);

  // Persistence Effect
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  // Scroll on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const initChat = async () => {
    if (!state.currentUser) return;
    try {
      const chat = await createChatSession(state.currentUser, state.clients, currentGoal, userSales, userActivations);
      chatSessionRef.current = chat;
    } catch (err) {
      console.error("Chat init error", err);
    }
  };

  // --- VOICE INPUT LOGIC ---
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' + transcript : transcript));
      
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  // -------------------------

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !state.currentUser) return;

    const userMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Reset height of textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const currentContext = prepareContext(state.currentUser, state.clients, currentGoal, userSales, userActivations);
      const contextUpdateMsg = `
        [ATUALIZAÇÃO DE CONTEXTO EM TEMPO REAL]
        Use estes dados frescos para responder:
        ${currentContext}
        
        PERGUNTA DO USUÁRIO: "${textToSend}"
      `;

      if (!chatSessionRef.current) {
        await initChat();
      }

      if (chatSessionRef.current) {
        try {
          const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: contextUpdateMsg });
          processBotResponse(result.text || "Sem resposta.");
        } catch (error: any) {
          console.warn("First attempt failed, retrying session...", error);
          await initChat();
          if (chatSessionRef.current) {
             const retryResult: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: contextUpdateMsg });
             processBotResponse(retryResult.text || "Sem resposta.");
          } else {
             throw new Error("Failed to re-init chat");
          }
        }
      }
    } catch (error) {
      console.error("Chat Error Final", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'bot', 
        text: "Ocorreu um erro na conexão com a IA. Por favor, tente novamente. 🤖",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const processBotResponse = (rawText: string) => {
    // PARSE DYNAMIC SUGGESTIONS
    // Look for [SUGGESTIONS: ... | ... ] pattern
    const suggestionRegex = /\[SUGGESTIONS:(.*?)\]/;
    const match = rawText.match(suggestionRegex);
    let cleanText = rawText;

    if (match && match[1]) {
        // Extract suggestions
        const suggestionsString = match[1];
        const newSuggestions = suggestionsString.split('|').map(s => s.trim());
        setDynamicSuggestions(newSuggestions);
        
        // Remove the tag from the message to display
        cleanText = rawText.replace(match[0], '').trim();
    }

    addBotMessage(cleanText);
  };

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      sender: 'bot', 
      text: text,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const clearChat = () => {
    const initialMsg: Message = { 
      id: Date.now().toString(), 
      sender: 'bot', 
      text: 'Histórico limpo. Vamos começar de novo! O que você precisa?', 
      timestamp: new Date().toISOString()
    };
    setMessages([initialMsg]);
    setDynamicSuggestions([]); // Clear dynamic suggestions
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Simple formatter for bold text (**text**) and newlines
  const formatMessageText = (text: string) => {
    let safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-inherit">$1</strong>');
    safe = safe.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    safe = safe.replace(/\n\*/g, '<br/>•');
    safe = safe.replace(/\n-/g, '<br/>•');
    safe = safe.replace(/\n/g, '<br />');
    
    return safe;
  };

  const currentSuggestions = dynamicSuggestions.length > 0 ? dynamicSuggestions.map(s => ({ label: s, prompt: s })) : DEFAULT_SUGGESTIONS;

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[100] bg-brand-600 hover:bg-brand-700 text-white p-4 rounded-full shadow-lg shadow-brand-600/30 transition-all hover:scale-110 active:scale-95 animate-in slide-in-from-bottom-10"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-[100] transition-all duration-300 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col
            ${isMinimized 
              ? 'w-72 h-14 bottom-20 md:bottom-8 right-4 md:right-8 rounded-t-xl' 
              : 'inset-0 md:inset-auto md:bottom-8 md:right-8 md:w-[400px] md:h-[600px] md:rounded-2xl'
            }`}
        >
          {/* Header */}
          <div className="bg-brand-600 p-4 flex justify-between items-center text-white shrink-0">
             <div className="flex items-center gap-2">
               <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                 <Bot size={20} />
               </div>
               <div>
                 <h3 className="font-bold text-sm">Coach de Vendas</h3>
                 {!isMinimized && <div className="flex items-center gap-1.5 opacity-80"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span><span className="text-[10px] font-medium">Online</span></div>}
               </div>
             </div>
             <div className="flex items-center gap-1">
               <button onClick={clearChat} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Limpar Conversa"><Trash2 size={16} /></button>
               <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
               </button>
               <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={16} /></button>
             </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/50 space-y-4 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm leading-relaxed ${
                       msg.sender === 'user' 
                       ? 'bg-brand-600 text-white rounded-tr-none' 
                       : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800'
                     }`}>
                        <div dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} />
                        <span className={`text-[10px] block mt-1 opacity-60 ${msg.sender === 'user' ? 'text-white' : 'text-slate-400'}`}>
                           {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                     </div>
                  </div>
                ))}
                
                {isTyping && (
                   <div className="flex justify-start">
                     <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none p-4 shadow-sm">
                        <div className="flex gap-1.5">
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                           <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                     </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions (Quick Actions) */}
              {!isTyping && (
                 <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 animate-in fade-in slide-in-from-bottom-2">
                    {currentSuggestions.map((s, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSend(s.prompt)}
                        className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm"
                      >
                        {s.label}
                      </button>
                    ))}
                 </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 pb-safe">
                 <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                    <button
                        onClick={toggleListening}
                        className={`p-2 rounded-xl transition-colors mb-0.5 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-brand-600'}`}
                        title="Entrada de Voz"
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    
                    <textarea 
                      ref={textareaRef}
                      value={inputText}
                      onChange={handleInput}
                      onKeyDown={handleKeyPress}
                      placeholder={isListening ? "Ouvindo..." : "Pergunte sobre suas metas..."}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 font-medium resize-none max-h-32 py-2 scrollbar-hide"
                      rows={1}
                    />
                    <button 
                      onClick={() => handleSend()}
                      disabled={!inputText.trim() || isTyping}
                      className="p-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors mb-0.5 shadow-sm"
                    >
                      <Send size={16} />
                    </button>
                 </div>
                 {isListening && <p className="text-[10px] text-center text-red-500 mt-1 font-bold animate-pulse">Gravando... Fale agora.</p>}
                 {!isListening && <p className="text-[10px] text-center text-slate-400 mt-2 font-medium opacity-80">A IA pode cometer erros. Verifique informações importantes.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};