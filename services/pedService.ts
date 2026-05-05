import { supabase } from './supabaseClient';
import type { PED } from '../types';

interface PEDRow {
  id: string;
  user_id: string;
  name: string;
  period: string;
  items: string[];
  created_at: string;
}

function mapRowToPED(row: PEDRow): PED {
  return {
    id: row.id,
    name: row.name,
    period: row.period as PED['period'],
    items: row.items || [],
    createdAt: row.created_at,
  };
}

/**
 * Fetch all PEDs for the current user.
 */
export async function fetchPEDs(userId: string): Promise<PED[]> {
  const { data, error } = await supabase
    .from('peds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch PEDs:', error);
    return [];
  }

  return (data || []).map(mapRowToPED);
}

/**
 * Add a new PED.
 */
export async function addPEDToDb(
  userId: string,
  ped: PED
): Promise<PED | null> {
  const { data, error } = await supabase
    .from('peds')
    .insert({
      id: ped.id,
      user_id: userId,
      name: ped.name,
      period: ped.period,
      items: ped.items,
      created_at: ped.createdAt
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add PED:', error);
    return null;
  }

  return mapRowToPED(data);
}

/**
 * Update an existing PED.
 */
export async function updatePEDInDb(ped: PED): Promise<PED | null> {
  const { data, error } = await supabase
    .from('peds')
    .update({
      name: ped.name,
      period: ped.period,
      items: ped.items,
    })
    .eq('id', ped.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update PED:', error);
    return null;
  }

  return mapRowToPED(data);
}

/**
 * Delete a PED.
 */
export async function deletePEDFromDb(pedId: string): Promise<boolean> {
  const { error } = await supabase
    .from('peds')
    .delete()
    .eq('id', pedId);

  if (error) {
    console.error('Failed to delete PED:', error);
    return false;
  }

  return true;
}
