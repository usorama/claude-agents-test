#!/usr/bin/env node

/**
 * Test Enhanced Story File Generation (IMP-003)
 * Tests technical context, dependency mapping, test scenarios, and implementation hints
 */

import { StoryEnricher } from './src/utils/StoryEnricher.js';
import { ContextManager } from './src/context/ContextManager.js';
import { ContextLevel } from './src/types/context.types.v2.js';
import fs from 'fs/promises';

const testDir = './test-enhanced-story-generation';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testEnhancedStoryGeneration() {
  console.log('🧪 Testing Enhanced Story File Generation (IMP-003)...\n');

  await cleanup();

  // Initialize context manager
  const contextManager = new ContextManager({
    baseDir: testDir,
    logLevel: 'warn'
  });
  await contextManager.initialize();

  // Initialize story enricher
  const enricher = new StoryEnricher(contextManager, {
    includeCodeReferences: true,
    generateTestScenarios: true,
    complexityThresholds: {
      simple: 3,
      medium: 8,
      complex: 13
    },
    logLevel: 'debug'
  });

  console.log('✅ Story enricher initialized with full configuration\n');

  // Create mock project context
  const projectContext = await contextManager.createContext(ContextLevel.PROJECT, {
    projectName: 'E-commerce Platform',
    projectPath: './e-commerce',
    config: {
      technology: 'Node.js',
      framework: 'Express',
      database: 'PostgreSQL'
    },
    architecture: {
      style: 'microservices',
      components: ['user-service', 'product-service', 'order-service'],
      patterns: ['event-driven', 'api-gateway']
    },
    requirements: {
      performance: {
        responseTime: '150ms',
        concurrentUsers: 500,
        throughput: '1000 requests/sec'
      },
      security: {
        authentication: 'JWT',
        authorization: 'RBAC',
        encryption: 'TLS 1.3'
      }
    }
  });

  console.log('✅ Created project context with comprehensive technical details\n');

  // Test 1: Simple CRUD story
  console.log('📊 Test 1: Simple CRUD story enrichment');
  
  const crudStory = {
    id: 'STORY-001',
    title: 'Create user registration API',
    description: 'As a new user, I want to register an account so that I can access the platform.',
    acceptanceCriteria: [
      'Given valid user data, when I submit registration, then account is created',
      'Given existing email, when I register, then error message is shown',
      'Given invalid email format, when I register, then validation error occurs'
    ]
  };

  const enrichedCrud = await enricher.enrichStory(crudStory, {
    technicalRequirements: ['user-service', 'database-migration'],
    codeReferences: [
      { file: 'src/services/UserService.js', line: 25, description: 'User service base class' }
    ]
  });

  console.log(`✅ CRUD story enriched with ${Object.keys(enrichedCrud).length} sections`);
  console.log(`Dependencies found: ${enrichedCrud.dependencies?.length || 0}`);
  console.log(`Test scenarios generated: ${enrichedCrud.testScenarios?.length || 0}`);
  console.log(`Implementation hints: ${enrichedCrud.implementationHints?.length || 0}`);
  console.log(`Complexity: ${enrichedCrud.metadata?.complexity}`);

  // Test 2: Complex integration story
  console.log('\n📊 Test 2: Complex integration story enrichment');

  const integrationStory = {
    id: 'STORY-002',
    title: 'Implement payment processing with external gateway',
    description: 'As a customer, I want to process payments securely through multiple payment providers so that I can complete purchases with my preferred method.',
    acceptanceCriteria: [
      'Given valid payment details, when payment is processed, then transaction is completed',
      'Given payment provider failure, when payment is attempted, then fallback provider is used',
      'Given insufficient funds, when payment is processed, then appropriate error is returned',
      'Given payment timeout, when processing, then user is notified and transaction is retried'
    ]
  };

  const enrichedIntegration = await enricher.enrichStory(integrationStory, {
    technicalRequirements: ['payment-service', 'webhook-handling', 'encryption'],
    dependencies: [
      { type: 'External API', description: 'Stripe API integration', status: 'pending' },
      { type: 'External API', description: 'PayPal API integration', status: 'pending' }
    ],
    architecture: 'microservices'
  });

  console.log(`✅ Integration story enriched with ${Object.keys(enrichedIntegration).length} sections`);
  console.log(`Dependencies found: ${enrichedIntegration.dependencies?.length || 0}`);
  console.log(`Test scenarios generated: ${enrichedIntegration.testScenarios?.length || 0}`);
  console.log(`Implementation hints: ${enrichedIntegration.implementationHints?.length || 0}`);
  console.log(`Complexity: ${enrichedIntegration.metadata?.complexity}`);

  // Test 3: UI component story
  console.log('\n📊 Test 3: UI component story enrichment');

  const uiStory = {
    id: 'STORY-003',
    title: 'Create responsive product catalog component',
    description: 'As a user, I want to browse products in a responsive grid layout so that I can easily find items on any device.',
    acceptanceCriteria: [
      'Given mobile device, when viewing catalog, then grid adapts to screen size',
      'Given desktop browser, when viewing catalog, then optimal grid layout is shown',
      'Given product search, when results are filtered, then grid updates smoothly'
    ]
  };

  const enrichedUI = await enricher.enrichStory(uiStory, {
    technicalRequirements: ['responsive-design', 'component-library']
  });

  console.log(`✅ UI story enriched with ${Object.keys(enrichedUI).length} sections`);
  console.log(`Dependencies found: ${enrichedUI.dependencies?.length || 0}`);
  console.log(`Test scenarios generated: ${enrichedUI.testScenarios?.length || 0}`);
  console.log(`Implementation hints: ${enrichedUI.implementationHints?.length || 0}`);
  console.log(`Complexity: ${enrichedUI.metadata?.complexity}`);

  // Test 4: Performance optimization story
  console.log('\n📊 Test 4: Performance optimization story enrichment');

  const performanceStory = {
    id: 'STORY-004',
    title: 'Optimize database query performance for product search',
    description: 'As a system, I need to handle product search queries under 100ms so that users have a fast search experience.',
    acceptanceCriteria: [
      'Given product search query, when executed, then response time is under 100ms',
      'Given 1000 concurrent searches, when system is under load, then performance is maintained',
      'Given complex search filters, when applied, then results are returned efficiently'
    ]
  };

  const enrichedPerformance = await enricher.enrichStory(performanceStory);

  console.log(`✅ Performance story enriched with ${Object.keys(enrichedPerformance).length} sections`);
  console.log(`Dependencies found: ${enrichedPerformance.dependencies?.length || 0}`);
  console.log(`Test scenarios generated: ${enrichedPerformance.testScenarios?.length || 0}`);
  console.log(`Implementation hints: ${enrichedPerformance.implementationHints?.length || 0}`);
  console.log(`Complexity: ${enrichedPerformance.metadata?.complexity}`);

  // Test 5: Bug fix story
  console.log('\n📊 Test 5: Bug fix story enrichment');

  const bugStory = {
    id: 'STORY-005',
    title: 'Fix cart total calculation error',
    description: 'As a customer, I need the shopping cart total to calculate correctly so that I am charged the right amount.',
    acceptanceCriteria: [
      'Given items in cart, when total is calculated, then amount matches sum of item prices',
      'Given discount codes, when applied, then total reflects correct discount',
      'Given tax calculation, when applicable, then tax is added correctly'
    ]
  };

  const enrichedBug = await enricher.enrichStory(bugStory);

  console.log(`✅ Bug fix story enriched with ${Object.keys(enrichedBug).length} sections`);
  console.log(`Dependencies found: ${enrichedBug.dependencies?.length || 0}`);
  console.log(`Test scenarios generated: ${enrichedBug.testScenarios?.length || 0}`);
  console.log(`Implementation hints: ${enrichedBug.implementationHints?.length || 0}`);
  console.log(`Complexity: ${enrichedBug.metadata?.complexity}`);

  // Test 6: Generate markdown output
  console.log('\n📊 Test 6: Markdown generation and formatting');

  const markdownCrud = enricher.generateStoryMarkdown(enrichedCrud);
  const markdownIntegration = enricher.generateStoryMarkdown(enrichedIntegration);

  // Save markdown files for inspection
  await fs.mkdir(`${testDir}/stories`, { recursive: true });
  await fs.writeFile(`${testDir}/stories/STORY-001-crud.md`, markdownCrud);
  await fs.writeFile(`${testDir}/stories/STORY-002-integration.md`, markdownIntegration);

  console.log(`✅ Generated markdown for CRUD story: ${markdownCrud.length} characters`);
  console.log(`✅ Generated markdown for integration story: ${markdownIntegration.length} characters`);

  // Test 7: Complexity assessment
  console.log('\n📊 Test 7: Complexity assessment accuracy');

  const complexityTests = [
    { story: enrichedCrud, expected: 'medium', name: 'CRUD story' },
    { story: enrichedIntegration, expected: 'complex', name: 'Integration story' },
    { story: enrichedUI, expected: 'medium', name: 'UI story' },
    { story: enrichedPerformance, expected: 'medium', name: 'Performance story' },
    { story: enrichedBug, expected: 'simple', name: 'Bug fix' }
  ];

  let correctAssessments = 0;
  complexityTests.forEach(test => {
    const actual = test.story.metadata?.complexity;
    const isCorrect = actual === test.expected;
    console.log(`${isCorrect ? '✅' : '⚠️'} ${test.name}: ${actual} (expected: ${test.expected})`);
    if (isCorrect) correctAssessments++;
  });

  const accuracyPercentage = (correctAssessments / complexityTests.length * 100).toFixed(1);
  console.log(`Complexity assessment accuracy: ${accuracyPercentage}%`);

  // Test 8: Technical context integration
  console.log('\n📊 Test 8: Technical context integration');

  const storiesWithTechContext = [enrichedCrud, enrichedIntegration, enrichedUI, enrichedPerformance];
  let storiesWithArchitecture = 0;
  let storiesWithPerformance = 0;
  let storiesWithSecurity = 0;

  storiesWithTechContext.forEach(story => {
    if (story.technicalContext?.architecture) storiesWithArchitecture++;
    if (story.technicalContext?.performance) storiesWithPerformance++;
    if (story.technicalContext?.security) storiesWithSecurity++;
  });

  console.log(`✅ Stories with architecture context: ${storiesWithArchitecture}/${storiesWithTechContext.length}`);
  console.log(`✅ Stories with performance context: ${storiesWithPerformance}/${storiesWithTechContext.length}`);
  console.log(`✅ Stories with security context: ${storiesWithSecurity}/${storiesWithTechContext.length}`);

  // Test 9: Dependency analysis
  console.log('\n📊 Test 9: Dependency analysis coverage');

  const totalDependencies = storiesWithTechContext.reduce((sum, story) => 
    sum + (story.dependencies?.length || 0), 0);
  
  const dependencyTypes = new Set();
  storiesWithTechContext.forEach(story => {
    story.dependencies?.forEach(dep => dependencyTypes.add(dep.type));
  });

  console.log(`✅ Total dependencies identified: ${totalDependencies}`);
  console.log(`✅ Dependency types found: ${Array.from(dependencyTypes).join(', ')}`);

  console.log('\n🎉 Enhanced Story Generation Tests Complete!');

  return {
    storiesEnriched: 5,
    averageSections: Math.round(storiesWithTechContext.reduce((sum, story) => 
      sum + Object.keys(story).length, 0) / storiesWithTechContext.length),
    totalDependencies,
    uniqueDependencyTypes: dependencyTypes.size,
    complexityAccuracy: parseFloat(accuracyPercentage),
    markdownGenerated: 2,
    techContextCoverage: {
      architecture: storiesWithArchitecture,
      performance: storiesWithPerformance,
      security: storiesWithSecurity
    }
  };
}

