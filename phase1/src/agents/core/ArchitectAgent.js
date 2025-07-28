import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export class ArchitectAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'architect-001',
      type: 'ArchitectAgent',
      name: 'Winston',
      description: 'Holistic System Architect & Full-Stack Technical Leader',
      capabilities: [
        AgentCapability.ARCHITECTURE,
        AgentCapability.PLANNING,
        AgentCapability.DOCUMENTATION
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.EDIT,
        ClaudeCodeTool.MULTI_EDIT,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.GLOB,
        ClaudeCodeTool.TASK
      ],
      ...config
    });
    
    this.persona = {
      role: 'Holistic System Architect & Full-Stack Technical Leader',
      style: 'Comprehensive, pragmatic, user-centric, technically deep yet accessible',
      identity: 'Master of holistic application design who bridges frontend, backend, infrastructure, and everything in between',
      focus: 'Complete systems architecture, cross-stack optimization, pragmatic technology selection',
      corePrinciples: [
        'Holistic System Thinking - View every component as part of a larger system',
        'User Experience Drives Architecture - Start with user journeys and work backward',
        'Pragmatic Technology Selection - Choose boring technology where possible, exciting where necessary',
        'Progressive Complexity - Design systems simple to start but can scale',
        'Cross-Stack Performance Focus - Optimize holistically across all layers',
        'Developer Experience as First-Class Concern - Enable developer productivity',
        'Security at Every Layer - Implement defense in depth',
        'Data-Centric Design - Let data requirements drive architecture',
        'Cost-Conscious Engineering - Balance technical ideals with financial reality',
        'Living Architecture - Design for change and adaptation'
      ]
    };
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Architect executing task', { taskType });
    
    switch (taskType) {
      case 'create-full-stack-architecture':
        return await this._createFullStackArchitecture(input);
        
      case 'create-backend-architecture':
        return await this._createBackendArchitecture(input);
        
      case 'create-frontend-architecture':
        return await this._createFrontendArchitecture(input);
        
      case 'create-brownfield-architecture':
        return await this._createBrownfieldArchitecture(input);
        
      case 'document-project':
        return await this._documentProjectArchitecture(input);
        
      case 'technology-selection':
        return await this._performTechnologySelection(input);
        
      case 'api-design':
        return await this._designAPIs(input);
        
      case 'infrastructure-planning':
        return await this._planInfrastructure(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _createFullStackArchitecture(input) {
    const {
      projectName,
      prdPath,
      requirements,
      constraints,
      teamSize,
      timeline
    } = input;
    
    // Load PRD if provided
    const prd = prdPath ? await this._loadPRD(prdPath) : null;
    
    const architecture = {
      title: `Full-Stack Architecture: ${projectName}`,
      version: '1.0',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      
      overview: {
        description: this._generateArchitectureOverview(projectName, requirements),
        keyDecisions: this._documentKeyDecisions(requirements, constraints),
        tradeoffs: this._analyzeTradeoffs(constraints, timeline)
      },
      
      systemArchitecture: {
        layers: this._defineSystemLayers(),
        components: this._defineComponents(requirements),
        dataFlow: this._designDataFlow(requirements),
        integrations: this._identifyIntegrations(requirements)
      },
      
      frontend: {
        framework: this._selectFrontendFramework(requirements, teamSize),
        architecture: this._designFrontendArchitecture(requirements),
        stateManagement: this._designStateManagement(requirements),
        uiComponents: this._planUIComponents(requirements),
        performance: this._planFrontendPerformance()
      },
      
      backend: {
        framework: this._selectBackendFramework(requirements, teamSize),
        architecture: this._designBackendArchitecture(requirements),
        apiDesign: this._designAPIArchitecture(requirements),
        dataModels: this._designDataModels(requirements),
        services: this._defineServices(requirements)
      },
      
      database: {
        selection: this._selectDatabase(requirements),
        schema: this._designDatabaseSchema(requirements),
        scaling: this._planDatabaseScaling(requirements),
        backup: this._designBackupStrategy()
      },
      
      infrastructure: {
        deployment: this._designDeploymentArchitecture(constraints),
        scaling: this._designScalingStrategy(requirements),
        monitoring: this._designMonitoringStrategy(),
        security: this._designSecurityArchitecture()
      },
      
      crossCuttingConcerns: {
        authentication: this._designAuthArchitecture(requirements),
        authorization: this._designAuthorizationModel(requirements),
        logging: this._designLoggingStrategy(),
        errorHandling: this._designErrorHandling(),
        caching: this._designCachingStrategy()
      },
      
      developmentConcerns: {
        cicd: this._designCICDPipeline(teamSize),
        testing: this._designTestingStrategy(),
        documentation: this._planDocumentation(),
        developmentEnvironment: this._designDevEnvironment(teamSize)
      },
      
      performanceTargets: this._definePerformanceTargets(requirements),
      
      securityConsiderations: this._documentSecurityConsiderations(requirements),
      
      costEstimates: this._estimateCosts(infrastructure, teamSize),
      
      migrationPlan: this._createMigrationPlan(timeline),
      
      riskMitigation: this._identifyAndMitigateRisks(constraints)
    };
    
    // Save architecture
    const outputPath = await this._saveArchitecture(projectName, architecture);
    
    // Generate diagrams
    const diagrams = await this._generateArchitectureDiagrams(architecture);
    
    // Share with Dev team
    await this.contextManager.sendMessage({
      from: this.id,
      to: 'developer-001',
      type: 'event',
      subject: 'Architecture Created',
      data: { 
        projectName, 
        architecturePath: outputPath,
        summary: architecture.overview.description 
      }
    });
    
    return {
      architecture,
      outputPath,
      diagrams,
      summary: `Created comprehensive full-stack architecture for "${projectName}"`
    };
  }

  async _createBackendArchitecture(input) {
    const {
      projectName,
      apiRequirements,
      dataRequirements,
      scalabilityNeeds,
      securityRequirements
    } = input;
    
    const backendArchitecture = {
      title: `Backend Architecture: ${projectName}`,
      version: '1.0',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      
      overview: {
        scope: 'Backend services, APIs, and data layer',
        objectives: this._defineBackendObjectives(apiRequirements)
      },
      
      apiLayer: {
        style: this._selectAPIStyle(apiRequirements), // REST, GraphQL, gRPC
        design: this._designAPILayer(apiRequirements),
        versioning: this._designAPIVersioning(),
        documentation: this._planAPIDocumentation()
      },
      
      serviceLayer: {
        architecture: this._selectServiceArchitecture(scalabilityNeeds), // Microservices, Monolith
        services: this._defineBackendServices(apiRequirements),
        communication: this._designServiceCommunication(),
        orchestration: this._designServiceOrchestration()
      },
      
      dataLayer: {
        databases: this._selectDatabases(dataRequirements),
        ormOdm: this._selectDataAccessLayer(dataRequirements),
        caching: this._designCachingLayer(dataRequirements),
        dataIntegrity: this._designDataIntegrity()
      },
      
      security: {
        authentication: this._designAuthenticationSystem(securityRequirements),
        authorization: this._designAuthorizationSystem(securityRequirements),
        encryption: this._designEncryption(),
        apiSecurity: this._designAPISecurity()
      },
      
      scalability: {
        horizontalScaling: this._designHorizontalScaling(scalabilityNeeds),
        verticalScaling: this._designVerticalScaling(scalabilityNeeds),
        loadBalancing: this._designLoadBalancing(),
        queueing: this._designQueueingSystem(scalabilityNeeds)
      },
      
      reliability: {
        errorHandling: this._designErrorHandlingStrategy(),
        retryLogic: this._designRetryMechanisms(),
        circuitBreakers: this._designCircuitBreakers(),
        healthChecks: this._designHealthChecks()
      },
      
      observability: {
        logging: this._designLoggingArchitecture(),
        monitoring: this._designMonitoringSystem(),
        tracing: this._designDistributedTracing(),
        alerting: this._designAlertingSystem()
      }
    };
    
    return {
      architecture: backendArchitecture,
      summary: `Created backend architecture focusing on ${apiRequirements.length} API requirements`
    };
  }

  async _createFrontendArchitecture(input) {
    const {
      projectName,
      uiRequirements,
      userFlows,
      performanceTargets,
      deviceTargets
    } = input;
    
    const frontendArchitecture = {
      title: `Frontend Architecture: ${projectName}`,
      version: '1.0',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      
      overview: {
        scope: 'User interface, client-side logic, and user experience',
        designPrinciples: this._defineFrontendPrinciples(uiRequirements)
      },
      
      framework: {
        selection: this._selectFrontendStack(uiRequirements, performanceTargets),
        justification: this._justifyFrameworkChoice(uiRequirements),
        alternatives: this._documentAlternatives()
      },
      
      architecture: {
        pattern: this._selectArchitecturePattern(), // MVC, MVVM, Component-based
        folderStructure: this._designFolderStructure(),
        moduleSystem: this._designModuleSystem(),
        componentHierarchy: this._designComponentHierarchy(userFlows)
      },
      
      stateManagement: {
        approach: this._selectStateManagement(uiRequirements),
        dataFlow: this._designDataFlow(userFlows),
        persistence: this._designStatePersistence(),
        synchronization: this._designStateSync()
      },
      
      routing: {
        strategy: this._designRoutingStrategy(userFlows),
        navigation: this._designNavigationPatterns(userFlows),
        deepLinking: this._planDeepLinking(),
        guards: this._designRouteGuards()
      },
      
      uiComponents: {
        designSystem: this._selectDesignSystem(uiRequirements),
        componentLibrary: this._planComponentLibrary(),
        styling: this._designStylingArchitecture(),
        theming: this._designThemingSystem()
      },
      
      performance: {
        bundling: this._designBundlingStrategy(performanceTargets),
        lazyLoading: this._designLazyLoading(),
        caching: this._designClientCaching(),
        optimization: this._planOptimizations(performanceTargets)
      },
      
      responsive: {
        breakpoints: this._defineBreakpoints(deviceTargets),
        adaptiveDesign: this._planAdaptiveDesign(deviceTargets),
        mobileFirst: this._designMobileFirst(),
        touchOptimization: this._planTouchOptimization()
      },
      
      accessibility: {
        standards: this._defineAccessibilityStandards(),
        implementation: this._planAccessibilityImplementation(),
        testing: this._planAccessibilityTesting(),
        documentation: this._planA11yDocumentation()
      },
      
      integration: {
        apiIntegration: this._designAPIIntegration(),
        authentication: this._designClientAuth(),
        errorBoundaries: this._designErrorBoundaries(),
        analytics: this._planAnalyticsIntegration()
      }
    };
    
    return {
      architecture: frontendArchitecture,
      summary: `Created frontend architecture for ${deviceTargets.length} device targets`
    };
  }

  async _createBrownfieldArchitecture(input) {
    const {
      projectPath,
      currentArchitecture,
      migrationGoals,
      constraints,
      timeline
    } = input;
    
    // Analyze existing architecture
    const analysis = await this._analyzeExistingArchitecture(projectPath);
    
    const brownfieldArchitecture = {
      title: `Brownfield Architecture: Modernization Plan`,
      version: '1.0',
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      
      currentState: {
        analysis: analysis,
        painPoints: this._identifyPainPoints(analysis),
        technicalDebt: this._assessArchitecturalDebt(analysis),
        constraints: this._documentExistingConstraints(currentArchitecture)
      },
      
      targetState: {
        vision: this._defineTargetArchitecture(migrationGoals),
        improvements: this._planImprovements(migrationGoals, analysis),
        modernization: this._planModernization(migrationGoals)
      },
      
      migrationStrategy: {
        approach: this._selectMigrationApproach(constraints, timeline),
        phases: this._defineMigrationPhases(migrationGoals, timeline),
        priorities: this._prioritizeMigration(analysis, migrationGoals)
      },
      
      architecturalChanges: {
        structural: this._planStructuralChanges(analysis, migrationGoals),
        technological: this._planTechnologyUpgrades(analysis),
        patterns: this._introducePatternsAndPractices(migrationGoals)
      },
      
      riskManagement: {
        risks: this._identifyMigrationRisks(analysis, timeline),
        mitigation: this._planRiskMitigation(),
        fallback: this._designFallbackStrategies()
      },
      
      coexistence: {
        interoperability: this._designInteroperability(),
        dataSync: this._planDataSynchronization(),
        featureFlags: this._designFeatureToggles()
      }
    };
    
    return {
      architecture: brownfieldArchitecture,
      summary: `Created brownfield modernization architecture with ${brownfieldArchitecture.migrationStrategy.phases.length} phases`
    };
  }

  async _documentProjectArchitecture(input) {
    const { projectPath, depth = 'comprehensive' } = input;
    
    // Analyze project structure
    const structure = await this._analyzeProjectStructure(projectPath);
    
    const documentation = {
      title: `Architecture Documentation: ${path.basename(projectPath)}`,
      analyzedAt: new Date().toISOString(),
      analyzedBy: this.name,
      
      overview: {
        projectType: this._identifyProjectType(structure),
        architectureStyle: this._identifyArchitectureStyle(structure),
        technologyStack: this._extractTechnologyStack(structure)
      },
      
      structure: {
        layers: this._identifyLayers(structure),
        modules: this._identifyModules(structure),
        components: this._identifyComponents(structure),
        dependencies: this._analyzeDependencies(structure)
      },
      
      patterns: {
        architectural: this._identifyArchitecturalPatterns(structure),
        design: this._identifyDesignPatterns(structure),
        antiPatterns: this._identifyAntiPatterns(structure)
      },
      
      dataFlow: {
        flow: this._traceDataFlow(structure),
        stores: this._identifyDataStores(structure),
        transformations: this._identifyTransformations(structure)
      },
      
      quality: {
        modularity: this._assessModularity(structure),
        coupling: this._assessCoupling(structure),
        cohesion: this._assessCohesion(structure),
        complexity: this._assessComplexity(structure)
      },
      
      recommendations: this._generateArchitectureRecommendations(structure)
    };
    
    return {
      documentation,
      summary: `Documented architecture for ${path.basename(projectPath)}`
    };
  }

  async _performTechnologySelection(input) {
    const {
      requirements,
      constraints,
      teamExpertise,
      timeline
    } = input;
    
    const selection = {
      criteria: this._defineTechnologyCriteria(requirements, constraints),
      
      frontend: {
        framework: this._evaluateFrontendFrameworks(requirements, teamExpertise),
        stateManagement: this._evaluateStateManagementSolutions(requirements),
        buildTools: this._evaluateBuildTools(timeline),
        testing: this._evaluateFrontendTestingTools()
      },
      
      backend: {
        language: this._evaluateBackendLanguages(requirements, teamExpertise),
        framework: this._evaluateBackendFrameworks(requirements),
        database: this._evaluateDatabases(requirements),
        caching: this._evaluateCachingSolutions(requirements)
      },
      
      infrastructure: {
        cloud: this._evaluateCloudProviders(constraints),
        containerization: this._evaluateContainerization(teamExpertise),
        orchestration: this._evaluateOrchestration(requirements),
        cicd: this._evaluateCICDTools(teamExpertise)
      },
      
      recommendations: this._generateTechnologyRecommendations(requirements, constraints, teamExpertise),
      
      alternativeStacks: this._proposeAlternativeStacks(requirements)
    };
    
    return {
      selection,
      summary: `Technology selection completed with recommendations for ${Object.keys(selection.recommendations).length} categories`
    };
  }

  async _designAPIs(input) {
    const {
      requirements,
      style = 'REST',
      versioning = 'url',
      authentication
    } = input;
    
    const apiDesign = {
      overview: {
        style,
        versioning,
        baseUrl: this._defineBaseUrl(requirements),
        authentication: authentication || 'JWT'
      },
      
      resources: this._defineAPIResources(requirements),
      
      endpoints: this._designEndpoints(requirements),
      
      dataModels: this._defineAPIDataModels(requirements),
      
      requestResponse: {
        formats: this._defineRequestFormats(),
        responses: this._defineResponseFormats(),
        errors: this._defineErrorFormats()
      },
      
      security: {
        authentication: this._designAPIAuthentication(authentication),
        authorization: this._designAPIAuthorization(requirements),
        rateLimiting: this._designRateLimiting(),
        cors: this._designCORSPolicy()
      },
      
      documentation: {
        openapi: this._generateOpenAPISpec(requirements),
        examples: this._generateAPIExamples(requirements)
      }
    };
    
    return {
      apiDesign,
      summary: `Designed ${style} API with ${apiDesign.endpoints.length} endpoints`
    };
  }

  async _planInfrastructure(input) {
    const {
      requirements,
      budget,
      scalability,
      regions
    } = input;
    
    const infrastructure = {
      overview: {
        approach: this._selectInfrastructureApproach(requirements, budget),
        primaryRegion: regions[0] || 'us-east-1',
        multiRegion: regions.length > 1
      },
      
      compute: {
        type: this._selectComputeType(requirements, scalability),
        sizing: this._calculateComputeSizing(requirements),
        scaling: this._designAutoScaling(scalability)
      },
      
      storage: {
        database: this._planDatabaseInfrastructure(requirements),
        fileStorage: this._planFileStorage(requirements),
        caching: this._planCachingInfrastructure(requirements)
      },
      
      networking: {
        architecture: this._designNetworkArchitecture(regions),
        loadBalancing: this._planLoadBalancing(scalability),
        cdn: this._planCDN(regions),
        security: this._planNetworkSecurity()
      },
      
      security: {
        identity: this._planIdentityManagement(),
        secrets: this._planSecretsManagement(),
        compliance: this._planComplianceRequirements(),
        backup: this._planBackupStrategy()
      },
      
      monitoring: {
        metrics: this._planMetricsCollection(),
        logging: this._planCentralizedLogging(),
        alerting: this._planAlertingStrategy(),
        dashboards: this._planDashboards()
      },
      
      disaster: {
        recovery: this._planDisasterRecovery(),
        backups: this._planBackupStrategy(),
        failover: this._planFailoverStrategy()
      },
      
      cost: {
        estimate: this._estimateInfrastructureCosts(requirements, budget),
        optimization: this._planCostOptimization()
      }
    };
    
    return {
      infrastructure,
      summary: `Planned infrastructure for ${regions.length} regions with estimated cost of ${infrastructure.cost.estimate}`
    };
  }

  // Helper methods
  async _loadPRD(prdPath) {
    const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: prdPath });
    return typeof content === 'string' ? JSON.parse(content) : content;
  }

  _generateArchitectureOverview(projectName, requirements) {
    return `Architecture for ${projectName} designed to support ${requirements.length} key requirements with focus on scalability, maintainability, and developer productivity.`;
  }

  _documentKeyDecisions(requirements, constraints) {
    return [
      { decision: 'Microservices vs Monolith', choice: 'Modular Monolith', rationale: 'Balance complexity with team size' },
      { decision: 'Database Selection', choice: 'PostgreSQL + Redis', rationale: 'Proven reliability and performance' },
      { decision: 'Frontend Framework', choice: 'React + TypeScript', rationale: 'Type safety and ecosystem maturity' }
    ];
  }

  _analyzeTradeoffs(constraints, timeline) {
    return [
      { tradeoff: 'Time to Market vs Perfect Architecture', choice: 'Iterative improvement', impact: 'Faster delivery' },
      { tradeoff: 'Cost vs Performance', choice: 'Start small, scale as needed', impact: 'Lower initial cost' }
    ];
  }

  _defineSystemLayers() {
    return [
      { name: 'Presentation Layer', responsibility: 'User interface and interaction' },
      { name: 'Application Layer', responsibility: 'Business logic and orchestration' },
      { name: 'Domain Layer', responsibility: 'Core business rules and entities' },
      { name: 'Infrastructure Layer', responsibility: 'External services and persistence' }
    ];
  }

  _defineComponents(requirements) {
    return [
      { name: 'Web Application', type: 'frontend', technology: 'React' },
      { name: 'API Gateway', type: 'backend', technology: 'Node.js' },
      { name: 'Core Services', type: 'backend', technology: 'Node.js' },
      { name: 'Database', type: 'data', technology: 'PostgreSQL' },
      { name: 'Cache', type: 'data', technology: 'Redis' }
    ];
  }

  _designDataFlow(requirements) {
    return {
      ingress: 'Client → CDN → Load Balancer → API Gateway',
      processing: 'API Gateway → Services → Database',
      egress: 'Database → Services → API Gateway → Client'
    };
  }

  _identifyIntegrations(requirements) {
    return [
      { service: 'Authentication Provider', type: 'OAuth2', purpose: 'User authentication' },
      { service: 'Payment Gateway', type: 'REST API', purpose: 'Payment processing' },
      { service: 'Email Service', type: 'SMTP/API', purpose: 'Notifications' }
    ];
  }

  _selectFrontendFramework(requirements, teamSize) {
    // Logic to select framework based on requirements
    if (requirements.some(r => r.includes('real-time'))) {
      return { framework: 'React', reason: 'Best real-time support with ecosystem' };
    }
    if (teamSize < 5) {
      return { framework: 'Vue.js', reason: 'Easier learning curve for small teams' };
    }
    return { framework: 'React', reason: 'Large ecosystem and community support' };
  }

  _designFrontendArchitecture(requirements) {
    return {
      pattern: 'Component-based with Container/Presenter pattern',
      stateManagement: 'Redux Toolkit for complex state, Context for simple state',
      routing: 'React Router with lazy loading',
      styling: 'CSS Modules with Tailwind utilities'
    };
  }

  _designStateManagement(requirements) {
    return {
      approach: 'Hybrid approach with global and local state',
      global: 'Redux Toolkit for app-wide state',
      local: 'React hooks for component state',
      async: 'RTK Query for server state',
      persistence: 'Redux Persist for offline support'
    };
  }

  _planUIComponents(requirements) {
    return {
      designSystem: 'Custom design system based on Material Design principles',
      components: ['Button', 'Form', 'Table', 'Modal', 'Navigation'],
      accessibility: 'WCAG 2.1 AA compliance',
      responsive: 'Mobile-first responsive design'
    };
  }

  _planFrontendPerformance() {
    return {
      bundling: 'Webpack 5 with code splitting',
      optimization: 'Tree shaking, minification, compression',
      lazy: 'Route-based code splitting',
      caching: 'Service worker for offline support',
      monitoring: 'Web Vitals tracking'
    };
  }

  _selectBackendFramework(requirements, teamSize) {
    return {
      framework: 'Express.js with TypeScript',
      reason: 'Mature, flexible, great TypeScript support'
    };
  }

  _designBackendArchitecture(requirements) {
    return {
      pattern: 'Layered architecture with dependency injection',
      layers: ['Controllers', 'Services', 'Repositories', 'Models'],
      middleware: ['Authentication', 'Validation', 'Error handling', 'Logging']
    };
  }

  _designAPIArchitecture(requirements) {
    return {
      style: 'RESTful with some GraphQL endpoints',
      versioning: 'URL versioning (/api/v1)',
      documentation: 'OpenAPI 3.0 specification',
      testing: 'Contract testing with Pact'
    };
  }

  _designDataModels(requirements) {
    return {
      approach: 'Domain-driven design',
      orm: 'TypeORM for type safety',
      validation: 'Class-validator for model validation',
      migrations: 'TypeORM migrations with version control'
    };
  }

  _defineServices(requirements) {
    return [
      { name: 'UserService', responsibility: 'User management and authentication' },
      { name: 'ProductService', responsibility: 'Product catalog and inventory' },
      { name: 'OrderService', responsibility: 'Order processing and fulfillment' },
      { name: 'NotificationService', responsibility: 'Email and push notifications' }
    ];
  }

  _selectDatabase(requirements) {
    return {
      primary: 'PostgreSQL for ACID compliance and complex queries',
      secondary: 'Redis for caching and sessions',
      search: 'Elasticsearch for full-text search'
    };
  }

  _designDatabaseSchema(requirements) {
    return {
      approach: 'Normalized design with strategic denormalization',
      naming: 'Snake_case with singular table names',
      indexing: 'Index foreign keys and frequently queried columns',
      partitioning: 'Time-based partitioning for large tables'
    };
  }

  _planDatabaseScaling(requirements) {
    return {
      vertical: 'Start with vertical scaling to 16GB RAM',
      horizontal: 'Read replicas for read-heavy workloads',
      sharding: 'Shard by tenant for multi-tenant requirements'
    };
  }

  _designBackupStrategy() {
    return {
      frequency: 'Daily full backups, hourly incrementals',
      retention: '30 days for daily, 7 days for hourly',
      testing: 'Monthly restore tests',
      location: 'Cross-region backup storage'
    };
  }

  _designDeploymentArchitecture(constraints) {
    return {
      strategy: 'Blue-green deployment with canary releases',
      platform: 'Kubernetes for container orchestration',
      registry: 'Private container registry',
      automation: 'GitOps with ArgoCD'
    };
  }

  _designScalingStrategy(requirements) {
    return {
      horizontal: 'Auto-scaling based on CPU and memory',
      vertical: 'Manual scaling for database',
      geographic: 'Multi-region deployment for global users'
    };
  }

  _designMonitoringStrategy() {
    return {
      metrics: 'Prometheus for metrics collection',
      logs: 'ELK stack for centralized logging',
      traces: 'Jaeger for distributed tracing',
      dashboards: 'Grafana for visualization'
    };
  }

  _designSecurityArchitecture() {
    return {
      network: 'Zero-trust network model',
      application: 'OWASP Top 10 mitigation',
      data: 'Encryption at rest and in transit',
      compliance: 'SOC2 and GDPR compliance'
    };
  }

  _designAuthArchitecture(requirements) {
    return {
      provider: 'Auth0 for flexibility',
      methods: ['Email/Password', 'Social login', 'SSO'],
      mfa: 'TOTP-based 2FA',
      sessions: 'JWT with refresh tokens'
    };
  }

  _designAuthorizationModel(requirements) {
    return {
      model: 'Role-based access control (RBAC)',
      roles: ['Admin', 'User', 'Guest'],
      permissions: 'Fine-grained permissions per resource',
      enforcement: 'Middleware-based enforcement'
    };
  }

  _designLoggingStrategy() {
    return {
      levels: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
      format: 'JSON structured logging',
      correlation: 'Request ID for tracing',
      retention: '30 days hot, 1 year cold storage'
    };
  }

  _designErrorHandling() {
    return {
      strategy: 'Centralized error handling',
      classification: 'Business vs Technical errors',
      responses: 'Consistent error format',
      recovery: 'Graceful degradation'
    };
  }

  _designCachingStrategy() {
    return {
      levels: ['CDN', 'Application', 'Database'],
      ttl: 'Content-based TTL strategy',
      invalidation: 'Event-based cache invalidation',
      warming: 'Proactive cache warming for critical data'
    };
  }

  _designCICDPipeline(teamSize) {
    return {
      vcs: 'Git with GitHub',
      ci: 'GitHub Actions for CI',
      cd: 'ArgoCD for GitOps deployment',
      stages: ['Lint', 'Test', 'Build', 'Deploy']
    };
  }

  _designTestingStrategy() {
    return {
      unit: '80% coverage target',
      integration: 'API contract testing',
      e2e: 'Critical user journeys',
      performance: 'Load testing before release'
    };
  }

  _planDocumentation() {
    return {
      api: 'Auto-generated from OpenAPI spec',
      architecture: 'C4 model diagrams',
      runbooks: 'Operational procedures',
      onboarding: 'Developer quickstart guide'
    };
  }

  _designDevEnvironment(teamSize) {
    return {
      local: 'Docker Compose for local development',
      ide: 'VS Code with recommended extensions',
      tools: 'Standardized toolchain',
      setup: 'Automated setup script'
    };
  }

  _definePerformanceTargets(requirements) {
    return {
      responseTime: '< 200ms p95',
      throughput: '1000 requests/second',
      availability: '99.9% uptime',
      errorRate: '< 0.1%'
    };
  }

  _documentSecurityConsiderations(requirements) {
    return [
      'Implement principle of least privilege',
      'Regular security audits and penetration testing',
      'Dependency scanning in CI pipeline',
      'Security headers and CSP implementation'
    ];
  }

  _estimateCosts(infrastructure, teamSize) {
    return {
      infrastructure: '$500-1000/month initial',
      scaling: '$100/month per 100K users',
      development: `${teamSize * 160} hours/month`,
      tools: '$200/month for monitoring and CI/CD'
    };
  }

  _createMigrationPlan(timeline) {
    return {
      phases: this._defineMigrationPhases(timeline),
      milestones: this._defineMilestones(timeline),
      checkpoints: this._defineCheckpoints(),
      rollback: this._defineRollbackPlan()
    };
  }

  _identifyAndMitigateRisks(constraints) {
    return [
      { risk: 'Technology lock-in', mitigation: 'Use standard interfaces' },
      { risk: 'Scaling bottlenecks', mitigation: 'Design for horizontal scaling' },
      { risk: 'Security vulnerabilities', mitigation: 'Regular security audits' }
    ];
  }

  async _saveArchitecture(projectName, architecture) {
    const filename = `${projectName.toLowerCase().replace(/\s+/g, '-')}-architecture.json`;
    const outputPath = path.join(
      this.contextManager.baseDir,
      '..',
      'output',
      'architectures',
      filename
    );
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: outputPath,
      content: JSON.stringify(architecture, null, 2)
    });
    
    return outputPath;
  }

  async _generateArchitectureDiagrams(architecture) {
    // Generate PlantUML or Mermaid diagrams
    return {
      systemContext: 'C4 Context diagram',
      container: 'C4 Container diagram',
      deployment: 'Deployment diagram',
      dataFlow: 'Data flow diagram'
    };
  }

  // Additional helper methods would be implemented similarly...
  _defineBackendObjectives(apiRequirements) {
    return ['Scalable API design', 'Efficient data processing', 'Secure service architecture'];
  }

  _selectAPIStyle(apiRequirements) {
    if (apiRequirements.some(r => r.includes('real-time'))) return 'GraphQL Subscriptions';
    if (apiRequirements.some(r => r.includes('complex queries'))) return 'GraphQL';
    return 'REST';
  }

  _designAPILayer(apiRequirements) {
    return {
      endpoints: apiRequirements.map(req => this._createEndpointFromRequirement(req)),
      middleware: ['Authentication', 'Rate limiting', 'Validation', 'CORS'],
      errorHandling: 'Consistent error responses with proper HTTP codes'
    };
  }

  _createEndpointFromRequirement(requirement) {
    return {
      method: 'GET',
      path: `/api/v1/${requirement.toLowerCase().replace(/\s+/g, '-')}`,
      description: requirement
    };
  }

  _defineMigrationPhases(timeline) {
    const phases = [];
    const weeklyPhases = Math.ceil(timeline / 7);
    
    for (let i = 0; i < weeklyPhases; i++) {
      phases.push({
        phase: i + 1,
        duration: '1 week',
        focus: this._getPhaseFocus(i)
      });
    }
    
    return phases;
  }

  _getPhaseFocus(phaseIndex) {
    const focuses = ['Foundation', 'Core Features', 'Integration', 'Testing', 'Deployment'];
    return focuses[phaseIndex % focuses.length];
  }

  _defineMilestones(timeline) {
    return [
      { milestone: 'Architecture Complete', day: 5 },
      { milestone: 'MVP Ready', day: Math.floor(timeline * 0.6) },
      { milestone: 'Production Ready', day: timeline }
    ];
  }

  _defineCheckpoints() {
    return ['Architecture Review', 'Security Audit', 'Performance Testing', 'User Acceptance'];
  }

  _defineRollbackPlan() {
    return {
      trigger: 'Critical failure in production',
      steps: ['Stop deployment', 'Revert to previous version', 'Analyze failure', 'Fix and retry']
    };
  }

  async _analyzeExistingArchitecture(projectPath) {
    // Simulate architecture analysis
    return {
      style: 'Monolithic',
      patterns: ['MVC', 'Repository'],
      issues: ['Tight coupling', 'No clear boundaries', 'Mixed concerns']
    };
  }

  async _analyzeProjectStructure(projectPath) {
    // Use Glob and Read tools to analyze structure
    return {
      files: 500,
      directories: 50,
      languages: ['JavaScript', 'TypeScript'],
      frameworks: ['Express', 'React']
    };
  }

  _identifyProjectType(structure) {
    if (structure.frameworks.includes('React')) return 'Full-stack web application';
    if (structure.frameworks.includes('Express')) return 'API service';
    return 'Unknown';
  }

  _identifyArchitectureStyle(structure) {
    if (structure.directories > 20) return 'Microservices';
    return 'Monolithic';
  }

  _extractTechnologyStack(structure) {
    return {
      frontend: structure.frameworks.filter(f => ['React', 'Vue', 'Angular'].includes(f)),
      backend: structure.frameworks.filter(f => ['Express', 'Fastify', 'NestJS'].includes(f)),
      database: ['PostgreSQL'], // Would be detected from config files
      infrastructure: ['Docker', 'Kubernetes'] // Would be detected from config files
    };
  }
}