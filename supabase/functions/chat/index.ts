import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "llama-3.2-11b-vision-preview";
const TEXT_MODEL = "llama-3.3-70b-versatile";
const FAST_MODEL = "llama-3.1-8b-instant";

interface FileAttachment {
  name: string;
  type: string;
  content: string;
}

async function extractAndSaveMemories(
  supabase: any,
  groqApiKey: string,
  userId: string,
  userMessage: string,
  aiResponse: string,
) {
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
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: FAST_MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "[]";

    let extracted: { memory: string; category: string }[] = [];
    try {
      extracted = JSON.parse(text);
    } catch {
      return;
    }

    if (!extracted.length) return;

    const { data: existing } = await supabase
      .from("user_memories")
      .select("memory")
      .eq("user_id", userId);

   const existingTexts = (existing || [])
  .filter((m: any) => m?.memory)
  .map((m: any) => m.memory.toLowerCase());
    const newMemories = extracted.filter(
      (e) => !existingTexts.some((ex: string) => ex.includes(e.memory.toLowerCase()))
    );

    if (!newMemories.length) return;

    await supabase.from("user_memories").insert(
      newMemories.map((m) => ({
        user_id: userId,
        memory: m.memory,
        category: m.category || "general",
      }))
    );
  } catch (err) {
    console.error("Memory extraction error:", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    if (req.method === "GET") {
      const url = new URL(req.url);
      const conversationId = url.searchParams.get("conversationId");

      if (conversationId) {
        const { data: messages, error: msgError } = await supabase
          .from("messages")
          .select("id, conversation_id, role, content, image_base64, file_attachment, sources, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgError) throw msgError;
        return new Response(JSON.stringify({ messages: messages || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select("id, title, created_at, updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (convError) throw convError;
        return new Response(JSON.stringify({ conversations: conversations || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const conversationId = url.searchParams.get("conversationId");
      if (!conversationId) {
        return new Response(JSON.stringify({ error: "conversationId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delError } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", userId);

      if (delError) throw delError;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const {
        message,
        conversationId,
        imageBase64,
        fileAttachment,
        generateImage,
        model: modelPref,
        systemPrompt,
        stream,
      } = body as {
        message: string;
        conversationId?: string;
        imageBase64?: string;
        fileAttachment?: FileAttachment;
        generateImage?: boolean;
        model?: "fast" | "smart";
        systemPrompt?: string;
        stream?: boolean;
      };

      if (!message && !imageBase64 && !fileAttachment) {
        return new Response(JSON.stringify({ error: "Message, image, or file required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let convId = conversationId;

      if (!convId) {
        const titleText = message
          ? message.slice(0, 50)
          : fileAttachment
          ? fileAttachment.name
          : "Image Chat";
        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: titleText })
          .select("id")
          .single();

        if (convError) throw convError;
        convId = conv.id;
      } else {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId)
          .eq("user_id", userId);
      }

      await supabase.from("messages").insert({
        conversation_id: convId,
        user_id: userId,
        role: "user",
        content: message || "",
        image_base64: imageBase64 || null,
        file_attachment: fileAttachment || null,
      });

      const { data: history } = await supabase
        .from("messages")
        .select("role, content, image_base64, file_attachment")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      const hasImage = !!imageBase64;
      const selectedModel = hasImage
        ? VISION_MODEL
        : modelPref === "fast"
        ? FAST_MODEL
        : TEXT_MODEL;

     const finalSystemPrompt =
  systemPrompt ||
  "Sen yardımcı bir yapay zeka asistanısın. Türkçe sorulara Türkçe, İngilizce sorulara İngilizce cevap ver.";
      
      const groqMessages: any[] = [
        { role: "system", content: finalSystemPrompt },
      ];

      for (const msg of history || []) {
        if (msg.role === "user" && msg.image_base64) {
          const content: any[] = [];
          if (msg.content) content.push({ type: "text", text: msg.content });
          content.push({
            type: "image_url",
            image_url: {
              url: msg.image_base64.startsWith("data:")
                ? msg.image_base64
                : `data:image/jpeg;base64,${msg.image_base64}`,
            },
          });
          groqMessages.push({ role: "user", content });
        } else if (msg.role === "user" && msg.file_attachment) {
          const file = msg.file_attachment as FileAttachment;
          const combinedText = msg.content
            ? `${msg.content}\n\n--- Dosya: ${file.name} ---\n${file.content}`
            : `Dosya: ${file.name}\n${file.content}`;
          groqMessages.push({ role: "user", content: combinedText });
        } else {
          groqMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const groqApiKey = Deno.env.get("GROQ_API_KEY");
      if (!groqApiKey) {
        return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Streaming
      if (stream) {
        const groqResponse = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: groqMessages,
            max_tokens: 2048,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!groqResponse.ok) {
          const errBody = await groqResponse.text();
          console.error("Groq API error:", errBody);
          return new Response(JSON.stringify({ error: "AI model request failed" }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let fullText = "";
        const encoder = new TextEncoder();

        const readable = new ReadableStream({
          async start(controller) {
            const reader = groqResponse.body!.getReader();
            const decoder = new TextDecoder();

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`)
            );

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(data);
                    const text = parsed.choices?.[0]?.delta?.content || "";
                    if (text) {
                      fullText += text;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                      );
                    }
                  } catch {}
                }
              }
            }

            await supabase.from("messages").insert({
              conversation_id: convId,
              user_id: userId,
              role: "assistant",
              content: fullText,
              sources: [],
            });

            if (message && fullText) {
              extractAndSaveMemories(supabase, groqApiKey, userId, message, fullText);
            }

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          },
        });

        return new Response(readable, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      // Normal yanıt
      const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: groqMessages,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!groqResponse.ok) {
        const errBody = await groqResponse.text();
        console.error("Groq API error:", errBody);
        return new Response(JSON.stringify({ error: "AI model request failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const groqData = await groqResponse.json();
      const textResponse = groqData.choices?.[0]?.message?.content || "No response";

      await supabase.from("messages").insert({
        conversation_id: convId,
        user_id: userId,
        role: "assistant",
        content: textResponse,
        sources: [],
      });

      if (message && textResponse) {
        extractAndSaveMemories(supabase, groqApiKey, userId, message, textResponse);
      }

      return new Response(
        JSON.stringify({ conversationId: convId, textResponse, sources: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
