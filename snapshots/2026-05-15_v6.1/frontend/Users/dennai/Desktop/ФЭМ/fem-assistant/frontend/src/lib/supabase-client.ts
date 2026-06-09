import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase';

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

export interface Project {
  id: string;
  name: string;
  currency: string;
  months: number;
  status: 'draft' | 'ready' | 'error';
  assumptions: Record<string, unknown>;
  project_type?: 'new' | 'existing';
  created_at: string;
  updated_at: string;
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createProject(name: string, currency = 'RUB', months = 36): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, currency, months, assumptions: {} })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectAssumptions(id: string, assumptions: Record<string, unknown>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ assumptions, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
