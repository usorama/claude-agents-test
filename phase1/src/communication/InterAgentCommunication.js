import { EventEmitter } from 'events';
import winston from 'winston';
import { z } from 'zod';

/**
 * Enhanced Inter-Agent Communication System
 * Provides real-time messaging, broadcasting, and coordination between agents
 */

// Message schemas
export const MessageTypeSchema = z.enum([
  'request',
  'response', 
  'notification',
  'broadcast',
  'task_assignment',
  'task_completion',
  'resource_request',
  'resource_response',
  'coordination',
  'status_update',
  'error_report',
  'heartbeat'
]);

export const MessagePrioritySchema = z.enum([
  'low',
  'normal', 
  'high',
  'urgent',
  'critical'
]);

export const EnhancedMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.union([z.string(), z.array(z.string())]), // Single recipient or multiple
  type: MessageTypeSchema,
  priority: MessagePrioritySchema.default('normal'),
  subject: z.string(),
  data: z.any(),
  metadata: z.object({
    timestamp: z.string(),
    ttl: z.number().optional(), // Time to live in milliseconds
    requiresAck: z.boolean().default(false),
    conversationId: z.string().optional(),
    retryCount: z.number().default(0),
    maxRetries: z.number().default(3)
  }),
  replyTo: z.string().optional(),
  acknowledgment: z.object({
    required: z.boolean().default(false),
    timeout: z.number().default(30000), // 30 seconds
    received: z.boolean().default(false),
    processed: z.boolean().default(false)
  }).optional()
});

