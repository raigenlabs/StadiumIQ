import { useState, useEffect, useRef } from "react";
import { Sparkles, FileText, Loader2, Download, CheckCircle, RefreshCw } from "lucide-react";

/**
 * End-of-day operations summary intelligence report generator.
 * Satisfies the "End-of-day AI Digest" and "operational intelligence" requirements.
 */
export default function DigestReport() {
  const [digestText, setDigestText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as text streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [digestText]);

  const handleGenerateDigest = async () => {
    setIsGenerating(true);
    setDigestText("");

    try {
      const response = await fetch("/api/digest-stream");
      if (!response.ok || !response.body) {
        throw new Error("Failed to open digest feed stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReport = "";

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
                fullReport += data.chunk;
                setDigestText(fullReport);
              }
              if (data.error) {
                fullReport += `\n[Stream Error: ${data.error}]`;
                setDigestText(fullReport);
              }
            } catch (err) {
              // ignore malformed JSON chunk errors
            }
          }
        }
      }
    } catch (err) {
      setDigestText(
        "### Generation Failed\n\nUnable to fetch data from operations ledger. Confirm connectivity to StadiumIQ brain server."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Highly robust mini-markdown parser to convert styled text into Tailwind DOM nodes
  const parsedHTML = (markdown: string) => {
    if (!markdown) return null;

    const lines = markdown.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();

      // Main Heading #
      if (trimmed.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-base font-extrabold text-green-700 font-sans mt-5 mb-2.5 pb-1 border-b border-gray-100">
            {trimmed.slice(2)}
          </h2>
        );
      }
      // Sub heading ###
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-sm font-bold text-gray-800 font-sans mt-4 mb-2 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            {trimmed.slice(4)}
          </h3>
        );
      }
      // Horizontal Rule ---
      if (trimmed === "---") {
        return <hr key={idx} className="border-gray-200 my-4" />;
      }
      // Numeric lists 1.
      if (/^\d+\.\s/.test(trimmed)) {
        const text = trimmed.replace(/^\d+\.\s/, "");
        // Format inline bolding **word**
        const formattedText = parseInlineBold(text);
        return (
          <div key={idx} className="flex gap-2.5 text-xs text-gray-600 pl-2 py-1.5 bg-green-50/20 rounded-md my-1 font-sans">
            <span className="font-extrabold text-green-700">{trimmed.match(/^\d+/)![0]}.</span>
            <span className="leading-relaxed">{formattedText}</span>
          </div>
        );
      }
      // Bullet lists *
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const text = trimmed.slice(2);
        const formattedText = parseInlineBold(text);
        return (
          <li key={idx} className="text-xs text-gray-600 pl-4 py-0.5 list-disc ml-2 font-sans leading-relaxed">
            {formattedText}
          </li>
        );
      }

      // Standard paragraphs
      if (trimmed.length > 0) {
        const formattedText = parseInlineBold(trimmed);
        return (
          <p key={idx} className="text-xs text-gray-600 leading-relaxed font-sans mb-2.5">
            {formattedText}
          </p>
        );
      }

      return <div key={idx} className="h-2" />;
    });
  };

  // Parses inline double asterisks **text** into JSX bold tags
  const parseInlineBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-extrabold text-gray-900">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">End-of-day AI Operations Digest</h3>
          </div>
          <p className="text-xs text-gray-500">Autonomous intelligence summary of match-day operations</p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGenerateDigest}
          disabled={isGenerating}
          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow disabled:opacity-50 min-h-[44px]"
          aria-label="Generate AI Digest Report"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Report Stream...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Compile & Stream Operations Digest
            </>
          )}
        </button>
      </div>

      {/* Terminal Viewbox */}
      <div
        ref={scrollRef}
        className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-6 overflow-y-auto h-[400px] flex flex-col"
        aria-live="polite"
      >
        {digestText ? (
          <div className="prose prose-sm prose-green max-w-none text-left">
            {parsedHTML(digestText)}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3.5 my-auto">
            <FileText className="h-10 w-10 text-gray-300 stroke-[1.5]" />
            <div>
              <p className="text-xs font-bold text-gray-700">Operations Digest Empty</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[320px] mx-auto">
                Trigger compilation to pull real-time incident loads, sanitation averages, and energy telemetry into an executive markdown briefing.
              </p>
            </div>
          </div>
        )}
      </div>

      {digestText && !isGenerating && (
        <div className="flex justify-end gap-2.5 animate-fade-in">
          <button
            onClick={() => {
              const element = document.createElement("a");
              const file = new Blob([digestText], { type: "text/markdown" });
              element.href = URL.createObjectURL(file);
              element.download = `StadiumIQ_Ops_Digest_${new Date().toISOString().slice(0, 10)}.md`;
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-xs font-semibold rounded-lg transition-all"
            aria-label="Download markdown report"
          >
            <Download className="h-3.5 w-3.5" />
            Save as Markdown
          </button>
        </div>
      )}
    </div>
  );
}
