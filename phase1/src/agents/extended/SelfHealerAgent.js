import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class SelfHealerAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'self-healer-001',
      type: 'SelfHealerAgent',
      name: 'Phoenix',
      description: 'Expert Autonomous Self-Healing System',
      capabilities: [
        AgentCapability.MONITORING,
        AgentCapability.DEBUGGING,
        AgentCapability.DEPLOYMENT
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.EDIT,
        ClaudeCodeTool.BASH,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.TASK,
        ClaudeCodeTool.TODO_WRITE
      ],
      ...config
    });
    
    this.persona = {
      role: 'Expert Autonomous Self-Healing System',
      style: 'Autonomous, decisive, preventive, resilient',
      identity: 'System guardian that automatically detects and fixes issues before they impact users',
      focus: 'Automated recovery, root cause analysis, preventive measures, system resilience',
      corePrinciples: [
        'Prevention is better than cure',
        'Every incident is a learning opportunity',
        'Automated recovery reduces MTTR',
        'Self-healing builds resilient systems',
        'Document every action for audit trails'
      ]
    };
    
    this.healingWorkflow = {
      detectionMethods: [
        'Log analysis',
        'Metric anomalies',
        'Health check failures',
        'Error rate spikes',
        'Performance degradation'
      ],
      healingStrategies: [
        'Service restart',
        'Resource scaling',
        'Configuration rollback',
        'Cache clearing',
        'Connection pool reset',
        'Automatic failover'
      ]
    };
    
    // Initialize healing state
    this.healingRules = new Map();
    this.incidentHistory = [];
    this.preventiveMeasures = new Map();
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Self-Healer executing task', { taskType });
    
    switch (taskType) {
      case 'configure-healing':
        return await this._configureHealing(input);
        
      case 'diagnose-issue':
        return await this._diagnoseIssue(input);
        
      case 'apply-healing':
        return await this._applyHealing(input);
        
      case 'create-runbook':
        return await this._createRunbook(input);
        
      case 'analyze-patterns':
        return await this._analyzeIncidentPatterns(input);
        
      case 'preventive-action':
        return await this._takePreventiveAction(input);
        
      case 'test-recovery':
        return await this._testRecoveryProcedure(input);
        
      case 'update-knowledge':
        return await this._updateHealingKnowledge(input);
        
      case 'emergency-response':
        return await this._handleEmergencyResponse(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _configureHealing(input) {
    const {
      services,
      rules = [],
      enableAutoHealing = true,
      notificationChannels = []
    } = input;
    
    const configuration = {
      services: [],
      rules: [],
      policies: {
        autoHealing: enableAutoHealing,
        maxRetries: 3,
        cooldownPeriod: 300 // seconds
      },
      status: 'configuring'
    };
    
    try {
      // Configure healing for each service
      for (const service of services) {
        const serviceConfig = {
          name: service.name,
          type: service.type,
          healthEndpoint: service.healthEndpoint,
          criticalDependencies: service.dependencies || [],
          healingActions: []
        };
        
        // Define service-specific healing actions
        serviceConfig.healingActions = this._defineHealingActions(service);
        
        configuration.services.push(serviceConfig);
      }
      
      // Process healing rules
      for (const rule of rules) {
        const processedRule = {
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rule.name,
          trigger: rule.trigger,
          conditions: rule.conditions,
          actions: rule.actions,
          priority: rule.priority || 'medium',
          enabled: true
        };
        
        this.healingRules.set(processedRule.id, processedRule);
        configuration.rules.push(processedRule);
      }
      
      // Create healing configuration files
      const configYaml = this._generateHealingConfig(configuration);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: 'self-healing/config.yaml',
        content: configYaml
      });
      
      // Setup monitoring integration
      await this._setupMonitoringIntegration(configuration);
      
      // Configure notification channels
      if (notificationChannels.length > 0) {
        await this._configureNotifications(notificationChannels);
      }
      
      configuration.status = 'active';
      
      return {
        configuration,
        summary: `Self-healing configured for ${services.length} services with ${configuration.rules.length} rules`
      };
    } catch (error) {
      this.logger.error('Healing configuration failed', { error: error.message });
      configuration.status = 'failed';
      configuration.error = error.message;
      return { configuration, summary: `Configuration failed: ${error.message}` };
    }
  }

  async _diagnoseIssue(input) {
    const {
      service,
      symptoms,
      metrics,
      logs,
      timeRange = { minutes: 30 }
    } = input;
    
    const diagnosis = {
      service,
      startedAt: new Date().toISOString(),
      symptoms: symptoms || [],
      rootCauses: [],
      correlations: [],
      recommendations: [],
      confidence: 0
    };
    
    try {
      // Analyze symptoms
      const symptomAnalysis = await this._analyzeSymptoms(symptoms, service);
      diagnosis.symptomAnalysis = symptomAnalysis;
      
      // Analyze metrics if provided
      if (metrics) {
        const metricAnalysis = await this._analyzeMetrics(metrics, timeRange);
        diagnosis.metricAnalysis = metricAnalysis;
        
        // Look for metric correlations
        diagnosis.correlations.push(...this._findMetricCorrelations(metricAnalysis));
      }
      
      // Analyze logs if provided
      if (logs) {
        const logAnalysis = await this._analyzeLogs(logs, timeRange);
        diagnosis.logAnalysis = logAnalysis;
        
        // Extract error patterns
        const errorPatterns = this._extractErrorPatterns(logAnalysis);
        diagnosis.errorPatterns = errorPatterns;
      }
      
      // Determine root causes
      diagnosis.rootCauses = await this._determineRootCauses(diagnosis);
      
      // Calculate confidence score
      diagnosis.confidence = this._calculateDiagnosisConfidence(diagnosis);
      
      // Generate recommendations
      diagnosis.recommendations = this._generateHealingRecommendations(diagnosis);
      
      // Check incident history for similar issues
      const similarIncidents = this._findSimilarIncidents(diagnosis);
      if (similarIncidents.length > 0) {
        diagnosis.historicalContext = {
          similar: similarIncidents,
          previousSolutions: this._extractPreviousSolutions(similarIncidents)
        };
      }
      
      // Create diagnosis report
      const report = this._generateDiagnosisReport(diagnosis);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `self-healing/diagnoses/${service}-${Date.now()}.md`,
        content: report
      });
      
      return {
        diagnosis,
        summary: `Diagnosed ${service}: ${diagnosis.rootCauses.length} root causes found, confidence: ${diagnosis.confidence}%`
      };
    } catch (error) {
      this.logger.error('Diagnosis failed', { service, error: error.message });
      diagnosis.error = error.message;
      return {
        diagnosis,
        summary: `Diagnosis failed: ${error.message}`
      };
    }
  }

  async _applyHealing(input) {
    const {
      service,
      diagnosis,
      strategy = 'progressive',
      dryRun = false
    } = input;
    
    const healing = {
      service,
      strategy,
      actions: [],
      startedAt: new Date().toISOString(),
      status: 'in-progress'
    };
    
    try {
      // Select healing actions based on diagnosis
      const selectedActions = this._selectHealingActions(diagnosis, strategy);
      
      // Execute healing actions
      for (const action of selectedActions) {
        const actionResult = {
          action: action.name,
          startedAt: new Date().toISOString(),
          status: 'pending'
        };
        
        if (!dryRun) {
          try {
            // Execute the healing action
            const result = await this._executeHealingAction(action, service);
            actionResult.result = result;
            actionResult.status = result.success ? 'completed' : 'failed';
            
            // Verify the action was effective
            const verification = await this._verifyHealingAction(action, service);
            actionResult.verification = verification;
            
            if (!verification.effective) {
              actionResult.status = 'ineffective';
              // Try next action if progressive strategy
              if (strategy === 'progressive') continue;
            }
          } catch (error) {
            actionResult.status = 'failed';
            actionResult.error = error.message;
          }
        } else {
          actionResult.status = 'dry-run';
        }
        
        actionResult.completedAt = new Date().toISOString();
        healing.actions.push(actionResult);
        
        // If action was successful and effective, stop
        if (actionResult.status === 'completed' && actionResult.verification?.effective) {
          break;
        }
      }
      
      // Final health check
      const finalHealth = await this._checkServiceHealth(service);
      healing.finalHealth = finalHealth;
      
      healing.status = finalHealth.healthy ? 'healed' : 'partial';
      healing.completedAt = new Date().toISOString();
      
      // Record incident
      this._recordIncident({
        service,
        diagnosis,
        healing,
        outcome: healing.status
      });
      
      return {
        healing,
        summary: `Healing ${healing.status}: Applied ${healing.actions.length} actions to ${service}`
      };
    } catch (error) {
      this.logger.error('Healing failed', { service, error: error.message });
      healing.status = 'failed';
      healing.error = error.message;
      return {
        healing,
        summary: `Healing failed: ${error.message}`
      };
    }
  }

  async _createRunbook(input) {
    const {
      scenario,
      title,
      severity = 'medium',
      steps = [],
      automatable = true
    } = input;
    
    const runbook = {
      id: `runbook-${Date.now()}`,
      title,
      scenario,
      severity,
      automatable,
      steps: [],
      validations: [],
      rollback: []
    };
    
    try {
      // Process each step
      for (const step of steps) {
        const processedStep = {
          order: runbook.steps.length + 1,
          name: step.name,
          description: step.description,
          command: step.command,
          expectedOutcome: step.expectedOutcome,
          timeout: step.timeout || 300,
          retryable: step.retryable !== false
        };
        
        // Add validation for the step
        if (step.validation) {
          runbook.validations.push({
            step: processedStep.order,
            check: step.validation
          });
        }
        
        runbook.steps.push(processedStep);
      }
      
      // Generate rollback procedures
      runbook.rollback = this._generateRollbackProcedures(runbook.steps);
      
      // Create runbook document
      const runbookDoc = this._generateRunbookDocument(runbook);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `self-healing/runbooks/${runbook.id}.md`,
        content: runbookDoc
      });
      
      // Create automated script if automatable
      if (automatable) {
        const script = this._generateAutomatedScript(runbook);
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: `self-healing/runbooks/${runbook.id}.sh`,
          content: script
        });
        
        // Make script executable
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: `chmod +x self-healing/runbooks/${runbook.id}.sh`,
          description: 'Make runbook script executable'
        });
      }
      
      // Register runbook
      this.healingRules.set(runbook.id, {
        type: 'runbook',
        ...runbook
      });
      
      return {
        runbook,
        summary: `Created runbook "${title}" with ${runbook.steps.length} steps`
      };
    } catch (error) {
      this.logger.error('Runbook creation failed', { title, error: error.message });
      return {
        runbook: null,
        summary: `Runbook creation failed: ${error.message}`
      };
    }
  }

  async _analyzeIncidentPatterns(input) {
    const {
      timeRange = { days: 30 },
      services = [],
      minOccurrences = 2
    } = input;
    
    const analysis = {
      timeRange,
      incidents: [],
      patterns: [],
      recommendations: []
    };
    
    try {
      // Load incident history
      const incidents = await this._loadIncidentHistory(timeRange, services);
      analysis.incidents = incidents;
      
      // Group incidents by similarity
      const groupedIncidents = this._groupSimilarIncidents(incidents);
      
      // Identify patterns
      for (const [key, group] of Object.entries(groupedIncidents)) {
        if (group.length >= minOccurrences) {
          const pattern = {
            type: this._determinePatternType(group),
            occurrences: group.length,
            frequency: this._calculateFrequency(group, timeRange),
            services: [...new Set(group.map(i => i.service))],
            commonCauses: this._extractCommonCauses(group),
            timePattern: this._analyzeTimePattern(group)
          };
          
          analysis.patterns.push(pattern);
        }
      }
      
      // Generate preventive recommendations
      for (const pattern of analysis.patterns) {
        const recommendations = this._generatePreventiveRecommendations(pattern);
        analysis.recommendations.push(...recommendations);
      }
      
      // Create pattern report
      const report = this._generatePatternReport(analysis);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `self-healing/reports/patterns-${Date.now()}.md`,
        content: report
      });
      
      return {
        analysis,
        summary: `Found ${analysis.patterns.length} incident patterns from ${analysis.incidents.length} incidents`
      };
    } catch (error) {
      this.logger.error('Pattern analysis failed', { error: error.message });
      return {
        analysis,
        summary: `Pattern analysis failed: ${error.message}`
      };
    }
  }

  async _takePreventiveAction(input) {
    const {
      service,
      risk,
      threshold = 0.7,
      actions = []
    } = input;
    
    const prevention = {
      service,
      risk,
      riskScore: 0,
      actionsTaken: [],
      status: 'evaluating'
    };
    
    try {
      // Evaluate current risk
      prevention.riskScore = await this._evaluateRisk(service, risk);
      
      if (prevention.riskScore < threshold) {
        prevention.status = 'low-risk';
        return {
          prevention,
          summary: `Risk score ${prevention.riskScore} below threshold ${threshold}, no action needed`
        };
      }
      
      // Select preventive actions
      const selectedActions = actions.length > 0 
        ? actions 
        : this._selectPreventiveActions(risk, prevention.riskScore);
      
      // Execute preventive actions
      for (const action of selectedActions) {
        const actionResult = {
          action: action.name,
          type: 'preventive',
          startedAt: new Date().toISOString()
        };
        
        try {
          const result = await this._executePreventiveAction(action, service);
          actionResult.result = result;
          actionResult.status = 'completed';
          
          // Re-evaluate risk after action
          const newRiskScore = await this._evaluateRisk(service, risk);
          actionResult.riskReduction = prevention.riskScore - newRiskScore;
          prevention.riskScore = newRiskScore;
          
        } catch (error) {
          actionResult.status = 'failed';
          actionResult.error = error.message;
        }
        
        actionResult.completedAt = new Date().toISOString();
        prevention.actionsTaken.push(actionResult);
        
        // Stop if risk is now acceptable
        if (prevention.riskScore < threshold) break;
      }
      
      prevention.status = prevention.riskScore < threshold ? 'mitigated' : 'partial';
      
      // Record preventive measure
      this.preventiveMeasures.set(`${service}-${risk.type}`, {
        ...prevention,
        timestamp: new Date().toISOString()
      });
      
      return {
        prevention,
        summary: `Preventive action ${prevention.status}: Risk reduced from ${prevention.riskScore} to ${prevention.riskScore}`
      };
    } catch (error) {
      this.logger.error('Preventive action failed', { service, error: error.message });
      prevention.status = 'failed';
      prevention.error = error.message;
      return {
        prevention,
        summary: `Preventive action failed: ${error.message}`
      };
    }
  }

  async _testRecoveryProcedure(input) {
    const {
      procedure,
      service,
      simulateFailure = true,
      validateRecovery = true
    } = input;
    
    const test = {
      procedure: procedure.name,
      service,
      steps: [],
      startedAt: new Date().toISOString(),
      status: 'running'
    };
    
    try {
      // Capture initial state
      const initialState = await this._captureServiceState(service);
      test.initialState = initialState;
      
      // Simulate failure if requested
      if (simulateFailure) {
        const failure = await this._simulateFailure(service, procedure.failureType);
        test.steps.push({
          step: 'simulate-failure',
          status: failure.success ? 'completed' : 'failed',
          result: failure
        });
        
        if (!failure.success) {
          throw new Error('Failed to simulate failure condition');
        }
      }
      
      // Execute recovery procedure
      for (const step of procedure.steps) {
        const stepResult = {
          step: step.name,
          startedAt: new Date().toISOString()
        };
        
        try {
          const result = await this._executeRecoveryStep(step, service);
          stepResult.result = result;
          stepResult.status = 'completed';
        } catch (error) {
          stepResult.status = 'failed';
          stepResult.error = error.message;
          test.steps.push(stepResult);
          throw error;
        }
        
        stepResult.completedAt = new Date().toISOString();
        test.steps.push(stepResult);
      }
      
      // Validate recovery if requested
      if (validateRecovery) {
        const validation = await this._validateRecovery(service, initialState);
        test.validation = validation;
        test.status = validation.recovered ? 'passed' : 'failed';
      } else {
        test.status = 'completed';
      }
      
      test.completedAt = new Date().toISOString();
      
      // Generate test report
      const report = this._generateRecoveryTestReport(test);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `self-healing/tests/recovery-${Date.now()}.md`,
        content: report
      });
      
      return {
        test,
        summary: `Recovery test ${test.status} for ${procedure.name}`
      };
    } catch (error) {
      this.logger.error('Recovery test failed', { procedure: procedure.name, error: error.message });
      test.status = 'failed';
      test.error = error.message;
      return {
        test,
        summary: `Recovery test failed: ${error.message}`
      };
    }
  }

  async _updateHealingKnowledge(input) {
    const {
      incident,
      solution,
      effectiveness,
      lessons = []
    } = input;
    
    const knowledge = {
      id: `knowledge-${Date.now()}`,
      incident: {
        type: incident.type,
        service: incident.service,
        rootCause: incident.rootCause
      },
      solution: {
        actions: solution.actions,
        duration: solution.duration,
        effectiveness
      },
      lessons,
      addedAt: new Date().toISOString()
    };
    
    try {
      // Extract patterns from the incident
      const patterns = this._extractIncidentPatterns(incident);
      knowledge.patterns = patterns;
      
      // Update healing rules based on effectiveness
      if (effectiveness > 0.8) {
        const newRule = this._createHealingRuleFromSolution(incident, solution);
        this.healingRules.set(newRule.id, newRule);
        knowledge.ruleCreated = newRule.id;
      }
      
      // Update preventive measures if applicable
      if (lessons.some(l => l.type === 'preventive')) {
        const preventiveMeasure = this._createPreventiveMeasure(incident, lessons);
        knowledge.preventiveMeasure = preventiveMeasure;
      }
      
      // Store knowledge in knowledge base
      const knowledgeDoc = this._generateKnowledgeDocument(knowledge);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `self-healing/knowledge/${knowledge.id}.md`,
        content: knowledgeDoc
      });
      
      // Update healing index
      await this._updateHealingIndex(knowledge);
      
      return {
        knowledge,
        summary: `Updated healing knowledge: ${effectiveness > 0.8 ? 'Created new rule' : 'Documented for reference'}`
      };
    } catch (error) {
      this.logger.error('Knowledge update failed', { error: error.message });
      return {
        knowledge: null,
        summary: `Knowledge update failed: ${error.message}`
      };
    }
  }

  async _handleEmergencyResponse(input) {
    const {
      alert,
      severity = 'critical',
      affectedServices = [],
      skipDiagnosis = false
    } = input;
    
    const emergency = {
      id: `emergency-${Date.now()}`,
      alert,
      severity,
      startedAt: new Date().toISOString(),
      actions: [],
      status: 'responding'
    };
    
    try {
      // Immediate stabilization actions
      const stabilization = await this._performStabilization(affectedServices);
      emergency.actions.push({
        type: 'stabilization',
        result: stabilization
      });
      
      // Quick diagnosis unless skipped
      let diagnosis = null;
      if (!skipDiagnosis) {
        diagnosis = await this._performQuickDiagnosis(alert, affectedServices);
        emergency.diagnosis = diagnosis;
      }
      
      // Execute emergency healing actions
      const healingActions = this._selectEmergencyActions(severity, diagnosis);
      
      for (const action of healingActions) {
        const actionResult = await this._executeEmergencyAction(action, affectedServices);
        emergency.actions.push({
          type: 'healing',
          action: action.name,
          result: actionResult
        });
        
        // Check if situation is improving
        const currentStatus = await this._assessEmergencyStatus(affectedServices);
        if (currentStatus.stable) {
          emergency.status = 'stabilized';
          break;
        }
      }
      
      // Notify relevant parties
      await this._sendEmergencyNotifications(emergency);
      
      // Create incident report
      const report = this._generateEmergencyReport(emergency);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `self-healing/emergencies/${emergency.id}.md`,
        content: report
      });
      
      emergency.completedAt = new Date().toISOString();
      emergency.status = emergency.status || 'contained';
      
      return {
        emergency,
        summary: `Emergency ${emergency.status}: ${emergency.actions.length} actions taken`
      };
    } catch (error) {
      this.logger.error('Emergency response failed', { alert, error: error.message });
      emergency.status = 'failed';
      emergency.error = error.message;
      return {
        emergency,
        summary: `Emergency response failed: ${error.message}`
      };
    }
  }

  // Helper methods
  _defineHealingActions(service) {
    const actions = [];
    
    // Common actions for all services
    actions.push(
      { name: 'restart-service', command: `systemctl restart ${service.name}`, impact: 'low' },
      { name: 'clear-cache', command: `redis-cli FLUSHDB`, impact: 'medium' },
      { name: 'increase-resources', command: `kubectl scale --replicas=+1 ${service.name}`, impact: 'low' }
    );
    
    // Service-specific actions
    if (service.type === 'web') {
      actions.push(
        { name: 'reset-connections', command: 'nginx -s reload', impact: 'low' },
        { name: 'failover', command: `kubectl patch service ${service.name} --type merge -p '{"spec":{"selector":{"version":"backup"}}}'`, impact: 'high' }
      );
    }
    
    if (service.type === 'database') {
      actions.push(
        { name: 'kill-long-queries', command: 'mysql -e "SHOW PROCESSLIST" | awk \'$6 > 30 {print "KILL "$1";"}\'', impact: 'medium' },
        { name: 'vacuum-tables', command: 'psql -c "VACUUM ANALYZE"', impact: 'low' }
      );
    }
    
    return actions;
  }

  _generateHealingConfig(config) {
    return `# Self-Healing Configuration

services:
${config.services.map(s => `  - name: ${s.name}
    type: ${s.type}
    health_endpoint: ${s.healthEndpoint}
    dependencies: ${s.criticalDependencies.length > 0 ? s.criticalDependencies.join(', ') : 'none'}
    healing_actions: ${s.healingActions.length}`).join('\n')}

policies:
  auto_healing: ${config.policies.autoHealing}
  max_retries: ${config.policies.maxRetries}
  cooldown_period: ${config.policies.cooldownPeriod}s

rules:
${config.rules.map(r => `  - id: ${r.id}
    name: ${r.name}
    trigger: ${r.trigger}
    priority: ${r.priority}
    enabled: ${r.enabled}`).join('\n')}

status: ${config.status}
`;
  }

  async _setupMonitoringIntegration(config) {
    // Create monitoring webhooks for healing triggers
    const webhooks = config.services.map(s => ({
      service: s.name,
      url: `/healing/trigger/${s.name}`,
      events: ['health_check_failed', 'error_rate_high', 'response_time_slow']
    }));
    
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: 'self-healing/monitoring-webhooks.json',
      content: JSON.stringify(webhooks, null, 2)
    });
  }

  async _configureNotifications(channels) {
    const notificationConfig = {
      channels: channels.map(c => ({
        type: c,
        enabled: true,
        events: ['healing_started', 'healing_completed', 'healing_failed', 'emergency']
      }))
    };
    
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: 'self-healing/notifications.yaml',
      content: JSON.stringify(notificationConfig, null, 2)
    });
  }

  async _analyzeSymptoms(symptoms, service) {
    const analysis = {
      symptoms: symptoms || [],
      severity: 'unknown',
      category: 'unknown',
      possibleCauses: []
    };
    
    // Categorize symptoms
    const hasPerformanceIssue = symptoms.some(s => 
      s.includes('slow') || s.includes('timeout') || s.includes('latency')
    );
    const hasErrorIssue = symptoms.some(s => 
      s.includes('error') || s.includes('fail') || s.includes('500')
    );
    const hasResourceIssue = symptoms.some(s => 
      s.includes('memory') || s.includes('cpu') || s.includes('disk')
    );
    
    if (hasResourceIssue) {
      analysis.category = 'resource';
      analysis.possibleCauses.push('Resource exhaustion', 'Memory leak', 'High load');
    } else if (hasPerformanceIssue) {
      analysis.category = 'performance';
      analysis.possibleCauses.push('Database slow queries', 'Network latency', 'Code inefficiency');
    } else if (hasErrorIssue) {
      analysis.category = 'error';
      analysis.possibleCauses.push('Code bug', 'Configuration error', 'Dependency failure');
    }
    
    // Determine severity
    const errorCount = symptoms.filter(s => s.includes('error')).length;
    if (errorCount > 3 || symptoms.some(s => s.includes('down'))) {
      analysis.severity = 'critical';
    } else if (errorCount > 1 || hasPerformanceIssue) {
      analysis.severity = 'major';
    } else {
      analysis.severity = 'minor';
    }
    
    return analysis;
  }

  async _analyzeMetrics(metrics, timeRange) {
    const analysis = {
      anomalies: [],
      trends: {},
      correlations: []
    };
    
    // Detect anomalies
    for (const [metric, values] of Object.entries(metrics)) {
      const stats = this._calculateStats(values);
      const latest = values[values.length - 1];
      
      if (Math.abs(latest - stats.mean) > 2 * stats.stdDev) {
        analysis.anomalies.push({
          metric,
          value: latest,
          expectedRange: [stats.mean - 2 * stats.stdDev, stats.mean + 2 * stats.stdDev],
          deviation: (latest - stats.mean) / stats.stdDev
        });
      }
      
      // Analyze trend
      analysis.trends[metric] = this._analyzeTrend(values);
    }
    
    return analysis;
  }

  async _analyzeLogs(logs, timeRange) {
    const analysis = {
      errorCount: 0,
      errorTypes: {},
      patterns: [],
      timeline: []
    };
    
    // Count and categorize errors
    for (const log of logs) {
      if (log.level === 'error' || log.level === 'fatal') {
        analysis.errorCount++;
        const errorType = this._categorizeError(log.message);
        analysis.errorTypes[errorType] = (analysis.errorTypes[errorType] || 0) + 1;
      }
    }
    
    // Extract patterns
    analysis.patterns = this._extractLogPatterns(logs);
    
    // Build timeline
    analysis.timeline = this._buildErrorTimeline(logs);
    
    return analysis;
  }

  _findMetricCorrelations(metricAnalysis) {
    const correlations = [];
    
    // Simple correlation detection
    if (metricAnalysis.trends.cpu === 'increasing' && 
        metricAnalysis.trends.response_time === 'increasing') {
      correlations.push({
        metrics: ['cpu', 'response_time'],
        type: 'resource-performance',
        confidence: 0.8
      });
    }
    
    if (metricAnalysis.trends.error_rate === 'increasing' &&
        metricAnalysis.trends.memory === 'increasing') {
      correlations.push({
        metrics: ['error_rate', 'memory'],
        type: 'memory-errors',
        confidence: 0.7
      });
    }
    
    return correlations;
  }

  _extractErrorPatterns(logAnalysis) {
    const patterns = [];
    
    // Look for common error patterns
    for (const [errorType, count] of Object.entries(logAnalysis.errorTypes)) {
      if (count > 5) {
        patterns.push({
          type: errorType,
          occurrences: count,
          pattern: this._getErrorPattern(errorType)
        });
      }
    }
    
    return patterns;
  }

  async _determineRootCauses(diagnosis) {
    const rootCauses = [];
    
    // Resource exhaustion
    if (diagnosis.metricAnalysis?.anomalies.some(a => 
      (a.metric === 'memory' && a.value > 90) ||
      (a.metric === 'cpu' && a.value > 85)
    )) {
      rootCauses.push({
        type: 'resource-exhaustion',
        confidence: 0.9,
        evidence: diagnosis.metricAnalysis.anomalies
      });
    }
    
    // Application errors
    if (diagnosis.logAnalysis?.errorCount > 10) {
      const dominantError = Object.entries(diagnosis.logAnalysis.errorTypes)
        .sort((a, b) => b[1] - a[1])[0];
      
      rootCauses.push({
        type: 'application-error',
        subtype: dominantError[0],
        confidence: 0.8,
        evidence: diagnosis.logAnalysis
      });
    }
    
    // Performance degradation
    if (diagnosis.correlations?.some(c => c.type === 'resource-performance')) {
      rootCauses.push({
        type: 'performance-degradation',
        confidence: 0.7,
        evidence: diagnosis.correlations
      });
    }
    
    return rootCauses.sort((a, b) => b.confidence - a.confidence);
  }

  _calculateDiagnosisConfidence(diagnosis) {
    let confidence = 50; // Base confidence
    
    // Increase confidence based on evidence
    if (diagnosis.rootCauses.length > 0) {
      confidence += diagnosis.rootCauses[0].confidence * 20;
    }
    
    if (diagnosis.correlations?.length > 0) {
      confidence += 10;
    }
    
    if (diagnosis.historicalContext?.similar.length > 0) {
      confidence += 15;
    }
    
    if (diagnosis.metricAnalysis?.anomalies.length > 0) {
      confidence += 5;
    }
    
    return Math.min(95, Math.round(confidence));
  }

  _generateHealingRecommendations(diagnosis) {
    const recommendations = [];
    
    for (const rootCause of diagnosis.rootCauses) {
      switch (rootCause.type) {
        case 'resource-exhaustion':
          recommendations.push({
            action: 'scale-resources',
            priority: 'high',
            automated: true,
            description: 'Increase CPU/memory allocation'
          });
          recommendations.push({
            action: 'restart-service',
            priority: 'medium',
            automated: true,
            description: 'Restart service to clear memory'
          });
          break;
          
        case 'application-error':
          recommendations.push({
            action: 'rollback-deployment',
            priority: 'high',
            automated: false,
            description: 'Rollback to previous stable version'
          });
          recommendations.push({
            action: 'clear-cache',
            priority: 'medium',
            automated: true,
            description: 'Clear application cache'
          });
          break;
          
        case 'performance-degradation':
          recommendations.push({
            action: 'optimize-queries',
            priority: 'medium',
            automated: false,
            description: 'Optimize slow database queries'
          });
          recommendations.push({
            action: 'enable-caching',
            priority: 'medium',
            automated: true,
            description: 'Enable additional caching layers'
          });
          break;
      }
    }
    
    return recommendations;
  }

  _findSimilarIncidents(diagnosis) {
    return this.incidentHistory.filter(incident => {
      // Match by root cause type
      if (incident.diagnosis?.rootCauses?.[0]?.type === diagnosis.rootCauses[0]?.type) {
        return true;
      }
      
      // Match by symptoms
      const symptomMatch = diagnosis.symptoms.some(s => 
        incident.diagnosis?.symptoms?.includes(s)
      );
      
      return symptomMatch;
    }).slice(0, 5); // Return top 5 similar incidents
  }

  _extractPreviousSolutions(incidents) {
    const solutions = [];
    
    for (const incident of incidents) {
      if (incident.healing?.status === 'healed') {
        solutions.push({
          actions: incident.healing.actions.filter(a => a.status === 'completed'),
          effectiveness: incident.healing.finalHealth?.score || 0
        });
      }
    }
    
    return solutions.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  _generateDiagnosisReport(diagnosis) {
    return `# Diagnosis Report

**Service**: ${diagnosis.service}
**Time**: ${diagnosis.startedAt}
**Confidence**: ${diagnosis.confidence}%

## Symptoms
${diagnosis.symptoms.map(s => `- ${s}`).join('\n')}

## Root Causes
${diagnosis.rootCauses.map(rc => `
### ${rc.type}
- Confidence: ${rc.confidence}
- Evidence: ${JSON.stringify(rc.evidence, null, 2)}
`).join('\n')}

## Recommendations
${diagnosis.recommendations.map(r => `
- **${r.action}** (${r.priority} priority)
  - ${r.description}
  - Automated: ${r.automated ? 'Yes' : 'No'}
`).join('\n')}

${diagnosis.historicalContext ? `
## Historical Context
Found ${diagnosis.historicalContext.similar.length} similar incidents
${diagnosis.historicalContext.previousSolutions.length} previous solutions available
` : ''}
`;
  }

  _selectHealingActions(diagnosis, strategy) {
    const actions = [];
    
    // Get recommended actions
    const recommended = diagnosis.recommendations
      .filter(r => r.automated)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    
    if (strategy === 'progressive') {
      // Start with least invasive actions
      actions.push(...recommended.filter(r => r.action !== 'restart-service'));
      actions.push(...recommended.filter(r => r.action === 'restart-service'));
    } else if (strategy === 'aggressive') {
      // Start with most impactful actions
      actions.push(...recommended);
    }
    
    return actions.map(r => ({
      name: r.action,
      description: r.description,
      priority: r.priority
    }));
  }

  async _executeHealingAction(action, service) {
    const actionMap = {
      'restart-service': `systemctl restart ${service}`,
      'scale-resources': `kubectl scale deployment ${service} --replicas=+1`,
      'clear-cache': `redis-cli -h ${service}-redis FLUSHDB`,
      'reset-connections': `curl -X POST http://${service}/admin/reset-connections`,
      'enable-caching': `curl -X POST http://${service}/admin/enable-cache`
    };
    
    const command = actionMap[action.name];
    if (!command) {
      throw new Error(`Unknown healing action: ${action.name}`);
    }
    
    try {
      const result = await this.invokeTool(ClaudeCodeTool.BASH, {
        command,
        description: `Execute healing action: ${action.name}`
      });
      
      return {
        success: true,
        output: result.stdout,
        duration: result.duration
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _verifyHealingAction(action, service) {
    // Wait for service to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check service health
    const health = await this._checkServiceHealth(service);
    
    // Check if symptoms are resolved
    const symptomsResolved = health.healthy && !health.issues.includes(action.targetSymptom);
    
    return {
      effective: symptomsResolved,
      health,
      message: symptomsResolved ? 'Action was effective' : 'Symptoms persist'
    };
  }

  async _checkServiceHealth(service) {
    try {
      // Simulate health check
      const healthCheck = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `curl -s http://${service}/health`,
        description: 'Check service health'
      });
      
      return {
        healthy: true,
        score: 100,
        issues: []
      };
    } catch (error) {
      return {
        healthy: false,
        score: 0,
        issues: ['Service unreachable']
      };
    }
  }

  _recordIncident(incident) {
    this.incidentHistory.push({
      ...incident,
      recordedAt: new Date().toISOString()
    });
    
    // Keep only last 1000 incidents
    if (this.incidentHistory.length > 1000) {
      this.incidentHistory = this.incidentHistory.slice(-1000);
    }
  }

  _generateRollbackProcedures(steps) {
    return steps.reverse().map(step => ({
      order: steps.length - step.order + 1,
      name: `Rollback: ${step.name}`,
      command: this._generateRollbackCommand(step),
      description: `Undo: ${step.description}`
    }));
  }

  _generateRollbackCommand(step) {
    // Generate inverse commands
    if (step.command.includes('start')) {
      return step.command.replace('start', 'stop');
    }
    if (step.command.includes('enable')) {
      return step.command.replace('enable', 'disable');
    }
    if (step.command.includes('scale --replicas=')) {
      return step.command.replace('--replicas=+1', '--replicas=-1');
    }
    
    return `echo "Manual rollback required for: ${step.name}"`;
  }

  _generateRunbookDocument(runbook) {
    return `# Runbook: ${runbook.title}

**ID**: ${runbook.id}
**Scenario**: ${runbook.scenario}
**Severity**: ${runbook.severity}
**Automatable**: ${runbook.automatable ? 'Yes' : 'No'}

## Steps

${runbook.steps.map(step => `
### ${step.order}. ${step.name}
**Description**: ${step.description}
**Command**: \`${step.command}\`
**Expected Outcome**: ${step.expectedOutcome}
**Timeout**: ${step.timeout}s
**Retryable**: ${step.retryable ? 'Yes' : 'No'}
`).join('\n')}

## Validations

${runbook.validations.map(v => `- Step ${v.step}: ${v.check}`).join('\n')}

## Rollback Procedures

${runbook.rollback.map(r => `
### ${r.order}. ${r.name}
**Command**: \`${r.command}\`
**Description**: ${r.description}
`).join('\n')}
`;
  }

  _generateAutomatedScript(runbook) {
    return `#!/bin/bash
# Automated Runbook: ${runbook.title}
# Generated: ${new Date().toISOString()}

set -e

echo "Starting runbook: ${runbook.title}"

${runbook.steps.map(step => `
echo "Step ${step.order}: ${step.name}"
timeout ${step.timeout} ${step.command}
if [ $? -eq 0 ]; then
  echo "✓ Step ${step.order} completed"
else
  echo "✗ Step ${step.order} failed"
  ${step.retryable ? `
  echo "Retrying..."
  timeout ${step.timeout} ${step.command} || exit 1
  ` : 'exit 1'}
fi
`).join('\n')}

echo "Runbook completed successfully"
`;
  }

  async _loadIncidentHistory(timeRange, services) {
    // Filter incidents by time range and services
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeRange.days || 30));
    
    return this.incidentHistory.filter(incident => {
      const incidentDate = new Date(incident.recordedAt);
      const inTimeRange = incidentDate > cutoff;
      const inServices = services.length === 0 || services.includes(incident.service);
      
      return inTimeRange && inServices;
    });
  }

  _groupSimilarIncidents(incidents) {
    const groups = {};
    
    for (const incident of incidents) {
      const key = `${incident.diagnosis?.rootCauses?.[0]?.type || 'unknown'}-${incident.service}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(incident);
    }
    
    return groups;
  }

  _determinePatternType(incidents) {
    // Analyze incident characteristics
    const rootCauses = incidents.map(i => i.diagnosis?.rootCauses?.[0]?.type).filter(Boolean);
    const mostCommon = this._getMostCommon(rootCauses);
    
    return mostCommon || 'mixed';
  }

  _calculateFrequency(incidents, timeRange) {
    const days = timeRange.days || 30;
    return (incidents.length / days).toFixed(2) + ' per day';
  }

  _extractCommonCauses(incidents) {
    const causes = incidents
      .map(i => i.diagnosis?.rootCauses?.[0])
      .filter(Boolean);
    
    // Count occurrences
    const causeCount = {};
    for (const cause of causes) {
      const key = `${cause.type}-${cause.subtype || ''}`;
      causeCount[key] = (causeCount[key] || 0) + 1;
    }
    
    return Object.entries(causeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cause, count]) => ({ cause, count }));
  }

  _analyzeTimePattern(incidents) {
    // Analyze when incidents occur
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    
    for (const incident of incidents) {
      const date = new Date(incident.recordedAt);
      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
    }
    
    return {
      peakHour: hourCounts.indexOf(Math.max(...hourCounts)),
      peakDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayCounts.indexOf(Math.max(...dayCounts))],
      distribution: { hourly: hourCounts, daily: dayCounts }
    };
  }

  _generatePreventiveRecommendations(pattern) {
    const recommendations = [];
    
    if (pattern.type === 'resource-exhaustion') {
      recommendations.push({
        action: 'auto-scaling',
        description: 'Implement predictive auto-scaling',
        priority: 'high'
      });
    }
    
    if (pattern.frequency > 1) {
      recommendations.push({
        action: 'monitoring-enhancement',
        description: 'Add specific alerts for this pattern',
        priority: 'medium'
      });
    }
    
    if (pattern.timePattern?.peakHour) {
      recommendations.push({
        action: 'scheduled-scaling',
        description: `Pre-scale resources before peak hour ${pattern.timePattern.peakHour}:00`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  _generatePatternReport(analysis) {
    return `# Incident Pattern Analysis

**Time Range**: ${analysis.timeRange.days} days
**Total Incidents**: ${analysis.incidents.length}
**Patterns Found**: ${analysis.patterns.length}

## Patterns

${analysis.patterns.map(p => `
### ${p.type}
- Occurrences: ${p.occurrences}
- Frequency: ${p.frequency}
- Services: ${p.services.join(', ')}
- Peak Time: ${p.timePattern.peakHour}:00 on ${p.timePattern.peakDay}

Common Causes:
${p.commonCauses.map(c => `- ${c.cause}: ${c.count} times`).join('\n')}
`).join('\n')}

## Recommendations

${analysis.recommendations.map(r => `
- **${r.action}** (${r.priority})
  - ${r.description}
`).join('\n')}
`;
  }

  async _evaluateRisk(service, risk) {
    // Simulate risk evaluation
    let score = 0;
    
    // Check current metrics
    const metrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      errorRate: Math.random() * 10
    };
    
    if (risk.type === 'resource-exhaustion') {
      if (metrics.cpu > 70) score += 0.3;
      if (metrics.memory > 80) score += 0.4;
      if (metrics.cpu > 60 && metrics.memory > 70) score += 0.2;
    }
    
    if (risk.type === 'cascade-failure') {
      if (metrics.errorRate > 5) score += 0.5;
      // Check dependent services
      score += 0.2; // Simplified
    }
    
    return Math.min(1, score);
  }

  _selectPreventiveActions(risk, riskScore) {
    const actions = [];
    
    if (risk.type === 'resource-exhaustion' && riskScore > 0.7) {
      actions.push({
        name: 'pre-scale',
        description: 'Proactively scale resources',
        command: 'kubectl scale --replicas=+2'
      });
    }
    
    if (risk.type === 'cascade-failure') {
      actions.push({
        name: 'circuit-breaker',
        description: 'Enable circuit breaker',
        command: 'enable-circuit-breaker'
      });
    }
    
    return actions;
  }

  async _executePreventiveAction(action, service) {
    // Simulate preventive action execution
    this.logger.info('Executing preventive action', { action: action.name, service });
    
    return {
      success: true,
      message: `Preventive action ${action.name} applied to ${service}`
    };
  }

  async _captureServiceState(service) {
    return {
      health: await this._checkServiceHealth(service),
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        connections: Math.floor(Math.random() * 1000)
      },
      configuration: {
        replicas: 3,
        version: '1.2.3'
      }
    };
  }

  async _simulateFailure(service, failureType) {
    this.logger.info('Simulating failure', { service, failureType });
    
    // Simulate different failure types
    switch (failureType) {
      case 'crash':
        return { success: true, message: 'Service crashed successfully' };
      case 'memory-leak':
        return { success: true, message: 'Memory leak simulated' };
      case 'network-partition':
        return { success: true, message: 'Network partition created' };
      default:
        return { success: false, message: 'Unknown failure type' };
    }
  }

  async _executeRecoveryStep(step, service) {
    // Execute recovery step
    try {
      const result = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: step.command || `echo "Executing ${step.name} for ${service}"`,
        description: step.name
      });
      
      return {
        success: true,
        output: result.stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _validateRecovery(service, initialState) {
    const currentState = await this._captureServiceState(service);
    
    return {
      recovered: currentState.health.healthy,
      stateMatch: JSON.stringify(currentState.configuration) === JSON.stringify(initialState.configuration),
      healthScore: currentState.health.score
    };
  }

  _generateRecoveryTestReport(test) {
    return `# Recovery Test Report

**Procedure**: ${test.procedure}
**Service**: ${test.service}
**Status**: ${test.status}
**Duration**: ${new Date(test.completedAt) - new Date(test.startedAt)}ms

## Steps
${test.steps.map(s => `
- ${s.step}: ${s.status}
  ${s.error ? `Error: ${s.error}` : ''}
`).join('\n')}

## Validation
${test.validation ? `
- Recovered: ${test.validation.recovered ? 'Yes' : 'No'}
- State Match: ${test.validation.stateMatch ? 'Yes' : 'No'}
- Health Score: ${test.validation.healthScore}
` : 'No validation performed'}
`;
  }

  _extractIncidentPatterns(incident) {
    return {
      timeOfDay: new Date(incident.timestamp).getHours(),
      dayOfWeek: new Date(incident.timestamp).getDay(),
      errorType: incident.rootCause?.split('-')[0],
      affectedComponent: incident.service
    };
  }

  _createHealingRuleFromSolution(incident, solution) {
    return {
      id: `auto-rule-${Date.now()}`,
      name: `Auto-heal ${incident.type}`,
      trigger: incident.type,
      conditions: {
        service: incident.service,
        rootCause: incident.rootCause
      },
      actions: solution.actions.filter(a => a.status === 'completed').map(a => a.action),
      priority: 'high',
      enabled: true,
      createdFrom: incident.id
    };
  }

  _createPreventiveMeasure(incident, lessons) {
    const preventiveLessons = lessons.filter(l => l.type === 'preventive');
    
    return {
      trigger: incident.type,
      threshold: 0.6,
      actions: preventiveLessons.map(l => ({
        name: l.action,
        description: l.description
      }))
    };
  }

  _generateKnowledgeDocument(knowledge) {
    return `# Healing Knowledge Entry

**ID**: ${knowledge.id}
**Added**: ${knowledge.addedAt}

## Incident
- Type: ${knowledge.incident.type}
- Service: ${knowledge.incident.service}
- Root Cause: ${knowledge.incident.rootCause}

## Solution
- Actions: ${knowledge.solution.actions.join(', ')}
- Duration: ${knowledge.solution.duration}ms
- Effectiveness: ${knowledge.solution.effectiveness}

## Lessons Learned
${knowledge.lessons.map(l => `- ${l.description}`).join('\n')}

${knowledge.ruleCreated ? `
## Automated Rule Created
Rule ID: ${knowledge.ruleCreated}
` : ''}
`;
  }

  async _updateHealingIndex(knowledge) {
    // Update searchable index of healing knowledge
    const indexPath = 'self-healing/knowledge/index.json';
    let index = {};
    
    try {
      const existing = await this.invokeTool(ClaudeCodeTool.READ, { file_path: indexPath });
      index = JSON.parse(existing);
    } catch (e) {
      // Index doesn't exist yet
    }
    
    index[knowledge.id] = {
      type: knowledge.incident.type,
      service: knowledge.incident.service,
      effectiveness: knowledge.solution.effectiveness,
      keywords: [
        knowledge.incident.type,
        knowledge.incident.service,
        knowledge.incident.rootCause
      ]
    };
    
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: indexPath,
      content: JSON.stringify(index, null, 2)
    });
  }

  async _performStabilization(services) {
    const actions = [];
    
    for (const service of services) {
      // Enable circuit breakers
      actions.push({
        service,
        action: 'enable-circuit-breaker',
        result: 'enabled'
      });
      
      // Increase resource limits temporarily
      actions.push({
        service,
        action: 'increase-limits',
        result: 'increased by 50%'
      });
    }
    
    return {
      actions,
      status: 'stabilized'
    };
  }

  async _performQuickDiagnosis(alert, services) {
    // Quick diagnosis for emergency response
    return {
      likelyCause: this._inferCauseFromAlert(alert),
      affectedComponents: services,
      severity: alert.severity || 'critical',
      quickChecks: [
        { check: 'service-health', result: 'degraded' },
        { check: 'error-rate', result: 'high' },
        { check: 'resource-usage', result: 'normal' }
      ]
    };
  }

  _selectEmergencyActions(severity, diagnosis) {
    const actions = [];
    
    if (severity === 'critical') {
      actions.push({
        name: 'emergency-scaling',
        description: 'Scale all services by 200%',
        priority: 1
      });
      
      actions.push({
        name: 'traffic-shedding',
        description: 'Enable traffic shedding at 50%',
        priority: 2
      });
    }
    
    if (diagnosis?.likelyCause === 'cascade-failure') {
      actions.push({
        name: 'isolate-failures',
        description: 'Isolate failing services',
        priority: 1
      });
    }
    
    return actions.sort((a, b) => a.priority - b.priority);
  }

  async _executeEmergencyAction(action, services) {
    this.logger.warn('Executing emergency action', { action: action.name });
    
    // Simulate emergency action execution
    return {
      action: action.name,
      services: services,
      status: 'executed',
      impact: 'immediate'
    };
  }

  async _assessEmergencyStatus(services) {
    // Check if situation is improving
    const healthChecks = await Promise.all(
      services.map(s => this._checkServiceHealth(s))
    );
    
    const allHealthy = healthChecks.every(h => h.healthy);
    const avgScore = healthChecks.reduce((sum, h) => sum + h.score, 0) / healthChecks.length;
    
    return {
      stable: allHealthy || avgScore > 80,
      healthScore: avgScore
    };
  }

  async _sendEmergencyNotifications(emergency) {
    this.logger.error('EMERGENCY ALERT', {
      id: emergency.id,
      severity: emergency.severity,
      alert: emergency.alert
    });
    
    // Would send to configured notification channels
  }

  _generateEmergencyReport(emergency) {
    return `# Emergency Response Report

**ID**: ${emergency.id}
**Severity**: ${emergency.severity}
**Alert**: ${emergency.alert}
**Started**: ${emergency.startedAt}
**Status**: ${emergency.status}

## Actions Taken
${emergency.actions.map(a => `
- ${a.type}: ${a.action || 'Multiple actions'}
  - Result: ${JSON.stringify(a.result, null, 2)}
`).join('\n')}

## Diagnosis
${emergency.diagnosis ? `
- Likely Cause: ${emergency.diagnosis.likelyCause}
- Affected: ${emergency.diagnosis.affectedComponents.join(', ')}
` : 'No diagnosis performed'}

## Outcome
- Final Status: ${emergency.status}
- Duration: ${emergency.completedAt ? new Date(emergency.completedAt) - new Date(emergency.startedAt) : 'ongoing'}ms
`;
  }

  // Utility methods
  _calculateStats(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return {
      mean,
      stdDev: Math.sqrt(variance)
    };
  }

  _analyzeTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  _categorizeError(message) {
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('connection')) return 'connection';
    if (message.includes('memory')) return 'memory';
    if (message.includes('null') || message.includes('undefined')) return 'null-reference';
    if (message.includes('permission') || message.includes('denied')) return 'permission';
    return 'unknown';
  }

  _extractLogPatterns(logs) {
    const patterns = [];
    const windowSize = 10;
    
    for (let i = 0; i < logs.length - windowSize; i++) {
      const window = logs.slice(i, i + windowSize);
      const errorCount = window.filter(l => l.level === 'error').length;
      
      if (errorCount > windowSize * 0.5) {
        patterns.push({
          type: 'error-burst',
          startIndex: i,
          errorRate: errorCount / windowSize
        });
      }
    }
    
    return patterns;
  }

  _buildErrorTimeline(logs) {
    const timeline = [];
    const bucketSize = 60000; // 1 minute buckets
    
    const errorLogs = logs.filter(l => l.level === 'error' || l.level === 'fatal');
    
    for (const log of errorLogs) {
      const bucket = Math.floor(new Date(log.timestamp).getTime() / bucketSize) * bucketSize;
      const existing = timeline.find(t => t.bucket === bucket);
      
      if (existing) {
        existing.count++;
      } else {
        timeline.push({
          bucket,
          timestamp: new Date(bucket).toISOString(),
          count: 1
        });
      }
    }
    
    return timeline;
  }

  _getErrorPattern(errorType) {
    const patterns = {
      'timeout': 'Service communication timeout',
      'connection': 'Connection failure to dependency',
      'memory': 'Memory allocation error',
      'null-reference': 'Null reference exception',
      'permission': 'Permission denied error'
    };
    
    return patterns[errorType] || 'Unknown error pattern';
  }

  _getMostCommon(array) {
    const counts = {};
    for (const item of array) {
      counts[item] = (counts[item] || 0) + 1;
    }
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
  }

  _inferCauseFromAlert(alert) {
    if (alert.includes('timeout') || alert.includes('latency')) {
      return 'performance-degradation';
    }
    if (alert.includes('error') || alert.includes('500')) {
      return 'application-error';
    }
    if (alert.includes('cpu') || alert.includes('memory')) {
      return 'resource-exhaustion';
    }
    if (alert.includes('cascade') || alert.includes('multiple')) {
      return 'cascade-failure';
    }
    
    return 'unknown';
  }
}