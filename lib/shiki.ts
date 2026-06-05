import { createHighlighter, type Highlighter } from 'shiki';

let highlighterInstance: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

export async function getShikiHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vitesse-dark'],
      langs: [
        'javascript', 'typescript', 'jsx', 'tsx', 'json', 'html', 'css', 
        'python', 'bash', 'shell', 'markdown', 'rust', 'go', 'yaml', 'sql'
      ],
    }).then((hl) => {
      highlighterInstance = hl;
      return hl;
    });
  }

  return highlighterPromise;
}
