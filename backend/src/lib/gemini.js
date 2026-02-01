const { GoogleGenAI } = require("@google/genai");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Gemini multimodal verification.
 * Uses JSON mode so the response is ALWAYS parseable.
 */
async function verifyWithGemini({ imageBuffer, mimeType, description }) {
  const apiKey = mustEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const ai = new GoogleGenAI({ apiKey });

  const base64 = imageBuffer.toString("base64");

  const system = `
You are a strict sustainability/charity proof verifier.
Given an image and a short text description, decide if the action is plausibly real and aligns with sustainable or charitable impact.

Return ONLY JSON with:
- valid: boolean
- category: string (one concise category, e.g., "Low-carbon transport", "Waste reduction", "Community volunteering", "Donation", "Energy saving", "Biodiversity")
- confidence: number (0 to 1)
- summary: string (short human-readable explanation of the verified action, 1–2 sentences)

Guidelines:
- If you cannot confidently verify what happened from the image+text, set valid=false.
- Confidence should reflect strength of visual evidence + consistency with text.
`;

  // JSON schema for the model response (JSON mode)
  const responseSchema = {
    type: "object",
    properties: {
      valid: { type: "boolean" },
      category: { type: "string" },
      confidence: { type: "number" },
      summary: { type: "string" }
    },
    required: ["valid", "category", "confidence", "summary"],
    additionalProperties: false
  };

  const resp = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64,
            mimeType: mimeType || "image/jpeg"
          }
        },
        {
          text: `User description:\n${description}\n\nReturn the JSON verdict now.`
        }
      ]
    },
    config: {
      systemInstruction: system,
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  // Depending on SDK version, resp.text is the JSON string.
  // Fallback: try typical locations.
  const raw =
    resp.text ||
    (resp.response && resp.response.text) ||
    JSON.stringify(resp);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // last-resort: extract JSON object substring
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini returned non-JSON output.");
    parsed = JSON.parse(match[0]);
  }

  // normalize
  return {
    valid: Boolean(parsed.valid),
    category: String(parsed.category || "Uncategorized"),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
    summary: String(parsed.summary || "")
  };
}

module.exports = { verifyWithGemini };
