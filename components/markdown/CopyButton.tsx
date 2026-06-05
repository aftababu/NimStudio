import { useState } from 'react';

interface CopyButtonProps {
  content: string;
}

export function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 bg-[#171717]/80 hover:bg-[#333333] border border-outline-variant/30 rounded-md text-on-surface-variant hover:text-on-surface transition-all flex items-center justify-center backdrop-blur-sm shadow-sm"
      aria-label="Copy to clipboard"
    >
      <span className="material-symbols-outlined text-[16px]">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
}
