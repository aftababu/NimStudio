CREATE INDEX `conversations_project_idx` ON `conversations` (`project_id`);--> statement-breakpoint
CREATE INDEX `document_chunks_document_idx` ON `document_chunks` (`document_id`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`);