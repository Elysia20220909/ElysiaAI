-- Product foundation for RAG imports, project memory, workbench, privacy, and agent approvals.

CREATE TABLE IF NOT EXISTS "action_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "localScope" TEXT NOT NULL DEFAULT 'workspace',
    "memoryPolicyJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "project_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "knowledge_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "extractor" TEXT NOT NULL DEFAULT 'plain-text',
    "storagePath" TEXT,
    "extractedText" TEXT,
    "sourceHash" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastIndexedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "knowledge_sources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "path" TEXT,
    "heading" TEXT,
    "content" TEXT NOT NULL,
    "contentHash" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "tokenCount" INTEGER,
    "embeddingKey" TEXT,
    "vectorStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "embedding_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "backend" TEXT NOT NULL DEFAULT 'sentence-transformers',
    "model" TEXT,
    "vectorStore" TEXT NOT NULL DEFAULT 'milvus-lite',
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "embedding_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "project_memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "gardenState" TEXT NOT NULL DEFAULT 'sprout',
    "strength" REAL NOT NULL DEFAULT 0.5,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "embeddingKey" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "sourceTraceJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_memories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "memory_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoryId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "delta" REAL,
    "reason" TEXT,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memory_events_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "project_memories" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memory_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "projectId" TEXT,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'markdown',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "content" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "sourceTraceJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "artifacts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "artifacts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "artifact_revisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artifactId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "artifact_revisions_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "answer_traces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "projectId" TEXT,
    "sessionId" TEXT,
    "messageId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "model" TEXT,
    "localOnly" BOOLEAN NOT NULL DEFAULT true,
    "sourcesJson" TEXT NOT NULL DEFAULT '[]',
    "memoriesJson" TEXT NOT NULL DEFAULT '[]',
    "externalCallsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "answer_traces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "answer_traces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "answer_traces_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "answer_traces_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "privacy_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "scope" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'local',
    "purpose" TEXT NOT NULL,
    "dataClass" TEXT NOT NULL DEFAULT 'unknown',
    "approvalStatus" TEXT NOT NULL DEFAULT 'not-required',
    "localOnly" BOOLEAN NOT NULL DEFAULT true,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "payloadHash" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "privacy_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tester_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "testerHash" TEXT,
    "sessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'neutral',
    "severity" TEXT NOT NULL DEFAULT 'info',
    "durationMs" INTEGER,
    "payloadHash" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tester_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tester_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "agent_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'plan-only',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL DEFAULT 'agent-workbench',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "agent_plans_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "agent_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requiredGate" TEXT NOT NULL DEFAULT 'read',
    "toolName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_steps_planId_fkey" FOREIGN KEY ("planId") REFERENCES "agent_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tool_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerKey" TEXT NOT NULL,
    "planId" TEXT,
    "stepId" TEXT,
    "requestedById" TEXT,
    "decidedById" TEXT,
    "toolName" TEXT NOT NULL,
    "actionClass" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestJson" TEXT NOT NULL DEFAULT '{}',
    "requestHash" TEXT,
    "decisionReason" TEXT,
    "expiresAt" DATETIME,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tool_approvals_planId_fkey" FOREIGN KEY ("planId") REFERENCES "agent_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tool_approvals_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "agent_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tool_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tool_approvals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "projects_ownerKey_slug_key" ON "projects"("ownerKey", "slug");
CREATE INDEX IF NOT EXISTS "projects_ownerKey_idx" ON "projects"("ownerKey");
CREATE INDEX IF NOT EXISTS "projects_ownerId_idx" ON "projects"("ownerId");
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_projectId_ownerKey_key" ON "project_members"("projectId", "ownerKey");
CREATE INDEX IF NOT EXISTS "project_members_ownerKey_idx" ON "project_members"("ownerKey");
CREATE INDEX IF NOT EXISTS "project_members_userId_idx" ON "project_members"("userId");

CREATE INDEX IF NOT EXISTS "action_logs_createdAt_idx" ON "action_logs"("createdAt");

CREATE INDEX IF NOT EXISTS "knowledge_sources_userId_idx" ON "knowledge_sources"("userId");
CREATE INDEX IF NOT EXISTS "knowledge_sources_ownerKey_idx" ON "knowledge_sources"("ownerKey");
CREATE INDEX IF NOT EXISTS "knowledge_sources_projectId_idx" ON "knowledge_sources"("projectId");
CREATE INDEX IF NOT EXISTS "knowledge_sources_status_idx" ON "knowledge_sources"("status");
CREATE INDEX IF NOT EXISTS "knowledge_sources_sourceHash_idx" ON "knowledge_sources"("sourceHash");

