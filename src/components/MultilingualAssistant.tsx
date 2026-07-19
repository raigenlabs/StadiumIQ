import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types.js";
import { sanitizeStr } from "../utils/sanitize.js";
import { Send, Globe, Bot, User, Loader2 } from "lucide-react";

/**
 * Multilingual AI Assistant component. Satisfies "multilingual" and "real-time decision support" capabilities.
 */
export default function MultilingualAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! Hola! Bonjour! مرحبًا! I am StadiumIQ, your World Cup 2026 operations assistant. Ask me about routes, shuttle times, sensory rooms, or stadium rules in your preferred language!",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamText, setCurrentStreamText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamText]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = sanitizeStr(inputText, 300);
    if (!cleanInput || isStreaming) return;

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: cleanInput,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsStreaming(true);
    setCurrentStreamText("");
    setDetectedLanguage(null);

    // Map context history for the model
    const history = messages
      .filter((m) => m.id !== "welcome")
      .slice(-6) // include last 6 messages
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        text: m.text,
      }));

    try {
      const url = `/api/chat-stream?message=${encodeURIComponent(cleanInput)}&history=${encodeURIComponent(
        JSON.stringify(history)
      )}`;

      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error("Failed to initialize SSE stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedText = "";
      let finalLang = "English";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.chunk) {
                completedText += data.chunk;
                setCurrentStreamText(completedText);
              }
              if (data.languageDetected) {
                finalLang = data.languageDetected;
                setDetectedLanguage(data.languageDetected);
              }
              if (data.error) {
                completedText += `\n[Error: ${data.error}]`;
                setCurrentStreamText(completedText);
              }
            } catch (err) {
              // ignore malformed JSON chunk errors
            }
          }
        }
      }

      // Save streamed response to chat log
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: "ai",
        text: completedText || "I'm sorry, I encountered a response error.",
        timestamp: new Date().toLocaleTimeString(),
        languageDetected: finalLang,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setCurrentStreamText("");
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: "ai",
        text: "Apologies, there was an issue reaching the StadiumIQ assist network. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm md:text-base">Multilingual AI Assist</h3>
            <p className="text-xs text-gray-500">FIFA World Cup 2026 concierge</p>
          </div>
        </div>
        {detectedLanguage && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 text-green-700 text-xs rounded-full font-medium transition-all animate-fade-in">
            <Globe className="h-3 w-3" />
            <span>{detectedLanguage} detected</span>
          </div>
        )}
      </div>

      {/* Messages Scrollway */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        aria-live="polite"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 max-w-[85%] ${
              m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`p-2.5 rounded-xl ${
                m.sender === "user"
                  ? "bg-green-600 text-white rounded-tr-none"
                  : "bg-gray-100 text-gray-800 rounded-tl-none"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                {m.sender === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                <span>{m.sender === "user" ? "Spectator" : "StadiumIQ AI"}</span>
                <span className="ml-1">•</span>
                <span>{m.timestamp}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}

        {/* Active Streaming Node */}
        {isStreaming && currentStreamText && (
          <div className="flex items-start gap-3 max-w-[85%] mr-auto">
            <div className="p-2.5 rounded-xl bg-gray-100 text-gray-800 rounded-tl-none">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                <Bot className="h-3 w-3" />
                <span>StadiumIQ AI</span>
                <span className="ml-1">•</span>
                <span>Streaming...</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentStreamText}</p>
            </div>
          </div>
        )}

        {/* Loader when waiting for server stream start */}
        {isStreaming && !currentStreamText && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
            <span>AI is interpreting request...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Form Footer */}
      <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="relative flex items-center">
          <label htmlFor="chat-input-field" className="sr-only">
            Ask StadiumIQ a question
          </label>
          <input
            id="chat-input-field"
            ref={chatInputRef}
            type="text"
            className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50"
            placeholder="Type in English, Spanish, French, or Arabic..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isStreaming}
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute right-2 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-h-[36px] min-w-[36px]"
            disabled={!inputText.trim() || isStreaming}
            aria-label="Send Message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
