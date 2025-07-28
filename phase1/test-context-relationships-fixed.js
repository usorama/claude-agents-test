#!/usr/bin/env node

/**
 * IronClaude-S: Context Graph Relationships Testing
 * Tests parent-child relationships and graph navigation
 */

import { ContextManager } from './src/context/ContextManager.js';
import { ContextLevel } from './src/types/context.types.v2.js';

async function testContextRelationships() {
  console.log('🔗 IronClaude-S: Testing Context Graph Relationships\n');

  let allTestsPassed = true;

  // Initialize context manager
  const contextManager = new ContextManager({
    baseDir: './test-context-relationships/context',
    logLevel: 'info'
  });
  await contextManager.initialize();

  // Test 1: Basic Parent-Child Relationship Creation
  console.log('📋 Test 1: Basic Parent-Child Relationship Creation\n');

  try {
    // Create project context (parent)
    const projectContext = await contextManager.createContext(
      ContextLevel.PROJECT,
      {
        projectName: 'Test Project',
        description: 'Testing parent-child relationships'
      }
    );

    console.log(`   ✅ Project context created: ${projectContext.id}`);

    // Create agent context (child)
    const agentContext = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentId: 'test-agent',
        agentType: 'TestAgent',
        capabilities: ['testing']
      },
      projectContext.id  // Set parent
    );

    console.log(`   ✅ Agent context created: ${agentContext.id} (parent: ${projectContext.id})`);

    // Create task context (child of project)
    const taskContext = await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId: 'test-task',
        taskType: 'relationship-test',
        input: { testData: 'Parent-child relationship test' },
        status: 'completed'
      },
      projectContext.id  // Set parent
    );

    console.log(`   ✅ Task context created: ${taskContext.id} (parent: ${projectContext.id})\n`);

    // Verify parent has children references
    const updatedProject = await contextManager.getContext(ContextLevel.PROJECT, projectContext.id);
    if (updatedProject.data.children && updatedProject.data.children.length > 0) {
      console.log(`   ✅ Parent context has ${updatedProject.data.children.length} children references`);
      console.log(`      Children: ${updatedProject.data.children.join(', ')}\n`);
    } else {
      console.log('   ❌ Parent context missing children references\n');
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`   ❌ Basic relationship creation failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 2: Context Relationships Retrieval
  console.log('🔍 Test 2: Context Relationships Retrieval\n');

  try {
    // Get all contexts to test relationships
    const contexts = await Promise.all([
      contextManager.createContext(ContextLevel.PROJECT, { 
        projectName: 'Relationship Test Project',
        description: 'Testing relationship retrieval'
      }),
      contextManager.createContext(ContextLevel.AGENT, { 
        agentId: 'rel-agent-1',
        agentType: 'TestAgent'
      }),
      contextManager.createContext(ContextLevel.AGENT, { 
        agentId: 'rel-agent-2', 
        agentType: 'TestAgent'
      })
    ]);

    const [projectCtx, agentCtx1, agentCtx2] = contexts;

    // Create parent-child relationships
    await contextManager.createContext(
      ContextLevel.AGENT,
      { agentId: 'child-agent-1', agentType: 'ChildAgent' },
      projectCtx.id
    );

    await contextManager.createContext(
      ContextLevel.TASK,
      { 
        taskId: 'child-task-1', 
        taskType: 'test',
        input: {},
        status: 'completed'
      },
      projectCtx.id
    );

    // Test getContextWithRelationships
    const projectWithRelationships = await contextManager.getContextWithRelationships(
      ContextLevel.PROJECT,
      projectCtx.id
    );

    if (projectWithRelationships && projectWithRelationships.relationships) {
      console.log('   ✅ Retrieved context with relationships');
      console.log(`      Children found: ${projectWithRelationships.relationships.children?.length || 0}`);
      console.log(`      Parent found: ${projectWithRelationships.relationships.parent ? '✅' : '❌'}`);
      
      if (projectWithRelationships.relationships.children?.length > 0) {
        console.log('   ✅ Child relationships working correctly');
      } else {
        console.log('   ❌ Child relationships not found');
        allTestsPassed = false;
      }
    } else {
      console.log('   ❌ Failed to retrieve relationships');
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`   ❌ Relationship retrieval failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Multi-level Hierarchy
  console.log('\n🏗️  Test 3: Multi-level Hierarchy\n');

  try {
    // Create global context
    const globalContext = await contextManager.createContext(
      ContextLevel.GLOBAL,
      {
        systemConfig: { testMode: true },
        activeProjects: [],
        globalState: { hierarchyTest: true }
      }
    );

    // Create project under global
    const hierarchyProject = await contextManager.createContext(
      ContextLevel.PROJECT,
      {
        projectName: 'Hierarchy Test Project',
        description: 'Testing multi-level hierarchy'
      },
      globalContext.id
    );

    // Create agent under project
    const hierarchyAgent = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentId: 'hierarchy-agent',
        agentType: 'HierarchyAgent',
        capabilities: ['hierarchy-testing']
      },
      hierarchyProject.id
    );

    // Create task under project (not under agent)  
    const hierarchyTask = await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId: 'hierarchy-task',
        taskType: 'hierarchy-test',
        input: { level: 'task' },
        status: 'completed'
      },
      hierarchyProject.id
    );

    console.log('   ✅ Multi-level hierarchy created:');
    console.log(`      Global → Project → Agent: ${globalContext.id} → ${hierarchyProject.id} → ${hierarchyAgent.id}`);
    console.log(`      Global → Project → Task: ${globalContext.id} → ${hierarchyProject.id} → ${hierarchyTask.id}`);

    // Verify each level has correct children
    const updatedGlobal = await contextManager.getContext(ContextLevel.GLOBAL, globalContext.id);
    const updatedProject = await contextManager.getContext(ContextLevel.PROJECT, hierarchyProject.id);

    if (updatedGlobal.data.children?.includes(hierarchyProject.id)) {
      console.log('   ✅ Global context has project child');
    } else {
      console.log('   ❌ Global context missing project child');
      allTestsPassed = false;
    }

    if (updatedProject.data.children?.includes(hierarchyAgent.id) && 
        updatedProject.data.children?.includes(hierarchyTask.id)) {
      console.log('   ✅ Project context has agent and task children');
    } else {
      console.log('   ❌ Project context missing agent or task children');
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`   ❌ Multi-level hierarchy test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 4: Relationship Navigation
  console.log('\n🧭 Test 4: Relationship Navigation\n');

  try {
    // Create connected contexts for navigation testing
    const navProject = await contextManager.createContext(
      ContextLevel.PROJECT,
      { projectName: 'Navigation Test Project' }
    );

    const navAgents = await Promise.all([
      contextManager.createContext(
        ContextLevel.AGENT,
        { agentId: 'nav-agent-1', agentType: 'NavigationAgent' },
        navProject.id
      ),
      contextManager.createContext(
        ContextLevel.AGENT,
        { agentId: 'nav-agent-2', agentType: 'NavigationAgent' },
        navProject.id
      ),
      contextManager.createContext(
        ContextLevel.AGENT,
        { agentId: 'nav-agent-3', agentType: 'NavigationAgent' },
        navProject.id
      )
    ]);

    const navTasks = await Promise.all([
      contextManager.createContext(
        ContextLevel.TASK,
        { 
          taskId: 'nav-task-1', 
          taskType: 'navigation-test',
          input: {},
          status: 'completed'
        },
        navProject.id
      ),
      contextManager.createContext(
        ContextLevel.TASK,
        { 
          taskId: 'nav-task-2', 
          taskType: 'navigation-test',
          input: {},
          status: 'in-progress'
        },
        navProject.id
      )
    ]);

    // Test navigation from project
    const projectWithNav = await contextManager.getContextWithRelationships(
      ContextLevel.PROJECT,
      navProject.id
    );

    const expectedChildren = navAgents.length + navTasks.length;
    const actualChildren = projectWithNav.relationships.children?.length || 0;

    if (actualChildren === expectedChildren) {
      console.log(`   ✅ Navigation test: Found ${actualChildren} children (expected: ${expectedChildren})`);
    } else {
      console.log(`   ❌ Navigation test: Found ${actualChildren} children (expected: ${expectedChildren})`);
      allTestsPassed = false;
    }

    // Test navigation from child to parent
    const agentWithNav = await contextManager.getContextWithRelationships(
      ContextLevel.AGENT,
      navAgents[0].id
    );

    if (agentWithNav.relationships.parent) {
      console.log('   ✅ Child-to-parent navigation working');
    } else {
      console.log('   ❌ Child-to-parent navigation failed');
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`   ❌ Relationship navigation test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 5: Relationship Consistency
  console.log('\n🔄 Test 5: Relationship Consistency\n');

  try {
    // Create test contexts
    const consistencyProject = await contextManager.createContext(
      ContextLevel.PROJECT,
      { projectName: 'Consistency Test Project' }
    );

    const consistencyAgent = await contextManager.createContext(
      ContextLevel.AGENT,
      { agentId: 'consistency-agent', agentType: 'ConsistencyAgent' },
      consistencyProject.id
    );

    // Verify bidirectional consistency
    const project = await contextManager.getContext(ContextLevel.PROJECT, consistencyProject.id);
    const agent = await contextManager.getContext(ContextLevel.AGENT, consistencyAgent.id);

    // Check parent → child reference
    const hasChildReference = project.data.children?.includes(consistencyAgent.id);
    
    // Check child → parent reference  
    const hasParentReference = agent.parentId === consistencyProject.id;

    if (hasChildReference && hasParentReference) {
      console.log('   ✅ Bidirectional relationship consistency verified');
    } else {
      console.log('   ❌ Relationship consistency failed');
      console.log(`      Parent has child ref: ${hasChildReference}`);
      console.log(`      Child has parent ref: ${hasParentReference}`);
      allTestsPassed = false;
    }

    // Test relationship after context update
    await contextManager.updateContext(
      ContextLevel.AGENT,
      consistencyAgent.id,
      { state: { updated: true } }
    );

    const updatedProject = await contextManager.getContext(ContextLevel.PROJECT, consistencyProject.id);
    const stillHasChild = updatedProject.data.children?.includes(consistencyAgent.id);

    if (stillHasChild) {
      console.log('   ✅ Relationships preserved after context update');
    } else {
      console.log('   ❌ Relationships lost after context update');
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`   ❌ Relationship consistency test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n📊 Context Graph Relationships Test Results:');
  console.log(`   - Basic relationship creation: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Relationship retrieval: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Multi-level hierarchy: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Relationship navigation: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Relationship consistency: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All context relationship tests passed!');
    console.log('✅ TASK-001-04: Context graph relationships fixed');
  } else {
    console.log('\n❌ Some context relationship tests failed');
    console.log('⚠️  TASK-001-04: Additional fixes needed');
  }

  return allTestsPassed;
}

// Run the test
testContextRelationships()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Context relationships test failed:', error);
    process.exit(1);
  });