CREATE UNIQUE INDEX IF NOT EXISTS "document_chunks_sourceId_chunkIndex_key" ON "document_chunks"("sourceId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "document_chunks_ownerKey_idx" ON "document_chunks"("ownerKey");
CREATE INDEX IF NOT EXISTS "document_chunks_userId_idx" ON "document_chunks"("userId");
CREATE INDEX IF NOT EXISTS "document_chunks_projectId_idx" ON "document_chunks"("projectId");
CREATE INDEX IF NOT EXISTS "document_chunks_sourceId_idx" ON "document_chunks"("sourceId");
CREATE INDEX IF NOT EXISTS "document_chunks_vectorStatus_idx" ON "document_chunks"("vectorStatus");

CREATE INDEX IF NOT EXISTS "embedding_jobs_sourceId_idx" ON "embedding_jobs"("sourceId");
CREATE INDEX IF NOT EXISTS "embedding_jobs_ownerKey_idx" ON "embedding_jobs"("ownerKey");
CREATE INDEX IF NOT EXISTS "embedding_jobs_userId_idx" ON "embedding_jobs"("userId");
CREATE INDEX IF NOT EXISTS "embedding_jobs_projectId_idx" ON "embedding_jobs"("projectId");
CREATE INDEX IF NOT EXISTS "embedding_jobs_status_idx" ON "embedding_jobs"("status");

CREATE INDEX IF NOT EXISTS "project_memories_projectId_idx" ON "project_memories"("projectId");
CREATE INDEX IF NOT EXISTS "project_memories_ownerKey_idx" ON "project_memories"("ownerKey");
CREATE INDEX IF NOT EXISTS "project_memories_userId_idx" ON "project_memories"("userId");
CREATE INDEX IF NOT EXISTS "project_memories_status_idx" ON "project_memories"("status");
CREATE INDEX IF NOT EXISTS "project_memories_gardenState_idx" ON "project_memories"("gardenState");
CREATE INDEX IF NOT EXISTS "project_memories_pinned_idx" ON "project_memories"("pinned");

CREATE INDEX IF NOT EXISTS "memory_events_memoryId_idx" ON "memory_events"("memoryId");
CREATE INDEX IF NOT EXISTS "memory_events_ownerKey_idx" ON "memory_events"("ownerKey");
CREATE INDEX IF NOT EXISTS "memory_events_userId_idx" ON "memory_events"("userId");
CREATE INDEX IF NOT EXISTS "memory_events_eventType_idx" ON "memory_events"("eventType");
CREATE INDEX IF NOT EXISTS "memory_events_createdAt_idx" ON "memory_events"("createdAt");

CREATE INDEX IF NOT EXISTS "artifacts_ownerKey_idx" ON "artifacts"("ownerKey");
CREATE INDEX IF NOT EXISTS "artifacts_projectId_idx" ON "artifacts"("projectId");
CREATE INDEX IF NOT EXISTS "artifacts_authorId_idx" ON "artifacts"("authorId");
CREATE INDEX IF NOT EXISTS "artifacts_kind_idx" ON "artifacts"("kind");
CREATE INDEX IF NOT EXISTS "artifacts_status_idx" ON "artifacts"("status");
CREATE INDEX IF NOT EXISTS "artifact_revisions_artifactId_idx" ON "artifact_revisions"("artifactId");
CREATE INDEX IF NOT EXISTS "artifact_revisions_createdAt_idx" ON "artifact_revisions"("createdAt");

CREATE INDEX IF NOT EXISTS "answer_traces_userId_idx" ON "answer_traces"("userId");
CREATE INDEX IF NOT EXISTS "answer_traces_projectId_idx" ON "answer_traces"("projectId");
CREATE INDEX IF NOT EXISTS "answer_traces_sessionId_idx" ON "answer_traces"("sessionId");
CREATE INDEX IF NOT EXISTS "answer_traces_messageId_idx" ON "answer_traces"("messageId");
CREATE INDEX IF NOT EXISTS "answer_traces_createdAt_idx" ON "answer_traces"("createdAt");

CREATE INDEX IF NOT EXISTS "privacy_events_ownerKey_idx" ON "privacy_events"("ownerKey");
CREATE INDEX IF NOT EXISTS "privacy_events_userId_idx" ON "privacy_events"("userId");
CREATE INDEX IF NOT EXISTS "privacy_events_projectId_idx" ON "privacy_events"("projectId");
CREATE INDEX IF NOT EXISTS "privacy_events_provider_idx" ON "privacy_events"("provider");
CREATE INDEX IF NOT EXISTS "privacy_events_approvalStatus_idx" ON "privacy_events"("approvalStatus");
CREATE INDEX IF NOT EXISTS "privacy_events_createdAt_idx" ON "privacy_events"("createdAt");

CREATE INDEX IF NOT EXISTS "tester_events_ownerKey_idx" ON "tester_events"("ownerKey");
CREATE INDEX IF NOT EXISTS "tester_events_userId_idx" ON "tester_events"("userId");
CREATE INDEX IF NOT EXISTS "tester_events_projectId_idx" ON "tester_events"("projectId");
CREATE INDEX IF NOT EXISTS "tester_events_sessionId_idx" ON "tester_events"("sessionId");
CREATE INDEX IF NOT EXISTS "tester_events_eventType_idx" ON "tester_events"("eventType");
CREATE INDEX IF NOT EXISTS "tester_events_area_idx" ON "tester_events"("area");
CREATE INDEX IF NOT EXISTS "tester_events_outcome_idx" ON "tester_events"("outcome");
CREATE INDEX IF NOT EXISTS "tester_events_createdAt_idx" ON "tester_events"("createdAt");

CREATE INDEX IF NOT EXISTS "agent_plans_ownerKey_idx" ON "agent_plans"("ownerKey");
CREATE INDEX IF NOT EXISTS "agent_plans_userId_idx" ON "agent_plans"("userId");
CREATE INDEX IF NOT EXISTS "agent_plans_projectId_idx" ON "agent_plans"("projectId");
CREATE INDEX IF NOT EXISTS "agent_plans_status_idx" ON "agent_plans"("status");
CREATE INDEX IF NOT EXISTS "agent_plans_riskLevel_idx" ON "agent_plans"("riskLevel");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_steps_planId_position_key" ON "agent_steps"("planId", "position");
CREATE INDEX IF NOT EXISTS "agent_steps_planId_idx" ON "agent_steps"("planId");
CREATE INDEX IF NOT EXISTS "agent_steps_status_idx" ON "agent_steps"("status");
CREATE INDEX IF NOT EXISTS "agent_steps_requiredGate_idx" ON "agent_steps"("requiredGate");
CREATE UNIQUE INDEX IF NOT EXISTS "tool_approvals_stepId_key" ON "tool_approvals"("stepId");
CREATE INDEX IF NOT EXISTS "tool_approvals_ownerKey_idx" ON "tool_approvals"("ownerKey");
CREATE INDEX IF NOT EXISTS "tool_approvals_planId_idx" ON "tool_approvals"("planId");
CREATE INDEX IF NOT EXISTS "tool_approvals_requestedById_idx" ON "tool_approvals"("requestedById");
CREATE INDEX IF NOT EXISTS "tool_approvals_decidedById_idx" ON "tool_approvals"("decidedById");
CREATE INDEX IF NOT EXISTS "tool_approvals_status_idx" ON "tool_approvals"("status");
CREATE INDEX IF NOT EXISTS "tool_approvals_riskLevel_idx" ON "tool_approvals"("riskLevel");
CREATE INDEX IF NOT EXISTS "tool_approvals_actionClass_idx" ON "tool_approvals"("actionClass");

CREATE VIRTUAL TABLE IF NOT EXISTS "document_chunks_fts" USING fts5(
    "chunkId" UNINDEXED,
    "sourceId" UNINDEXED,
    "sourceName",
    "content",
    tokenize = 'unicode61'
);

CREATE TRIGGER IF NOT EXISTS "document_chunks_ai" AFTER INSERT ON "document_chunks" BEGIN
    INSERT INTO "document_chunks_fts"("rowid", "chunkId", "sourceId", "sourceName", "content")
    VALUES (
        new.rowid,
        new."id",
        new."sourceId",
        COALESCE((SELECT "name" FROM "knowledge_sources" WHERE "id" = new."sourceId"), ''),
        new."content"
    );
END;

CREATE TRIGGER IF NOT EXISTS "document_chunks_ad" AFTER DELETE ON "document_chunks" BEGIN
    DELETE FROM "document_chunks_fts" WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS "document_chunks_au" AFTER UPDATE ON "document_chunks" BEGIN
    DELETE FROM "document_chunks_fts" WHERE rowid = old.rowid;
    INSERT INTO "document_chunks_fts"("rowid", "chunkId", "sourceId", "sourceName", "content")
    VALUES (
        new.rowid,
        new."id",
        new."sourceId",
        COALESCE((SELECT "name" FROM "knowledge_sources" WHERE "id" = new."sourceId"), ''),
        new."content"
    );
END;
