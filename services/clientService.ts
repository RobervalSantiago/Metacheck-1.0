import { supabase } from './supabaseClient';
import type { Client } from '../types';

interface ClientRow {
  id: string;
  user_id: string;
  code: string;
  name: string;
  city: string;
  visit_day: string | null;
  lat: number | null;
  lng: number | null;
  frequency: string | null;
  created_at: string;
}

function mapRowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
    visitDay: row.visit_day || undefined,
    lat: row.lat || undefined,
    lng: row.lng || undefined,
    frequency: (row.frequency as Client['frequency']) || 'weekly',
    createdAt: row.created_at,
  };
}

/**
 * Fetch all clients for the current user.
 */
export async function fetchClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('Failed to fetch clients:', error);
    return [];
  }

  return (data || []).map(mapRowToClient);
}

/**
 * Add a new client.
 */
export async function addClientToDb(
  userId: string,
  client: Omit<Client, 'id'>
): Promise<Client | null> {
  const id = `c${Date.now()}`;
  const { data, error } = await supabase
    .from('clients')
    .insert({
      id,
      user_id: userId,
      code: client.code,
      name: client.name,
      city: client.city,
      visit_day: client.visitDay || null,
      lat: client.lat || null,
      lng: client.lng || null,
      frequency: client.frequency || 'weekly',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add client:', error);
    return null;
  }

  return mapRowToClient(data);
}

/**
 * Update an existing client.
 */
export async function updateClientInDb(client: Client): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .update({
      code: client.code,
      name: client.name,
      city: client.city,
      visit_day: client.visitDay || null,
      lat: client.lat || null,
      lng: client.lng || null,
      frequency: client.frequency || 'weekly',
    })
    .eq('id', client.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update client:', error);
    return null;
  }

  return mapRowToClient(data);
}

/**
 * Delete a client.
 */
export async function deleteClientFromDb(clientId: string): Promise<boolean> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) {
    console.error('Failed to delete client:', error);
    return false;
  }

  return true;
}
