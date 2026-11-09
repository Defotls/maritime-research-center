import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "请先登录科研中心账号。" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Supabase 服务端环境变量未配置。" }, 500);
    }
    if (!deepseekKey) {
      return json({ error: "尚未配置 DEEPSEEK_API_KEY，请先在 Supabase Secrets 中添加。" }, 503);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: "登录状态已失效，请重新登录。" }, 401);

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const mode = body.mode === "selection" ? "selection" : "page";
    const paperTitle = typeof body.paperTitle === "string" ? body.paperTitle.slice(0, 300) : "学术论文";
    if (!text) return json({ error: "没有可翻译的英文文本。" }, 400);
    const maxLength = mode === "selection" ? 8000 : 24000;
    if (text.length > maxLength) {
      return json({ error: mode === "selection" ? "选中内容过长，请分段选择。" : "本页文本较长，请选中段落分段翻译。" }, 413);
    }

    const systemPrompt = [
      "你是一名严谨的学术论文英译中译者，熟悉船舶交通、海事监控、AIS、计算机视觉、多模态融合、雷达、红外成像和多目标跟踪。",
      "将用户提供的英文论文文本准确翻译为简体中文。只输出译文，不要添加前言、总结或评论。",
      "保持原文段落顺序、逻辑关系、编号、引用标记、数学符号、变量、公式、单位和缩写；不要编造或省略内容。",
      "AIS、RGB、LWIR、MOT、YOLO、Kalman、DeepSORT、mAP、IoU、IDF1、MOTA、HOTA 等专业缩写首次出现时可保留英文缩写，必要时在旁边给出中文释义。",
      "对于表格、图注、章节标题和项目符号，尽量保留其结构。若输入中含有无法解析的公式或排版标记，原样保留。",
      "不要将 vessel 一律误译为船只；根据海事学术语境优先使用“船舶”或“船舶目标”。",
    ].join("\n");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + deepseekKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        thinking: { type: "disabled" },
        temperature: 0.1,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "论文标题：" + paperTitle + "\n翻译以下文本：\n\n" + text },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || ("DeepSeek API 返回 HTTP " + response.status);
      return json({ error: message }, 502);
    }

    const translation = payload?.choices?.[0]?.message?.content?.trim();
    if (!translation) return json({ error: "翻译模型没有返回有效译文，请重试。" }, 502);
    return json({ translation, model: payload.model || "deepseek-flash" });
  } catch (_error) {
    return json({ error: "翻译服务暂时不可用，请稍后重试。" }, 500);
  }
});
