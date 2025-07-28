import { z } from 'zod';

// Agent capabilities
export const AgentCapability = {
  RESEARCH: 'research',
  PLANNING: 'planning',
  ARCHITECTURE: 'architecture',
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation',
  PROJECT_MANAGEMENT: 'project_management',
  VERSION_CONTROL: 'version_control',
  DEPLOYMENT: 'deployment',
  MONITORING: 'monitoring',
  DEBUGGING: 'debugging',
  REVIEW: 'review',
  QUALITY: 'quality'
};

// Agent types
export const AgentType = {
  ANALYST: 'analyst',
  PM: 'pm',
  ARCHITECT: 'architect',
  DEVELOPER: 'developer',
  QA: 'qa',
  SM: 'sm',
  PO: 'po',
  UX: 'ux',
  DEVOPS: 'devops',
  GIT_MANAGER: 'git_manager',
  MONITOR: 'monitor',
  SELF_HEALER: 'self_healer',
  OPS_MANAGER: 'ops_manager',
  ORCHESTRATOR: 'orchestrator',
  UI_ARCHITECT: 'ui_architect'
};

// Claude Code tool types
export const ClaudeCodeTool = {
  TASK: 'Task',
  BASH: 'Bash',
  GLOB: 'Glob',
  GREP: 'Grep',
  LS: 'LS',
  READ: 'Read',
  EDIT: 'Edit',
  MULTI_EDIT: 'MultiEdit',
  WRITE: 'Write',
  NOTEBOOK_READ: 'NotebookRead',
  NOTEBOOK_EDIT: 'NotebookEdit',
  WEB_FETCH: 'WebFetch',
  WEB_SEARCH: 'WebSearch',
  TODO_WRITE: 'TodoWrite'
};

// Task schema
export const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['pending', 'assigned', 'running', 'completed', 'failed', 'cancelled']),
  input: z.unknown(),
  output: z.unknown().optional(),
  assignedTo: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional()
});

// Agent configuration schema
export const AgentConfigSchema = z.object({
  id: z.string(),
  type: z.enum(Object.values(AgentType)),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.enum(Object.values(AgentCapability))),
  tools: z.array(z.enum(Object.values(ClaudeCodeTool))),
  maxConcurrentTasks: z.number().positive().default(1),
  timeoutMs: z.number().positive().default(300000), // 5 minutes
  retryAttempts: z.number().nonnegative().default(3),
  config: z.record(z.unknown()).optional()
});

// Agent state schema
export const AgentStateSchema = z.object({
  agentId: z.string(),
  status: z.enum(['idle', 'busy', 'error', 'offline']),
  currentTasks: z.array(z.string()),
  completedTasks: z.number().nonnegative(),
  failedTasks: z.number().nonnegative(),
  totalTokensUsed: z.number().nonnegative(),
  lastActiveAt: z.string().datetime(),
  metrics: z.object({
    avgTaskDuration: z.number().nonnegative(),
    successRate: z.number().min(0).max(1),
    tokenEfficiency: z.number().nonnegative()
  }).optional()
});

// Tool invocation schema
export const ToolInvocationSchema = z.object({
  tool: z.enum(Object.values(ClaudeCodeTool)),
  parameters: z.record(z.unknown()),
  timeout: z.number().positive().optional()
});

// Agent request schema
export const AgentRequestSchema = z.object({
  taskId: z.string(),
  taskType: z.string(),
  input: z.unknown(),
  context: z.record(z.unknown()).optional(),
  tools: z.array(z.enum(Object.values(ClaudeCodeTool))).optional(),
  constraints: z.object({
    maxTokens: z.number().positive().optional(),
    timeout: z.number().positive().optional(),
    allowedTools: z.array(z.string()).optional()
  }).optional()
});

// Agent response schema
export const AgentResponseSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  status: z.enum(['success', 'failure', 'partial']),
  output: z.unknown(),
  toolsUsed: z.array(z.object({
    tool: z.string(),
    invocations: z.number(),
    tokensUsed: z.number()
  })).optional(),
  metrics: z.object({
    duration: z.number(),
    tokensUsed: z.number(),
    toolInvocations: z.number()
  }),
  error: z.string().optional()
});