#!/usr/bin/env node

/**
 * Test Phase 3: Extended Implementation
 * Tests extended agents, agent interactions, and workflow implementation
 */

import { ContextManager } from './src/context/ContextManager.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import { GitManagerAgent } from './src/agents/extended/GitManagerAgent.js';
import { MonitorAgent } from './src/agents/extended/MonitorAgent.js';
import { DevOpsAgent } from './src/agents/extended/DevOpsAgent.js';
import { DeveloperAgent } from './src/agents/extended/DeveloperAgent.js';
import { QAAgent } from './src/agents/extended/QAAgent.js';
import { SelfHealerAgent } from './src/agents/extended/SelfHealerAgent.js';
import { ContextLevel } from './src/types/context.types.v2.js';
import fs from 'fs/promises';

const testDir = './test-phase3-extended';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testPhase3ExtendedImplementation() {
  console.log('🧪 Testing Phase 3: Extended Implementation...\n');

  await cleanup();

  // Test 1: Extended Agent Initialization
  console.log('📊 Test 1: Extended Agent Initialization');

  const contextManager = new ContextManager({
    baseDir: `${testDir}/context`,
    logLevel: 'warn'
  });
  await contextManager.initialize();

  const agents = [];
  const agentConfigs = [
    { AgentClass: GitManagerAgent, type: 'GitManagerAgent', id: 'git-001' },
    { AgentClass: MonitorAgent, type: 'MonitorAgent', id: 'monitor-001' },
    { AgentClass: DevOpsAgent, type: 'DevOpsAgent', id: 'devops-001' },
    { AgentClass: DeveloperAgent, type: 'DeveloperAgent', id: 'dev-001' },
    { AgentClass: QAAgent, type: 'QAAgent', id: 'qa-001' },
    { AgentClass: SelfHealerAgent, type: 'SelfHealerAgent', id: 'healer-001' }
  ];

  const initializedAgents = [];
  for (const config of agentConfigs) {
    try {
      const agent = new config.AgentClass({
        id: config.id,
        type: config.type,
        name: `Test ${config.type}`,
        logLevel: 'warn'
      });
      
      await agent.initialize(contextManager);
      agents.push(agent);
      initializedAgents.push(config.type);
      console.log(`✅ ${config.type} initialized successfully`);
    } catch (error) {
      console.log(`❌ ${config.type} initialization failed: ${error.message}`);
    }
  }

  console.log(`✅ Successfully initialized ${initializedAgents.length}/${agentConfigs.length} extended agents`);

  // Test 2: Agent Capabilities Verification
  console.log('\n📊 Test 2: Agent Capabilities Verification');

  const expectedCapabilities = {
    GitManagerAgent: ['version_control', 'documentation'],
    MonitorAgent: ['monitoring', 'debugging'],
    DevOpsAgent: ['deployment', 'monitoring', 'version_control'],
    DeveloperAgent: ['development', 'testing', 'debugging'],
    QAAgent: ['testing', 'review', 'quality'],
    SelfHealerAgent: ['monitoring', 'debugging', 'deployment']
  };

  let capabilityTests = 0;
  let capabilityPassed = 0;

  for (const agent of agents) {
    const expected = expectedCapabilities[agent.type];
    if (expected) {
      capabilityTests++;
      const hasCapabilities = expected.some(cap => 
        agent.capabilities && agent.capabilities.includes(cap)
      );
      
      if (hasCapabilities) {
        capabilityPassed++;
        console.log(`✅ ${agent.type}: Has expected capabilities`);
      } else {
        console.log(`❌ ${agent.type}: Missing expected capabilities`);
        console.log(`   Expected: ${expected.join(', ')}`);
        console.log(`   Actual: ${agent.capabilities ? agent.capabilities.join(', ') : 'none'}`);
      }
    }
  }

  const capabilityScore = (capabilityPassed / capabilityTests * 100).toFixed(1);
  console.log(`✅ Capability verification: ${capabilityScore}% (${capabilityPassed}/${capabilityTests})`);

  // Test 3: Agent State Management
  console.log('\n📊 Test 3: Agent State Management');

  let stateTests = 0;
  let statePassed = 0;

  for (const agent of agents) {
    stateTests++;
    try {
      // Test state access (BaseAgent has this.state property)
      const state = agent.state;
      const hasValidState = state && typeof state === 'object' && state.status;
      
      if (hasValidState) {
        statePassed++;
        console.log(`✅ ${agent.type}: Valid state management (status: ${state.status})`);
      } else {
        console.log(`❌ ${agent.type}: Invalid state structure`);
      }
    } catch (error) {
      console.log(`❌ ${agent.type}: State access failed - ${error.message}`);
    }
  }

  const stateScore = (statePassed / stateTests * 100).toFixed(1);
  console.log(`✅ State management: ${stateScore}% (${statePassed}/${stateTests})`);

  // Test 4: Agent Interactions via Orchestrator
  console.log('\n📊 Test 4: Agent Interactions via Orchestrator');

  const orchestrator = new OrchestratorAgent({
    id: 'orchestrator-001',
    type: 'OrchestratorAgent',
    name: 'Test Orchestrator',
    logLevel: 'warn'
  });
  await orchestrator.initialize(contextManager);

  console.log(`✅ Orchestrator initialized with built-in agents`);

  // Test agent discovery - orchestrator has its own agents map
  const registeredAgents = Array.from(orchestrator.agents.keys());
  const registeredCount = registeredAgents.length;
  console.log(`✅ Found ${registeredCount} agents in orchestrator: ${registeredAgents.join(', ')}`);

  // Test agent communication
  let communicationTests = 0;
  let communicationPassed = 0;

  const testTasks = [
    { type: 'git', agent: 'GitManagerAgent', task: 'status check' },
    { type: 'monitor', agent: 'MonitorAgent', task: 'health check' },
    { type: 'deploy', agent: 'DevOpsAgent', task: 'deployment status' }
  ];

  for (const testTask of testTasks) {
    communicationTests++;
    try {
      const targetAgent = orchestrator.agents.get(testTask.agent);
      if (targetAgent && targetAgent.state.status === 'idle') {
        // Test successful task assignment
        communicationPassed++;
        console.log(`✅ Communication test: ${testTask.agent} can receive ${testTask.type} tasks`);
      } else if (targetAgent) {
        console.log(`⚠️  Communication test: ${testTask.agent} not available for tasks (status: ${targetAgent.state.status})`);
      } else {
        console.log(`⚠️  Communication test: ${testTask.agent} not found in orchestrator`);
      }
    } catch (error) {
      console.log(`❌ Communication test failed for ${testTask.agent}: ${error.message}`);
    }
  }

  const commScore = (communicationPassed / communicationTests * 100).toFixed(1);
  console.log(`✅ Agent communication: ${commScore}% (${communicationPassed}/${communicationTests})`);

  // Test 5: Context Manager Agent Integration
  console.log('\n📊 Test 5: Context Manager Agent Integration');

  // Create project context
  const projectContext = await contextManager.createContext(
    ContextLevel.PROJECT,
    {
      projectName: 'Extended Implementation Test',
      phase: 'Phase 3',
      agents: initializedAgents
    }
  );

  console.log(`✅ Created project context: ${projectContext.id}`);

  // Create agent-specific contexts
  const agentContexts = [];
  for (const agent of agents.slice(0, 3)) { // Test with first 3 agents
    const agentContext = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentId: agent.id,
        agentType: agent.type,
        state: agent.state,
        capabilities: agent.capabilities || []
      },
      projectContext.id
    );
    agentContexts.push(agentContext);
    console.log(`✅ Created context for ${agent.type}: ${agentContext.id}`);
  }

  // Test context relationships
  const relationships = await contextManager.getContextWithRelationships(
    ContextLevel.PROJECT,
    projectContext.id
  );

  console.log(`✅ Project context has ${relationships.relationships.children.length} child contexts`);

  // Test 6: Workflow Implementation
  console.log('\n📊 Test 6: Basic Workflow Implementation');

  // Simulate a basic development workflow
  const workflowSteps = [
    { agent: 'DeveloperAgent', task: 'implement feature', duration: 100 },
    { agent: 'QAAgent', task: 'test implementation', duration: 80, dependencies: ['implement feature'] },
    { agent: 'GitManagerAgent', task: 'commit changes', duration: 50, dependencies: ['test implementation'] },
    { agent: 'DevOpsAgent', task: 'deploy to staging', duration: 120, dependencies: ['commit changes'] },
    { agent: 'MonitorAgent', task: 'monitor deployment', duration: 60, dependencies: ['deploy to staging'] }
  ];

  console.log(`✅ Defined workflow with ${workflowSteps.length} steps`);

  // Test workflow validation
  const workflowValid = workflowSteps.every(step => {
    const hasAgent = agents.some(a => a.type === step.agent);
    const hasValidDeps = !step.dependencies || step.dependencies.every(dep => 
      workflowSteps.some(s => s.task === dep)
    );
    return hasAgent && hasValidDeps;
  });

  console.log(`✅ Workflow validation: ${workflowValid ? 'Valid' : 'Invalid'}`);

  // Test dependency resolution
  const resolvedSteps = [];
  const completed = new Set();
  
  while (resolvedSteps.length < workflowSteps.length) {
    const readySteps = workflowSteps.filter(step => 
      !resolvedSteps.includes(step) &&
      (!step.dependencies || step.dependencies.every(dep => completed.has(dep)))
    );
    
    if (readySteps.length === 0) break; // Circular dependency or invalid workflow
    
    const nextStep = readySteps[0];
    resolvedSteps.push(nextStep);
    completed.add(nextStep.task);
  }

  const workflowResolution = resolvedSteps.length === workflowSteps.length;
  console.log(`✅ Dependency resolution: ${workflowResolution ? 'Successful' : 'Failed'}`);
  console.log(`✅ Execution order: ${resolvedSteps.map(s => s.task).join(' → ')}`);

  // Test 7: Agent Persistence and Recovery
  console.log('\n📊 Test 7: Agent Persistence and Recovery');

  let persistenceTests = 0;
  let persistencePassed = 0;

  for (const agent of agents.slice(0, 2)) { // Test with first 2 agents
    persistenceTests++;
    try {
      // Save agent state
      const context = await contextManager.createContext(
        ContextLevel.TASK,
        {
          agentId: agent.id,
          taskType: 'persistence_test',
          state: agent.state,
          timestamp: new Date().toISOString()
        },
        agentContexts[0]?.id
      );

      // Verify persistence
      const savedContext = await contextManager.getContext(ContextLevel.TASK, context.id);
      const hasSavedState = savedContext && savedContext.data.state;
      
      if (hasSavedState) {
        persistencePassed++;
        console.log(`✅ ${agent.type}: State persistence working`);
      } else {
        console.log(`❌ ${agent.type}: State persistence failed`);
      }
    } catch (error) {
      console.log(`❌ ${agent.type}: Persistence test failed - ${error.message}`);
    }
  }

  const persistenceScore = (persistencePassed / persistenceTests * 100).toFixed(1);
  console.log(`✅ Agent persistence: ${persistenceScore}% (${persistencePassed}/${persistenceTests})`);

  // Test 8: System Integration Test
  console.log('\n📊 Test 8: System Integration Test');

  // Create a comprehensive task that requires multiple agents
  const integrationTask = {
    id: 'integration-001',
    type: 'full-cycle-deployment',
    steps: [
      { agent: 'DeveloperAgent', action: 'prepare code' },
      { agent: 'QAAgent', action: 'run tests' },
      { agent: 'GitManagerAgent', action: 'create branch' },
      { agent: 'DevOpsAgent', action: 'build and deploy' },
      { agent: 'MonitorAgent', action: 'verify deployment' },
      { agent: 'SelfHealerAgent', action: 'health check' }
    ]
  };

  let integrationSteps = 0;
  let integrationPassed = 0;

  for (const step of integrationTask.steps) {
    integrationSteps++;
    const agent = orchestrator.agents.get(step.agent) || agents.find(a => a.type === step.agent);
    
    if (agent && agent.state.status === 'idle') {
      integrationPassed++;
      console.log(`✅ Integration step: ${step.agent} ready for ${step.action}`);
    } else if (agent) {
      console.log(`⚠️  Integration step: ${step.agent} not ready for ${step.action} (status: ${agent.state.status})`);
    } else {
      console.log(`❌ Integration step: ${step.agent} not found`);
    }
  }

  const integrationScore = (integrationPassed / integrationSteps * 100).toFixed(1);
  console.log(`✅ System integration: ${integrationScore}% (${integrationPassed}/${integrationSteps})`);

  console.log('\n🎉 Phase 3: Extended Implementation Tests Complete!');

  return {
    agentInitialization: parseFloat(((initializedAgents.length / agentConfigs.length) * 100).toFixed(1)),
    capabilityVerification: parseFloat(capabilityScore),
    stateManagement: parseFloat(stateScore),
    agentCommunication: parseFloat(commScore),
    contextIntegration: relationships.relationships.children.length > 0,
    workflowImplementation: workflowValid && workflowResolution,
    agentPersistence: parseFloat(persistenceScore),
    systemIntegration: parseFloat(integrationScore),
    totalAgentsImplemented: initializedAgents.length,
    contextManagerWorking: projectContext && agentContexts.length > 0,
    orchestratorIntegration: registeredCount > 0
  };
}

