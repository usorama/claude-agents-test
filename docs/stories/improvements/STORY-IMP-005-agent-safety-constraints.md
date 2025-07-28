# Story IMP-005: Implement Agent Safety Constraints and Guardrails

## Story
As a System Administrator, I need agents to operate within defined safety constraints to prevent destructive actions, resource exhaustion, and unintended consequences in production environments.

## Background
Research emphasizes the importance of safety constraints for autonomous agents. Implementing guardrails ensures agents cannot perform destructive operations or consume excessive resources, making the system production-ready.

## Acceptance Criteria
1. **Resource Constraints**
   - CPU usage limits per agent
   - Memory usage monitoring
   - File system access restrictions
   - Network request rate limiting

2. **Action Constraints**
   - Whitelist of allowed operations
   - Blacklist of forbidden actions
   - Confirmation required for destructive operations
   - Rollback capability for reversible actions

3. **Scope Constraints**
   - Directory access boundaries
   - File modification limits
   - Time-based execution limits
   - Context size constraints

4. **Monitoring & Enforcement**
   - Real-time constraint monitoring
   - Automatic enforcement actions
   - Violation logging and alerting
   - Graceful degradation on limit reach

## Technical Requirements
- Create SafetyConstraints configuration system
- Implement ConstraintEnforcer middleware
- Add resource monitoring to BaseAgent
- Create SafetyViolation event system

## Implementation Details

```javascript
// Safety Constraints Configuration
class SafetyConstraints {
  constructor(config = {}) {
    this.constraints = {
      resources: {
        maxCpuPercent: config.maxCpuPercent || 50,
        maxMemoryMB: config.maxMemoryMB || 512,
        maxExecutionTimeMs: config.maxExecutionTimeMs || 300000, // 5 minutes
        maxFileOperations: config.maxFileOperations || 100,
        maxFileSizeMB: config.maxFileSizeMB || 50
      },
      actions: {
        allowedTools: config.allowedTools || ['Read', 'Write', 'Grep'],
        forbiddenPaths: config.forbiddenPaths || ['/etc', '/sys', '/proc'],
        requireConfirmation: config.requireConfirmation || ['Delete', 'Bash'],
        maxBashCommands: config.maxBashCommands || 10
      },
      scope: {
        workspaceBoundary: config.workspaceBoundary || process.cwd(),
        allowedFileExtensions: config.allowedFileExtensions || null,
        maxContextSizeKB: config.maxContextSizeKB || 100,
        maxConcurrentTasks: config.maxConcurrentTasks || 5
      }
    };
  }
  
  validate(action, context) {
    const violations = [];
    
    // Check action constraints
    if (!this.isActionAllowed(action)) {
      violations.push({
        type: 'ACTION_FORBIDDEN',
        action: action.type,
        severity: 'HIGH'
      });
    }
    
    // Check path constraints
    if (action.path && !this.isPathAllowed(action.path)) {
      violations.push({
        type: 'PATH_FORBIDDEN',
        path: action.path,
        severity: 'CRITICAL'
      });
    }
    
    // Check resource constraints
    const resourceViolations = this.checkResourceLimits(context);
    violations.push(...resourceViolations);
    
    return violations;
  }
}

// Constraint Enforcer Middleware
class ConstraintEnforcer {
  constructor(constraints) {
    this.constraints = constraints;
    this.violations = new Map();
    this.resourceMonitor = new ResourceMonitor();
  }
  
  async enforcePreAction(agent, action) {
    const context = {
      agent: agent.id,
      resources: await this.resourceMonitor.getCurrentUsage(agent.id),
      history: agent.getActionHistory()
    };
    
    const violations = this.constraints.validate(action, context);
    
    if (violations.length > 0) {
      const critical = violations.filter(v => v.severity === 'CRITICAL');
      
      if (critical.length > 0) {
        throw new SafetyViolationError('Critical safety violation', violations);
      }
      
      // Log non-critical violations
      this.logViolations(agent.id, violations);
      
      // Check if confirmation needed
      if (this.needsConfirmation(action)) {
        await this.requestConfirmation(agent, action);
      }
    }
    
    return true;
  }
  
  async enforcePostAction(agent, action, result) {
    // Check if action caused resource spike
    const postResources = await this.resourceMonitor.getCurrentUsage(agent.id);
    
    if (this.detectResourceSpike(postResources)) {
      await this.throttleAgent(agent);
    }
    
    // Update action history
    agent.recordAction(action, result);
  }
}

// Enhanced BaseAgent with Safety
class BaseAgent {
  constructor(config) {
    super(config);
    this.constraints = new SafetyConstraints(config.safety || {});
    this.enforcer = new ConstraintEnforcer(this.constraints);
    this.actionHistory = [];
    this.resourceMonitor = new ResourceMonitor(this.id);
  }
  
  async execute(request) {
    // Start resource monitoring
    this.resourceMonitor.startTracking();
    
    try {
      // Pre-execution safety check
      await this.enforcer.enforcePreAction(this, request);
      
      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => this._executeTask(request),
        this.constraints.constraints.resources.maxExecutionTimeMs
      );
      
      // Post-execution safety check
      await this.enforcer.enforcePostAction(this, request, result);
      
      return result;
    } catch (error) {
      if (error instanceof SafetyViolationError) {
        this.handleSafetyViolation(error);
      }
      throw error;
    } finally {
      this.resourceMonitor.stopTracking();
    }
  }
  
  async executeWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      )
    ]);
  }
  
  handleSafetyViolation(error) {
    // Log violation
    this.logger.error('Safety violation detected', {
      agent: this.id,
      violations: error.violations
    });
    
    // Notify orchestrator
    this.emit('safety-violation', {
      agent: this.id,
      violations: error.violations,
      timestamp: new Date()
    });
    
    // Apply penalties
    this.applyPenalty(error.violations);
  }
}

// Resource Monitor
class ResourceMonitor {
  constructor(agentId) {
    this.agentId = agentId;
    this.measurements = [];
  }
  
  async getCurrentUsage() {
    const usage = {
      cpu: await this.getCpuUsage(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      fileOps: this.getFileOperationCount(),
      timestamp: Date.now()
    };
    
    this.measurements.push(usage);
    
    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }
    
    return usage;
  }
  
  detectAnomaly() {
    if (this.measurements.length < 10) return false;
    
    const recent = this.measurements.slice(-10);
    const avgCpu = recent.reduce((sum, m) => sum + m.cpu, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memory, 0) / recent.length;
    
    const latest = this.measurements[this.measurements.length - 1];
    
    return latest.cpu > avgCpu * 2 || latest.memory > avgMemory * 2;
  }
}
```

## Test Cases
1. Test resource limit enforcement
2. Test forbidden action blocking
3. Test path boundary enforcement
4. Test confirmation flow
5. Test violation logging and alerting

## Dependencies
- BaseAgent class (already implemented)
- Resource monitoring capabilities
- Event system for violations

## Effort Estimate
6-8 hours of implementation

## Priority
High - Critical for production safety

## Notes
- Consider integration with system monitoring tools
- May need OS-specific resource monitoring
- Should support custom constraint plugins
- Balance safety with agent effectiveness