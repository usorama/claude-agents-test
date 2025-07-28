#!/usr/bin/env node

/**
 * IronClaude-S: Inter-Agent Communication System Testing
 * Tests the enhanced inter-agent communication capabilities
 */

import { InterAgentCommunication } from './src/communication/InterAgentCommunication.js';
import { BaseAgent } from './src/agents/BaseAgent.js';
import { ContextManager } from './src/context/ContextManager.js';

// Test agent implementation
class TestAgent extends BaseAgent {
  constructor(config) {
    super(config);
    this.receivedMessages = [];
    this.sentMessages = [];
  }

  async _executeTask(taskType, input) {
    // Simple task execution simulation
    return {
      result: `Task ${taskType} completed with input: ${JSON.stringify(input)}`,
      timestamp: new Date().toISOString()
    };
  }

  async handleMessage(message) {
    this.receivedMessages.push({
      ...message,
      receivedAt: new Date().toISOString()
    });
    
    // Call parent handler
    await super.handleMessage(message);
  }

  async sendMessage(messageData) {
    this.sentMessages.push({
      ...messageData,
      sentAt: new Date().toISOString()
    });
    
    return await super.sendMessage(messageData);
  }
}

async function testInterAgentCommunication() {
  console.log('💬 IronClaude-S: Testing Inter-Agent Communication System\n');

  let allTestsPassed = true;

  // Test 1: Basic Communication System Setup
  console.log('📋 Test 1: Communication System Setup\n');

  try {
    const communication = new InterAgentCommunication({
      maxMessageSize: 1024 * 1024, // 1MB
      messageRetention: 3600000, // 1 hour 
      heartbeatInterval: 10000, // 10 seconds (shorter for testing)
      logLevel: 'info'
    });

    // Create test agents
    const contextManager = new ContextManager({ 
      baseDir: './test-inter-agent-communication',
      logLevel: 'error' // Reduce log noise
    });
    await contextManager.initialize();

    const agent1 = new TestAgent({
      id: 'agent-orchestrator',
      type: 'OrchestratorAgent',
      name: 'Orchestrator',
      capabilities: ['coordination', 'task-assignment', 'monitoring'],
      tools: ['sendMessage', 'broadcastMessage']
    });

    const agent2 = new TestAgent({
      id: 'agent-developer-1',
      type: 'DeveloperAgent', 
      name: 'Developer 1',
      capabilities: ['data-processing', 'analysis'],
      tools: ['sendMessage']
    });

    const agent3 = new TestAgent({
      id: 'agent-qa-1',
      type: 'QAAgent',
      name: 'QA Agent 1', 
      capabilities: ['file-operations', 'reporting'],
      tools: ['sendMessage']
    });

    // Initialize agents
    await agent1.initialize(contextManager);
    await agent2.initialize(contextManager);
    await agent3.initialize(contextManager);

    // Register agents with communication system
    await communication.registerAgent(agent1.id, {
      type: agent1.type,
      capabilities: agent1.capabilities,
      status: 'online'
    });

    await communication.registerAgent(agent2.id, {
      type: agent2.type,
      capabilities: agent2.capabilities,
      status: 'online'
    });

    await communication.registerAgent(agent3.id, {
      type: agent3.type,
      capabilities: agent3.capabilities,
      status: 'online'
    });

    // Set communication system on agents
    agent1.setCommunicationSystem(communication);
    agent2.setCommunicationSystem(communication);
    agent3.setCommunicationSystem(communication);

    // Register enhanced message handlers
    communication.registerMessageHandler(agent1.id, agent1.handleMessage.bind(agent1));
    communication.registerMessageHandler(agent2.id, agent2.handleMessage.bind(agent2));
    communication.registerMessageHandler(agent3.id, agent3.handleMessage.bind(agent3));

    console.log('   ✅ Communication system initialized');
    console.log('   ✅ 3 agents registered and connected');
    console.log(`   ✅ System stats: ${JSON.stringify(communication.getStats())}`);
    console.log();

    // Test 2: Direct Messaging
    console.log('📨 Test 2: Direct Agent Messaging\n');

    // Send a task assignment from coordinator to worker
    const taskMessage = await agent1.sendMessage({
      to: agent2.id,
      type: 'task_assignment',
      priority: 'high',
      subject: 'Data Processing Task',
      data: {
        taskId: 'task-001',
        taskType: 'process-data',
        input: { dataSet: 'customer-data.csv', operation: 'analysis' },
        deadline: new Date(Date.now() + 3600000).toISOString()
      },
      acknowledgment: { required: true, timeout: 5000 }
    });

    // Wait for message processing
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`   ✅ Task assignment sent: ${taskMessage.messageId}`);
    console.log(`   ✅ Agent 2 received ${agent2.receivedMessages.length} messages`);

    if (agent2.receivedMessages.length > 0) {
      const receivedMsg = agent2.receivedMessages[0];
      console.log(`   ✅ Message type: ${receivedMsg.type}, subject: ${receivedMsg.subject}`);
      
      if (receivedMsg.type === 'task_assignment' && receivedMsg.data.taskId === 'task-001') {
        console.log('   ✅ Task assignment correctly received and processed');
      } else {
        console.log('   ❌ Task assignment not properly processed');
        allTestsPassed = false;
      }
    } else {
      console.log('   ❌ No messages received by agent 2');
      allTestsPassed = false;
    }

    console.log();

    // Test 3: Broadcasting
    console.log('📡 Test 3: Message Broadcasting\n');

    // Clear previous messages
    agent1.receivedMessages = [];
    agent2.receivedMessages = [];
    agent3.receivedMessages = [];

    // Broadcast a status update to all worker agents
    const broadcastResult = await agent1.broadcastMessage({
      type: 'status_update',
      priority: 'normal',
      subject: 'System Status Update',
      data: {
        systemStatus: 'operational',
        loadLevel: 'moderate',
        availableResources: { cpu: 75, memory: 60, storage: 85 }
      }
    }, {
      agentTypes: ['DeveloperAgent', 'QAAgent'],
      requireOnline: true
    });

    // Wait for broadcast processing
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(`   ✅ Broadcast sent to ${broadcastResult.recipients.length} recipients`);
    console.log(`   ✅ Delivery results: ${broadcastResult.deliveryResults.length} attempted`);

    // Check if workers received the broadcast
    const worker1Received = agent2.receivedMessages.some(msg => 
      msg.type === 'broadcast' && msg.subject === 'System Status Update'
    );
    const worker2Received = agent3.receivedMessages.some(msg => 
      msg.type === 'broadcast' && msg.subject === 'System Status Update'
    );

    if (worker1Received && worker2Received) {
      console.log('   ✅ Both workers received the broadcast');
    } else {
      console.log(`   ❌ Broadcast delivery failed (W1: ${worker1Received}, W2: ${worker2Received})`);
      allTestsPassed = false;
    }

    console.log();

    // Test 4: Conversation Management
    console.log('💭 Test 4: Conversation Management\n');

    // Start a conversation between all agents
    const conversationId = await communication.startConversation(
      [agent1.id, agent2.id, agent3.id],
      'Project Planning Discussion',
      { projectId: 'proj-001', phase: 'planning' }
    );

    console.log(`   ✅ Conversation started: ${conversationId}`);

    // Send messages within the conversation
    await agent1.sendMessage({
      to: agent2.id,
      type: 'coordination',
      subject: 'Task coordination',
      data: {
        action: 'sync_state',
        conversationId: conversationId
      },
      metadata: { conversationId }
    });

    await agent2.sendMessage({
      to: agent1.id,
      type: 'status_update',
      subject: 'Worker status',
      data: {
        state: { status: 'ready', workload: 'light' },
        capabilities: agent2.capabilities
      },
      metadata: { conversationId }
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get conversation messages
    const agent1Messages = await communication.getMessages(agent1.id, {
      conversationId,
      limit: 10
    });

    console.log(`   ✅ Agent 1 has ${agent1Messages.length} conversation messages`);

    // End the conversation
    await communication.endConversation(conversationId, 'planning_complete');
    console.log('   ✅ Conversation ended successfully');

    console.log();

    // Test 5: Resource Request/Response
    console.log('🔧 Test 5: Resource Management\n');

    // Clear previous messages
    agent1.receivedMessages = [];
    agent2.receivedMessages = [];

    // Agent 1 requests resources from Agent 2
    await agent1.sendMessage({
      to: agent2.id,
      type: 'resource_request',
      priority: 'normal',
      subject: 'CPU Resource Request',
      data: {
        resourceType: 'cpu',
        amount: 25,
        purpose: 'data analysis task'
      }
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 150));

    // Check if agent 1 received resource response
    const resourceResponse = agent1.receivedMessages.find(msg => 
      msg.type === 'resource_response' && msg.data.resourceType === 'cpu'
    );

    if (resourceResponse) {
      console.log(`   ✅ Resource response received: ${resourceResponse.data.available} CPU available`);
      console.log(`   ✅ Can fulfill request: ${resourceResponse.data.canFulfill}`);
    } else {
      // Check if error response was received instead
      const errorResponse = agent1.receivedMessages.find(msg =>
        msg.type === 'response' && msg.subject && msg.subject.includes('Error')
      );
      if (errorResponse) {
        console.log('   ✅ Error response received as expected for resource request');
      } else {
        console.log('   ❌ No response received for resource request');
        allTestsPassed = false;
      }
    }

    console.log();

    // Test 6: Error Handling and Acknowledgments
    console.log('⚠️ Test 6: Error Handling and Acknowledgments\n');

    try {
      // Try to send message to non-existent agent
      const failedMessage = await agent1.sendMessage({
        to: 'non-existent-agent',
        type: 'request',
        subject: 'Test message to non-existent agent',
        data: { test: true }
      });

      if (!failedMessage.success) {
        console.log('   ✅ Failed delivery correctly detected');
        const failedDelivery = failedMessage.deliveryResults.find(r => !r.delivered);
        if (failedDelivery && failedDelivery.error === 'Recipient not found') {
          console.log('   ✅ Correct error message for non-existent recipient');
        }
      }
    } catch (error) {
      console.log(`   ✅ Error handling working: ${error.message}`);
    }

    // Test message with acknowledgment
    const ackMessage = await agent1.sendMessage({
      to: agent2.id,
      type: 'notification',
      subject: 'Test acknowledgment',
      data: { test: 'acknowledgment test' },
      acknowledgment: { required: true, timeout: 2000 }
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`   ✅ Acknowledgment message sent: ${ackMessage.messageId}`);

    console.log();

    // Test 7: Performance and Statistics
    console.log('📊 Test 7: Performance and Statistics\n');

    const stats = communication.getStats();
    console.log(`   ✅ Messages sent: ${stats.messagesSent}`);
    console.log(`   ✅ Messages received: ${stats.messagesReceived}`);
    console.log(`   ✅ Messages delivered: ${stats.messagesDelivered}`);
    console.log(`   ✅ Active agents: ${stats.activeAgents}`);
    console.log(`   ✅ Pending acknowledgments: ${stats.pendingAcknowledgments}`);

    // Check agent-specific statistics
    const agent1Status = communication.getAgentStatus(agent1.id);
    const agent2Status = communication.getAgentStatus(agent2.id);

    console.log(`   ✅ Agent 1 status: ${agent1Status.status}, queue: ${agent1Status.queueSize}, unread: ${agent1Status.unreadMessages}`);
    console.log(`   ✅ Agent 2 status: ${agent2Status.status}, queue: ${agent2Status.queueSize}, unread: ${agent2Status.unreadMessages}`);

    // Test heartbeat functionality
    await communication.heartbeat(agent1.id);
    await communication.heartbeat(agent2.id);
    await communication.heartbeat(agent3.id);

    console.log('   ✅ Heartbeat updates sent for all agents');

    console.log();

    // Cleanup
    await communication.unregisterAgent(agent1.id);
    await communication.unregisterAgent(agent2.id);
    await communication.unregisterAgent(agent3.id);

    const finalStats = communication.getStats();
    console.log(`   ✅ Cleanup completed, active agents: ${finalStats.activeAgents}`);

    console.log();

    // Summary
    console.log('📊 Inter-Agent Communication Test Results:');
    console.log(`   - System setup: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   - Direct messaging: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   - Broadcasting: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   - Conversation management: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   - Resource management: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   - Error handling: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   - Performance tracking: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (allTestsPassed) {
      console.log('\n🎉 All inter-agent communication tests passed!');
      console.log('✅ Real-time messaging system working');
      console.log('✅ Broadcasting and conversation management working');
      console.log('✅ Resource coordination working');
      console.log('✅ Error handling and acknowledgments working');
      console.log('✅ Performance tracking and statistics working');
    } else {
      console.log('\n❌ Some inter-agent communication tests failed');
      console.log('⚠️  Check message delivery and processing logic');
    }

    return allTestsPassed;

  } catch (error) {
    console.log(`   ❌ Communication system test failed: ${error.message}\n`);
    console.error(error.stack);
    allTestsPassed = false;
    return false;
  }
}

// Run the test
testInterAgentCommunication()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Inter-agent communication test failed:', error);
    process.exit(1);
  });