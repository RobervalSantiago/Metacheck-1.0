import { supabase } from './supabaseClient';
import type { Goal } from '../types';

/**
 * Fetch all goals for the current user.
 */
export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch goals:', error);
    return [];
  }

  return (data || []).map(row => ({
    userId: row.user_id,
    month: row.month,
    salesTarget: Number(row.sales_target) || 0,
    activationTarget: Number(row.activation_target) || 0,
    industryTargets: row.industry_targets || {},
    industryCoverageTargets: row.industry_coverage_targets || {},
  }));
}

/**
 * Insert or update a goal (upsert by user_id + month).
 */
export async function upsertGoal(userId: string, goal: Goal): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .upsert({
      user_id: userId,
      month: goal.month,
      sales_target: goal.salesTarget,
      activation_target: goal.activationTarget,
      industry_targets: goal.industryTargets || {},
      industry_coverage_targets: goal.industryCoverageTargets || {},
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,month'
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert goal:', error);
    return null;
  }

  return {
    userId: data.user_id,
    month: data.month,
    salesTarget: Number(data.sales_target) || 0,
    activationTarget: Number(data.activation_target) || 0,
    industryTargets: data.industry_targets || {},
    industryCoverageTargets: data.industry_coverage_targets || {},
  };
}
