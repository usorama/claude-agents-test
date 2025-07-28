import { z } from 'zod';

// Context hierarchy levels
export const ContextLevel = {
  GLOBAL: 'global',
  PROJECT: 'project',
  AGENT: 'agent',
  TASK: 'task'
};

// Base context schema
export const BaseContextSchema = z.object({
  id: z.string(),
  level: z.enum([ContextLevel.GLOBAL, ContextLevel.PROJECT, ContextLevel.AGENT, ContextLevel.TASK]),
  parentId: z.string().optional(),
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.number().int().positive(),
    tags: z.array(z.string()).optional()
  }),
  data: z.record(z.unknown())
});

// Global context schema
export const GlobalContextSchema = BaseContextSchema.extend({
  level: z.literal(ContextLevel.GLOBAL),
  data: z.object({
    systemConfig: z.record(z.unknown()),
    activeProjects: z.array(z.string()),
    globalState: z.record(z.unknown())
  })
});

// Project context schema
export const ProjectContextSchema = BaseContextSchema.extend({
  level: z.literal(ContextLevel.PROJECT),
  data: z.object({
    projectName: z.string(),
    projectPath: z.string(),
    config: z.record(z.unknown()),
    activeAgents: z.array(z.string()),
    sharedState: z.record(z.unknown())
  })
});

// Agent context schema
export const AgentContextSchema = BaseContextSchema.extend({
  level: z.literal(ContextLevel.AGENT),
  data: z.object({
    agentId: z.string(),
    agentType: z.string(),
    state: z.record(z.unknown()),
    history: z.array(z.object({
      timestamp: z.string().datetime(),
      action: z.string(),
      data: z.unknown()
    })),
    capabilities: z.array(z.string())
  })
});

// Task context schema
export const TaskContextSchema = BaseContextSchema.extend({
  level: z.literal(ContextLevel.TASK),
  data: z.object({
    taskId: z.string(),
    taskType: z.string(),
    input: z.unknown(),
    output: z.unknown().optional(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    progress: z.number().min(0).max(100).optional(),
    error: z.string().optional()
  })
});

// Message schema for inter-agent communication
export const AgentMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  timestamp: z.string().datetime(),
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
  since: z.string().datetime().optional(),
  limit: z.number().positive().optional()
});

// Type exports
export const ContextSchema = z.union([
  GlobalContextSchema,
  ProjectContextSchema,
  AgentContextSchema,
  TaskContextSchema
]);