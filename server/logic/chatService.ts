import { GoogleGenAI } from "@google/genai";
import { sanitizeStr } from "../../src/utils/sanitize.js";

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

/**
 * Local keyword fallback chat response generator.
 * Tailored to FIFA World Cup 2026 operations and supports 4 languages:
 * English, Spanish, French, and Arabic.
 */
export function getLocalChatResponse(message: string): { language: string; reply: string } {
  const msg = sanitizeStr(message).toLowerCase();

  // Language detection
  let lang = "English";
  let isSpanish = msg.includes("hola") || msg.includes("dónde") || msg.includes("mapa") || msg.includes("baño") || msg.includes("estadio");
  let isFrench = msg.includes("bonjour") || msg.includes("où") || msg.includes("carte") || msg.includes("stade") || msg.includes("métro");
  let isArabic = msg.includes("مرحبا") || msg.includes("اين") || msg.includes("خريطة") || msg.includes("ملعب") || msg.includes("طريق");

  if (isSpanish) lang = "Spanish";
  else if (isFrench) lang = "French";
  else if (isArabic) lang = "Arabic";

  // Respond according to detected language
  if (lang === "Spanish") {
    if (msg.includes("mapa") || msg.includes("ruta") || msg.includes("ir a")) {
      return {
        language: lang,
        reply: "Para navegar por el estadio, use la pestaña 'Navegación inteligente'. La Zona F tiene mucha gente ahora, le recomiendo usar el túnel de la Zona B para evitar congestiones.",
      };
    }
    if (msg.includes("accesibilidad") || msg.includes("silla") || msg.includes("ascensor")) {
      return {
        language: lang,
        reply: "El Estadio tiene rutas accesibles en todas las zonas. Los ascensores principales están en la Zona E y los espacios sensoriales tranquilos están en la Zona D, Sector 102.",
      };
    }
    return {
      language: lang,
      reply: "¡Hola! Soy StadiumIQ, su asistente de la Copa Mundial de la FIFA 2026. ¿En qué puedo ayudarle hoy con el transporte, accesibilidad o navegación en el estadio?",
    };
  }

  if (lang === "French") {
    if (msg.includes("carte") || msg.includes("route") || msg.includes("aller")) {
      return {
        language: lang,
        reply: "Pour naviguer, utilisez l'onglet 'Navigation Intelligente'. La Zone F est très encombrée, nous vous conseillons de passer par la Zone B pour gagner du temps.",
      };
    }
    if (msg.includes("accessibilité") || msg.includes("fauteuil") || msg.includes("ascenseur")) {
      return {
        language: lang,
        reply: "Le stade est entièrement accessible. Des ascenseurs prioritaires sont situés en Zone E. Les zones calmes sans bruit se trouvent en Zone D, Section 102.",
      };
    }
    return {
      language: lang,
      reply: "Bonjour! Je suis StadiumIQ, votre assistant pour la Coupe du Monde de la FIFA 2026. Comment puis-je vous aider aujourd'hui?",
    };
  }

  if (lang === "Arabic") {
    if (msg.includes("خريطة") || msg.includes("طريق") || msg.includes("ذهاب")) {
      return {
        language: lang,
        reply: "للتنقل، يرجى استخدام 'التنقل الذكي'. المنطقة F مزدحمة حالياً، ننصحك بالمرور عبر المنطقة B لتفادي الازدحام.",
      };
    }
    if (msg.includes("سهولة") || msg.includes("كرسي") || msg.includes("مساعدة")) {
      return {
        language: lang,
        reply: "الملعب مجهز بالكامل لذوي الاحتياجات الخاصة. المصاعد متوفرة في المنطقة E، والمنطقة الهادئة الحسية تقع في المنطقة D، القسم 102.",
      };
    }
    return {
      language: lang,
      reply: "مرحباً! أنا StadiumIQ، مساعدك الذكي لبطولة كأس العالم 2026. كيف يمكنني مساعدتك اليوم في التنقل، المواصلات أو الدعم؟",
    };
  }

  // Default English responses
  if (msg.includes("map") || msg.includes("route") || msg.includes("navigate") || msg.includes("way")) {
    return {
      language: "English",
      reply: "To navigate the arena, please open our 'Smart Navigation' tab. It dynamically routes you around Zone F (which is currently crowded) and recommends Zone B as a faster path.",
    };
  }
  if (msg.includes("access") || msg.includes("wheelchair") || msg.includes("sensory") || msg.includes("disabled")) {
    return {
      language: "English",
      reply: "StadiumIQ features dedicated accessible pathways. Accessible ramps are situated in Zone A & D. Elevators are in the concourse (Zone E), and our sensory-friendly room is at Zone D, Sector 102.",
    };
  }
  if (msg.includes("shuttle") || msg.includes("transit") || msg.includes("parking") || msg.includes("bus")) {
    return {
      language: "English",
      reply: "Our 'Transport Status' module shows live feeds. Metro Line 1 is operating smoothly (4 min wait), while North Parking Shuttle A has a delay of about 14 minutes due to ring-road traffic.",
    };
  }

  return {
    language: "English",
    reply: "Hello! I am StadiumIQ, your operational and wayfinding assistant for the FIFA World Cup 2026. Ask me about dynamic routes, shuttle status, sensory zones, or stadium rules!",
  };
}

/**
 * Streams a chat assistant response via Server-Sent Events (SSE).
 */
export async function streamChatResponse(
  message: string,
  history: Array<{ role: "user" | "model"; text: string }>,
  writeChunk: (data: string) => void,
  onDone: (lang: string) => void
): Promise<void> {
  const sanitizedMessage = sanitizeStr(message);
  const ai = getGeminiClient();

  if (!ai) {
    // Fallback rule-based streaming
    const { language, reply } = getLocalChatResponse(sanitizedMessage);
    const words = reply.split(" ");
    let i = 0;

    const interval = setInterval(() => {
      if (i < words.length) {
        writeChunk(words[i] + " ");
        i++;
      } else {
        clearInterval(interval);
        onDone(language);
      }
    }, 45); // simulated speaking rate
    return;
  }

  try {
    // Detect language using lightweight context
    const detectionResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Identify the primary language used in this query: "${sanitizedMessage}". Return only the standard English name of the language (e.g. "English", "Spanish", "French", "Arabic").`,
    });
    const detectedLang = sanitizeStr(detectionResponse.text || "English").trim();

    // Prepare system instructions for StadiumIQ chat assistant
    const systemInstruction = `You are StadiumIQ, the official GenAI operational & fan-experience assistant for the FIFA World Cup 2026.
    Your job is to assist spectators with wayfinding, arena rules, public transport, and accessibility guides.
    Always reply politely in the customer's detected language.
    Keep answers helpful, clear, and brief (max 150 words).`;

    // Map conversation history
    const contents = history.map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));
    // Append current message
    contents.push({
      role: "user",
      parts: [{ text: sanitizedMessage }],
    });

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        writeChunk(chunk.text);
      }
    }
    onDone(detectedLang);
  } catch (error) {
    // Instant fallback if Gemini stream throws error
    const { language, reply } = getLocalChatResponse(sanitizedMessage);
    writeChunk(`(Network mode fallback) ${reply}`);
    onDone(language);
  }
}
