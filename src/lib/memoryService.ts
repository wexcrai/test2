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
  const blacklist = [
    'bilgi bulunmamaktadır', 'bilinmiyor', 'kişisel bilgi bulunamadı',
    'kabul edilenler', 'kesinlikle', 'kullanıcı hakkında', 'hatırlanmaya değer'
  ];

  const filtered = memories.filter(m =>
    m.memory &&
    m.memory.length > 2 &&
    m.memory.length < 100 &&
    !blacklist.some(b => m.memory.toLowerCase().includes(b))
  );

  if (filtered.length === 0) return '';

  const grouped = {
    personal: filtered.filter(m => m.category === 'personal'),
    preference: filtered.filter(m => m.category === 'preference'),
    fact: filtered.filter(m => m.category === 'fact'),
    general: filtered.filter(m => m.category === 'general'),
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
