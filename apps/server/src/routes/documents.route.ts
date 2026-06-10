import { Hono } from "hono";
import { DocumentsService } from "../services/documents.service";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const router = new Hono();

router.post("/:projectId/upload", async (c) => {
  try {
    const projectId = c.req.param("projectId");
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Save file temporarily
    const buffer = await file.arrayBuffer();
    const tempFileName = crypto.randomUUID();
    const tempFilePath = path.join(process.cwd(), "uploads", tempFileName);
    
    // Ensure uploads directory exists
    await fs.mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
    await fs.writeFile(tempFilePath, Buffer.from(buffer));

    // Sanitize filename to ensure it works with the @ mention regex (alphanumeric, dot, dash)
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Process the document using our service
    const result = await DocumentsService.processAndStoreDocument(
      projectId,
      sanitizedFilename,
      tempFilePath,
      file.type
    );

    // Clean up temporary file asynchronously
    fs.unlink(tempFilePath).catch((err) => console.error("Failed to delete temp file:", err));

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default router;
