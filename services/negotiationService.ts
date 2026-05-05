import { supabase } from './supabaseClient';
import { NegotiationLog, SellOutLog } from '../types';

export const negotiationService = {
  async getNegotiationLogs(userId: string): Promise<NegotiationLog[]> {
    const { data, error } = await supabase
      .from('negotiation_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching negotiation logs:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      timestamp: Number(row.timestamp),
      clientName: row.client_name,
      productName: row.product_name,
      price: Number(row.price),
      quantity: Number(row.quantity),
      type: row.type,
      bonusQty: Number(row.bonus_qty),
      bonusType: row.bonus_type,
      bonusProduct: row.bonus_product,
      bonusProductPrice: Number(row.bonus_product_price),
      targetPrice: Number(row.target_price)
    }));
  },

  async addNegotiationLog(log: Omit<NegotiationLog, 'id'>, userId: string): Promise<NegotiationLog | null> {
    const { data, error } = await supabase
      .from('negotiation_logs')
      .insert({
        user_id: userId,
        timestamp: log.timestamp,
        client_name: log.clientName,
        product_name: log.productName,
        price: log.price,
        quantity: log.quantity,
        type: log.type,
        bonus_qty: log.bonusQty,
        bonus_type: log.bonusType,
        bonus_product: log.bonusProduct,
        bonus_product_price: log.bonusProductPrice,
        target_price: log.targetPrice
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding negotiation log:', error);
      return null;
    }

    return {
      ...log,
      id: data.id,
      userId: data.user_id
    };
  },

  async getSellOutLogs(userId: string): Promise<SellOutLog[]> {
    const { data, error } = await supabase
      .from('sell_out_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching sell out logs:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      timestamp: Number(row.timestamp),
      supervisor: row.supervisor,
      consultor: row.consultor,
      period: row.period,
      reason: row.reason,
      observation: row.observation,
      entries: row.entries
    }));
  },

  async addSellOutLog(log: Omit<SellOutLog, 'id'>, userId: string): Promise<SellOutLog | null> {
    const { data, error } = await supabase
      .from('sell_out_logs')
      .insert({
        user_id: userId,
        timestamp: log.timestamp,
        supervisor: log.supervisor,
        consultor: log.consultor,
        period: log.period,
        reason: log.reason,
        observation: log.observation,
        entries: log.entries
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding sell out log:', error);
      return null;
    }

    return {
      ...log,
      id: data.id,
      userId: data.user_id
    };
  }
};
