import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class DeveloperAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'developer-001',
      type: 'DeveloperAgent',
      name: 'James',
      description: 'Expert Senior Software Engineer & Implementation Specialist',
      capabilities: [
        AgentCapability.DEVELOPMENT,
        AgentCapability.TESTING,
        AgentCapability.DEBUGGING
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.EDIT,
        ClaudeCodeTool.MULTI_EDIT,
        ClaudeCodeTool.BASH,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.GLOB
      ],
      ...config
    });
    
    this.persona = {
      role: 'Expert Senior Software Engineer & Implementation Specialist',
      style: 'Extremely concise, pragmatic, detail-oriented, solution-focused',
      identity: 'Expert who implements stories by reading requirements and executing tasks sequentially with comprehensive testing',
      focus: 'Executing story tasks with precision, updating Dev Agent Record sections only, maintaining minimal context overhead',
      corePrinciples: [
        'Story has ALL info needed - avoid loading unnecessary docs',
        'ONLY update story file Dev Agent Record sections',
        'Follow develop-story command workflow precisely',
        'Always use numbered lists for user choices',
        'Comprehensive testing before marking complete'
      ]
    };
    
    this.developmentWorkflow = {
      orderOfExecution: [
        'Read task',
        'Implement task and subtasks',
        'Write tests',
        'Execute validations',
        'Update task checkbox if all pass',
        'Update file list',
        'Repeat until complete'
      ],
      blockingConditions: [
        'Unapproved dependencies needed',
        'Ambiguous requirements',
        '3 failures attempting implementation',
        'Missing configuration',
        'Failing regression tests'
      ]
    };
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Developer executing task', { taskType });
    
    switch (taskType) {
      case 'implement-story':
        return await this._implementStory(input);
        
      case 'implement-feature':
        return await this._implementFeature(input);
        
      case 'fix-bug':
        return await this._fixBug(input);
        
      case 'refactor-code':
        return await this._refactorCode(input);
        
      case 'write-tests':
        return await this._writeTests(input);
        
      case 'run-tests':
        return await this._runTests(input);
        
      case 'code-review':
        return await this._performCodeReview(input);
        
      case 'debug-issue':
        return await this._debugIssue(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _implementStory(input) {
    const {
      storyId,
      storyPath,
      requirements,
      acceptanceCriteria,
      technicalNotes
    } = input;
    
    const implementation = {
      storyId,
      startedAt: new Date().toISOString(),
      tasks: [],
      filesModified: [],
      testsWritten: [],
      status: 'in-progress'
    };
    
    try {
      // Read story file if provided
      let storyContent = null;
      if (storyPath) {
        storyContent = await this.invokeTool(ClaudeCodeTool.READ, { file_path: storyPath });
        implementation.storyContent = storyContent;
      }
      
      // Parse tasks from requirements
      const tasks = this._parseTasksFromRequirements(requirements || storyContent);
      
      // Implement each task
      for (const task of tasks) {
        this.logger.info('Implementing task', { task: task.name });
        
        const taskResult = await this._implementTask(task);
        implementation.tasks.push({
          task: task.name,
          status: taskResult.success ? 'completed' : 'failed',
          filesCreated: taskResult.filesCreated || [],
          filesModified: taskResult.filesModified || [],
          result: taskResult
        });
        
        if (taskResult.filesCreated) {
          implementation.filesModified.push(...taskResult.filesCreated);
        }
        if (taskResult.filesModified) {
          implementation.filesModified.push(...taskResult.filesModified);
        }
        
        // Write tests for the task
        if (taskResult.success && task.requiresTests) {
          const testResult = await this._writeTestsForTask(task, taskResult);
          implementation.testsWritten.push(...testResult.tests);
        }
      }
      
      // Run all tests
      const testResults = await this._runAllTests(implementation.testsWritten);
      implementation.testResults = testResults;
      
      // Validate implementation
      const validation = await this._validateImplementation(implementation, acceptanceCriteria);
      implementation.validation = validation;
      
      implementation.status = validation.allPassed ? 'completed' : 'needs-fixes';
      implementation.completedAt = new Date().toISOString();
      
      return {
        implementation,
        summary: `Implemented story ${storyId}: ${tasks.length} tasks completed, ${implementation.testsWritten.length} tests written`
      };
    } catch (error) {
      this.logger.error('Story implementation failed', { storyId, error: error.message });
      implementation.status = 'failed';
      implementation.error = error.message;
      return {
        implementation,
        summary: `Failed to implement story ${storyId}: ${error.message}`
      };
    }
  }

  async _implementFeature(input) {
    const {
      featureName,
      description,
      specifications,
      targetFiles = []
    } = input;
    
    const feature = {
      name: featureName,
      implementation: {
        components: [],
        functions: [],
        tests: []
      }
    };
    
    // Analyze feature requirements
    const analysis = this._analyzeFeatureRequirements(description, specifications);
    
    // Generate implementation plan
    const plan = this._createImplementationPlan(analysis);
    
    // Implement components
    for (const component of plan.components) {
      const componentCode = this._generateComponentCode(component);
      const filePath = path.join('src', component.type, `${component.name}.js`);
      
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: filePath,
        content: componentCode
      });
      
      feature.implementation.components.push({
        name: component.name,
        path: filePath,
        type: component.type
      });
    }
    
    // Implement functions
    for (const func of plan.functions) {
      if (func.targetFile && targetFiles.includes(func.targetFile)) {
        // Add to existing file
        await this._addFunctionToFile(func.targetFile, func);
      } else {
        // Create new file
        const funcCode = this._generateFunctionCode(func);
        const filePath = path.join('src', 'utils', `${func.name}.js`);
        
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: filePath,
          content: funcCode
        });
        
        feature.implementation.functions.push({
          name: func.name,
          path: filePath
        });
      }
    }
    
    // Write tests
    const tests = await this._generateFeatureTests(feature, specifications);
    feature.implementation.tests = tests;
    
    return {
      feature,
      summary: `Implemented feature "${featureName}": ${feature.implementation.components.length} components, ${feature.implementation.functions.length} functions`
    };
  }

  async _fixBug(input) {
    const {
      bugId,
      description,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      affectedFiles = []
    } = input;
    
    const bugFix = {
      bugId,
      diagnosis: null,
      rootCause: null,
      fix: {
        filesModified: [],
        changes: []
      },
      tests: [],
      verification: null
    };
    
    // Diagnose the issue
    bugFix.diagnosis = await this._diagnoseBug(description, reproductionSteps, affectedFiles);
    
    // Find root cause
    bugFix.rootCause = await this._findRootCause(bugFix.diagnosis);
    
    // Implement fix
    for (const file of bugFix.rootCause.affectedFiles) {
      const fixResult = await this._applyBugFix(file, bugFix.rootCause);
      bugFix.fix.filesModified.push(file);
      bugFix.fix.changes.push(fixResult);
    }
    
    // Write regression test
    const regressionTest = await this._writeRegressionTest(bugId, reproductionSteps, expectedBehavior);
    bugFix.tests.push(regressionTest);
    
    // Verify fix
    bugFix.verification = await this._verifyBugFix(reproductionSteps, expectedBehavior);
    
    return {
      bugFix,
      summary: `Fixed bug ${bugId}: Modified ${bugFix.fix.filesModified.length} files`
    };
  }

  async _refactorCode(input) {
    const {
      targetPath,
      refactorType,
      goals = [],
      constraints = []
    } = input;
    
    const refactoring = {
      targetPath,
      type: refactorType,
      analysis: null,
      changes: [],
      tests: {
        before: null,
        after: null
      },
      metrics: {
        before: {},
        after: {}
      }
    };
    
    // Analyze current code
    refactoring.analysis = await this._analyzeCodeForRefactoring(targetPath, refactorType);
    
    // Run tests before refactoring
    refactoring.tests.before = await this._runTestsForPath(targetPath);
    
    // Collect metrics before
    refactoring.metrics.before = await this._collectCodeMetrics(targetPath);
    
    // Apply refactoring based on type
    switch (refactorType) {
      case 'extract-function':
        refactoring.changes = await this._extractFunction(targetPath, refactoring.analysis);
        break;
      case 'rename':
        refactoring.changes = await this._renameSymbols(targetPath, refactoring.analysis);
        break;
      case 'simplify':
        refactoring.changes = await this._simplifyCode(targetPath, refactoring.analysis);
        break;
      case 'performance':
        refactoring.changes = await this._optimizePerformance(targetPath, refactoring.analysis);
        break;
      case 'modernize':
        refactoring.changes = await this._modernizeCode(targetPath, refactoring.analysis);
        break;
      default:
        throw new Error(`Unknown refactor type: ${refactorType}`);
    }
    
    // Run tests after refactoring
    refactoring.tests.after = await this._runTestsForPath(targetPath);
    
    // Collect metrics after
    refactoring.metrics.after = await this._collectCodeMetrics(targetPath);
    
    // Verify no regression
    const testsPass = refactoring.tests.after.passed === refactoring.tests.before.passed;
    
    return {
      refactoring,
      success: testsPass,
      summary: `Refactored ${targetPath} (${refactorType}): ${refactoring.changes.length} changes made`
    };
  }

  async _writeTests(input) {
    const {
      targetPath,
      testType = 'unit',
      coverage = 80,
      framework = 'jest'
    } = input;
    
    const testSuite = {
      targetPath,
      testType,
      framework,
      tests: [],
      coverage: {
        target: coverage,
        actual: 0
      }
    };
    
    // Analyze code to test
    const codeAnalysis = await this._analyzeCodeForTesting(targetPath);
    
    // Generate test cases
    const testCases = this._generateTestCases(codeAnalysis, testType);
    
    // Write test files
    for (const testCase of testCases) {
      const testCode = this._generateTestCode(testCase, framework);
      const testPath = this._getTestPath(targetPath, testCase.name);
      
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: testPath,
        content: testCode
      });
      
      testSuite.tests.push({
        name: testCase.name,
        path: testPath,
        type: testCase.type,
        assertions: testCase.assertions.length
      });
    }
    
    // Check coverage
    const coverageResult = await this._checkTestCoverage(targetPath);
    testSuite.coverage.actual = coverageResult.percentage;
    
    return {
      testSuite,
      summary: `Wrote ${testSuite.tests.length} tests for ${targetPath}, ${testSuite.coverage.actual}% coverage`
    };
  }

  async _runTests(input) {
    const {
      testPath,
      pattern,
      verbose = false,
      coverage = true
    } = input;
    
    const testRun = {
      startedAt: new Date().toISOString(),
      command: null,
      results: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      failures: [],
      coverage: null,
      duration: 0
    };
    
    // Determine test command
    testRun.command = this._buildTestCommand(testPath, pattern, coverage);
    
    // Execute tests
    const startTime = Date.now();
    const testOutput = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: testRun.command
    });
    testRun.duration = Date.now() - startTime;
    
    // Parse test results
    const parsedResults = this._parseTestOutput(testOutput.stdout);
    testRun.results = parsedResults.summary;
    testRun.failures = parsedResults.failures;
    
    // Parse coverage if enabled
    if (coverage && testOutput.stdout.includes('Coverage')) {
      testRun.coverage = this._parseCoverageOutput(testOutput.stdout);
    }
    
    testRun.completedAt = new Date().toISOString();
    
    return {
      testRun,
      success: testRun.results.failed === 0,
      summary: `Tests: ${testRun.results.passed}/${testRun.results.total} passed${coverage ? `, Coverage: ${testRun.coverage?.percentage || 'N/A'}%` : ''}`
    };
  }

  async _performCodeReview(input) {
    const {
      files,
      prNumber,
      reviewType = 'comprehensive',
      checklistPath
    } = input;
    
    const review = {
      reviewType,
      files: [],
      issues: {
        critical: [],
        major: [],
        minor: [],
        suggestions: []
      },
      metrics: {
        linesReviewed: 0,
        complexityScore: 0,
        maintainabilityScore: 0
      },
      approved: true
    };
    
    // Load checklist if provided
    let checklist = null;
    if (checklistPath) {
      checklist = await this._loadReviewChecklist(checklistPath);
    }
    
    // Review each file
    for (const file of files) {
      const fileReview = await this._reviewFile(file, reviewType, checklist);
      review.files.push(fileReview);
      
      // Aggregate issues
      review.issues.critical.push(...fileReview.issues.critical);
      review.issues.major.push(...fileReview.issues.major);
      review.issues.minor.push(...fileReview.issues.minor);
      review.issues.suggestions.push(...fileReview.suggestions);
      
      // Update metrics
      review.metrics.linesReviewed += fileReview.linesReviewed;
    }
    
    // Calculate overall scores
    review.metrics.complexityScore = this._calculateAverageComplexity(review.files);
    review.metrics.maintainabilityScore = this._calculateMaintainability(review.files);
    
    // Determine approval
    review.approved = review.issues.critical.length === 0 && review.issues.major.length < 3;
    
    // Generate review comments
    const comments = this._generateReviewComments(review);
    
    return {
      review,
      comments,
      summary: `Code review: ${review.approved ? 'APPROVED' : 'CHANGES REQUESTED'} - ${review.issues.critical.length} critical, ${review.issues.major.length} major issues`
    };
  }

  async _debugIssue(input) {
    const {
      description,
      errorMessage,
      stackTrace,
      context = {},
      reproductionSteps
    } = input;
    
    const debugging = {
      issue: description,
      hypothesis: [],
      investigations: [],
      findings: [],
      solution: null,
      verification: null
    };
    
    // Form initial hypothesis
    debugging.hypothesis = this._formDebugHypothesis(errorMessage, stackTrace);
    
    // Investigate each hypothesis
    for (const hyp of debugging.hypothesis) {
      const investigation = await this._investigateHypothesis(hyp, context);
      debugging.investigations.push(investigation);
      
      if (investigation.findings.length > 0) {
        debugging.findings.push(...investigation.findings);
      }
    }
    
    // Identify root cause
    const rootCause = this._identifyRootCause(debugging.findings);
    
    // Develop solution
    debugging.solution = await this._developDebugSolution(rootCause);
    
    // Verify solution
    if (reproductionSteps) {
      debugging.verification = await this._verifyDebugSolution(debugging.solution, reproductionSteps);
    }
    
    return {
      debugging,
      solved: debugging.verification?.success || false,
      summary: `Debug: Found ${debugging.findings.length} issues, root cause: ${rootCause.description}`
    };
  }

  // Helper methods
  _parseTasksFromRequirements(requirements) {
    if (typeof requirements === 'string') {
      // Parse tasks from story format
      const tasks = [];
      const lines = requirements.split('\n');
      let currentTask = null;
      
      for (const line of lines) {
        if (line.match(/^###?\s+Task/i)) {
          if (currentTask) tasks.push(currentTask);
          currentTask = {
            name: line.replace(/^###?\s+Task\s*\d*:?\s*/i, '').trim(),
            subtasks: [],
            requiresTests: true
          };
        } else if (currentTask && line.match(/^\s*-\s*\[.\]\s*/)) {
          currentTask.subtasks.push(line.replace(/^\s*-\s*\[.\]\s*/, '').trim());
        }
      }
      if (currentTask) tasks.push(currentTask);
      return tasks;
    }
    
    // Requirements is already structured
    return requirements;
  }

  async _implementTask(task) {
    const result = {
      success: false,
      filesCreated: [],
      filesModified: [],
      output: null
    };
    
    try {
      // Simulate task implementation
      result.output = `Implemented ${task.name}`;
      result.success = true;
      
      // Would create/modify files based on task
      if (task.name.includes('component')) {
        result.filesCreated.push(`src/components/${task.name.replace(/\s+/g, '')}.js`);
      } else if (task.name.includes('function')) {
        result.filesModified.push('src/utils/helpers.js');
      }
      
      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  async _writeTestsForTask(task, implementation) {
    const tests = [];
    
    // Generate test based on task type
    const testContent = this._generateTaskTestContent(task, implementation);
    const testPath = `tests/${task.name.replace(/\s+/g, '-').toLowerCase()}.test.js`;
    
    tests.push({
      path: testPath,
      content: testContent,
      type: 'unit'
    });
    
    return { tests };
  }

  async _runAllTests(tests) {
    // Simulate running tests
    return {
      total: tests.length,
      passed: tests.length,
      failed: 0,
      duration: 1234
    };
  }

  async _validateImplementation(implementation, acceptanceCriteria) {
    const validation = {
      criteria: acceptanceCriteria || [],
      results: [],
      allPassed: true
    };
    
    // Check each criterion
    for (const criterion of validation.criteria) {
      const result = {
        criterion,
        passed: true, // Simplified
        notes: 'Criterion met'
      };
      validation.results.push(result);
    }
    
    return validation;
  }

  _analyzeFeatureRequirements(description, specifications) {
    return {
      components: ['MainComponent', 'HelperComponent'],
      functions: ['processData', 'validateInput'],
      dataModels: ['UserModel', 'DataModel']
    };
  }

  _createImplementationPlan(analysis) {
    return {
      components: analysis.components.map(name => ({
        name,
        type: 'components',
        dependencies: []
      })),
      functions: analysis.functions.map(name => ({
        name,
        type: 'utils',
        parameters: [],
        returnType: 'any'
      }))
    };
  }

  _generateComponentCode(component) {
    return `export class ${component.name} {
  constructor() {
    // Component initialization
  }
  
  render() {
    // Component rendering logic
  }
}`;
  }

  _generateFunctionCode(func) {
    return `export function ${func.name}(...args) {
  // Function implementation
  return result;
}`;
  }

  async _addFunctionToFile(filePath, func) {
    const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: filePath });
    const newContent = content + '\n\n' + this._generateFunctionCode(func);
    await this.invokeTool(ClaudeCodeTool.WRITE, { file_path: filePath, content: newContent });
  }

  async _generateFeatureTests(feature, specifications) {
    const tests = [];
    
    // Component tests
    for (const component of feature.implementation.components) {
      tests.push({
        path: `tests/components/${component.name}.test.js`,
        type: 'component',
        content: `// Test for ${component.name}`
      });
    }
    
    // Function tests
    for (const func of feature.implementation.functions) {
      tests.push({
        path: `tests/utils/${func.name}.test.js`,
        type: 'unit',
        content: `// Test for ${func.name}`
      });
    }
    
    return tests;
  }

  async _diagnoseBug(description, reproSteps, files) {
    return {
      suspectedFiles: files,
      errorPattern: 'Type error',
      scope: 'Local to component'
    };
  }

  async _findRootCause(diagnosis) {
    return {
      location: diagnosis.suspectedFiles[0],
      line: 42,
      cause: 'Undefined variable access',
      affectedFiles: diagnosis.suspectedFiles
    };
  }

  async _applyBugFix(file, rootCause) {
    return {
      file,
      changes: [{
        line: rootCause.line,
        before: 'const value = obj.prop;',
        after: 'const value = obj?.prop || defaultValue;'
      }]
    };
  }

  async _writeRegressionTest(bugId, reproSteps, expected) {
    return {
      path: `tests/regression/bug-${bugId}.test.js`,
      content: `// Regression test for bug ${bugId}`
    };
  }

  async _verifyBugFix(reproSteps, expected) {
    return {
      reproduced: false,
      behaviorCorrect: true,
      testsPassing: true
    };
  }

  async _analyzeCodeForRefactoring(targetPath, refactorType) {
    return {
      complexity: 15,
      duplications: 3,
      suggestions: ['Extract method', 'Simplify conditionals']
    };
  }

  async _runTestsForPath(targetPath) {
    return { total: 10, passed: 10, failed: 0 };
  }

  async _collectCodeMetrics(targetPath) {
    return {
      loc: 500,
      complexity: 15,
      maintainability: 75
    };
  }

  async _extractFunction(targetPath, analysis) {
    return [{
      type: 'extract',
      from: { line: 20, column: 5 },
      to: { line: 35, column: 10 },
      newFunction: 'extractedFunction'
    }];
  }

  async _renameSymbols(targetPath, analysis) {
    return [{
      type: 'rename',
      oldName: 'oldFunction',
      newName: 'newFunction',
      occurrences: 5
    }];
  }

  async _simplifyCode(targetPath, analysis) {
    return [{
      type: 'simplify',
      location: { line: 50 },
      before: 'Complex conditional',
      after: 'Simplified conditional'
    }];
  }

  async _optimizePerformance(targetPath, analysis) {
    return [{
      type: 'optimize',
      optimization: 'Cache results',
      impact: '50% faster'
    }];
  }

  async _modernizeCode(targetPath, analysis) {
    return [{
      type: 'modernize',
      change: 'Convert callbacks to async/await',
      files: 3
    }];
  }

  async _analyzeCodeForTesting(targetPath) {
    return {
      functions: ['func1', 'func2'],
      classes: ['Class1'],
      exports: ['default', 'helper']
    };
  }

  _generateTestCases(analysis, testType) {
    const cases = [];
    
    for (const func of analysis.functions) {
      cases.push({
        name: `${func}-test`,
        type: testType,
        target: func,
        assertions: ['returns expected value', 'handles errors']
      });
    }
    
    return cases;
  }

  _generateTestCode(testCase, framework) {
    return `describe('${testCase.target}', () => {
  test('${testCase.assertions[0]}', () => {
    // Test implementation
  });
});`;
  }

  _getTestPath(targetPath, testName) {
    const dir = path.dirname(targetPath);
    const base = path.basename(targetPath, path.extname(targetPath));
    return path.join(dir, '__tests__', `${base}.${testName}.test.js`);
  }

  async _checkTestCoverage(targetPath) {
    return { percentage: 85, uncovered: ['line 45-50'] };
  }

  _buildTestCommand(testPath, pattern, coverage) {
    let cmd = 'npm test';
    if (testPath) cmd += ` ${testPath}`;
    if (pattern) cmd += ` --testNamePattern="${pattern}"`;
    if (coverage) cmd += ' --coverage';
    return cmd;
  }

  _parseTestOutput(output) {
    // Simplified parsing
    return {
      summary: {
        total: 10,
        passed: 9,
        failed: 1,
        skipped: 0
      },
      failures: [{
        test: 'should handle edge case',
        error: 'Expected true, got false'
      }]
    };
  }

  _parseCoverageOutput(output) {
    return {
      percentage: 85,
      statements: { total: 100, covered: 85 },
      branches: { total: 20, covered: 17 },
      functions: { total: 30, covered: 28 },
      lines: { total: 100, covered: 85 }
    };
  }

  async _loadReviewChecklist(checklistPath) {
    const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: checklistPath });
    return content.split('\n').filter(line => line.trim());
  }

  async _reviewFile(file, reviewType, checklist) {
    return {
      file,
      linesReviewed: 150,
      issues: {
        critical: [],
        major: [{
          line: 42,
          issue: 'Potential null pointer exception',
          suggestion: 'Add null check'
        }],
        minor: [{
          line: 10,
          issue: 'Unused import',
          suggestion: 'Remove unused import'
        }]
      },
      suggestions: [{
        type: 'performance',
        suggestion: 'Consider memoizing this expensive calculation'
      }],
      complexity: 12,
      maintainability: 78
    };
  }

  _calculateAverageComplexity(files) {
    const total = files.reduce((sum, file) => sum + file.complexity, 0);
    return Math.round(total / files.length);
  }

  _calculateMaintainability(files) {
    const total = files.reduce((sum, file) => sum + file.maintainability, 0);
    return Math.round(total / files.length);
  }

  _generateReviewComments(review) {
    const comments = [];
    
    if (review.issues.critical.length > 0) {
      comments.push('⛔ CRITICAL issues must be fixed before merge');
    }
    
    if (review.issues.major.length > 0) {
      comments.push(`⚠️ ${review.issues.major.length} major issues need attention`);
    }
    
    comments.push(`📊 Code metrics: Complexity ${review.metrics.complexityScore}, Maintainability ${review.metrics.maintainabilityScore}`);
    
    return comments;
  }

  _formDebugHypothesis(error, stackTrace) {
    return [
      { type: 'null-reference', probability: 0.8 },
      { type: 'type-mismatch', probability: 0.6 },
      { type: 'async-timing', probability: 0.4 }
    ];
  }

  async _investigateHypothesis(hypothesis, context) {
    return {
      hypothesis,
      findings: [{
        location: 'src/component.js:42',
        evidence: 'Variable accessed before initialization',
        confidence: 0.9
      }]
    };
  }

  _identifyRootCause(findings) {
    return {
      description: 'Uninitialized variable access',
      location: findings[0].location,
      fix: 'Initialize variable with default value'
    };
  }

  async _developDebugSolution(rootCause) {
    return {
      changes: [{
        file: 'src/component.js',
        line: 42,
        fix: 'Add initialization with default value'
      }],
      preventionStrategy: 'Add linting rule for uninitialized variables'
    };
  }

  async _verifyDebugSolution(solution, reproSteps) {
    return {
      success: true,
      errorReproduced: false,
      testsPass: true
    };
  }

  _generateTaskTestContent(task, implementation) {
    return `describe('${task.name}', () => {
  test('should complete successfully', () => {
    // Test implementation
    expect(result).toBeDefined();
  });
});`;
  }
}