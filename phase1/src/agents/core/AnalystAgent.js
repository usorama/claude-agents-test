import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class AnalystAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'analyst-001',
      type: 'AnalystAgent',
      name: 'Mary',
      description: 'Insightful Analyst & Strategic Ideation Partner',
      capabilities: [
        AgentCapability.RESEARCH,
        AgentCapability.PLANNING,
        AgentCapability.DOCUMENTATION
      ],
      tools: [
        ClaudeCodeTool.WEB_SEARCH,
        ClaudeCodeTool.WEB_FETCH,
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.TASK
      ],
      ...config
    });
    
    this.persona = {
      role: 'Insightful Analyst & Strategic Ideation Partner',
      style: 'Analytical, inquisitive, creative, facilitative, objective, data-informed',
      identity: 'Strategic analyst specializing in brainstorming, market research, competitive analysis, and project briefing',
      focus: 'Research planning, ideation facilitation, strategic analysis, actionable insights',
      corePrinciples: [
        'Curiosity-Driven Inquiry',
        'Objective & Evidence-Based Analysis',
        'Strategic Contextualization',
        'Facilitate Clarity & Shared Understanding',
        'Creative Exploration & Divergent Thinking',
        'Structured & Methodical Approach',
        'Action-Oriented Outputs',
        'Collaborative Partnership',
        'Maintaining a Broad Perspective',
        'Integrity of Information'
      ]
    };
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Analyst executing task', { taskType });
    
    switch (taskType) {
      case 'create-project-brief':
        return await this._createProjectBrief(input);
        
      case 'perform-market-research':
        return await this._performMarketResearch(input);
        
      case 'create-competitor-analysis':
        return await this._createCompetitorAnalysis(input);
        
      case 'brainstorm':
        return await this._facilitateBrainstorming(input);
        
      case 'research-prompt':
        return await this._createResearchPrompt(input);
        
      case 'document-project':
        return await this._documentProject(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _createProjectBrief(input) {
    const { projectName, description, goals, constraints } = input;
    
    // Gather information through research
    const research = await this._gatherProjectResearch(projectName, description);
    
    // Structure the project brief
    const brief = {
      title: `Project Brief: ${projectName}`,
      createdBy: this.name,
      createdAt: new Date().toISOString(),
      sections: {
        executiveSummary: {
          title: 'Executive Summary',
          content: this._generateExecutiveSummary(projectName, description, goals)
        },
        background: {
          title: 'Background & Context',
          content: this._analyzeBackground(description, research)
        },
        objectives: {
          title: 'Project Objectives',
          content: this._structureObjectives(goals)
        },
        scope: {
          title: 'Scope & Deliverables',
          content: this._defineScope(goals, constraints)
        },
        constraints: {
          title: 'Constraints & Assumptions',
          content: this._documentConstraints(constraints)
        },
        successCriteria: {
          title: 'Success Criteria',
          content: this._defineSuccessCriteria(goals)
        },
        risks: {
          title: 'Initial Risk Assessment',
          content: this._assessInitialRisks(constraints, research)
        },
        nextSteps: {
          title: 'Recommended Next Steps',
          content: this._recommendNextSteps()
        }
      },
      metadata: {
        researchSources: research.sources || [],
        keyInsights: research.insights || [],
        marketContext: research.marketContext || {}
      }
    };
    
    // Save the brief
    const outputPath = path.join(
      this.contextManager.baseDir,
      '..',
      'output',
      'briefs',
      `${projectName.toLowerCase().replace(/\s+/g, '-')}-brief.json`
    );
    
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(brief, null, 2));
    
    this.logger.info('Project brief created', { projectName, outputPath });
    
    return {
      brief,
      outputPath,
      summary: `Created comprehensive project brief for "${projectName}" with ${Object.keys(brief.sections).length} sections`
    };
  }

  async _performMarketResearch(input) {
    const { topic, depth = 'comprehensive', focus = [] } = input;
    
    this.logger.info('Performing market research', { topic, depth });
    
    // Simulate web search for market data
    const searchResults = await this.invokeTool(ClaudeCodeTool.WEB_SEARCH, {
      query: `${topic} market analysis trends 2025`
    });
    
    // Structure research findings
    const research = {
      topic,
      timestamp: new Date().toISOString(),
      methodology: {
        approach: depth,
        focusAreas: focus,
        sourcesAnalyzed: searchResults.results?.length || 0
      },
      marketOverview: {
        size: this._estimateMarketSize(topic),
        growthRate: this._estimateGrowthRate(topic),
        keyTrends: this._identifyTrends(searchResults),
        majorPlayers: this._identifyPlayers(searchResults)
      },
      opportunities: this._identifyOpportunities(topic, searchResults),
      challenges: this._identifyChallenges(topic, searchResults),
      recommendations: this._generateRecommendations(topic, searchResults),
      sources: this._formatSources(searchResults)
    };
    
    return {
      research,
      summary: `Comprehensive market research on "${topic}" completed with ${research.marketOverview.keyTrends.length} key trends identified`
    };
  }

  async _createCompetitorAnalysis(input) {
    const { competitors, criteria = [], industry } = input;
    
    const analysis = {
      industry,
      analyzedAt: new Date().toISOString(),
      competitors: {}
    };
    
    // Analyze each competitor
    for (const competitor of competitors) {
      analysis.competitors[competitor] = {
        overview: await this._gatherCompetitorInfo(competitor),
        strengths: this._analyzeStrengths(competitor),
        weaknesses: this._analyzeWeaknesses(competitor),
        opportunities: this._identifyCompetitorOpportunities(competitor),
        threats: this._identifyCompetitorThreats(competitor),
        scoring: this._scoreCompetitor(competitor, criteria)
      };
    }
    
    // Comparative analysis
    analysis.comparison = {
      marketPositioning: this._comparePositioning(analysis.competitors),
      competitiveAdvantages: this._identifyAdvantages(analysis.competitors),
      gaps: this._identifyGaps(analysis.competitors),
      recommendations: this._strategicRecommendations(analysis.competitors)
    };
    
    return {
      analysis,
      summary: `Analyzed ${competitors.length} competitors in ${industry} across ${criteria.length || 'standard'} criteria`
    };
  }

  async _facilitateBrainstorming(input) {
    const { topic, participants = 1, duration = 30, techniques = ['mind-mapping'] } = input;
    
    const session = {
      topic,
      startTime: new Date().toISOString(),
      techniques,
      phases: []
    };
    
    // Divergent thinking phase
    session.phases.push({
      phase: 'Divergent Thinking',
      ideas: this._generateIdeas(topic, 20),
      prompts: this._generatePrompts(topic)
    });
    
    // Categorization phase
    session.phases.push({
      phase: 'Categorization',
      categories: this._categorizeIdeas(session.phases[0].ideas),
      themes: this._identifyThemes(session.phases[0].ideas)
    });
    
    // Convergent thinking phase
    session.phases.push({
      phase: 'Convergent Thinking',
      prioritized: this._prioritizeIdeas(session.phases[0].ideas),
      actionable: this._makeActionable(session.phases[0].ideas)
    });
    
    return {
      session,
      summary: `Brainstorming session on "${topic}" generated ${session.phases[0].ideas.length} ideas`,
      topIdeas: session.phases[2].prioritized.slice(0, 5)
    };
  }

  async _createResearchPrompt(input) {
    const { topic, depth = 'deep', aspects = [] } = input;
    
    const prompt = {
      topic,
      objective: `Conduct ${depth} research on ${topic}`,
      researchQuestions: this._generateResearchQuestions(topic, aspects),
      methodology: this._defineMethodology(depth),
      expectedOutputs: this._defineExpectedOutputs(depth),
      sources: this._recommendSources(topic),
      timeline: this._estimateTimeline(depth)
    };
    
    return {
      prompt,
      formatted: this._formatResearchPrompt(prompt)
    };
  }

  async _documentProject(input) {
    const { projectPath, scanDepth = 'full' } = input;
    
    // Analyze project structure
    const structure = await this._analyzeProjectStructure(projectPath);
    
    // Extract key information
    const documentation = {
      projectName: path.basename(projectPath),
      analyzedAt: new Date().toISOString(),
      overview: {
        type: this._identifyProjectType(structure),
        stack: this._identifyTechStack(structure),
        architecture: this._analyzeArchitecture(structure)
      },
      components: this._documentComponents(structure),
      dataFlow: this._analyzeDataFlow(structure),
      dependencies: this._analyzeDependencies(structure),
      recommendations: this._generateDocRecommendations(structure)
    };
    
    return {
      documentation,
      summary: `Documented project with ${documentation.components.length} components identified`
    };
  }

  // Helper methods
  async _gatherProjectResearch(projectName, description) {
    // Simulate research gathering
    return {
      sources: [`Industry report on ${projectName}`, 'Market analysis 2025'],
      insights: ['Growing market demand', 'Technology maturity'],
      marketContext: { size: '$1B', growth: '15%' }
    };
  }

  _generateExecutiveSummary(projectName, description, goals) {
    return `${projectName} aims to ${description}. Key objectives include ${goals.slice(0, 3).join(', ')}.`;
  }

  _analyzeBackground(description, research) {
    return `Market analysis indicates ${research.marketContext.growth} growth in this sector. ${description}`;
  }

  _structureObjectives(goals) {
    return goals.map((goal, i) => ({
      id: `OBJ-${i + 1}`,
      description: goal,
      measurable: this._makeMeasurable(goal)
    }));
  }

  _defineScope(goals, constraints) {
    return {
      included: goals.map(g => `Deliver ${g}`),
      excluded: ['Items outside core objectives'],
      constraints: constraints || []
    };
  }

  _documentConstraints(constraints) {
    return (constraints || []).map(c => ({
      type: this._categorizeConstraint(c),
      description: c,
      impact: this._assessImpact(c)
    }));
  }

  _defineSuccessCriteria(goals) {
    return goals.map(goal => ({
      criterion: `Successfully ${goal}`,
      measurement: this._defineMeasurement(goal),
      target: this._defineTarget(goal)
    }));
  }

  _assessInitialRisks(constraints, research) {
    const risks = [];
    if (constraints?.includes('budget')) {
      risks.push({ risk: 'Budget overrun', likelihood: 'Medium', impact: 'High' });
    }
    if (constraints?.includes('timeline')) {
      risks.push({ risk: 'Schedule delay', likelihood: 'Medium', impact: 'Medium' });
    }
    return risks;
  }

  _recommendNextSteps() {
    return [
      'Review and approve project brief with stakeholders',
      'Proceed to detailed requirements gathering with PM',
      'Begin technical architecture design with Architect',
      'Establish project team and communication channels'
    ];
  }

  // Placeholder methods for market research
  _estimateMarketSize(topic) {
    return '$10B - $50B'; // Placeholder
  }

  _estimateGrowthRate(topic) {
    return '12-15% CAGR'; // Placeholder
  }

  _identifyTrends(searchResults) {
    return [
      'AI/ML adoption increasing',
      'Cloud-first strategies',
      'Focus on user experience'
    ];
  }

  _identifyPlayers(searchResults) {
    return ['Market Leader A', 'Challenger B', 'Innovator C'];
  }

  _identifyOpportunities(topic, searchResults) {
    return ['Underserved market segment', 'Technology disruption potential'];
  }

  _identifyChallenges(topic, searchResults) {
    return ['High competition', 'Regulatory compliance'];
  }

  _generateRecommendations(topic, searchResults) {
    return ['Focus on differentiation', 'Invest in innovation'];
  }

  _formatSources(searchResults) {
    return searchResults.results?.map(r => ({
      title: r.title,
      url: r.url,
      relevance: 'High'
    })) || [];
  }

  // Additional helper methods would be implemented similarly...
  _makeMeasurable(goal) {
    return `Measurable outcome for: ${goal}`;
  }

  _categorizeConstraint(constraint) {
    if (constraint.includes('budget') || constraint.includes('cost')) return 'Financial';
    if (constraint.includes('time') || constraint.includes('deadline')) return 'Timeline';
    if (constraint.includes('tech') || constraint.includes('platform')) return 'Technical';
    return 'Other';
  }

  _assessImpact(constraint) {
    return 'Medium'; // Placeholder
  }

  _defineMeasurement(goal) {
    return `KPI for ${goal}`;
  }

  _defineTarget(goal) {
    return '100% completion';
  }

  _generateIdeas(topic, count) {
    return Array.from({ length: count }, (_, i) => `Idea ${i + 1} for ${topic}`);
  }

  _generatePrompts(topic) {
    return [
      `What if we approached ${topic} differently?`,
      `How might we solve ${topic} in an innovative way?`,
      `What are unconventional solutions for ${topic}?`
    ];
  }

  _categorizeIdeas(ideas) {
    return {
      innovative: ideas.slice(0, 5),
      practical: ideas.slice(5, 10),
      experimental: ideas.slice(10)
    };
  }

  _identifyThemes(ideas) {
    return ['Innovation', 'Efficiency', 'User Experience'];
  }

  _prioritizeIdeas(ideas) {
    return ideas.slice(0, 10); // Top 10
  }

  _makeActionable(ideas) {
    return ideas.slice(0, 5).map(idea => ({
      idea,
      nextSteps: ['Research feasibility', 'Create prototype', 'Test with users']
    }));
  }

  _generateResearchQuestions(topic, aspects) {
    return [
      `What is the current state of ${topic}?`,
      `What are the key challenges in ${topic}?`,
      `What opportunities exist in ${topic}?`,
      ...aspects.map(a => `How does ${a} relate to ${topic}?`)
    ];
  }

  _defineMethodology(depth) {
    return {
      approach: depth === 'deep' ? 'Comprehensive' : 'Focused',
      methods: ['Literature review', 'Market analysis', 'Expert interviews']
    };
  }

  _defineExpectedOutputs(depth) {
    return ['Executive summary', 'Detailed findings', 'Recommendations'];
  }

  _recommendSources(topic) {
    return ['Academic journals', 'Industry reports', 'News articles'];
  }

  _estimateTimeline(depth) {
    return depth === 'deep' ? '2-3 weeks' : '3-5 days';
  }

  _formatResearchPrompt(prompt) {
    return `Research Prompt: ${prompt.topic}\n\nObjective: ${prompt.objective}\n\nQuestions:\n${prompt.researchQuestions.join('\n')}`;
  }

  async _analyzeProjectStructure(projectPath) {
    // Placeholder - would use Glob and LS tools
    return {
      directories: ['src', 'tests', 'docs'],
      files: ['package.json', 'README.md'],
      totalFiles: 100
    };
  }

  _identifyProjectType(structure) {
    if (structure.files.includes('package.json')) return 'Node.js';
    if (structure.files.includes('requirements.txt')) return 'Python';
    return 'Unknown';
  }

  _identifyTechStack(structure) {
    return ['Node.js', 'React', 'PostgreSQL']; // Placeholder
  }

  _analyzeArchitecture(structure) {
    return 'Microservices architecture with REST APIs';
  }

  _documentComponents(structure) {
    return ['API Gateway', 'User Service', 'Database Layer'];
  }

  _analyzeDataFlow(structure) {
    return 'Client → API → Services → Database';
  }

  _analyzeDependencies(structure) {
    return { production: 20, development: 15 };
  }

  _generateDocRecommendations(structure) {
    return ['Add API documentation', 'Update README', 'Create architecture diagram'];
  }

  async _gatherCompetitorInfo(competitor) {
    return `${competitor} overview information`;
  }

  _analyzeStrengths(competitor) {
    return ['Market presence', 'Technology'];
  }

  _analyzeWeaknesses(competitor) {
    return ['Limited features', 'High pricing'];
  }

  _identifyCompetitorOpportunities(competitor) {
    return ['Market expansion', 'New features'];
  }

  _identifyCompetitorThreats(competitor) {
    return ['New entrants', 'Technology shifts'];
  }

  _scoreCompetitor(competitor, criteria) {
    return criteria.reduce((acc, c) => ({ ...acc, [c]: Math.random() * 10 }), {});
  }

  _comparePositioning(competitors) {
    return 'Market positioning analysis';
  }

  _identifyAdvantages(competitors) {
    return ['First mover advantage', 'Superior technology'];
  }

  _identifyGaps(competitors) {
    return ['Feature gaps', 'Market coverage gaps'];
  }

  _strategicRecommendations(competitors) {
    return ['Differentiate through innovation', 'Focus on underserved segments'];
  }
}