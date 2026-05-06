import { supabase } from './supabaseClient';
import type { ClientUIState } from '../types';

/**
 * Fetch all client states for the current user.
 * Returns a record keyed by "userId_clientId".
 */
export async function fetchClientStates(userId: string): Promise<Record<string, ClientUIState>> {
  const { data, error } = await supabase
    .from('client_states')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch client states:', error);
    return {};
  }

  const result: Record<string, ClientUIState> = {};
  (data || []).forEach(row => {
    const key = `${row.user_id}_${row.client_id}`;
    result[key] = row.state_data as ClientUIState;
  });

  return result;
}

/**
 * Upsert a single client state (insert or update by user_id + client_id).
 */
export async function upsertClientState(
  userId: string,
  clientId: string,
  stateData: ClientUIState
): Promise<boolean> {
  const { error } = await supabase
    .from('client_states')
    .upsert({
      user_id: userId,
      client_id: clientId,
      state_data: stateData,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,client_id'
    });

  if (error) {
    console.error('Failed to upsert client state:', error);
    return false;
  }

  return true;
}

/**
 * Batch upsert all client states for a user.
 * Used during cycle reset or bulk sync.
 */
export async function batchUpsertClientStates(
  userId: string,
  clientStates: Record<string, ClientUIState>
): Promise<boolean> {
  const rows = Object.entries(clientStates)
    .filter(([key]) => key.startsWith(`${userId}_`))
    .map(([key, stateData]) => ({
      user_id: userId,
      client_id: key.split('_')[1],
      state_data: stateData,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return true;

  const { error } = await supabase
    .from('client_states')
    .upsert(rows, { onConflict: 'user_id,client_id' });

  if (error) {
    console.error('Failed to batch upsert client states:', error);
    return false;
  }

  return true;
}

/**
 * Delete all client states for a user (used during cycle reset).
 */
export async function deleteAllClientStates(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('client_states')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete client states:', error);
    return false;
  }

  return true;
}
