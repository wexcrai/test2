import { supabase } from './supabase';

export interface Memory {
  id: string;
  user_id: string;
  memory: string;
  category: 'personal' | 'preference' | 'fact' | 'general';
  created_at: string;
  updated_at: string;
}

// Kullanıcının tüm hafızalarını getir
export async function getMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Hafızaları sistem promptuna ekle
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

  prompt += '\nBu bilgileri sadece gerektiğinde kullan. Soruları doğrudan yanıtla, her mesajda bu bilgileri ön plana çıkarma.';
  return prompt;
}
// AI yanıtından hafıza çıkar
export async function extractAndSaveMemories(
  userId: string,
  userMessage: string,
  aiResponse: string,
  groqApiKey: string
): Promise<void> {
  const prompt = `Aşağıdaki konuşmadan kullanıcı hakkında hatırlanmaya değer bilgileri çıkar.
Sadece gerçekten önemli bilgileri al: isim, meslek, şehir, dil tercihi, hobiler, sık kullandığı araçlar, önemli tercihler.
Sıradan veya tek seferlik şeyleri alma.

Kullanıcı: ${userMessage}
AI: ${aiResponse}

Sadece JSON array döndür, başka hiçbir şey yazma:
[
  {"memory": "...", "category": "personal|preference|fact|general"},
  ...
]

Eğer hatırlanacak bir şey yoksa boş array döndür: []`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // hızlı model yeterli
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '[]';

    let extracted: { memory: string; category: string }[] = [];
    try {
      extracted = JSON.parse(text);
    } catch {
      return; // parse hatası olursa sessizce geç
    }

    if (!extracted.length) return;

    // Mevcut hafızalarla çakışma kontrolü
    const existing = await getMemories(userId);
    const existingTexts = existing.map(m => m.memory.toLowerCase());

    const newMemories = extracted.filter(
      e => !existingTexts.some(ex => ex.includes(e.memory.toLowerCase()))
    );

    if (!newMemories.length) return;

    await supabase.from('user_memories').insert(
      newMemories.map(m => ({
        user_id: userId,
        memory: m.memory,
        category: m.category || 'general',
      }))
    );
  } catch (err) {
    console.error('Memory extraction error:', err);
    // hata olursa sohbeti etkileme
  }
}

// Hafıza sil
export async function deleteMemory(id: string): Promise<void> {
  const { error } = await supabase.from('user_memories').delete().eq('id', id);
  if (error) throw error;
}

// Hafıza güncelle
export async function updateMemory(id: string, memory: string): Promise<void> {
  const { error } = await supabase
    .from('user_memories')
    .update({ memory })
    .eq('id', id);
  if (error) throw error;
}
