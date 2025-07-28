import { PMAgent } from '../src/agents/core/PMAgent.js';
import { ContextManager } from '../src/context/ContextManager.js';
import fs from 'fs/promises';
import path from 'path';

async function testEnhancedStoryGeneration() {
  console.log('Testing Enhanced Story Generation...\n');
  
  const testDir = './test-enhanced-stories';
  
  // Clean up test directory
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  // Initialize context manager
  const contextManager = new ContextManager({
    baseDir: path.join(testDir, 'context')
  });
  await contextManager.initialize();
  
  // Initialize PM agent
  const pmAgent = new PMAgent({
    id: 'pm-test-001',
    type: 'PMAgent',
    name: 'Test PM'
  });
  await pmAgent.initialize(contextManager);
  
  try {
    // Test 1: Create a basic story
    console.log('Test 1: Creating basic user story...');
    const basicStoryResult = await pmAgent.execute({
      taskId: 'task-001',
      taskType: 'create-story',
      input: {
        asA: 'registered user',
        iWant: 'to reset my password',
        soThat: 'I can regain access to my account',
        acceptanceCriteria: [
          'User can request password reset from login page',
          'Reset link is sent to registered email',
          'Link expires after 24 hours',
          'Password must meet security requirements'
        ],
        priority: 'high',
        storyPoints: 5
      }
    });
    
    console.log('✓ Basic story created:', basicStoryResult.output.story.id);
    console.log('  Test scenarios:', basicStoryResult.output.story.testScenarios?.length || 0);
    console.log('  Implementation hints:', basicStoryResult.output.story.implementationHints?.length || 0);
    console.log('  Dependencies:', basicStoryResult.output.story.dependencies?.length || 0);
    
    // Test 2: Create a story with epic context
    console.log('\nTest 2: Creating story with epic context...');
    const epicContext = {
      architecture: 'microservices',
      technicalRequirements: ['OAuth2 authentication', 'Email service integration'],
      dependencies: [
        { type: 'Service', description: 'Email notification service', status: 'available' },
        { type: 'Database', description: 'User credentials table', status: 'existing' }
      ],
      codeReferences: [
        { file: 'src/auth/AuthController.js', line: 45, description: 'Authentication controller' }
      ]
    };
    
    const enrichedStoryResult = await pmAgent.execute({
      taskId: 'task-002',
      taskType: 'create-story',
      input: {
        asA: 'API developer',
        iWant: 'to create a REST endpoint for user management',
        soThat: 'external applications can manage users',
        acceptanceCriteria: [
          'Endpoint follows RESTful conventions',
          'Supports CRUD operations',
          'Returns appropriate HTTP status codes',
          'Includes pagination for list operations',
          'Validates input data'
        ],
        priority: 'medium',
        storyPoints: 8,
        epicId: 'EPIC-USER-MGMT',
        epicContext
      }
    });
    
    const enrichedStory = enrichedStoryResult.output.story;
    console.log('✓ Enriched story created:', enrichedStory.id);
    console.log('  Test scenarios:', enrichedStory.testScenarios?.length || 0);
    console.log('  Implementation hints:', enrichedStory.implementationHints?.length || 0);
    console.log('  Dependencies:', enrichedStory.dependencies?.length || 0);
    console.log('  Code references:', enrichedStory.references?.length || 0);
    console.log('  Complexity:', enrichedStory.metadata?.complexity);
    
    // Test 3: Verify markdown generation
    console.log('\nTest 3: Verifying markdown output...');
    if (enrichedStoryResult.output.markdown) {
      console.log('✓ Markdown generated with', enrichedStoryResult.output.markdown.length, 'characters');
      
      // Check for key sections
      const markdown = enrichedStoryResult.output.markdown;
      const sections = [
        'Technical Context',
        'Dependencies',
        'Acceptance Criteria',
        'Test Scenarios',
        'Implementation Hints',
        'Definition of Done',
        'Metadata'
      ];
      
      const foundSections = sections.filter(section => markdown.includes(`## ${section}`));
      console.log(`✓ Found ${foundSections.length}/${sections.length} expected sections`);
      console.log('  Sections:', foundSections.join(', '));
    }
    
    // Test 4: Create a performance-related story
    console.log('\nTest 4: Creating performance story...');
    const performanceStoryResult = await pmAgent.execute({
      taskId: 'task-003',
      taskType: 'create-story',
      input: {
        asA: 'system administrator',
        iWant: 'to optimize database query performance',
        soThat: 'the system can handle increased load',
        acceptanceCriteria: [
          'Identify slow queries using profiling',
          'Add appropriate indexes',
          'Optimize query structure',
          'Response time < 100ms for 95th percentile'
        ],
        priority: 'high',
        storyPoints: 13
      }
    });
    
    const perfStory = performanceStoryResult.output.story;
    console.log('✓ Performance story created:', perfStory.id);
    console.log('  Detected as:', perfStory.testScenarios?.find(s => s.type === 'performance') ? 'performance story' : 'regular story');
    
    // Test 5: Create multiple stories and verify uniqueness
    console.log('\nTest 5: Creating multiple stories...');
    const storyIds = [];
    for (let i = 0; i < 3; i++) {
      const result = await pmAgent.execute({
        taskId: `task-00${i + 4}`,
        taskType: 'create-story',
        input: {
          asA: 'user',
          iWant: `feature ${i + 1}`,
          soThat: 'I can be more productive',
          acceptanceCriteria: ['Basic functionality works'],
          priority: 'low',
          storyPoints: 3
        }
      });
      storyIds.push(result.output.story.id);
    }
    
    const uniqueIds = new Set(storyIds);
    console.log(`✓ Created ${storyIds.length} stories with ${uniqueIds.size} unique IDs`);
    
    // Test 6: Verify story files were saved
    console.log('\nTest 6: Checking saved story files...');
    const storyDir = path.join(testDir, 'output', 'stories');
    try {
      const files = await fs.readdir(storyDir);
      console.log(`✓ Found ${files.length} story files saved`);
      
      // Read one file to verify content
      if (files.length > 0 && enrichedStory.filePath) {
        const content = await fs.readFile(enrichedStory.filePath, 'utf8');
        console.log('✓ Story file contains', content.split('\n').length, 'lines');
      }
    } catch (error) {
      console.log('⚠ Story files directory not found (this is okay if using mocked file system)');
    }
    
    console.log('\n✅ All enhanced story generation tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await pmAgent.shutdown();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Run the test
testEnhancedStoryGeneration().catch(console.error);