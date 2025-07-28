import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { StoryEnricher } from '../../utils/StoryEnricher.js';

export class PMAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'pm-001',
      type: 'PMAgent',
      name: 'John',
      description: 'Investigative Product Strategist & Market-Savvy PM',
      capabilities: [
        AgentCapability.PLANNING,
        AgentCapability.DOCUMENTATION,
        AgentCapability.PROJECT_MANAGEMENT
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.EDIT,
        ClaudeCodeTool.MULTI_EDIT,
        ClaudeCodeTool.TASK,
        ClaudeCodeTool.TODO_WRITE
      ],
      ...config
    });
    
    this.persona = {
      role: 'Investigative Product Strategist & Market-Savvy PM',
      style: 'Analytical, inquisitive, data-driven, user-focused, pragmatic',
      identity: 'Product Manager specialized in document creation and product research',
      focus: 'Creating PRDs and other product documentation using templates',
      corePrinciples: [
        'Deeply understand "Why" - uncover root causes and motivations',
        'Champion the user - maintain relentless focus on target user value',
        'Data-informed decisions with strategic judgment',
        'Ruthless prioritization & MVP focus',
        'Clarity & precision in communication',
        'Collaborative & iterative approach',
        'Proactive risk identification',
        'Strategic thinking & outcome-oriented'
      ]
    };
    
    // Initialize story enricher
    this.storyEnricher = null;
  }
  
  async initialize(contextManager) {
    await super.initialize(contextManager);
    // Initialize story enricher with context manager
    this.storyEnricher = new StoryEnricher(contextManager, {
      includeCodeReferences: true,
      generateTestScenarios: true
    });
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('PM executing task', { taskType });
    
    switch (taskType) {
      case 'create-prd':
        return await this._createPRD(input);
        
      case 'create-brownfield-prd':
        return await this._createBrownfieldPRD(input);
        
      case 'create-epic':
        return await this._createEpic(input);
        
      case 'create-story':
        return await this._createUserStory(input);
        
      case 'shard-prd':
        return await this._shardPRD(input);
        
      case 'prioritize-features':
        return await this._prioritizeFeatures(input);
        
      case 'create-roadmap':
        return await this._createRoadmap(input);
        
      case 'correct-course':
        return await this._correctCourse(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _createPRD(input) {
    const { 
      projectName, 
      projectBrief, 
      targetUsers, 
      problemStatement,
      goals,
      constraints = [],
      successMetrics = []
    } = input;
    
    // Get project context from Context Manager
    const projectContext = await this._getProjectContext(projectName);
    
    // Structure the PRD
    const prd = {
      title: `Product Requirements Document: ${projectName}`,
      version: '1.0',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      
      sections: {
        executiveSummary: {
          title: 'Executive Summary',
          content: this._generateExecutiveSummary(projectName, problemStatement, goals)
        },
        
        problemStatement: {
          title: 'Problem Statement',
          content: this._elaborateProblemStatement(problemStatement, targetUsers)
        },
        
        targetAudience: {
          title: 'Target Audience',
          content: this._defineTargetAudience(targetUsers)
        },
        
        goalsAndObjectives: {
          title: 'Goals and Objectives',
          content: this._structureGoalsAndObjectives(goals)
        },
        
        userStories: {
          title: 'User Stories',
          content: this._generateUserStories(targetUsers, goals)
        },
        
        functionalRequirements: {
          title: 'Functional Requirements',
          content: this._defineFunctionalRequirements(goals, projectBrief)
        },
        
        nonFunctionalRequirements: {
          title: 'Non-Functional Requirements',
          content: this._defineNonFunctionalRequirements(constraints)
        },
        
        successMetrics: {
          title: 'Success Metrics',
          content: this._defineSuccessMetrics(successMetrics, goals)
        },
        
        assumptions: {
          title: 'Assumptions',
          content: this._documentAssumptions(projectBrief)
        },
        
        constraints: {
          title: 'Constraints',
          content: this._documentConstraints(constraints)
        },
        
        dependencies: {
          title: 'Dependencies',
          content: this._identifyDependencies(projectBrief)
        },
        
        risks: {
          title: 'Risks and Mitigation',
          content: this._assessRisks(constraints, goals)
        },
        
        mvpScope: {
          title: 'MVP Scope',
          content: this._defineMVPScope(goals, constraints)
        },
        
        futureConsiderations: {
          title: 'Future Considerations',
          content: this._documentFutureConsiderations(goals)
        }
      },
      
      metadata: {
        projectContext,
        templateUsed: 'prd-tmpl.yaml',
        epicsGenerated: false,
        storiesGenerated: false
      }
    };
    
    // Save the PRD
    const outputPath = await this._savePRD(projectName, prd);
    
    // Share with Architect agent
    const shareId = await this.contextManager.sendMessage({
      from: this.id,
      to: 'architect-001',
      type: 'event',
      subject: 'PRD Created',
      data: { projectName, prdPath: outputPath, summary: prd.sections.executiveSummary.content }
    });
    
    this.logger.info('PRD created', { projectName, outputPath, shareId });
    
    return {
      prd,
      outputPath,
      shareId,
      summary: `Created comprehensive PRD for "${projectName}" with ${Object.keys(prd.sections).length} sections`
    };
  }

  async _createBrownfieldPRD(input) {
    const { 
      projectPath,
      existingDocs,
      migrationGoals,
      technicalDebt,
      constraints
    } = input;
    
    // Analyze existing project
    const analysis = await this._analyzeExistingProject(projectPath);
    
    const brownfieldPRD = {
      title: `Brownfield PRD: ${path.basename(projectPath)}`,
      version: '1.0',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      
      sections: {
        currentState: {
          title: 'Current State Analysis',
          content: this._documentCurrentState(analysis, existingDocs)
        },
        
        migrationGoals: {
          title: 'Migration Goals',
          content: this._structureMigrationGoals(migrationGoals)
        },
        
        technicalDebt: {
          title: 'Technical Debt Assessment',
          content: this._assessTechnicalDebt(technicalDebt, analysis)
        },
        
        migrationStrategy: {
          title: 'Migration Strategy',
          content: this._defineMigrationStrategy(migrationGoals, constraints)
        },
        
        phasesPlan: {
          title: 'Phased Migration Plan',
          content: this._createPhasesPlan(migrationGoals, technicalDebt)
        },
        
        riskAssessment: {
          title: 'Risk Assessment',
          content: this._assessMigrationRisks(technicalDebt, constraints)
        },
        
        rollbackPlan: {
          title: 'Rollback Plan',
          content: this._defineRollbackPlan()
        }
      }
    };
    
    return {
      prd: brownfieldPRD,
      summary: `Created brownfield PRD for ${path.basename(projectPath)} with ${Object.keys(brownfieldPRD.sections).length} sections`
    };
  }

  async _createEpic(input) {
    const { 
      epicTitle,
      description,
      acceptanceCriteria,
      priority = 'medium',
      estimatedEffort,
      dependencies = []
    } = input;
    
    const epic = {
      id: this._generateEpicId(),
      title: epicTitle,
      type: 'epic',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      description,
      
      acceptanceCriteria: this._structureAcceptanceCriteria(acceptanceCriteria),
      
      priority,
      estimatedEffort: this._parseEffort(estimatedEffort),
      
      stories: [],
      dependencies,
      
      metadata: {
        status: 'draft',
        labels: this._generateLabels(epicTitle, description),
        milestone: this._suggestMilestone(priority)
      }
    };
    
    // Generate initial stories
    epic.stories = await this._generateStoriesForEpic(epic);
    
    return {
      epic,
      summary: `Created epic "${epicTitle}" with ${epic.stories.length} initial stories`
    };
  }

  async _createUserStory(input) {
    const {
      asA,
      iWant,
      soThat,
      acceptanceCriteria,
      priority = 'medium',
      storyPoints,
      epicId,
      epicContext = {}
    } = input;
    
    // Create base story
    const baseStory = {
      id: this._generateStoryId(),
      title: `${asA} - ${iWant}`,
      type: 'story',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      
      description: `As a ${asA}, I want ${iWant}, so that ${soThat}`,
      
      userStory: {
        asA,
        iWant,
        soThat
      },
      
      acceptanceCriteria: this._formatAcceptanceCriteriaArray(acceptanceCriteria),
      
      priority,
      storyPoints: parseInt(storyPoints) || null,
      epicId,
      
      technicalNotes: this._generateTechnicalNotes(iWant),
      
      definition: {
        ready: this._checkDefinitionOfReady(input),
        done: this._defineDefinitionOfDone()
      },
      
      metadata: {
        status: 'ready',
        labels: this._generateStoryLabels(asA, iWant),
        createdFromEpic: epicId || null
      }
    };
    
    // Enrich the story if enricher is available
    let enrichedStory = baseStory;
    let storyContent = null;
    
    if (this.storyEnricher) {
      try {
        enrichedStory = await this.storyEnricher.enrichStory(baseStory, epicContext);
        storyContent = this.storyEnricher.generateStoryMarkdown(enrichedStory);
        
        // Save enriched story file
        const storyPath = await this._saveStoryFile(enrichedStory.id, storyContent);
        enrichedStory.filePath = storyPath;
        
        this.logger.info('Story enriched and saved', { 
          storyId: enrichedStory.id,
          path: storyPath 
        });
      } catch (error) {
        this.logger.error('Failed to enrich story', { error });
        // Continue with base story if enrichment fails
      }
    }
    
    return {
      story: enrichedStory,
      markdown: storyContent,
      summary: `Created enriched user story: "${baseStory.description}" with ${enrichedStory.testScenarios?.length || 0} test scenarios and ${enrichedStory.implementationHints?.length || 0} implementation hints`
    };
  }

  async _shardPRD(input) {
    const { prdPath, shardingStrategy = 'by-epic' } = input;
    
    // Read PRD
    const prdContent = await this.invokeTool(ClaudeCodeTool.READ, { file_path: prdPath });
    const prd = typeof prdContent === 'string' ? JSON.parse(prdContent) : prdContent;
    
    const shards = [];
    
    switch (shardingStrategy) {
      case 'by-epic':
        shards.push(...this._shardByEpic(prd));
        break;
      case 'by-component':
        shards.push(...this._shardByComponent(prd));
        break;
      case 'by-milestone':
        shards.push(...this._shardByMilestone(prd));
        break;
      default:
        throw new Error(`Unknown sharding strategy: ${shardingStrategy}`);
    }
    
    // Save shards
    const outputDir = path.join(path.dirname(prdPath), 'shards');
    const savedShards = [];
    
    for (const shard of shards) {
      const shardPath = path.join(outputDir, `${shard.id}.json`);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: shardPath,
        content: JSON.stringify(shard, null, 2)
      });
      savedShards.push({ id: shard.id, path: shardPath });
    }
    
    return {
      shards: savedShards,
      summary: `Sharded PRD into ${shards.length} parts using ${shardingStrategy} strategy`
    };
  }

  async _prioritizeFeatures(input) {
    const { features, criteria = ['user_value', 'effort', 'risk'] } = input;
    
    const prioritizedFeatures = features.map(feature => {
      const scores = {};
      let totalScore = 0;
      
      // Score each criterion
      for (const criterion of criteria) {
        scores[criterion] = this._scoreFeature(feature, criterion);
        totalScore += scores[criterion];
      }
      
      return {
        ...feature,
        scores,
        totalScore,
        priority: this._calculatePriority(totalScore, criteria.length)
      };
    });
    
    // Sort by total score
    prioritizedFeatures.sort((a, b) => b.totalScore - a.totalScore);
    
    // Group by priority
    const priorityGroups = {
      high: prioritizedFeatures.filter(f => f.priority === 'high'),
      medium: prioritizedFeatures.filter(f => f.priority === 'medium'),
      low: prioritizedFeatures.filter(f => f.priority === 'low')
    };
    
    return {
      prioritizedFeatures,
      priorityGroups,
      summary: `Prioritized ${features.length} features: ${priorityGroups.high.length} high, ${priorityGroups.medium.length} medium, ${priorityGroups.low.length} low`
    };
  }

  async _createRoadmap(input) {
    const { 
      timeframe = 'quarterly',
      features,
      constraints,
      milestones = []
    } = input;
    
    const roadmap = {
      timeframe,
      createdAt: new Date().toISOString(),
      createdBy: this.name,
      
      phases: this._generatePhases(timeframe),
      
      milestones: this._alignMilestones(milestones, timeframe),
      
      featureAllocation: this._allocateFeatures(features, timeframe, constraints),
      
      dependencies: this._mapDependencies(features),
      
      risks: this._identifyRoadmapRisks(features, constraints),
      
      metrics: this._defineRoadmapMetrics(features)
    };
    
    return {
      roadmap,
      summary: `Created ${timeframe} roadmap with ${features.length} features across ${roadmap.phases.length} phases`
    };
  }

  async _correctCourse(input) {
    const { currentState, desiredState, blockers = [] } = input;
    
    const correction = {
      analysis: {
        gap: this._analyzeGap(currentState, desiredState),
        rootCauses: this._identifyRootCauses(blockers),
        impact: this._assessImpact(currentState, desiredState)
      },
      
      recommendations: this._generateRecommendations(currentState, desiredState, blockers),
      
      actionPlan: this._createActionPlan(currentState, desiredState),
      
      successCriteria: this._defineSuccessCriteria(desiredState),
      
      timeline: this._estimateTimeline(currentState, desiredState)
    };
    
    return {
      correction,
      summary: `Generated course correction plan with ${correction.recommendations.length} recommendations`
    };
  }

  // Helper methods
  async _getProjectContext(projectName) {
    const contexts = await this.contextManager.queryContexts({
      level: 'project',
      tags: [projectName]
    });
    return contexts[0] || null;
  }

  _generateExecutiveSummary(projectName, problemStatement, goals) {
    return `${projectName} addresses the following problem: ${problemStatement}. 
    The primary goals are: ${goals.slice(0, 3).join(', ')}. 
    This PRD outlines the requirements and approach to achieve these objectives.`;
  }

  _elaborateProblemStatement(problemStatement, targetUsers) {
    return {
      statement: problemStatement,
      affectedUsers: targetUsers,
      impact: this._assessProblemImpact(problemStatement),
      currentSolutions: 'Manual processes or inadequate existing solutions',
      proposedSolution: 'Automated, user-friendly solution addressing core pain points'
    };
  }

  _defineTargetAudience(targetUsers) {
    return targetUsers.map(user => ({
      segment: user,
      characteristics: this._getUserCharacteristics(user),
      needs: this._getUserNeeds(user),
      painPoints: this._getUserPainPoints(user)
    }));
  }

  _structureGoalsAndObjectives(goals) {
    return goals.map((goal, index) => ({
      id: `GOAL-${index + 1}`,
      goal,
      objectives: this._breakDownGoal(goal),
      measurable: this._makeMeasurable(goal),
      timeframe: this._estimateTimeframe(goal)
    }));
  }

  _generateUserStories(targetUsers, goals) {
    const stories = [];
    for (const user of targetUsers) {
      for (const goal of goals) {
        stories.push(this._createUserStoryFromGoal(user, goal));
      }
    }
    return stories;
  }

  _defineFunctionalRequirements(goals, projectBrief) {
    const requirements = [];
    let reqId = 1;
    
    for (const goal of goals) {
      const goalReqs = this._extractRequirementsFromGoal(goal);
      requirements.push(...goalReqs.map(req => ({
        id: `FR-${reqId++}`,
        requirement: req,
        priority: this._assessRequirementPriority(req, goal),
        relatedGoal: goal
      })));
    }
    
    return requirements;
  }

  _defineNonFunctionalRequirements(constraints) {
    const nfrs = [
      { category: 'Performance', requirements: ['Response time < 2s', 'Support 1000 concurrent users'] },
      { category: 'Security', requirements: ['Data encryption at rest and in transit', 'Role-based access control'] },
      { category: 'Usability', requirements: ['Mobile responsive design', 'WCAG 2.1 AA compliance'] },
      { category: 'Reliability', requirements: ['99.9% uptime SLA', 'Automated backups'] }
    ];
    
    // Add constraint-specific NFRs
    if (constraints.includes('budget')) {
      nfrs.push({ category: 'Cost', requirements: ['Monthly operational cost < $X', 'Use open-source where possible'] });
    }
    
    return nfrs;
  }

  _defineSuccessMetrics(successMetrics, goals) {
    const defaultMetrics = [
      { metric: 'User Adoption Rate', target: '80% within 3 months', measurement: 'Active users / Total users' },
      { metric: 'User Satisfaction', target: 'NPS > 50', measurement: 'Quarterly surveys' },
      { metric: 'Feature Usage', target: 'Core features used by 70% of users', measurement: 'Analytics tracking' }
    ];
    
    return [...defaultMetrics, ...successMetrics];
  }

  _documentAssumptions(projectBrief) {
    return [
      'Users have basic technical literacy',
      'Internet connectivity is available',
      'Development resources are available as planned',
      'Third-party services remain available and compatible'
    ];
  }

  _documentConstraints(constraints) {
    return constraints.map(constraint => ({
      constraint,
      type: this._categorizeConstraint(constraint),
      impact: this._assessConstraintImpact(constraint),
      mitigation: this._suggestMitigation(constraint)
    }));
  }

  _identifyDependencies(projectBrief) {
    return [
      { dependency: 'Authentication Service', type: 'external', criticality: 'high' },
      { dependency: 'Database Infrastructure', type: 'internal', criticality: 'high' },
      { dependency: 'Third-party APIs', type: 'external', criticality: 'medium' }
    ];
  }

  _assessRisks(constraints, goals) {
    const risks = [];
    
    if (constraints.includes('timeline')) {
      risks.push({
        risk: 'Schedule Overrun',
        likelihood: 'Medium',
        impact: 'High',
        mitigation: 'Phased delivery approach, MVP focus'
      });
    }
    
    if (goals.length > 5) {
      risks.push({
        risk: 'Scope Creep',
        likelihood: 'High',
        impact: 'Medium',
        mitigation: 'Strict change control process'
      });
    }
    
    return risks;
  }

  _defineMVPScope(goals, constraints) {
    // Select top 3 goals for MVP
    const mvpGoals = goals.slice(0, 3);
    
    return {
      includedFeatures: mvpGoals.map(g => this._simplifyGoalForMVP(g)),
      excludedFeatures: goals.slice(3).map(g => ({ feature: g, reason: 'Post-MVP enhancement' })),
      timeline: '8-12 weeks',
      successCriteria: 'Core functionality operational with positive user feedback'
    };
  }

  _documentFutureConsiderations(goals) {
    return [
      'Scalability improvements for enterprise adoption',
      'Advanced analytics and reporting features',
      'API for third-party integrations',
      'Machine learning enhancements'
    ];
  }

  async _savePRD(projectName, prd) {
    const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-prd.json`;
    const outputPath = path.join(
      this.contextManager.baseDir,
      '..',
      'output',
      'prds',
      filename
    );
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: outputPath,
      content: JSON.stringify(prd, null, 2)
    });
    
    return outputPath;
  }

  // Additional helper methods
  _generateEpicId() {
    return `EPIC-${Date.now().toString(36).toUpperCase()}`;
  }

  _generateStoryId() {
    return `STORY-${Date.now().toString(36).toUpperCase()}`;
  }

  _parseEffort(effort) {
    if (typeof effort === 'string') {
      const match = effort.match(/(\d+)\s*(days?|weeks?|sprints?)/i);
      if (match) {
        return { value: parseInt(match[1]), unit: match[2].toLowerCase() };
      }
    }
    return effort;
  }

  _structureAcceptanceCriteria(criteria) {
    if (Array.isArray(criteria)) {
      return criteria.map((c, i) => ({
        id: `AC-${i + 1}`,
        criterion: c,
        testable: true
      }));
    }
    return [{ id: 'AC-1', criterion: criteria, testable: true }];
  }

  _generateLabels(title, description) {
    const labels = [];
    if (title.toLowerCase().includes('api')) labels.push('api');
    if (title.toLowerCase().includes('ui')) labels.push('frontend');
    if (description.toLowerCase().includes('performance')) labels.push('performance');
    return labels;
  }

  _suggestMilestone(priority) {
    switch (priority) {
      case 'high': return 'Current Sprint';
      case 'medium': return 'Next Release';
      case 'low': return 'Future Enhancement';
      default: return 'Backlog';
    }
  }

  async _generateStoriesForEpic(epic) {
    // Generate 3-5 initial stories based on epic
    const storyCount = Math.floor(Math.random() * 3) + 3;
    const stories = [];
    
    for (let i = 0; i < storyCount; i++) {
      stories.push({
        id: this._generateStoryId(),
        title: `${epic.title} - Story ${i + 1}`,
        epicId: epic.id,
        priority: epic.priority,
        status: 'todo'
      });
    }
    
    return stories;
  }

  _formatAcceptanceCriteria(criteria) {
    if (typeof criteria === 'string') {
      return criteria.split('\n').filter(c => c.trim()).map((c, i) => ({
        id: i + 1,
        criterion: c.trim(),
        status: 'pending'
      }));
    }
    return criteria;
  }
  
  _formatAcceptanceCriteriaArray(criteria) {
    if (typeof criteria === 'string') {
      return criteria.split('\n').filter(c => c.trim());
    }
    if (Array.isArray(criteria)) {
      return criteria;
    }
    return [criteria];
  }
  
  async _saveStoryFile(storyId, content) {
    const filename = `${storyId}.md`;
    const outputPath = path.join(
      this.contextManager.baseDir,
      '..',
      'output',
      'stories',
      filename
    );
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: outputPath,
      content
    });
    
    return outputPath;
  }

  _generateTechnicalNotes(feature) {
    return `Consider implementation approach for: ${feature}`;
  }

  _checkDefinitionOfReady(story) {
    return {
      hasAcceptanceCriteria: !!story.acceptanceCriteria,
      hasEstimate: !!story.storyPoints,
      hasUserStory: !!(story.asA && story.iWant && story.soThat),
      isReady: true
    };
  }

  _defineDefinitionOfDone() {
    return [
      'Code complete and peer reviewed',
      'Unit tests written and passing',
      'Integration tests passing',
      'Documentation updated',
      'Deployed to staging environment',
      'Product owner acceptance'
    ];
  }

  _generateStoryLabels(persona, feature) {
    const labels = [`user:${persona.toLowerCase().replace(/\s+/g, '-')}`];
    if (feature.includes('API')) labels.push('api');
    if (feature.includes('UI')) labels.push('ui');
    return labels;
  }

  _shardByEpic(prd) {
    // Extract epics from PRD and create shards
    const epics = this._extractEpics(prd);
    return epics.map(epic => ({
      id: `shard-epic-${epic.id}`,
      type: 'epic',
      content: epic,
      parent: prd.title
    }));
  }

  _shardByComponent(prd) {
    // Extract components and create shards
    const components = this._extractComponents(prd);
    return components.map(comp => ({
      id: `shard-component-${comp.name}`,
      type: 'component',
      content: comp,
      parent: prd.title
    }));
  }

  _shardByMilestone(prd) {
    // Group by milestones
    const milestones = this._extractMilestones(prd);
    return milestones.map(milestone => ({
      id: `shard-milestone-${milestone.id}`,
      type: 'milestone',
      content: milestone,
      parent: prd.title
    }));
  }

  _extractEpics(prd) {
    // Extract epics from functional requirements
    return prd.sections.functionalRequirements?.content?.reduce((epics, req, i) => {
      const epicIndex = Math.floor(i / 5); // Group every 5 requirements
      if (!epics[epicIndex]) {
        epics[epicIndex] = {
          id: `epic-${epicIndex + 1}`,
          requirements: []
        };
      }
      epics[epicIndex].requirements.push(req);
      return epics;
    }, []) || [];
  }

  _extractComponents(prd) {
    return ['Frontend', 'Backend', 'Database', 'Infrastructure'].map(name => ({
      name,
      requirements: []
    }));
  }

  _extractMilestones(prd) {
    return [
      { id: 'mvp', name: 'MVP Release', features: [] },
      { id: 'v1', name: 'Version 1.0', features: [] },
      { id: 'v2', name: 'Version 2.0', features: [] }
    ];
  }

  _scoreFeature(feature, criterion) {
    // Simplified scoring logic
    switch (criterion) {
      case 'user_value':
        return Math.random() * 10;
      case 'effort':
        return 10 - (Math.random() * 10); // Inverse for effort
      case 'risk':
        return 10 - (Math.random() * 10); // Inverse for risk
      default:
        return 5;
    }
  }

  _calculatePriority(score, maxScore) {
    const percentage = score / (maxScore * 10);
    if (percentage > 0.7) return 'high';
    if (percentage > 0.4) return 'medium';
    return 'low';
  }

  _generatePhases(timeframe) {
    switch (timeframe) {
      case 'quarterly':
        return ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
      case 'monthly':
        return Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
      default:
        return ['Phase 1', 'Phase 2', 'Phase 3'];
    }
  }

  _alignMilestones(milestones, timeframe) {
    return milestones.map((m, i) => ({
      ...m,
      targetPhase: i % this._generatePhases(timeframe).length
    }));
  }

  _allocateFeatures(features, timeframe, constraints) {
    const phases = this._generatePhases(timeframe);
    const allocation = {};
    
    features.forEach((feature, i) => {
      const phaseIndex = Math.floor(i / Math.ceil(features.length / phases.length));
      const phase = phases[phaseIndex] || phases[phases.length - 1];
      
      if (!allocation[phase]) allocation[phase] = [];
      allocation[phase].push(feature);
    });
    
    return allocation;
  }

  _mapDependencies(features) {
    return features.reduce((deps, feature) => {
      if (feature.dependencies) {
        deps.push(...feature.dependencies.map(d => ({
          from: feature.id,
          to: d,
          type: 'depends_on'
        })));
      }
      return deps;
    }, []);
  }

  _identifyRoadmapRisks(features, constraints) {
    const risks = [];
    
    if (features.length > 20) {
      risks.push({ risk: 'Feature overload', mitigation: 'Prioritize ruthlessly' });
    }
    
    if (constraints.includes('resources')) {
      risks.push({ risk: 'Resource constraints', mitigation: 'Consider phased hiring' });
    }
    
    return risks;
  }

  _defineRoadmapMetrics(features) {
    return {
      velocity: 'Features delivered per phase',
      quality: 'Defect rate per feature',
      adoption: 'User adoption per feature',
      satisfaction: 'User satisfaction score'
    };
  }

  // Course correction helpers
  _analyzeGap(current, desired) {
    return {
      current,
      desired,
      gaps: this._identifyGaps(current, desired)
    };
  }

  _identifyRootCauses(blockers) {
    return blockers.map(blocker => ({
      blocker,
      rootCause: this._analyzeRootCause(blocker),
      impact: this._assessBlockerImpact(blocker)
    }));
  }

  _assessImpact(current, desired) {
    return {
      timeline: 'Medium delay expected',
      budget: 'Within contingency',
      quality: 'Minimal impact'
    };
  }

  _generateRecommendations(current, desired, blockers) {
    const recommendations = [];
    
    for (const blocker of blockers) {
      recommendations.push({
        issue: blocker,
        recommendation: this._recommendSolution(blocker),
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  _createActionPlan(current, desired) {
    return [
      { action: 'Assess current state', timeline: 'Week 1', owner: 'PM' },
      { action: 'Identify quick wins', timeline: 'Week 1-2', owner: 'Team' },
      { action: 'Implement corrections', timeline: 'Week 2-4', owner: 'Dev Team' },
      { action: 'Validate progress', timeline: 'Week 4', owner: 'PM' }
    ];
  }

  _defineSuccessCriteria(desired) {
    return [
      `Achieve ${desired} state`,
      'All blockers resolved',
      'Team velocity restored',
      'Stakeholder satisfaction'
    ];
  }

  _estimateTimeline(current, desired) {
    return '4-6 weeks for full course correction';
  }

  // Utility methods
  _getUserCharacteristics(user) {
    return `${user} with specific needs and workflows`;
  }

  _getUserNeeds(user) {
    return [`Efficient workflow for ${user}`, 'Easy to use interface', 'Reliable performance'];
  }

  _getUserPainPoints(user) {
    return ['Current process is manual', 'Lack of visibility', 'Time-consuming tasks'];
  }

  _breakDownGoal(goal) {
    return [`Objective 1 for ${goal}`, `Objective 2 for ${goal}`];
  }

  _makeMeasurable(goal) {
    return `Measurable outcome for ${goal}`;
  }

  _estimateTimeframe(goal) {
    return '3-6 months';
  }

  _createUserStoryFromGoal(user, goal) {
    return {
      story: `As a ${user}, I want to ${goal}, so that I can improve my workflow`,
      priority: 'medium'
    };
  }

  _extractRequirementsFromGoal(goal) {
    return [`System shall ${goal}`, `Users shall be able to ${goal}`];
  }

  _assessRequirementPriority(req, goal) {
    return 'high'; // Simplified
  }

  _categorizeConstraint(constraint) {
    if (constraint.includes('budget') || constraint.includes('cost')) return 'Financial';
    if (constraint.includes('time') || constraint.includes('deadline')) return 'Timeline';
    if (constraint.includes('tech') || constraint.includes('platform')) return 'Technical';
    return 'Other';
  }

  _assessConstraintImpact(constraint) {
    return 'Medium'; // Simplified
  }

  _suggestMitigation(constraint) {
    return `Mitigation strategy for ${constraint}`;
  }

  _simplifyGoalForMVP(goal) {
    return `Core functionality for ${goal}`;
  }

  _assessProblemImpact(problem) {
    return 'High impact on user productivity and satisfaction';
  }

  async _analyzeExistingProject(projectPath) {
    return {
      structure: 'Monolithic',
      techStack: ['Node.js', 'React', 'PostgreSQL'],
      codeQuality: 'Medium',
      testCoverage: '45%'
    };
  }

  _documentCurrentState(analysis, docs) {
    return {
      architecture: analysis.structure,
      technology: analysis.techStack,
      documentation: docs ? 'Partial' : 'Missing',
      quality: analysis.codeQuality
    };
  }

  _structureMigrationGoals(goals) {
    return goals.map((goal, i) => ({
      id: `MG-${i + 1}`,
      goal,
      priority: 'high',
      complexity: 'medium'
    }));
  }

  _assessTechnicalDebt(debt, analysis) {
    return {
      identified: debt,
      severity: 'Medium to High',
      estimatedEffort: '3-6 months to address',
      priority: 'Should be addressed during migration'
    };
  }

  _defineMigrationStrategy(goals, constraints) {
    return {
      approach: 'Incremental migration',
      phases: 'Component by component',
      fallback: 'Maintain backward compatibility',
      testing: 'Comprehensive testing at each phase'
    };
  }

  _createPhasesPlan(goals, debt) {
    return [
      { phase: 1, focus: 'Critical debt resolution', duration: '1 month' },
      { phase: 2, focus: 'Core functionality migration', duration: '2 months' },
      { phase: 3, focus: 'Feature parity', duration: '2 months' },
      { phase: 4, focus: 'Optimization and cleanup', duration: '1 month' }
    ];
  }

  _assessMigrationRisks(debt, constraints) {
    return [
      { risk: 'Data migration issues', likelihood: 'Medium', mitigation: 'Thorough testing' },
      { risk: 'Downtime during migration', likelihood: 'Low', mitigation: 'Blue-green deployment' },
      { risk: 'Feature regression', likelihood: 'Medium', mitigation: 'Comprehensive test suite' }
    ];
  }

  _defineRollbackPlan() {
    return {
      trigger: 'Critical issues in production',
      procedure: [
        'Immediate notification to stakeholders',
        'Switch traffic to previous version',
        'Preserve data integrity',
        'Post-mortem analysis'
      ],
      timeline: '< 30 minutes for rollback execution'
    };
  }

  _identifyGaps(current, desired) {
    return ['Feature gap', 'Performance gap', 'User experience gap'];
  }

  _analyzeRootCause(blocker) {
    return `Root cause analysis for ${blocker}`;
  }

  _assessBlockerImpact(blocker) {
    return 'High';
  }

  _recommendSolution(blocker) {
    return `Recommended solution for ${blocker}`;
  }
}