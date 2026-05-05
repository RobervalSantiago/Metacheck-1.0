
import { GoogleGenAI } from "@google/genai";
import { User, Goal, SaleLog, ActivationLog, Client } from '../types';
import { getTrustedDate } from './timeService';

export const prepareContext = (user: User, clients: Client[], goal: Goal | undefined, sales: SaleLog[], activations: ActivationLog[]) => {
  const todayDate = getTrustedDate();
  const todayIso = todayDate.toISOString().split('T')[0];
  const todayDay = todayDate.getDate();
  const todayMonth = todayDate.getMonth();
  const todayYear = todayDate.getFullYear();

  const currentCycleIndex = todayDay >= 20 ? (todayYear * 12 + todayMonth + 1) : (todayYear * 12 + todayMonth);

  const cycleWorkingDates = (user.workingDates || []).filter(dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateCycleIndex = d >= 20 ? (y * 12 + (m - 1) + 1) : (y * 12 + (m - 1));
    return dateCycleIndex === currentCycleIndex;
  }).sort();

  const remainingWorkDays = cycleWorkingDates.filter(d => d >= todayIso).length;

  const filterByCycle = (timestamp: string) => {
    const d = new Date(timestamp);
    const [y, m, day] = [d.getFullYear(), d.getMonth(), d.getDate()];
    const dateCycleIdx = day >= 20 ? (y * 12 + m + 1) : (y * 12 + m);
    return dateCycleIdx === currentCycleIndex;
  };

  const cycleSales = sales.filter(s => filterByCycle(s.timestamp));
  const cycleActivations = activations.filter(a => filterByCycle(a.timestamp));

  const totalSales = cycleSales.reduce((acc, curr) => acc + curr.amount, 0) + 
                     cycleActivations.reduce((acc, curr) => acc + (curr.saleValuePalm || 0) + (curr.saleValueSite || 0), 0);
  
  const salesTarget = goal?.salesTarget || 1;
  const uniqueActivated = new Set(cycleActivations.filter(a => 
    (a.checklist && a.checklist.length > 0) || (a.saleValuePalm || 0) > 0 || (a.saleValueSite || 0) > 0
  ).map(a => a.clientName)).size;

  const needed = Math.max(0, salesTarget - totalSales);
  const runRate = remainingWorkDays > 0 ? (needed / remainingWorkDays) : 0;

  return `
    [DADOS DO VENDEDOR]
    - Realizado: R$ ${totalSales.toLocaleString('pt-BR')}
    - Meta Total: R$ ${salesTarget.toLocaleString('pt-BR')}
    - Progresso Financeiro: ${((totalSales/salesTarget)*100).toFixed(1)}%
    - Positividade (Cobertura): ${uniqueActivated} de ${goal?.activationTarget || 0} PDVs
    - Dias úteis restantes no ciclo: ${remainingWorkDays}
    - Run Rate Diário Necessário: R$ ${runRate.toLocaleString('pt-BR')}
  `;
};

export const createChatSession = async (user: User, clients: Client[], goal: Goal | undefined, sales: SaleLog[], activations: ActivationLog[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contextData = prepareContext(user, clients, goal, sales, activations);
  
  const systemInstruction = `
    Você é o estrategista de vendas "MetaCheck AI". Sua linguagem é executiva, motivadora e focada em fechamento.
    Sua função é analisar o contexto abaixo e dar ordens de batalha.
    CONTEXTO ATUAL: ${contextData}
    
    DIRETRIZES:
    1. Se o Run Rate estiver alto, sugira focar nos clientes VIP (Curva A).
    2. Se a Positividade estiver baixa, sugira produtos de alto giro (Combo de entrada).
    3. Responda sempre em Markdown. Use negrito para valores financeiros.
    4. Ao final da resposta, você DEVE sugerir 2 ou 3 perguntas rápidas no formato:
    [SUGGESTIONS: Qual meu ticket médio? | Como bater a meta de mix? | Dica para prospectar]
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: { systemInstruction, temperature: 0.7 }
  });
};
