import React, { useEffect, useState, memo } from "react";
import { useTheme } from "next-themes";
import { getShikiHighlighter } from "../../lib/shiki";
import { CopyButton } from "./CopyButton";

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock = memo(function CodeBlock({
  language,
  value,
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;

    getShikiHighlighter()
      .then((highlighter) => {
        if (!isMounted) return;

        try {
          const loadedLangs = highlighter.getLoadedLanguages();
          const lang = loadedLangs.includes(language as any)
            ? language
            : "text";

          const highlightedHtml = highlighter.codeToHtml(value, {
            lang,
            theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
          });
          setHtml(highlightedHtml);
        } catch (e) {
          console.error("Shiki highlight error:", e);
          setHtml("");
        }
      })
      .catch((e) => {
        console.error("Failed to load highlighter:", e);
      });

    return () => {
      isMounted = false;
    };
  }, [language, value, resolvedTheme]);

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-outline-variant bg-surface font-code-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-outline-variant text-xs text-on-surface-variant font-sans">
        <span className="uppercase tracking-wider">{language || "text"}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton content={value} />
        </div>
      </div>
      <div className="p-4 overflow-x-auto custom-scrollbar text-[13px] leading-relaxed">
        {html ? (
          <div
            dangerouslySetInnerHTML={{ __html: html }}
            className="[&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0"
          />
        ) : (
          <pre className="!bg-transparent !m-0 !p-0 text-gray-300">
            <code>{value}</code>
          </pre>
        )}
      </div>
    </div>
  );
});
