import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "llama-3.2-11b-vision-preview";
const TEXT_MODEL = "llama-3.3-70b-versatile";

interface FileAttachment {
  name: string;
  type: string;
  content: string;
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
      const { message, conversationId, imageBase64, fileAttachment, generateImage } = body as {
        message: string;
        conversationId?: string;
        imageBase64?: string;
        fileAttachment?: FileAttachment;
        generateImage?: boolean;
      };

      if (!message && !imageBase64 && !fileAttachment) {
        return new Response(JSON.stringify({ error: "Message, image, or file required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let convId = conversationId;

      if (!convId) {
        const titleText = message ? message.slice(0, 50) : (fileAttachment ? fileAttachment.name : "Image Chat");
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
      const model = hasImage ? VISION_MODEL : TEXT_MODEL;

   const groqMessages: any[] = [
  {
    role: "system",
    content: "Sen yardımcı bir yapay zeka asistanısın. Türkçe sorulara Türkçe, İngilizce sorulara İngilizce cevap ver."
  }
];

      for (const msg of (history || [])) {
        if (msg.role === "user" && msg.image_base64) {
          const content: any[] = [];
          if (msg.content) {
            content.push({ type: "text", text: msg.content });
          }
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
          const fileContent = file.content || "";
          const userText = msg.content || "";
          const combinedText = userText
            ? `${userText}\n\n--- Dosya: ${file.name} ---\n${fileContent}`
            : `Dosya: ${file.name}\n${fileContent}`;
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

      const groqResponse = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
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

      await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          user_id: userId,
          role: "assistant",
          content: textResponse,
          sources: [],
        })
        .select("id")
        .single();

      return new Response(
        JSON.stringify({
          conversationId: convId,
          textResponse,
          sources: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
