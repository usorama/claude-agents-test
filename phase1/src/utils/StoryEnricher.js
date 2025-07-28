import winston from 'winston';
import { ContextLevel } from '../types/context.types.v2.js';

/**
 * StoryEnricher adds comprehensive context to story files
 * including dependencies, test cases, and implementation hints
 */
export class StoryEnricher {
  constructor(contextManager, config = {}) {
    this.contextManager = contextManager;
    this.config = {
      includeCodeReferences: config.includeCodeReferences !== false,
      generateTestScenarios: config.generateTestScenarios !== false,
      complexityThresholds: config.complexityThresholds || {
        simple: 3,
        medium: 8,
        complex: 13
      },
      ...config
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'StoryEnricher' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Enrich a base story with comprehensive context
   * @param {Object} baseStory - The basic story object
   * @param {Object} epicContext - Context from the parent epic
   * @returns {Object} Enriched story object
   */
  async enrichStory(baseStory, epicContext = {}) {
    try {
      const enriched = { ...baseStory };
      
      // Add technical context
      enriched.technicalContext = await this.gatherTechnicalContext(baseStory, epicContext);
      
      // Analyze dependencies
      enriched.dependencies = await this.analyzeDependencies(baseStory, epicContext);
      
      // Generate test scenarios
      if (this.config.generateTestScenarios) {
        enriched.testScenarios = this.generateTestScenarios(baseStory);
      }
      
      // Generate implementation hints
      enriched.implementationHints = await this.generateHints(baseStory, epicContext);
      
      // Find code references
      if (this.config.includeCodeReferences) {
        enriched.references = await this.findReferences(baseStory, epicContext);
      }
      
      // Calculate metadata
      enriched.metadata = this.calculateMetadata(enriched);
      
      this.logger.info('Story enriched', { 
        storyId: baseStory.id,
        addedSections: Object.keys(enriched).filter(k => !baseStory[k])
      });
      
      return enriched;
    } catch (error) {
      this.logger.error('Failed to enrich story', { 
        storyId: baseStory.id,
        error 
      });
      // Return base story if enrichment fails
      return baseStory;
    }
  }

  /**
   * Gather technical context from related documents
   * @private
   */
  async gatherTechnicalContext(story, epicContext) {
    const context = {
      summary: '',
      architecture: '',
      performance: '',
      security: '',
      constraints: []
    };
    
    try {
      // Get project context
      const projectContexts = await this.contextManager.queryContexts({
        level: ContextLevel.PROJECT,
        limit: 1
      });
      
      if (projectContexts.length > 0) {
        const projectData = projectContexts[0].data;
        
        // Extract architecture information
        if (projectData.architecture) {
          context.architecture = this._summarizeArchitecture(projectData.architecture);
        }
        
        // Extract performance requirements
        if (projectData.requirements?.performance) {
          context.performance = this._summarizePerformance(projectData.requirements.performance);
        }
        
        // Extract security requirements
        if (projectData.requirements?.security) {
          context.security = this._summarizeSecurity(projectData.requirements.security);
        }
        
        this.logger.debug('Project context retrieved', {
          hasArchitecture: !!projectData.architecture,
          hasPerformance: !!projectData.requirements?.performance,
          hasSecurity: !!projectData.requirements?.security
        });
      } else {
        this.logger.warn('No project context found for technical context gathering');
      }
      
      // Add epic-specific context
      if (epicContext.technicalRequirements) {
        context.constraints = epicContext.technicalRequirements;
      }
      
      // Generate summary
      context.summary = this._generateTechnicalSummary(story, context);
      
      this.logger.debug('Technical context gathered', {
        hasArchitecture: !!context.architecture,
        hasPerformance: !!context.performance,
        hasSecurity: !!context.security,
        constraintsCount: context.constraints.length
      });
      
    } catch (error) {
      this.logger.error('Failed to gather technical context', { error });
    }
    
    return context;
  }

  /**
   * Analyze story dependencies
   * @private
   */
  async analyzeDependencies(story, epicContext) {
    const dependencies = [];
    const storyText = (story.title + ' ' + story.description + ' ' + 
                     (story.acceptanceCriteria?.join(' ') || '')).toLowerCase();
    
    try {
      // More comprehensive pattern matching for dependencies
      
      // API dependencies
      if (storyText.match(/api|endpoint|service|rest|graphql|microservice/i)) {
        dependencies.push({
          type: 'API',
          description: 'Requires API endpoint implementation and service integration',
          status: 'pending',
          priority: 'high'
        });
      }
      
      // Database dependencies
      if (storyText.match(/database|table|schema|migration|query|sql|nosql|mongo|postgres/i)) {
        dependencies.push({
          type: 'Database',
          description: 'Requires database schema changes and data migration',
          status: 'pending',
          priority: 'high'
        });
      }
      
      // UI/Frontend dependencies
      if (storyText.match(/ui|interface|component|screen|page|frontend|react|vue|angular/i)) {
        dependencies.push({
          type: 'UI',
          description: 'Requires UI component implementation and styling',
          status: 'pending',
          priority: 'medium'
        });
      }
      
      // Authentication/Authorization dependencies
      if (storyText.match(/auth|login|logout|session|token|jwt|oauth|permission|role/i)) {
        dependencies.push({
          type: 'Authentication',
          description: 'Requires authentication and authorization implementation',
          status: 'pending',
          priority: 'high'
        });
      }
      
      // Payment processing dependencies
      if (storyText.match(/payment|billing|charge|invoice|stripe|paypal|transaction/i)) {
        dependencies.push({
          type: 'Payment',
          description: 'Requires payment processing and financial transaction handling',
          status: 'pending',
          priority: 'critical'
        });
      }
      
      // External service dependencies
      if (storyText.match(/integration|external|third-party|webhook|api.*key|provider/i)) {
        dependencies.push({
          type: 'External Service',
          description: 'Requires external service integration and API key management',
          status: 'pending',
          priority: 'medium'
        });
      }
      
      // Testing dependencies
      if (storyText.match(/test|testing|qa|unit.*test|integration.*test|e2e/i)) {
        dependencies.push({
          type: 'Testing',
          description: 'Requires comprehensive test suite implementation',
          status: 'pending',
          priority: 'medium'
        });
      }
      
      // Performance dependencies
      if (storyText.match(/performance|optimization|speed|cache|indexing|scaling/i)) {
        dependencies.push({
          type: 'Performance',
          description: 'Requires performance optimization and monitoring',
          status: 'pending',
          priority: 'medium'
        });
      }
      
      // Security dependencies
      if (storyText.match(/security|encryption|ssl|tls|vulnerability|sanitiz|validat/i)) {
        dependencies.push({
          type: 'Security',
          description: 'Requires security implementation and vulnerability assessment',
          status: 'pending',
          priority: 'high'
        });
      }
      
      // DevOps/Infrastructure dependencies
      if (storyText.match(/deploy|deployment|infrastructure|docker|kubernetes|ci\/cd|pipeline/i)) {
        dependencies.push({
          type: 'DevOps',
          description: 'Requires infrastructure setup and deployment pipeline',
          status: 'pending',
          priority: 'medium'
        });
      }
      
      // Add epic-level dependencies
      if (epicContext.dependencies && Array.isArray(epicContext.dependencies)) {
        const relevantDeps = epicContext.dependencies.filter(d => 
          this._isDependencyRelevant(d, story)
        );
        dependencies.push(...relevantDeps.map(dep => ({
          ...dep,
          source: 'epic'
        })));
      }
      
      // Check for story dependencies
      const relatedStories = await this._findRelatedStories(story);
      relatedStories.forEach(related => {
        dependencies.push({
          type: 'Story',
          description: `Depends on completion of ${related.id}: ${related.title}`,
          status: related.status || 'pending',
          priority: 'high',
          source: 'story-dependency'
        });
      });
      
      // Remove duplicates based on type and description
      const uniqueDeps = dependencies.filter((dep, index, arr) => 
        arr.findIndex(d => d.type === dep.type && d.description === dep.description) === index
      );
      
      this.logger.debug('Dependencies analyzed', {
        storyId: story.id,
        totalFound: uniqueDeps.length,
        types: [...new Set(uniqueDeps.map(d => d.type))]
      });
      
      return uniqueDeps;
      
    } catch (error) {
      this.logger.error('Failed to analyze dependencies', { 
        storyId: story.id,
        error 
      });
    }
    
    return dependencies;
  }

  /**
   * Generate test scenarios based on acceptance criteria
   * @private
   */
  generateTestScenarios(story) {
    const scenarios = [];
    
    // Generate scenarios from acceptance criteria
    if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
      story.acceptanceCriteria.forEach((criterion, index) => {
        scenarios.push({
          name: `Acceptance Test ${index + 1}`,
          given: this._extractGiven(criterion),
          when: this._extractWhen(criterion),
          then: this._extractThen(criterion),
          type: 'acceptance'
        });
      });
    }
    
    // Add standard test scenarios based on story type
    const storyType = this._detectStoryType(story);
    
    switch (storyType) {
      case 'feature':
        scenarios.push({
          name: 'Happy Path Test',
          given: 'Valid input and system state',
          when: 'User performs the main action',
          then: 'Expected outcome is achieved',
          type: 'happy-path'
        });
        scenarios.push({
          name: 'Error Handling Test',
          given: 'Invalid input or error condition',
          when: 'User attempts the action',
          then: 'Appropriate error message is displayed',
          type: 'error-handling'
        });
        break;
        
      case 'bug':
        scenarios.push({
          name: 'Regression Test',
          given: 'The conditions that caused the bug',
          when: 'The triggering action is performed',
          then: 'The bug no longer occurs',
          type: 'regression'
        });
        break;
        
      case 'performance':
        scenarios.push({
          name: 'Performance Benchmark',
          given: 'Standard load conditions',
          when: 'Operation is performed',
          then: 'Response time is within acceptable limits',
          type: 'performance'
        });
        break;
    }
    
    return scenarios;
  }

  /**
   * Generate implementation hints based on story analysis
   * @private
   */
  async generateHints(story, epicContext) {
    const hints = [];
    
    // Analyze story for common patterns
    const patterns = this._detectPatterns(story);
    
    // Add pattern-specific hints
    patterns.forEach(pattern => {
      switch (pattern) {
        case 'CRUD':
          hints.push('Consider using a standard CRUD controller pattern');
          hints.push('Implement proper validation for all inputs');
          hints.push('Add appropriate database indexes for query performance');
          break;
          
        case 'Authentication':
          hints.push('Use existing authentication middleware');
          hints.push('Ensure proper session management');
          hints.push('Implement rate limiting for security');
          break;
          
        case 'DataProcessing':
          hints.push('Consider using batch processing for large datasets');
          hints.push('Implement progress tracking for long operations');
          hints.push('Add proper error recovery mechanisms');
          break;
          
        case 'UI':
          hints.push('Follow the existing design system components');
          hints.push('Ensure responsive design for all screen sizes');
          hints.push('Add proper loading and error states');
          break;
      }
    });
    
    // Add architecture-specific hints
    if (epicContext.architecture) {
      if (epicContext.architecture.includes('microservice')) {
        hints.push('Implement proper service boundaries');
        hints.push('Use message queuing for inter-service communication');
      }
      if (epicContext.architecture.includes('event-driven')) {
        hints.push('Emit appropriate events for state changes');
        hints.push('Implement idempotent event handlers');
      }
    }
    
    // Add general best practices
    hints.push('Write unit tests alongside implementation');
    hints.push('Document any new APIs or interfaces');
    hints.push('Consider edge cases and error scenarios');
    
    return hints;
  }

  /**
   * Find relevant code references
   * @private
   */
  async findReferences(story, epicContext) {
    const references = [];
    
    try {
      // Search for related code files
      const keywords = this._extractKeywords(story);
      
      // Mock references for now (in real implementation, would search codebase)
      if (keywords.includes('api')) {
        references.push({
          file: 'src/api/controllers/BaseController.js',
          line: 15,
          description: 'Base controller class for API endpoints'
        });
      }
      
      if (keywords.includes('database')) {
        references.push({
          file: 'src/models/BaseModel.js',
          line: 8,
          description: 'Base model class for database entities'
        });
      }
      
      if (keywords.includes('component')) {
        references.push({
          file: 'src/components/BaseComponent.js',
          line: 12,
          description: 'Base component class for UI elements'
        });
      }
      
      // Add epic-specific references
      if (epicContext.codeReferences) {
        references.push(...epicContext.codeReferences);
      }
      
    } catch (error) {
      this.logger.error('Failed to find references', { error });
    }
    
    return references;
  }

  /**
   * Calculate story metadata
   * @private
   */
  calculateMetadata(enrichedStory) {
    const metadata = {
      complexity: 'medium',
      effort: '4 hours',
      skills: [],
      checkpoints: []
    };
    
    // Calculate complexity based on various factors
    let complexityScore = 0;
    
    // Factor in dependencies
    complexityScore += (enrichedStory.dependencies?.length || 0) * 2;
    
    // Factor in test scenarios
    complexityScore += (enrichedStory.testScenarios?.length || 0);
    
    // Factor in acceptance criteria
    complexityScore += (enrichedStory.acceptanceCriteria?.length || 0);
    
    // Determine complexity level
    if (complexityScore <= this.config.complexityThresholds.simple) {
      metadata.complexity = 'simple';
      metadata.effort = '2 hours';
    } else if (complexityScore <= this.config.complexityThresholds.medium) {
      metadata.complexity = 'medium';
      metadata.effort = '4 hours';
    } else {
      metadata.complexity = 'complex';
      metadata.effort = '8 hours';
    }
    
    // Determine required skills
    const skills = new Set();
    
    if (enrichedStory.description.match(/API|backend/i)) {
      skills.add('Backend Development');
    }
    if (enrichedStory.description.match(/UI|frontend|component/i)) {
      skills.add('Frontend Development');
    }
    if (enrichedStory.description.match(/database|query|migration/i)) {
      skills.add('Database Design');
    }
    if (enrichedStory.description.match(/test|testing|QA/i)) {
      skills.add('Testing');
    }
    if (enrichedStory.description.match(/deploy|deployment|CI\/CD/i)) {
      skills.add('DevOps');
    }
    
    metadata.skills = Array.from(skills);
    
    // Define checkpoints based on complexity
    switch (metadata.complexity) {
      case 'simple':
        metadata.checkpoints = ['Implementation Complete', 'Tests Pass'];
        break;
      case 'medium':
        metadata.checkpoints = ['Design Review', 'Implementation Complete', 'Code Review', 'Tests Pass'];
        break;
      case 'complex':
        metadata.checkpoints = ['Design Review', '50% Complete', 'Implementation Complete', 'Code Review', 'Integration Test', 'Performance Test'];
        break;
    }
    
    return metadata;
  }

  /**
   * Generate story markdown
   * @param {Object} enrichedStory - The enriched story object
   * @returns {string} Formatted markdown content
   */
  generateStoryMarkdown(enrichedStory) {
    const sections = [];
    
    // Header
    sections.push(`# ${enrichedStory.id}: ${enrichedStory.title}`);
    sections.push('');
    
    // Story description
    sections.push('## Story');
    sections.push(enrichedStory.description);
    sections.push('');
    
    // Technical context
    if (enrichedStory.technicalContext?.summary) {
      sections.push('## Technical Context');
      sections.push(enrichedStory.technicalContext.summary);
      sections.push('');
      
      if (enrichedStory.technicalContext.architecture) {
        sections.push('### Architecture Considerations');
        sections.push(enrichedStory.technicalContext.architecture);
        sections.push('');
      }
      
      if (enrichedStory.technicalContext.performance) {
        sections.push('### Performance Requirements');
        sections.push(enrichedStory.technicalContext.performance);
        sections.push('');
      }
      
      if (enrichedStory.technicalContext.security) {
        sections.push('### Security Requirements');
        sections.push(enrichedStory.technicalContext.security);
        sections.push('');
      }
    }
    
    // Dependencies
    if (enrichedStory.dependencies?.length > 0) {
      sections.push('## Dependencies');
      enrichedStory.dependencies.forEach(dep => {
        sections.push(`- **${dep.type}**: ${dep.description} (${dep.status})`);
      });
      sections.push('');
    }
    
    // Acceptance criteria
    if (enrichedStory.acceptanceCriteria?.length > 0) {
      sections.push('## Acceptance Criteria');
      enrichedStory.acceptanceCriteria.forEach((criterion, index) => {
        sections.push(`${index + 1}. ${criterion}`);
      });
      sections.push('');
    }
    
    // Test scenarios
    if (enrichedStory.testScenarios?.length > 0) {
      sections.push('## Test Scenarios');
      enrichedStory.testScenarios.forEach(scenario => {
        sections.push(`### ${scenario.name}`);
        sections.push(`- **Given**: ${scenario.given}`);
        sections.push(`- **When**: ${scenario.when}`);
        sections.push(`- **Then**: ${scenario.then}`);
        sections.push('');
      });
    }
    
    // Implementation hints
    if (enrichedStory.implementationHints?.length > 0) {
      sections.push('## Implementation Hints');
      enrichedStory.implementationHints.forEach(hint => {
        sections.push(`- ${hint}`);
      });
      sections.push('');
    }
    
    // Code references
    if (enrichedStory.references?.length > 0) {
      sections.push('## Code References');
      enrichedStory.references.forEach(ref => {
        sections.push(`- \`${ref.file}:${ref.line}\` - ${ref.description}`);
      });
      sections.push('');
    }
    
    // Definition of done
    sections.push('## Definition of Done');
    sections.push('- [ ] Implementation complete');
    sections.push('- [ ] Unit tests written and passing');
    sections.push('- [ ] Integration tests updated');
    sections.push('- [ ] Code reviewed');
    sections.push('- [ ] Documentation updated');
    if (enrichedStory.technicalContext?.performance) {
      sections.push('- [ ] Performance benchmarks met');
    }
    if (enrichedStory.technicalContext?.security) {
      sections.push('- [ ] Security review completed');
    }
    sections.push('');
    
    // Metadata
    if (enrichedStory.metadata) {
      sections.push('## Metadata');
      sections.push(`- **Complexity**: ${enrichedStory.metadata.complexity}`);
      sections.push(`- **Estimated Effort**: ${enrichedStory.metadata.effort}`);
      if (enrichedStory.metadata.skills?.length > 0) {
        sections.push(`- **Required Skills**: ${enrichedStory.metadata.skills.join(', ')}`);
      }
      if (enrichedStory.metadata.checkpoints?.length > 0) {
        sections.push(`- **Review Checkpoints**: ${enrichedStory.metadata.checkpoints.join(', ')}`);
      }
    }
    
    return sections.join('\n');
  }

  // Private helper methods
  _summarizeArchitecture(architecture) {
    // Simplified summary
    return `The system follows a ${architecture.style || 'modular'} architecture with ${architecture.components?.length || 'multiple'} components.`;
  }

  _summarizePerformance(performance) {
    return `Response time should be under ${performance.responseTime || '200ms'} with support for ${performance.concurrentUsers || '100'} concurrent users.`;
  }

  _summarizeSecurity(security) {
    return `Security requirements include ${security.authentication || 'standard authentication'} and ${security.authorization || 'role-based access control'}.`;
  }

  _generateTechnicalSummary(story, context) {
    const parts = [];
    
    if (context.architecture) {
      parts.push('This story should align with the system architecture.');
    }
    
    if (context.performance) {
      parts.push('Performance requirements must be considered during implementation.');
    }
    
    if (context.security) {
      parts.push('Security best practices must be followed.');
    }
    
    if (context.constraints.length > 0) {
      parts.push(`Key constraints: ${context.constraints.join(', ')}`);
    }
    
    return parts.join(' ') || 'Standard technical requirements apply.';
  }

  _isDependencyRelevant(dependency, story) {
    // Simple relevance check based on keywords
    const storyKeywords = this._extractKeywords(story);
    const depKeywords = dependency.description.toLowerCase().split(/\s+/);
    
    return depKeywords.some(keyword => storyKeywords.includes(keyword));
  }

  async _findRelatedStories(story) {
    // Mock implementation - would search for related stories
    return [];
  }

  _extractGiven(criterion) {
    const match = criterion.match(/given\s+(.+?)(?:when|then|$)/i);
    return match ? match[1].trim() : 'The system is in a valid state';
  }

  _extractWhen(criterion) {
    const match = criterion.match(/when\s+(.+?)(?:then|$)/i);
    return match ? match[1].trim() : 'The user performs the action';
  }

  _extractThen(criterion) {
    const match = criterion.match(/then\s+(.+?)$/i);
    return match ? match[1].trim() : criterion;
  }

  _detectStoryType(story) {
    if (story.title?.match(/bug|fix|issue/i)) return 'bug';
    if (story.title?.match(/performance|optimize|speed/i)) return 'performance';
    if (story.title?.match(/security|vulnerability/i)) return 'security';
    return 'feature';
  }

  _detectPatterns(story) {
    const patterns = [];
    const text = (story.title + ' ' + story.description).toLowerCase();
    
    if (text.match(/create|read|update|delete|crud/i)) {
      patterns.push('CRUD');
    }
    
    if (text.match(/auth|login|logout|session|token/i)) {
      patterns.push('Authentication');
    }
    
    if (text.match(/process|transform|convert|batch|queue/i)) {
      patterns.push('DataProcessing');
    }
    
    if (text.match(/ui|interface|component|screen|page/i)) {
      patterns.push('UI');
    }
    
    return patterns;
  }

  _extractKeywords(story) {
    const text = (story.title + ' ' + story.description).toLowerCase();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    return text
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
}