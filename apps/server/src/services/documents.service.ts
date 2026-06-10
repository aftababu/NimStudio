import { eq } from "drizzle-orm";
import { db, documents, documentChunks } from "@nimstudio/db";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const execAsync = promisify(exec);

/**
 * Split markdown into chunks of roughly 800-1000 words.
 * Attempts to split at double newlines or heading boundaries.
 */
function chunkMarkdown(markdown: string, maxWordsPerChunk = 1000): string[] {
  const blocks = markdown.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentWordCount = 0;

  for (const block of blocks) {
    const wordCount = block.split(/\s+/).length;

    // If adding this block exceeds the max words (and current chunk isn't empty)
    if (
      currentWordCount + wordCount > maxWordsPerChunk &&
      currentWordCount > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = block;
      currentWordCount = wordCount;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + block;
      currentWordCount += wordCount;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export const DocumentsService = {
  async processAndStoreDocument(
    projectId: string,
    filename: string,
    filePath: string,
    mimeType: string,
  ) {
    // 1. Run Python MarkItDown script
    const pyScriptPath = path.join(process.cwd(), "./document_converter.py");
    // We assume apps/server/venv/bin/python is available
    const pyEnv = path.join(__dirname, "../../venv/bin/python");

    let markdownContent = "";
    try {
      const { stdout } = await execAsync(
        `"${pyEnv}" "${pyScriptPath}" "${filePath}"`,
      );
      const result = JSON.parse(stdout.trim());

      if (!result.success) {
        throw new Error(result.error || "MarkItDown failed to parse document");
      }
      markdownContent = result.markdown;
    } catch (e: any) {
      throw new Error(`Failed to convert document: ${e.message}`);
    }

    // 2. Chunk the markdown
    const chunks = chunkMarkdown(markdownContent, 1000);

    // 3. Store in database
    const documentId = crypto.randomUUID();

    // Insert document
    await db.insert(documents).values({
      id: documentId,
      projectId: projectId,
      filename: filename,
      fileType: mimeType,
      markdownContent: markdownContent,
    });

    // Insert chunks
    if (chunks.length > 0) {
      const chunkRecords = chunks.map((content, index) => ({
        id: crypto.randomUUID(),
        documentId: documentId,
        chunkIndex: index,
        content: content,
      }));
      await db.insert(documentChunks).values(chunkRecords);
    }

    return {
      documentId,
      filename,
      chunkCount: chunks.length,
    };
  },

  async searchDocumentChunks(
    projectId: string,
    filename: string,
    maxChunks = 5,
  ) {
    // Basic exact filename search first
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.filename, filename));
    const targetDoc = docs.find((d) => d.projectId === projectId) || docs[0];

    if (!targetDoc) return [];

    // Return the first `maxChunks` chunks (future: replace with embedding search)
    const chunks = await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, targetDoc.id))
      .limit(maxChunks);

    return chunks.map((c) => c.content);
  },
};