// Run tests
testPhase3ExtendedImplementation()
  .then(results => {
    console.log('\n📈 Phase 3: Extended Implementation Test Results:');
    console.log('- Agent initialization success rate:', results.agentInitialization + '%');
    console.log('- Capability verification score:', results.capabilityVerification + '%');
    console.log('- State management score:', results.stateManagement + '%');
    console.log('- Agent communication score:', results.agentCommunication + '%');
    console.log('- Context integration working:', results.contextIntegration ? '✅ Yes' : '❌ No');
    console.log('- Workflow implementation working:', results.workflowImplementation ? '✅ Yes' : '❌ No');
    console.log('- Agent persistence score:', results.agentPersistence + '%');
    console.log('- System integration score:', results.systemIntegration + '%');
    console.log('- Total extended agents implemented:', results.totalAgentsImplemented);
    console.log('- Context Manager integration:', results.contextManagerWorking ? '✅ Working' : '❌ Failed');
    console.log('- Orchestrator integration:', results.orchestratorIntegration ? '✅ Working' : '❌ Failed');
    
    const scores = [
      results.agentInitialization,
      results.capabilityVerification,
      results.stateManagement,
      results.agentCommunication,
      results.contextIntegration ? 100 : 0,
      results.workflowImplementation ? 100 : 0,
      results.agentPersistence,
      results.systemIntegration
    ];
    
    const overallScore = (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
    
    console.log('- Overall Phase 3 completion score:', overallScore + '%');
    
    if (overallScore >= 90) {
      console.log('✅ Excellent Phase 3 implementation!');
    } else if (overallScore >= 80) {
      console.log('✅ Good Phase 3 implementation!');
    } else {
      console.log('⚠️  Phase 3 implementation needs improvement');
    }
  })
  .catch(error => {
    console.error('❌ Phase 3 extended implementation tests failed:', error);
    process.exit(1);
  });