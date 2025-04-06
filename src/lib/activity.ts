import { supabase } from './supabase';

export async function logActivity(
  action: string,
  page?: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabase.rpc('log_user_activity', {
      p_action: action,
      p_page: page,
      p_metadata: metadata
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}