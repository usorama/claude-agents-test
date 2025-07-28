#!/usr/bin/env node

import { ContextManager } from './context/ContextManager.js';
import { OrchestratorAgent } from './orchestrator/OrchestratorAgent.js';
import { program } from 'commander';
import chalk from 'chalk';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      const color = level === 'error' ? chalk.red : 
                   level === 'warn' ? chalk.yellow : 
                   chalk.green;
      return `${chalk.gray(timestamp)} ${color(level.toUpperCase())} ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

// ASCII Art Banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('BMAD-METHOD Claude Code Agent System')}          ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('Breakthrough Method of Agile AI Development')}  ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════╝')}
`;

async function main() {
  console.log(banner);
  
  program
    .name('bmad-agents')
    .description('BMAD-METHOD Agent System for Claude Code')
    .version('1.0.0');

  program
    .command('start')
    .description('Start the orchestrator and agent system')
    .option('-c, --context-dir <dir>', 'Context storage directory', './agent-context')
    .option('-m, --max-concurrency <number>', 'Maximum concurrent tasks', '3')
    .action(async (options) => {
      try {
        logger.info('Starting BMAD Agent System...');
        
        // Initialize Context Manager
        const contextManager = new ContextManager({
          baseDir: options.contextDir,
          logLevel: 'info'
        });
        await contextManager.initialize();
        logger.info(`Context Manager initialized at ${options.contextDir}`);
        
        // Initialize Orchestrator
        const orchestrator = new OrchestratorAgent({
          maxConcurrency: parseInt(options.maxConcurrency),
          logLevel: 'info'
        });
        await orchestrator.initialize(contextManager);
        logger.info('Orchestrator initialized with agents:', Array.from(orchestrator.agents.keys()));
        
        // Interactive mode
        console.log('\n' + chalk.bold('System ready! Available commands:'));
        console.log(chalk.gray('  - route <request>     : Route a request to appropriate agents'));
        console.log(chalk.gray('  - workflow <name>     : Start a workflow (product-development, brownfield-modernization)'));
        console.log(chalk.gray('  - status              : Show system status'));
        console.log(chalk.gray('  - exit                : Shutdown the system'));
        console.log('');
        
        // Start interactive prompt
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: chalk.cyan('bmad> ')
        });
        
        rl.prompt();
        
        rl.on('line', async (line) => {
          const [command, ...args] = line.trim().split(' ');
          
          try {
            switch (command) {
              case 'route':
                const request = args.join(' ');
                if (!request) {
                  console.log(chalk.red('Please provide a request to route'));
                  break;
                }
                console.log(chalk.gray('Routing request...'));
                const routeResult = await orchestrator.routeRequest(request);
                console.log(chalk.green('✓ Request routed successfully'));
                console.log(JSON.stringify(routeResult, null, 2));
                break;
                
              case 'workflow':
                const workflowName = args[0];
                if (!workflowName) {
                  console.log(chalk.red('Please provide a workflow name'));
                  console.log(chalk.gray('Available workflows: product-development, brownfield-modernization, emergency-response'));
                  break;
                }
                console.log(chalk.gray(`Starting ${workflowName} workflow...`));
                const workflowResult = await orchestrator.startWorkflow(workflowName, {
                  request: args.slice(1).join(' ') || 'User initiated workflow'
                });
                console.log(chalk.green('✓ Workflow completed'));
                console.log(JSON.stringify(workflowResult, null, 2));
                break;
                
              case 'status':
                const status = await orchestrator.getStatus();
                console.log(chalk.bold('\nSystem Status:'));
                console.log(`Active Workflows: ${status.activeWorkflows}`);
                console.log(`Queued Tasks: ${status.queuedTasks}`);
                console.log(`Pending Tasks: ${status.pendingTasks}`);
                console.log('\nAgent Status:');
                for (const [agent, metrics] of Object.entries(status.metrics.agents)) {
                  console.log(`  ${agent}: ${metrics.status} (${metrics.completedTasks} completed, ${metrics.failedTasks} failed)`);
                }
                break;
                
              case 'exit':
                console.log(chalk.yellow('Shutting down...'));
                await orchestrator.shutdown();
                process.exit(0);
                break;
                
              case '':
                break;
                
              default:
                console.log(chalk.red(`Unknown command: ${command}`));
                console.log(chalk.gray('Type "help" for available commands'));
            }
          } catch (error) {
            console.error(chalk.red('Error:'), error.message);
            logger.error('Command error', { command, error: error.message });
          }
          
          rl.prompt();
        });
        
        rl.on('close', async () => {
          console.log(chalk.yellow('\nShutting down...'));
          await orchestrator.shutdown();
          process.exit(0);
        });
        
      } catch (error) {
        logger.error('Failed to start system', { error: error.message });
        console.error(chalk.red('Failed to start:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('agent <type> <task>')
    .description('Run a specific agent task')
    .option('-i, --input <json>', 'Task input as JSON string')
    .option('-c, --context-dir <dir>', 'Context storage directory', './agent-context')
    .action(async (type, task, options) => {
      try {
        logger.info(`Running ${type} agent task: ${task}`);
        
        // Parse input
        const input = options.input ? JSON.parse(options.input) : {};
        
        // Initialize Context Manager
        const contextManager = new ContextManager({
          baseDir: options.contextDir
        });
        await contextManager.initialize();
        
        // Initialize Orchestrator
        const orchestrator = new OrchestratorAgent();
        await orchestrator.initialize(contextManager);
        
        // Execute task
        const result = await orchestrator.execute({
          taskId: `cli-${Date.now()}`,
          taskType: 'delegate-task',
          input: {
            agentType: type,
            task,
            taskInput: input
          }
        });
        
        console.log(chalk.green('✓ Task completed successfully'));
        console.log(JSON.stringify(result, null, 2));
        
        await orchestrator.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Task failed', { error: error.message });
        console.error(chalk.red('Task failed:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('test')
    .description('Run system tests')
    .action(async () => {
      try {
        logger.info('Running system tests...');
        
        const { spawn } = await import('child_process');
        const test = spawn('npm', ['test'], {
          stdio: 'inherit',
          shell: true
        });
        
        test.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('✓ All tests passed'));
          } else {
            console.log(chalk.red('✗ Tests failed'));
          }
          process.exit(code);
        });
      } catch (error) {
        logger.error('Test execution failed', { error: error.message });
        console.error(chalk.red('Test execution failed:'), error.message);
        process.exit(1);
      }
    });

  program.parse();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  console.error(chalk.red('Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Run main
main().catch((error) => {
  logger.error('Main process error', { error: error.message });
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});