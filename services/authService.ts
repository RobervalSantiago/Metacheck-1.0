import { supabase } from './supabaseClient';
import type { User } from '../types';
import { UserRole } from '../types';

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  mix: string;
  userCode: string;
  industries: string[];
  industryColors: Record<string, string>;
  workingDates: string[];
}

/**
 * Fetches the user profile from the `profiles` table.
 */
export async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch profile:', error);
    return null;
  }

  return mapProfileToUser(data);
}

/**
 * Updates the user profile in the `profiles` table.
 */
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  const dbUpdates: Record<string, any> = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.mix !== undefined) dbUpdates.mix = updates.mix;
  if (updates.userCode !== undefined) dbUpdates.user_code = updates.userCode;
  if (updates.industries !== undefined) dbUpdates.industries = updates.industries;
  if (updates.industryColors !== undefined) dbUpdates.industry_colors = updates.industryColors;
  if (updates.workingDates !== undefined) dbUpdates.working_dates = updates.workingDates;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) {
    console.error('Failed to update profile:', error);
    return null;
  }

  return mapProfileToUser(data);
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign up with email, password and user metadata.
 */
export async function signUp(
  email: string,
  password: string,
  metadata: { name: string; avatar: string; userCode?: string }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata.name,
        avatar: metadata.avatar,
        user_code: metadata.userCode || '',
      },
    },
  });

  if (error) throw error;

  // After signup, update profile with additional data
  if (data.user) {
    await supabase.from('profiles').update({
      user_code: metadata.userCode || '',
    }).eq('id', data.user.id);
  }

  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Maps a database profile row to our User type.
 */
function mapProfileToUser(row: any): User {
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    role: row.role === 'admin' ? UserRole.ADMIN : UserRole.SALES,
    avatar: row.avatar || '',
    mix: row.mix || 'MIX 2',
    userCode: row.user_code || '',
    industries: row.industries || [],
    industryColors: row.industry_colors || {},
    workingDates: row.working_dates || [],
  };
}