// Run tests
testEnhancedStoryGeneration()
  .then(results => {
    console.log('\n📈 Enhanced Story Generation Test Results:');
    console.log('- Stories enriched:', results.storiesEnriched);
    console.log('- Average sections per story:', results.averageSections);
    console.log('- Total dependencies identified:', results.totalDependencies);
    console.log('- Unique dependency types:', results.uniqueDependencyTypes);
    console.log('- Complexity assessment accuracy:', results.complexityAccuracy + '%');
    console.log('- Markdown files generated:', results.markdownGenerated);
    console.log('- Technical context coverage:');
    console.log('  - Architecture:', results.techContextCoverage.architecture);
    console.log('  - Performance:', results.techContextCoverage.performance);
    console.log('  - Security:', results.techContextCoverage.security);
    
    if (results.complexityAccuracy >= 80) {
      console.log('✅ Excellent complexity assessment accuracy!');
    } else if (results.complexityAccuracy >= 60) {
      console.log('✅ Good complexity assessment accuracy!');
    } else {
      console.log('⚠️  Complexity assessment could be improved');
    }

    if (results.averageSections >= 8) {
      console.log('✅ Comprehensive story enrichment achieved!');
    } else {
      console.log('⚠️  Story enrichment could be more comprehensive');
    }
  })
  .catch(error => {
    console.error('❌ Enhanced story generation tests failed:', error);
    process.exit(1);
  });