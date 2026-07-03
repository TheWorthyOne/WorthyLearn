export function getModelLineup() {
  const primary = process.env.AI_MODEL || "AdaptLLM/medicine-chat";
  const fallbacks = (process.env.AI_FALLBACK_MODELS || "Henrychur/MMed-Llama-3-8B,baichuan-inc/Baichuan-M2-32B")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([primary, ...fallbacks]));
}

export function shouldTryNextModel(status: number, body: string) {
  return status >= 500
    || body.includes("capacity_exhausted")
    || body.includes("model_not_deployed")
    || body.includes("model_not_found")
    || body.includes("temporarily at capacity");
}

export function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("The AI returned text instead of valid JSON.");
  }
}

export async function callAiJson(
  prompt: string,
  systemPrompt: string,
  validate?: (generated: any) => string | null,
) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return { generated: null, attempts: ["No AI key configured"] };

  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const models = getModelLineup();
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 3500);
  const attempts: string[] = [];

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const aiRes = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.35,
          max_tokens: maxTokens,
        }),
      });

      if (!aiRes.ok) {
        const text = await aiRes.text();
        attempts.push(`${model}: ${text.slice(0, 240)}`);
        if (shouldTryNextModel(aiRes.status, text)) continue;
        return { generated: null, attempts, fatal: `AI request failed: ${text}` };
      }

      const data = await aiRes.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      try {
        const generated = extractJson(content);
        const validationError = validate?.(generated);
        if (validationError) {
          attempts.push(`${model}: ${validationError}`);
          continue;
        }
        return { generated, attempts, modelUsed: model };
      } catch (err) {
        console.error("AI JSON parse failed", { model, err, content: content.slice(0, 1000) });
        attempts.push(`${model}: malformed JSON`);
      }
    } catch (err) {
      const message = err instanceof Error && err.name === "AbortError"
        ? "timed out after 120 seconds"
        : "request could not be completed";
      attempts.push(`${model}: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { generated: null, attempts };
}
