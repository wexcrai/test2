import { supabase } from './supabase';

export interface Memory {
  id: string;
  user_id: string;
  memory: string;
  category: 'personal' | 'preference' | 'fact' | 'general';
  created_at: string;
  updated_at: string;
}

export async function getMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function buildMemoryPrompt(memories: Memory[]): string {
  if (memories.length === 0) return '';

  const grouped = {
    personal: memories.filter(m => m.category === 'personal'),
    preference: memories.filter(m => m.category === 'preference'),
    fact: memories.filter(m => m.category === 'fact'),
    general: memories.filter(m => m.category === 'general'),
  };

  let prompt = '\n\n### Kullanıcı Hakkında Arka Plan Bilgisi:\n';

  if (grouped.personal.length)
    prompt += `${grouped.personal.map(m => m.memory).join(', ')}\n`;
  if (grouped.preference.length)
    prompt += `${grouped.preference.map(m => m.memory).join(', ')}\n`;
  if (grouped.fact.length)
    prompt += `${grouped.fact.map(m => m.memory).join(', ')}\n`;
  if (grouped.general.length)
    prompt += `${grouped.general.map(m => m.memory).join(', ')}\n`;

  prompt += '\nBu bilgileri sadece kullanıcı kendi hakkında soru sorduğunda kullan. Diğer sorulara doğrudan cevap ver.';
  return prompt;
}

export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('user_memories').delete().eq('id', id);
  if (error) throw error;
}

export async function updateMemory(id: string, memory: string): Promise<void> {
  const { error } = await supabase
    .from('user_memories')
    .update({ memory })
    .eq('id', id);
  if (error) throw error;
}
