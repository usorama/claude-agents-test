import { z } from 'zod';

// Context hierarchy levels
export const ContextLevel = {
  GLOBAL: 'global',
  PROJECT: 'project',
  AGENT: 'agent',
  TASK: 'task'
};

// Base metadata schema
const MetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().positive(),
  tags: z.array(z.string()).optional()
});

// Individual context schemas without union
export const GlobalContextSchema = z.object({
  id: z.string(),
  level: z.literal(ContextLevel.GLOBAL),
  parentId: z.string().nullable(),
  metadata: MetadataSchema,
  data: z.object({
    systemConfig: z.record(z.unknown()),
    activeProjects: z.array(z.string()),
    globalState: z.record(z.unknown()),
    children: z.array(z.string()).optional()
  })
});

export const ProjectContextSchema = z.object({
  id: z.string(),
  level: z.literal(ContextLevel.PROJECT),
  parentId: z.string().nullable(),
  metadata: MetadataSchema,
  data: z.object({
    projectName: z.string(),
    projectPath: z.string(),
    config: z.record(z.unknown()),
    activeAgents: z.array(z.string()),
    sharedState: z.record(z.unknown()),
    children: z.array(z.string()).optional()
  })
});

export const AgentContextSchema = z.object({
  id: z.string(),
  level: z.literal(ContextLevel.AGENT),
  parentId: z.string().nullable(),
  metadata: MetadataSchema,
  data: z.object({
    agentId: z.string(),
    agentType: z.string(),
    state: z.record(z.unknown()),
    history: z.array(z.object({
      timestamp: z.string(),
      action: z.string(),
      data: z.unknown()
    })),
    capabilities: z.array(z.string()),
    children: z.array(z.string()).optional()
  })
});

export const TaskContextSchema = z.object({
  id: z.string(),
  level: z.literal(ContextLevel.TASK),
  parentId: z.string().nullable(),
  metadata: MetadataSchema,
  data: z.object({
    taskId: z.string(),
    taskType: z.string(),
    input: z.unknown(),
    output: z.unknown().optional(),
    status: z.enum(['pending', 'assigned', 'running', 'in-progress', 'completed', 'failed', 'blocked', 'cancelled']),
    progress: z.number().min(0).max(100).optional(),
    error: z.string().optional()
  })
});

// Helper function to validate context based on level
export function validateContext(context) {
  switch (context.level) {
    case ContextLevel.GLOBAL:
      return GlobalContextSchema.parse(context);
    case ContextLevel.PROJECT:
      return ProjectContextSchema.parse(context);
    case ContextLevel.AGENT:
      return AgentContextSchema.parse(context);
    case ContextLevel.TASK:
      return TaskContextSchema.parse(context);
    default:
      throw new Error(`Unknown context level: ${context.level}`);
  }
}

// Message schema for inter-agent communication
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  timestamp: z.string(),
  type: z.enum(['request', 'response', 'event', 'broadcast']),
  subject: z.string(),
  data: z.unknown(),
  replyTo: z.string().optional(),
  ttl: z.number().optional()
});

// Context query schema
export const ContextQuerySchema = z.object({
  level: z.enum([ContextLevel.GLOBAL, ContextLevel.PROJECT, ContextLevel.AGENT, ContextLevel.TASK]).optional(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  since: z.string().optional(),
  limit: z.number().positive().optional()
});