export class InterAgentCommunication extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
      messageRetention: config.messageRetention || 3600000, // 1 hour
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      ackTimeout: config.ackTimeout || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      enablePersistence: config.enablePersistence !== false,
      ...config
    };
    
    // Active agents registry
    this.agents = new Map(); // agentId -> agent info
    this.messageHandlers = new Map(); // agentId -> handler functions
    this.conversations = new Map(); // conversationId -> conversation data
    this.pendingAcknowledgments = new Map(); // messageId -> ack data
    
    // Message queues and routing
    this.messageQueues = new Map(); // agentId -> message queue
    this.routingTable = new Map(); // pattern -> routing function
    this.broadcasts = new Map(); // broadcastId -> broadcast data
    
    // Performance tracking
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageLatency: 0,
      activeConversations: 0
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'InterAgentCommunication' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    // Start maintenance tasks
    this._startMaintenanceTasks();
  }

  /**
   * Register an agent in the communication system
   */
  async registerAgent(agentId, agentInfo = {}) {
    this.agents.set(agentId, {
      id: agentId,
      status: 'online',
      lastHeartbeat: Date.now(),
      capabilities: agentInfo.capabilities || [],
      messageCount: 0,
      ...agentInfo
    });
    
    // Initialize message queue
    this.messageQueues.set(agentId, []);
    
    this.logger.info('Agent registered', { agentId, capabilities: agentInfo.capabilities });
    this.emit('agent_registered', { agentId, agentInfo });
    
    return true;
  }

  /**
   * Unregister an agent from the communication system
   */
  async unregisterAgent(agentId) {
    if (!this.agents.has(agentId)) {
      return false;
    }
    
    // Clean up resources
    this.agents.delete(agentId);
    this.messageHandlers.delete(agentId);
    this.messageQueues.delete(agentId);
    
    // Cancel pending acknowledgments for this agent
    for (const [messageId, ackData] of this.pendingAcknowledgments.entries()) {
      if (ackData.from === agentId || ackData.to === agentId) {
        clearTimeout(ackData.timeout);
        this.pendingAcknowledgments.delete(messageId);
      }
    }
    
    this.logger.info('Agent unregistered', { agentId });
    this.emit('agent_unregistered', { agentId });
    
    return true;
  }

  /**
   * Register a message handler for an agent
   */
  registerMessageHandler(agentId, handler) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, []);
    }
    
    this.messageHandlers.get(agentId).push(handler);
    this.logger.info('Message handler registered', { agentId });
    
    return true;
  }

  /**
   * Send a message to one or more agents
   */
  async sendMessage(messageData) {
    try {
      // Validate and enrich message
      const message = await this._prepareMessage(messageData);
      
      // Handle different recipient types
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      const deliveryResults = [];
      
      for (const recipient of recipients) {
        const result = await this._deliverMessage(message, recipient);
        deliveryResults.push(result);
      }
      
      // Update statistics
      this.stats.messagesSent++;
      this.stats.messagesDelivered += deliveryResults.filter(r => r.delivered).length;
      this.stats.messagesFailed += deliveryResults.filter(r => !r.delivered).length;
      
      this.logger.info('Message sent', {
        messageId: message.id,
        from: message.from,
        to: message.to,
        type: message.type,
        priority: message.priority,
        deliveryResults: deliveryResults.length
      });
      
      return {
        messageId: message.id,
        deliveryResults,
        success: deliveryResults.every(r => r.delivered)
      };
    } catch (error) {
      this.stats.messagesFailed++;
      this.logger.error('Failed to send message', { error: error.message });
      throw error;
    }
  }

  /**
   * Broadcast a message to multiple agents based on criteria
   */
  async broadcastMessage(messageData, criteria = {}) {
    const {
      includeCapabilities = [],
      excludeAgents = [],
      includeAgents = [],
      agentTypes = [],
      requireOnline = true
    } = criteria;
    
    // Find matching agents
    const recipients = [];
    
    for (const [agentId, agentInfo] of this.agents.entries()) {
      // Skip excluded agents
      if (excludeAgents.includes(agentId)) continue;
      
      // Include only specific agents if list provided
      if (includeAgents.length > 0 && !includeAgents.includes(agentId)) continue;
      
      // Check agent type
      if (agentTypes.length > 0 && !agentTypes.includes(agentInfo.type)) continue;
      
      // Check capabilities
      if (includeCapabilities.length > 0) {
        const hasCapability = includeCapabilities.some(cap => 
          agentInfo.capabilities && agentInfo.capabilities.includes(cap)
        );
        if (!hasCapability) continue;
      }
      
      // Check online status
      if (requireOnline && agentInfo.status !== 'online') continue;
      
      recipients.push(agentId);
    }
    
    if (recipients.length === 0) {
      this.logger.warn('No recipients found for broadcast', { criteria });
      return { messageId: null, recipients: [], deliveryResults: [] };
    }
    
    // Send broadcast message
    const broadcastMessage = {
      ...messageData,
      type: 'broadcast',
      to: recipients
    };
    
    const result = await this.sendMessage(broadcastMessage);
    
    this.logger.info('Broadcast sent', {
      messageId: result.messageId,
      recipients: recipients.length,
      criteria
    });
    
    return {
      ...result,
      recipients
    };
  }

  /**
   * Start a conversation between agents
   */
  async startConversation(participants, topic, metadata = {}) {
    const conversationId = this._generateId();
    
    const conversation = {
      id: conversationId,
      participants,
      topic,
      startedAt: new Date().toISOString(),
      messages: [],
      status: 'active',
      metadata
    };
    
    this.conversations.set(conversationId, conversation);
    this.stats.activeConversations++;
    
    // Notify participants
    await this.broadcastMessage({
      from: 'system',
      type: 'notification',
      subject: `New conversation: ${topic}`,
      data: { conversationId, topic, participants },
      metadata: { conversationId }
    }, { includeAgents: participants });
    
    this.logger.info('Conversation started', { conversationId, participants, topic });
    
    return conversationId;
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId, reason = 'completed') {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }
    
    conversation.status = 'ended';
    conversation.endedAt = new Date().toISOString();
    conversation.endReason = reason;
    
    this.stats.activeConversations--;
    
    // Notify participants
    await this.broadcastMessage({
      from: 'system',
      type: 'notification',
      subject: `Conversation ended: ${conversation.topic}`,
      data: { conversationId, reason },
      metadata: { conversationId }
    }, { includeAgents: conversation.participants });
    
    this.logger.info('Conversation ended', { conversationId, reason });
    
    return true;
  }

  /**
   * Get messages for an agent
   */
  async getMessages(agentId, options = {}) {
    const {
      since = null,
      limit = 100,
      includeRead = true,
      conversationId = null,
      messageTypes = []
    } = options;
    
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    
    const queue = this.messageQueues.get(agentId) || [];
    let messages = [...queue];
    
    // Apply filters
    if (since) {
      const sinceTime = new Date(since).getTime();
      messages = messages.filter(msg => 
        new Date(msg.metadata.timestamp).getTime() > sinceTime
      );
    }
    
    if (!includeRead) {
      messages = messages.filter(msg => !msg._read);
    }
    
    if (conversationId) {
      messages = messages.filter(msg => 
        msg.metadata.conversationId === conversationId
      );
    }
    
    if (messageTypes.length > 0) {
      messages = messages.filter(msg => messageTypes.includes(msg.type));
    }
    
    // Sort by timestamp and limit
    messages.sort((a, b) => 
      new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
    );
    
    if (limit > 0) {
      messages = messages.slice(-limit);
    }
    
    return messages;
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(agentId, messageIds) {
    const queue = this.messageQueues.get(agentId);
    if (!queue) return false;
    
    let markedCount = 0;
    for (const message of queue) {
      if (messageIds.includes(message.id)) {
        message._read = true;
        markedCount++;
      }
    }
    
    this.logger.debug('Messages marked as read', { agentId, markedCount });
    return markedCount;
  }

  /**
   * Get communication statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeAgents: this.agents.size,
      totalMessageQueues: this.messageQueues.size,
      pendingAcknowledgments: this.pendingAcknowledgments.size,
      activeConversations: this.conversations.size
    };
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    
    const queue = this.messageQueues.get(agentId) || [];
    const unreadCount = queue.filter(msg => !msg._read).length;
    
    return {
      ...agent,
      queueSize: queue.length,
      unreadMessages: unreadCount,
      lastSeen: new Date(agent.lastHeartbeat).toISOString()
    };
  }

  /**
   * Update agent heartbeat
   */
  async heartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    agent.lastHeartbeat = Date.now();
    agent.status = 'online';
    
    return true;
  }

  // Private methods

  async _prepareMessage(messageData) {
    const message = EnhancedMessageSchema.parse({
      id: messageData.id || this._generateId(),
      from: messageData.from,
      to: messageData.to,
      type: messageData.type,
      priority: messageData.priority || 'normal',
      subject: messageData.subject,
      data: messageData.data,
      metadata: {
        timestamp: new Date().toISOString(),
        ttl: messageData.ttl,
        requiresAck: messageData.requiresAck || false,
        conversationId: messageData.conversationId,
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        ...messageData.metadata
      },
      replyTo: messageData.replyTo,
      acknowledgment: messageData.acknowledgment
    });
    
    // Check message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.maxMessageSize) {
      throw new Error(`Message too large: ${messageSize} bytes (max: ${this.config.maxMessageSize})`);
    }
    
    return message;
  }

  async _deliverMessage(message, recipientId) {
    try {
      // Check if recipient exists
      if (!this.agents.has(recipientId)) {
        return { delivered: false, error: 'Recipient not found', recipientId };
      }
      
      // Add to recipient's queue
      const queue = this.messageQueues.get(recipientId);
      queue.push({ ...message, _received: Date.now() });
      
      // Handle TTL cleanup
      if (message.metadata.ttl) {
        setTimeout(() => {
          const index = queue.findIndex(msg => msg.id === message.id);
          if (index >= 0 && !queue[index]._read) {
            queue.splice(index, 1);
            this.logger.debug('Message expired', { messageId: message.id, recipientId });
          }
        }, message.metadata.ttl);
      }
      
      // Set up acknowledgment if required
      if (message.acknowledgment?.required) {
        this._setupAcknowledgment(message, recipientId);
      }
      
      // Call message handlers
      const handlers = this.messageHandlers.get(recipientId) || [];
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error) {
          this.logger.error('Message handler error', { 
            messageId: message.id, 
            recipientId, 
            error: error.message 
          });
        }
      }
      
      // Emit message event
      this.emit('message_delivered', { message, recipientId });
      
      // Update statistics
      this.stats.messagesReceived++;
      
      return { delivered: true, recipientId };
    } catch (error) {
      this.logger.error('Message delivery failed', { 
        messageId: message.id, 
        recipientId, 
        error: error.message 
      });
      return { delivered: false, error: error.message, recipientId };
    }
  }

  _setupAcknowledgment(message, recipientId) {
    const ackData = {
      messageId: message.id,
      from: message.from,
      to: recipientId,
      timeout: setTimeout(() => {
        this.pendingAcknowledgments.delete(message.id);
        this.logger.warn('Acknowledgment timeout', { messageId: message.id, recipientId });
        this.emit('acknowledgment_timeout', { message, recipientId });
      }, message.acknowledgment.timeout || this.config.ackTimeout)
    };
    
    this.pendingAcknowledgments.set(message.id, ackData);
  }

  _generateId() {
    return 'msg-' + Math.random().toString(36).substr(2, 16) + '-' + Date.now().toString(36);
  }

  _startMaintenanceTasks() {
    // Heartbeat monitoring
    setInterval(() => {
      const now = Date.now();
      for (const [agentId, agent] of this.agents.entries()) {
        if (now - agent.lastHeartbeat > this.config.heartbeatInterval * 2) {
          agent.status = 'offline';
          this.logger.warn('Agent appears offline', { agentId });
          this.emit('agent_offline', { agentId });
        }
      }
    }, this.config.heartbeatInterval);
    
    // Message cleanup
    setInterval(() => {
      const now = Date.now();
      for (const [agentId, queue] of this.messageQueues.entries()) {
        const initialSize = queue.length;
        
        // Remove old read messages
        const cutoff = now - this.config.messageRetention;
        this.messageQueues.set(agentId, queue.filter(msg => {
          const messageTime = msg._received || new Date(msg.metadata.timestamp).getTime();
          return !msg._read || messageTime > cutoff;
        }));
        
        const removed = initialSize - this.messageQueues.get(agentId).length;
        if (removed > 0) {
          this.logger.debug('Cleaned up old messages', { agentId, removed });
        }
      }
    }, 60000); // Run every minute
  }
}

export default InterAgentCommunication;