import { supabase } from './supabaseClient';
import type { ActivationLog } from '../types';

/**
 * Fetch all activation logs for the current user.
 */
export async function fetchActivationLogs(userId: string): Promise<ActivationLog[]> {
  const { data, error } = await supabase
    .from('activation_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Failed to fetch activation logs:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp,
    clientName: row.client_name,
    location: row.location || null,
    photoUrl: row.photo_url || undefined,
    notes: row.notes || '',
    checklist: row.checklist || [],
    saleValue: Number(row.sale_value) || 0,
    saleValuePalm: Number(row.sale_value_palm) || 0,
    saleValueSite: Number(row.sale_value_site) || 0,
  }));
}

/**
 * Add a new activation log to the database.
 */
export async function addActivationLogToDb(
  userId: string,
  log: ActivationLog
): Promise<ActivationLog | null> {
  const { data, error } = await supabase
    .from('activation_logs')
    .insert({
      id: log.id,
      user_id: userId,
      timestamp: log.timestamp,
      client_name: log.clientName,
      location: log.location || null,
      photo_url: log.photoUrl || null,
      notes: log.notes || '',
      checklist: log.checklist || [],
      sale_value: log.saleValue || 0,
      sale_value_palm: log.saleValuePalm || 0,
      sale_value_site: log.saleValueSite || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add activation log:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    timestamp: data.timestamp,
    clientName: data.client_name,
    location: data.location || null,
    notes: data.notes || '',
    checklist: data.checklist || [],
    saleValue: Number(data.sale_value) || 0,
    saleValuePalm: Number(data.sale_value_palm) || 0,
    saleValueSite: Number(data.sale_value_site) || 0,
  };
}
