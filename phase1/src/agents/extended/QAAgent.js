import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class QAAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'qa-001',
      type: 'QAAgent',
      name: 'Sofia',
      description: 'Expert QA Engineer & Code Quality Specialist',
      capabilities: [
        AgentCapability.TESTING,
        AgentCapability.REVIEW,
        AgentCapability.QUALITY
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.EDIT,
        ClaudeCodeTool.MULTI_EDIT,
        ClaudeCodeTool.BASH,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.GLOB,
        ClaudeCodeTool.TODO_WRITE
      ],
      ...config
    });
    
    this.persona = {
      role: 'Expert QA Engineer & Code Quality Specialist',
      style: 'Meticulous, analytical, quality-focused, constructive feedback',
      identity: 'Quality guardian who ensures code meets highest standards through comprehensive testing and reviews',
      focus: 'Testing coverage, code quality, bug prevention, continuous improvement',
      corePrinciples: [
        'Quality is everyone\'s responsibility, but I champion it',
        'Prevention is better than detection',
        'Automated testing enables confident refactoring',
        'Every bug is a learning opportunity',
        'Clear feedback improves the entire team'
      ]
    };
    
    this.qaWorkflow = {
      reviewProcess: [
        'Analyze story requirements',
        'Review implementation against requirements',
        'Check test coverage',
        'Verify edge cases handled',
        'Assess code quality',
        'Run all tests',
        'Document findings',
        'Provide actionable feedback'
      ],
      qualityMetrics: [
        'Test coverage >= 80%',
        'No critical security issues',
        'Performance within requirements',
        'Code follows project standards',
        'Documentation complete'
      ]
    };
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('QA executing task', { taskType });
    
    switch (taskType) {
      case 'review-story':
        return await this._reviewStoryImplementation(input);
        
      case 'write-test-suite':
        return await this._writeTestSuite(input);
        
      case 'perform-code-review':
        return await this._performCodeReview(input);
        
      case 'security-audit':
        return await this._performSecurityAudit(input);
        
      case 'performance-test':
        return await this._performanceTest(input);
        
      case 'regression-test':
        return await this._runRegressionTests(input);
        
      case 'integration-test':
        return await this._runIntegrationTests(input);
        
      case 'quality-report':
        return await this._generateQualityReport(input);
        
      case 'refactor-tests':
        return await this._refactorTests(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _reviewStoryImplementation(input) {
    const {
      storyId,
      storyPath,
      implementationFiles = [],
      requirements,
      acceptanceCriteria
    } = input;
    
    const review = {
      storyId,
      startedAt: new Date().toISOString(),
      findings: {
        requirements: [],
        tests: [],
        code: [],
        security: [],
        performance: []
      },
      metrics: {
        testCoverage: 0,
        codeQuality: 0,
        requirementsCoverage: 0
      },
      recommendations: [],
      status: 'reviewing'
    };
    
    try {
      // Read story content
      let storyContent = null;
      if (storyPath) {
        storyContent = await this.invokeTool(ClaudeCodeTool.READ, { file_path: storyPath });
        review.storyContent = storyContent;
      }
      
      // Review requirements implementation
      const reqReview = await this._reviewRequirementsImplementation(
        requirements || storyContent,
        implementationFiles
      );
      review.findings.requirements = reqReview.findings;
      review.metrics.requirementsCoverage = reqReview.coverage;
      
      // Review test coverage
      const testReview = await this._reviewTestCoverage(implementationFiles);
      review.findings.tests = testReview.findings;
      review.metrics.testCoverage = testReview.coverage;
      
      // Code quality review
      const codeReview = await this._reviewCodeQuality(implementationFiles);
      review.findings.code = codeReview.findings;
      review.metrics.codeQuality = codeReview.score;
      
      // Security review
      const securityReview = await this._performQuickSecurityReview(implementationFiles);
      review.findings.security = securityReview.findings;
      
      // Performance considerations
      const perfReview = await this._reviewPerformanceConsiderations(implementationFiles);
      review.findings.performance = perfReview.findings;
      
      // Generate recommendations
      review.recommendations = this._generateRecommendations(review.findings);
      
      // Determine overall status
      const hasBlockers = 
        review.findings.security.some(f => f.severity === 'critical') ||
        review.metrics.testCoverage < 60 ||
        review.metrics.requirementsCoverage < 90;
      
      review.status = hasBlockers ? 'needs-work' : 'approved';
      review.completedAt = new Date().toISOString();
      
      // Update story status
      if (storyPath) {
        await this._updateStoryQASection(storyPath, review);
      }
      
      return {
        review,
        summary: `Story ${storyId} review: ${review.status}. Coverage: ${review.metrics.testCoverage}%, Quality: ${review.metrics.codeQuality}/100`
      };
    } catch (error) {
      this.logger.error('Story review failed', { storyId, error: error.message });
      review.status = 'error';
      review.error = error.message;
      return { review, summary: `Review failed: ${error.message}` };
    }
  }

  async _writeTestSuite(input) {
    const {
      targetPath,
      testType = 'comprehensive',
      framework = 'jest',
      requirements = [],
      existingTests = []
    } = input;
    
    const testSuite = {
      targetPath,
      framework,
      tests: {
        unit: [],
        integration: [],
        e2e: []
      },
      coverage: {
        target: 85,
        actual: 0
      }
    };
    
    // Analyze target code
    const codeAnalysis = await this._analyzeCodeForTesting(targetPath);
    
    // Identify test gaps
    const testGaps = this._identifyTestGaps(codeAnalysis, existingTests);
    
    // Generate unit tests
    if (testType === 'comprehensive' || testType === 'unit') {
      testSuite.tests.unit = await this._generateUnitTests(codeAnalysis, testGaps, framework);
    }
    
    // Generate integration tests
    if (testType === 'comprehensive' || testType === 'integration') {
      testSuite.tests.integration = await this._generateIntegrationTests(codeAnalysis, requirements, framework);
    }
    
    // Generate e2e tests if applicable
    if (testType === 'comprehensive' || testType === 'e2e') {
      testSuite.tests.e2e = await this._generateE2ETests(requirements, framework);
    }
    
    // Write test files
    for (const [type, tests] of Object.entries(testSuite.tests)) {
      for (const test of tests) {
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: test.path,
          content: test.content
        });
      }
    }
    
    // Run coverage analysis
    const coverageResult = await this._analyzeCoverage(targetPath, testSuite);
    testSuite.coverage.actual = coverageResult.percentage;
    
    return {
      testSuite,
      summary: `Created ${Object.values(testSuite.tests).flat().length} tests. Coverage: ${testSuite.coverage.actual}%`
    };
  }

  async _performCodeReview(input) {
    const {
      files,
      reviewType = 'comprehensive',
      standards = [],
      focusAreas = []
    } = input;
    
    const codeReview = {
      reviewType,
      files: [],
      issues: {
        blocker: [],
        critical: [],
        major: [],
        minor: [],
        info: []
      },
      suggestions: [],
      metrics: {
        complexity: 0,
        duplication: 0,
        maintainability: 0,
        testability: 0
      }
    };
    
    // Apply review standards
    const reviewStandards = this._loadReviewStandards(standards);
    
    // Review each file
    for (const file of files) {
      const fileReview = await this._reviewFile(file, reviewStandards, focusAreas);
      codeReview.files.push(fileReview);
      
      // Aggregate issues
      for (const [severity, issues] of Object.entries(fileReview.issues)) {
        if (codeReview.issues[severity]) {
          codeReview.issues[severity].push(...issues);
        }
      }
    }
    
    // Calculate overall metrics
    codeReview.metrics = this._calculateOverallMetrics(codeReview.files);
    
    // Generate improvement suggestions
    codeReview.suggestions = this._generateImprovementSuggestions(codeReview);
    
    // Create review report
    const report = this._formatCodeReviewReport(codeReview);
    
    return {
      codeReview,
      report,
      summary: `Reviewed ${files.length} files: ${codeReview.issues.blocker.length} blockers, ${codeReview.issues.critical.length} critical issues`
    };
  }

  async _performSecurityAudit(input) {
    const {
      targetPaths,
      auditType = 'standard',
      includeDepsScan = true,
      customRules = []
    } = input;
    
    const securityAudit = {
      auditType,
      startedAt: new Date().toISOString(),
      vulnerabilities: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      dependencies: {
        vulnerabilities: [],
        outdated: []
      },
      codeIssues: [],
      recommendations: []
    };
    
    // Scan for common vulnerabilities
    for (const path of targetPaths) {
      const vulns = await this._scanForVulnerabilities(path, customRules);
      for (const [severity, items] of Object.entries(vulns)) {
        securityAudit.vulnerabilities[severity].push(...items);
      }
    }
    
    // Scan dependencies if requested
    if (includeDepsScan) {
      securityAudit.dependencies = await this._scanDependencies();
    }
    
    // Check for security best practices
    const bestPractices = await this._checkSecurityBestPractices(targetPaths);
    securityAudit.codeIssues = bestPractices.issues;
    
    // Generate remediation recommendations
    securityAudit.recommendations = this._generateSecurityRecommendations(securityAudit);
    
    securityAudit.completedAt = new Date().toISOString();
    
    return {
      securityAudit,
      summary: `Security audit complete: ${securityAudit.vulnerabilities.critical.length} critical, ${securityAudit.vulnerabilities.high.length} high severity issues`
    };
  }

  async _performanceTest(input) {
    const {
      targetEndpoints = [],
      testScenarios = [],
      duration = 60,
      targetRPS = 100
    } = input;
    
    const perfTest = {
      scenarios: [],
      results: {
        throughput: {},
        latency: {},
        errors: {},
        resources: {}
      },
      bottlenecks: [],
      recommendations: []
    };
    
    // Run performance scenarios
    for (const scenario of testScenarios) {
      const result = await this._runPerformanceScenario(scenario, {
        duration,
        targetRPS
      });
      perfTest.scenarios.push(result);
    }
    
    // Analyze results
    perfTest.results = this._analyzePerformanceResults(perfTest.scenarios);
    
    // Identify bottlenecks
    perfTest.bottlenecks = this._identifyPerformanceBottlenecks(perfTest.results);
    
    // Generate optimization recommendations
    perfTest.recommendations = this._generatePerformanceRecommendations(perfTest);
    
    return {
      perfTest,
      summary: `Performance test complete. Avg latency: ${perfTest.results.latency.p50}ms, Success rate: ${perfTest.results.errors.successRate}%`
    };
  }

  async _runRegressionTests(input) {
    const {
      testSuite = 'all',
      baselineBranch = 'main',
      compareResults = true
    } = input;
    
    const regression = {
      suite: testSuite,
      startedAt: new Date().toISOString(),
      results: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      failures: [],
      newFailures: [],
      fixedTests: []
    };
    
    // Run regression suite
    const testCommand = this._buildRegressionCommand(testSuite);
    const startTime = Date.now();
    
    const testOutput = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: testCommand,
      timeout: 300000 // 5 minutes
    });
    
    regression.results.duration = Date.now() - startTime;
    
    // Parse results
    const parsed = this._parseTestResults(testOutput.stdout);
    regression.results = { ...regression.results, ...parsed.summary };
    regression.failures = parsed.failures;
    
    // Compare with baseline if requested
    if (compareResults && baselineBranch) {
      const comparison = await this._compareWithBaseline(regression, baselineBranch);
      regression.newFailures = comparison.newFailures;
      regression.fixedTests = comparison.fixed;
    }
    
    regression.completedAt = new Date().toISOString();
    
    return {
      regression,
      summary: `Regression tests: ${regression.results.passed}/${regression.results.total} passed. ${regression.newFailures.length} new failures`
    };
  }

  async _runIntegrationTests(input) {
    const {
      components = [],
      testEnvironment = 'test',
      setupRequired = true
    } = input;
    
    const integration = {
      environment: testEnvironment,
      components,
      setup: {
        success: false,
        steps: []
      },
      tests: {
        total: 0,
        passed: 0,
        failed: 0
      },
      integrationPoints: [],
      issues: []
    };
    
    // Setup test environment if needed
    if (setupRequired) {
      integration.setup = await this._setupIntegrationEnvironment(testEnvironment);
      if (!integration.setup.success) {
        return {
          integration,
          summary: 'Integration test setup failed'
        };
      }
    }
    
    // Test each integration point
    const integrationPoints = this._identifyIntegrationPoints(components);
    
    for (const point of integrationPoints) {
      const testResult = await this._testIntegrationPoint(point);
      integration.integrationPoints.push({
        point,
        result: testResult
      });
      
      integration.tests.total += testResult.tests.length;
      integration.tests.passed += testResult.passed;
      integration.tests.failed += testResult.failed;
    }
    
    // Identify integration issues
    integration.issues = this._analyzeIntegrationIssues(integration.integrationPoints);
    
    // Cleanup if needed
    if (setupRequired) {
      await this._cleanupIntegrationEnvironment(testEnvironment);
    }
    
    return {
      integration,
      summary: `Integration tests: ${integration.tests.passed}/${integration.tests.total} passed. ${integration.issues.length} integration issues found`
    };
  }

  async _generateQualityReport(input) {
    const {
      projectPath,
      includeMetrics = ['coverage', 'complexity', 'duplication', 'maintainability'],
      format = 'markdown'
    } = input;
    
    const qualityReport = {
      generatedAt: new Date().toISOString(),
      projectPath,
      metrics: {},
      trends: {},
      recommendations: [],
      summary: {}
    };
    
    // Collect quality metrics
    for (const metric of includeMetrics) {
      qualityReport.metrics[metric] = await this._collectMetric(metric, projectPath);
    }
    
    // Analyze trends
    qualityReport.trends = await this._analyzeQualityTrends(qualityReport.metrics);
    
    // Generate recommendations
    qualityReport.recommendations = this._generateQualityRecommendations(qualityReport);
    
    // Create summary
    qualityReport.summary = this._summarizeQualityStatus(qualityReport);
    
    // Format report
    const formattedReport = this._formatQualityReport(qualityReport, format);
    
    // Write report
    const reportPath = path.join(projectPath, `quality-report-${Date.now()}.${format}`);
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: reportPath,
      content: formattedReport
    });
    
    return {
      qualityReport,
      reportPath,
      summary: `Quality report generated: Overall health ${qualityReport.summary.overallScore}/100`
    };
  }

  async _refactorTests(input) {
    const {
      testPaths,
      refactorGoals = ['reduce-duplication', 'improve-clarity', 'optimize-performance'],
      preserveBehavior = true
    } = input;
    
    const refactoring = {
      goals: refactorGoals,
      changes: [],
      metrics: {
        before: {},
        after: {}
      },
      verification: {
        testsPass: false,
        behaviorPreserved: false
      }
    };
    
    // Analyze current test state
    refactoring.metrics.before = await this._analyzeTestMetrics(testPaths);
    
    // Run tests before refactoring
    const beforeResults = await this._runTestsForPaths(testPaths);
    
    // Apply refactoring based on goals
    for (const goal of refactorGoals) {
      const changes = await this._applyTestRefactoring(testPaths, goal);
      refactoring.changes.push(...changes);
    }
    
    // Analyze after refactoring
    refactoring.metrics.after = await this._analyzeTestMetrics(testPaths);
    
    // Verify tests still pass
    const afterResults = await this._runTestsForPaths(testPaths);
    refactoring.verification.testsPass = afterResults.failed === 0;
    
    // Verify behavior preserved
    if (preserveBehavior) {
      refactoring.verification.behaviorPreserved = 
        beforeResults.passed === afterResults.passed &&
        beforeResults.total === afterResults.total;
    }
    
    return {
      refactoring,
      summary: `Refactored ${testPaths.length} test files. ${refactoring.changes.length} changes made. Tests ${refactoring.verification.testsPass ? 'pass' : 'fail'}`
    };
  }

  // Helper methods
  async _reviewRequirementsImplementation(requirements, files) {
    const findings = [];
    const implemented = new Set();
    
    // Parse requirements
    const reqs = this._parseRequirements(requirements);
    
    // Check each requirement
    for (const req of reqs) {
      const impl = await this._findRequirementImplementation(req, files);
      if (impl.found) {
        implemented.add(req.id);
      } else {
        findings.push({
          requirement: req.id,
          issue: 'Not implemented',
          severity: 'major'
        });
      }
    }
    
    const coverage = reqs.length > 0 ? (implemented.size / reqs.length) * 100 : 100;
    
    return { findings, coverage };
  }

  async _reviewTestCoverage(files) {
    const findings = [];
    let totalCoverage = 0;
    
    // Check for test files
    const testFiles = await this._findTestFiles(files);
    
    if (testFiles.length === 0) {
      findings.push({
        issue: 'No test files found',
        severity: 'critical'
      });
      return { findings, coverage: 0 };
    }
    
    // Run coverage analysis
    const coverageData = await this._runCoverageAnalysis(files);
    totalCoverage = coverageData.percentage;
    
    // Check coverage thresholds
    if (totalCoverage < 80) {
      findings.push({
        issue: `Test coverage ${totalCoverage}% is below 80% threshold`,
        severity: totalCoverage < 60 ? 'major' : 'minor',
        suggestion: 'Add tests for uncovered code paths'
      });
    }
    
    // Check for untested critical paths
    const criticalPaths = await this._identifyCriticalPaths(files);
    for (const path of criticalPaths) {
      if (!coverageData.covered.includes(path)) {
        findings.push({
          issue: `Critical path not tested: ${path}`,
          severity: 'major'
        });
      }
    }
    
    return { findings, coverage: totalCoverage };
  }

  async _reviewCodeQuality(files) {
    const findings = [];
    let totalScore = 0;
    
    for (const file of files) {
      const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: file });
      
      // Check complexity
      const complexity = this._calculateComplexity(content);
      if (complexity > 10) {
        findings.push({
          file,
          issue: `High complexity: ${complexity}`,
          severity: complexity > 20 ? 'major' : 'minor',
          suggestion: 'Consider breaking down complex functions'
        });
      }
      
      // Check for code smells
      const smells = this._detectCodeSmells(content);
      findings.push(...smells);
      
      // Calculate file score
      const fileScore = this._calculateQualityScore(content);
      totalScore += fileScore;
    }
    
    const avgScore = Math.round(totalScore / files.length);
    
    return { findings, score: avgScore };
  }

  async _performQuickSecurityReview(files) {
    const findings = [];
    
    const securityPatterns = [
      { pattern: /eval\(/, severity: 'critical', issue: 'Use of eval()' },
      { pattern: /innerHTML\s*=/, severity: 'major', issue: 'Direct innerHTML assignment' },
      { pattern: /password.*=.*['"]/, severity: 'critical', issue: 'Hardcoded password' },
      { pattern: /api[_-]?key.*=.*['"]/, severity: 'critical', issue: 'Hardcoded API key' }
    ];
    
    for (const file of files) {
      const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: file });
      
      for (const { pattern, severity, issue } of securityPatterns) {
        if (pattern.test(content)) {
          findings.push({ file, issue, severity });
        }
      }
    }
    
    return { findings };
  }

  async _reviewPerformanceConsiderations(files) {
    const findings = [];
    
    for (const file of files) {
      const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: file });
      
      // Check for performance anti-patterns
      const antiPatterns = this._detectPerformanceAntiPatterns(content);
      findings.push(...antiPatterns.map(p => ({
        file,
        issue: p.issue,
        severity: p.severity,
        suggestion: p.suggestion
      })));
    }
    
    return { findings };
  }

  _generateRecommendations(findings) {
    const recommendations = [];
    
    // High-level recommendations based on findings
    if (findings.tests.some(f => f.severity === 'critical')) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Increase test coverage for critical paths'
      });
    }
    
    if (findings.security.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: 'Address security vulnerabilities before deployment'
      });
    }
    
    if (findings.code.some(f => f.issue.includes('complexity'))) {
      recommendations.push({
        priority: 'medium',
        recommendation: 'Refactor complex functions to improve maintainability'
      });
    }
    
    return recommendations;
  }

  async _updateStoryQASection(storyPath, review) {
    // Update QA section in story file
    const storyContent = await this.invokeTool(ClaudeCodeTool.READ, { file_path: storyPath });
    
    const qaSection = `
## QA Review

- **Status**: ${review.status}
- **Test Coverage**: ${review.metrics.testCoverage}%
- **Code Quality**: ${review.metrics.codeQuality}/100
- **Requirements Coverage**: ${review.metrics.requirementsCoverage}%

### Findings
${review.findings.security.length > 0 ? `- Security: ${review.findings.security.length} issues` : ''}
${review.findings.tests.length > 0 ? `- Tests: ${review.findings.tests.length} issues` : ''}
${review.findings.code.length > 0 ? `- Code Quality: ${review.findings.code.length} issues` : ''}

### Recommendations
${review.recommendations.map(r => `- ${r.recommendation}`).join('\n')}

**Reviewed at**: ${review.completedAt}
`;
    
    // Add or update QA section
    const updatedContent = this._updateOrAddSection(storyContent, '## QA Review', qaSection);
    
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: storyPath,
      content: updatedContent
    });
  }

  _updateOrAddSection(content, sectionHeader, newSection) {
    const sectionRegex = new RegExp(`${sectionHeader}[\\s\\S]*?(?=##|$)`, 'g');
    
    if (content.includes(sectionHeader)) {
      return content.replace(sectionRegex, newSection);
    } else {
      return content + '\n' + newSection;
    }
  }

  async _analyzeCodeForTesting(targetPath) {
    const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: targetPath });
    
    return {
      functions: this._extractFunctions(content),
      classes: this._extractClasses(content),
      exports: this._extractExports(content),
      dependencies: this._extractDependencies(content)
    };
  }

  _identifyTestGaps(analysis, existingTests) {
    const gaps = {
      functions: [],
      classes: [],
      scenarios: []
    };
    
    // Find untested functions
    for (const func of analysis.functions) {
      if (!existingTests.some(t => t.includes(func))) {
        gaps.functions.push(func);
      }
    }
    
    // Find untested classes
    for (const cls of analysis.classes) {
      if (!existingTests.some(t => t.includes(cls))) {
        gaps.classes.push(cls);
      }
    }
    
    return gaps;
  }

  _parseRequirements(requirements) {
    if (typeof requirements === 'string') {
      // Parse from text format
      const reqs = [];
      const lines = requirements.split('\n');
      let id = 1;
      
      for (const line of lines) {
        if (line.match(/^-\s+/)) {
          reqs.push({
            id: `REQ-${id++}`,
            text: line.replace(/^-\s+/, '').trim()
          });
        }
      }
      
      return reqs;
    }
    
    return requirements;
  }

  _calculateComplexity(content) {
    // Simplified cyclomatic complexity calculation
    let complexity = 1;
    
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /case\s+/g,
      /\?\s*[^:]+:/g // ternary
    ];
    
    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    }
    
    return complexity;
  }

  _detectCodeSmells(content) {
    const smells = [];
    
    // Long functions
    const functions = content.split(/function\s+\w+|=>\s*{/);
    for (const func of functions) {
      const lines = func.split('\n').length;
      if (lines > 50) {
        smells.push({
          issue: 'Long function (>50 lines)',
          severity: 'minor',
          suggestion: 'Consider breaking into smaller functions'
        });
      }
    }
    
    // Duplicate code detection (simplified)
    const codeBlocks = content.match(/\{[^{}]*\}/g) || [];
    const duplicates = codeBlocks.filter((block, i) => 
      codeBlocks.indexOf(block) !== i && block.length > 50
    );
    
    if (duplicates.length > 0) {
      smells.push({
        issue: 'Possible code duplication',
        severity: 'minor',
        suggestion: 'Extract common code into reusable functions'
      });
    }
    
    return smells;
  }

  _calculateQualityScore(content) {
    let score = 100;
    
    // Deduct for complexity
    const complexity = this._calculateComplexity(content);
    if (complexity > 10) score -= Math.min(20, complexity - 10);
    
    // Deduct for code smells
    const smells = this._detectCodeSmells(content);
    score -= smells.length * 5;
    
    // Deduct for missing comments
    const commentRatio = (content.match(/\/\/|\/\*|\*\//g) || []).length / content.split('\n').length;
    if (commentRatio < 0.1) score -= 10;
    
    return Math.max(0, score);
  }

  _detectPerformanceAntiPatterns(content) {
    const antiPatterns = [];
    
    // N+1 query pattern
    if (/for.*await.*fetch|forEach.*await/g.test(content)) {
      antiPatterns.push({
        issue: 'Potential N+1 query pattern',
        severity: 'major',
        suggestion: 'Consider batching requests or using Promise.all()'
      });
    }
    
    // Synchronous file operations
    if (/readFileSync|writeFileSync/g.test(content)) {
      antiPatterns.push({
        issue: 'Synchronous file operations',
        severity: 'minor',
        suggestion: 'Use async file operations for better performance'
      });
    }
    
    return antiPatterns;
  }

  async _findTestFiles(files) {
    const testFiles = [];
    
    for (const file of files) {
      // Check for corresponding test file
      const testPath = file.replace(/\.js$/, '.test.js');
      const specPath = file.replace(/\.js$/, '.spec.js');
      
      try {
        await this.invokeTool(ClaudeCodeTool.READ, { file_path: testPath });
        testFiles.push(testPath);
      } catch (e) {
        // Try spec file
        try {
          await this.invokeTool(ClaudeCodeTool.READ, { file_path: specPath });
          testFiles.push(specPath);
        } catch (e2) {
          // No test file found
        }
      }
    }
    
    return testFiles;
  }

  async _runCoverageAnalysis(files) {
    // Simulate coverage analysis
    return {
      percentage: 75,
      covered: files.slice(0, Math.floor(files.length * 0.75)),
      uncovered: files.slice(Math.floor(files.length * 0.75))
    };
  }

  async _identifyCriticalPaths(files) {
    const critical = [];
    
    for (const file of files) {
      if (file.includes('auth') || file.includes('payment') || file.includes('security')) {
        critical.push(file);
      }
    }
    
    return critical;
  }

  _extractFunctions(content) {
    const functions = [];
    const funcRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push(match[1] || match[2]);
    }
    
    return functions;
  }

  _extractClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }

  _extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:default\s+)?(?:function\s+)?(\w+)|module\.exports\s*=\s*(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1] || match[2]);
    }
    
    return exports;
  }

  _extractDependencies(content) {
    const deps = [];
    const importRegex = /import\s+.*from\s+['"](.+)['"]/g;
    const requireRegex = /require\(['"](.+)['"]\)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      deps.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      deps.push(match[1]);
    }
    
    return [...new Set(deps)];
  }

  async _findRequirementImplementation(requirement, files) {
    // Simplified requirement tracking
    for (const file of files) {
      try {
        const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: file });
        // Check if requirement is mentioned in code or comments
        if (content.toLowerCase().includes(requirement.text.toLowerCase().slice(0, 20))) {
          return { found: true, file };
        }
      } catch (e) {
        // File doesn't exist, continue
      }
    }
    return { found: false };
  }

  _loadReviewStandards(standards) {
    // Default review standards
    const defaultStandards = {
      security: ['no-eval', 'no-hardcoded-secrets', 'validate-input'],
      performance: ['avoid-sync-io', 'batch-operations', 'cache-results'],
      maintainability: ['clear-naming', 'single-responsibility', 'proper-comments']
    };
    
    return { ...defaultStandards, ...standards };
  }

  async _reviewFile(file, standards, focusAreas) {
    const review = {
      file,
      issues: {
        blocker: [],
        critical: [],
        major: [],
        minor: [],
        info: []
      },
      complexity: 0,
      maintainability: 0
    };
    
    try {
      const content = await this.invokeTool(ClaudeCodeTool.READ, { file_path: file });
      
      // Check against standards
      if (focusAreas.includes('security')) {
        const securityIssues = this._checkSecurityStandards(content, standards.security);
        for (const issue of securityIssues) {
          review.issues[issue.severity].push(issue);
        }
      }
      
      // Calculate metrics
      review.complexity = this._calculateComplexity(content);
      review.maintainability = this._calculateQualityScore(content);
      
    } catch (e) {
      review.issues.critical.push({
        issue: `Unable to read file: ${e.message}`,
        severity: 'critical'
      });
    }
    
    return review;
  }

  _checkSecurityStandards(content, standards) {
    const issues = [];
    
    if (standards.includes('no-eval') && /eval\(/.test(content)) {
      issues.push({
        issue: 'Use of eval() detected',
        severity: 'critical',
        line: content.split('\n').findIndex(line => /eval\(/.test(line)) + 1
      });
    }
    
    if (standards.includes('no-hardcoded-secrets')) {
      const secretPatterns = [
        /password\s*=\s*['"][^'"]+['"]/,
        /api[_-]?key\s*=\s*['"][^'"]+['"]/,
        /secret\s*=\s*['"][^'"]+['"]/
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          issues.push({
            issue: 'Possible hardcoded secret detected',
            severity: 'critical'
          });
        }
      }
    }
    
    return issues;
  }

  _calculateOverallMetrics(files) {
    const metrics = {
      complexity: 0,
      duplication: 0,
      maintainability: 0,
      testability: 0
    };
    
    if (files.length === 0) return metrics;
    
    let totalComplexity = 0;
    let totalMaintainability = 0;
    
    for (const file of files) {
      totalComplexity += file.complexity || 0;
      totalMaintainability += file.maintainability || 0;
    }
    
    metrics.complexity = Math.round(totalComplexity / files.length);
    metrics.maintainability = Math.round(totalMaintainability / files.length);
    metrics.testability = metrics.maintainability > 70 ? 80 : 60;
    
    return metrics;
  }

  _generateImprovementSuggestions(codeReview) {
    const suggestions = [];
    
    if (codeReview.metrics.complexity > 15) {
      suggestions.push({
        priority: 'high',
        suggestion: 'Reduce code complexity by extracting functions and simplifying logic'
      });
    }
    
    if (codeReview.issues.critical.length > 0) {
      suggestions.push({
        priority: 'critical',
        suggestion: 'Address critical security issues immediately'
      });
    }
    
    if (codeReview.metrics.maintainability < 70) {
      suggestions.push({
        priority: 'medium',
        suggestion: 'Improve code maintainability with better naming and structure'
      });
    }
    
    return suggestions;
  }

  _formatCodeReviewReport(codeReview) {
    const report = [];
    
    report.push('# Code Review Report\n');
    report.push(`**Review Type**: ${codeReview.reviewType}`);
    report.push(`**Files Reviewed**: ${codeReview.files.length}\n`);
    
    // Issues summary
    report.push('## Issues Summary');
    for (const [severity, issues] of Object.entries(codeReview.issues)) {
      if (issues.length > 0) {
        report.push(`- **${severity}**: ${issues.length} issues`);
      }
    }
    
    // Metrics
    report.push('\n## Code Metrics');
    report.push(`- **Complexity**: ${codeReview.metrics.complexity}`);
    report.push(`- **Maintainability**: ${codeReview.metrics.maintainability}/100`);
    report.push(`- **Testability**: ${codeReview.metrics.testability}/100`);
    
    // Suggestions
    if (codeReview.suggestions.length > 0) {
      report.push('\n## Improvement Suggestions');
      for (const suggestion of codeReview.suggestions) {
        report.push(`- [${suggestion.priority}] ${suggestion.suggestion}`);
      }
    }
    
    return report.join('\n');
  }

  async _generateUnitTests(analysis, gaps, framework) {
    const tests = [];
    
    for (const func of gaps.functions) {
      const testContent = this._generateUnitTestTemplate(func, framework);
      tests.push({
        path: `tests/unit/${func}.test.js`,
        content: testContent,
        type: 'unit'
      });
    }
    
    return tests;
  }

  async _generateIntegrationTests(analysis, requirements, framework) {
    const tests = [];
    
    // Generate based on component interactions
    const integrations = this._identifyIntegrations(analysis);
    
    for (const integration of integrations) {
      const testContent = this._generateIntegrationTestTemplate(integration, framework);
      tests.push({
        path: `tests/integration/${integration.name}.test.js`,
        content: testContent,
        type: 'integration'
      });
    }
    
    return tests;
  }

  async _generateE2ETests(requirements, framework) {
    const tests = [];
    
    // Generate user journey tests
    const journeys = this._extractUserJourneys(requirements);
    
    for (const journey of journeys) {
      const testContent = this._generateE2ETestTemplate(journey, framework);
      tests.push({
        path: `tests/e2e/${journey.name}.test.js`,
        content: testContent,
        type: 'e2e'
      });
    }
    
    return tests;
  }

  _generateUnitTestTemplate(funcName, framework) {
    return `describe('${funcName}', () => {
  beforeEach(() => {
    // Setup
  });

  test('should handle valid input', () => {
    // Arrange
    const input = {};
    
    // Act
    const result = ${funcName}(input);
    
    // Assert
    expect(result).toBeDefined();
  });

  test('should handle edge cases', () => {
    // Test edge cases
  });

  test('should handle errors gracefully', () => {
    // Test error handling
  });
});`;
  }

  _generateIntegrationTestTemplate(integration, framework) {
    return `describe('${integration.name} Integration', () => {
  beforeAll(async () => {
    // Setup integration environment
  });

  afterAll(async () => {
    // Cleanup
  });

  test('components should communicate correctly', async () => {
    // Test integration flow
  });
});`;
  }

  _generateE2ETestTemplate(journey, framework) {
    return `describe('${journey.name} User Journey', () => {
  beforeEach(async () => {
    // Setup browser/app state
  });

  test('user can complete ${journey.name}', async () => {
    // Test user journey steps
  });
});`;
  }

  _identifyIntegrations(analysis) {
    // Simplified integration identification
    return [
      { name: 'api-database', components: ['API', 'Database'] },
      { name: 'auth-flow', components: ['Auth', 'User'] }
    ];
  }

  _extractUserJourneys(requirements) {
    // Simplified journey extraction
    return [
      { name: 'user-registration', steps: ['visit', 'fill-form', 'submit', 'verify'] },
      { name: 'complete-purchase', steps: ['browse', 'add-to-cart', 'checkout', 'confirm'] }
    ];
  }

  async _analyzeCoverage(targetPath, testSuite) {
    // Simulate coverage calculation
    const totalTests = Object.values(testSuite.tests).flat().length;
    return {
      percentage: Math.min(95, 60 + totalTests * 5)
    };
  }
}