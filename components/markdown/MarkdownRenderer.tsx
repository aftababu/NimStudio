import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
}: MarkdownRendererProps) {
  return (
    <div
      className="prose prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words [--tw-prose-body:var(--color-on-surface)]
    [--tw-prose-headings:var(--color-on-surface)]
    [--tw-prose-bold:var(--color-on-surface)]
    [--tw-prose-bullets:var(--color-on-surface)]
    [--tw-prose-counters:var(--color-on-surface)] text-on-surface"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const value = String(children).replace(/\n$/, "");
            const isBlock = match || value.includes("\n");

            if (isBlock) {
              return (
                <CodeBlock language={match?.[1] || "text"} value={value} />
              );
            }

            return (
              <code
                className="bg-background text-on-surface px-1.5 py-0.5 rounded-md font-mono text-[0.875em] before:content-none after:content-none"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-outline-variant ">
              <table
                className="w-full text-left border-collapse m-0"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-3 bg-surface border-b border-outline-variant font-medium text-sm text-on-surface"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-3 border-b border-outline-variant text-sm"
              {...props}
            >
              {children}
            </td>
          ),
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-primary hover:text-primary-fixed underline decoration-primary/30 underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/50 bg-surface-container-low px-4 py-1 my-4 italic text-on-surface-variant rounded-r-md"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
        // className="text-on-surface"
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
