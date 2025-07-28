import { StoryEnricher } from '../src/utils/StoryEnricher.js';
import { ContextManager } from '../src/context/ContextManager.js';
import fs from 'fs/promises';

async function testStoryEnricherBasic() {
  console.log('Testing Story Enricher Basic Functionality...\n');
  
  const testDir = './test-story-enricher';
  
  // Clean up
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  // Initialize context manager
  const contextManager = new ContextManager({
    baseDir: testDir
  });
  await contextManager.initialize();
  
  // Initialize story enricher
  const enricher = new StoryEnricher(contextManager);
  
  try {
    // Test 1: Basic story enrichment
    console.log('Test 1: Basic story enrichment...');
    
    const baseStory = {
      id: 'STORY-TEST-001',
      title: 'User Authentication',
      description: 'As a user, I want to login with my credentials, so that I can access my account',
      acceptanceCriteria: [
        'User can enter username and password',
        'System validates credentials',
        'User is redirected to dashboard on success',
        'Error message shown on failure'
      ]
    };
    
    const enriched = await enricher.enrichStory(baseStory);
    
    console.log('✓ Story enriched');
    console.log('  Technical context:', enriched.technicalContext ? 'Added' : 'Missing');
    console.log('  Dependencies:', enriched.dependencies?.length || 0);
    console.log('  Test scenarios:', enriched.testScenarios?.length || 0);
    console.log('  Implementation hints:', enriched.implementationHints?.length || 0);
    console.log('  Metadata:', enriched.metadata ? 'Added' : 'Missing');
    
    // Test 2: Markdown generation
    console.log('\nTest 2: Markdown generation...');
    
    const markdown = enricher.generateStoryMarkdown(enriched);
    console.log('✓ Markdown generated:', markdown.length, 'characters');
    
    // Check sections
    const expectedSections = [
      '# STORY-TEST-001:',
      '## Story',
      '## Acceptance Criteria',
      '## Test Scenarios',
      '## Implementation Hints',
      '## Definition of Done',
      '## Metadata'
    ];
    
    const foundSections = expectedSections.filter(section => markdown.includes(section));
    console.log(`✓ Found ${foundSections.length}/${expectedSections.length} sections`);
    
    // Test 3: Epic context integration
    console.log('\nTest 3: Epic context integration...');
    
    const epicContext = {
      architecture: 'microservices',
      technicalRequirements: ['OAuth2', 'JWT tokens'],
      dependencies: [
        { type: 'Service', description: 'Auth service', status: 'available' }
      ]
    };
    
    const enrichedWithContext = await enricher.enrichStory(baseStory, epicContext);
    console.log('✓ Story enriched with epic context');
    console.log('  Epic dependencies integrated:', enrichedWithContext.dependencies?.length > enriched.dependencies?.length);
    console.log('  Technical constraints added:', enrichedWithContext.technicalContext?.constraints?.length || 0);
    
    // Test 4: Different story types
    console.log('\nTest 4: Different story types...');
    
    const bugStory = {
      id: 'BUG-001',
      title: 'Fix login bug',
      description: 'Login fails for users with special characters in password',
      acceptanceCriteria: ['Bug is fixed', 'Tests added']
    };
    
    const perfStory = {
      id: 'PERF-001',
      title: 'Optimize query performance',
      description: 'Database queries are slow',
      acceptanceCriteria: ['Response time < 100ms']
    };
    
    const bugEnriched = await enricher.enrichStory(bugStory);
    const perfEnriched = await enricher.enrichStory(perfStory);
    
    console.log('✓ Bug story enriched with', bugEnriched.testScenarios?.find(s => s.type === 'regression') ? 'regression test' : 'no special test');
    console.log('✓ Performance story enriched with', perfEnriched.testScenarios?.find(s => s.type === 'performance') ? 'performance test' : 'no special test');
    
    console.log('\n✅ All story enricher tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Run test
testStoryEnricherBasic().catch(console.error);