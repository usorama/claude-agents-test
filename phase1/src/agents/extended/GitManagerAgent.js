import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class GitManagerAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'git-manager-001',
      type: 'GitManagerAgent',
      name: 'Vera',
      description: 'Expert Git & Version Control Specialist',
      capabilities: [
        AgentCapability.VERSION_CONTROL,
        AgentCapability.DOCUMENTATION
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.EDIT,
        ClaudeCodeTool.BASH,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.GLOB,
        ClaudeCodeTool.TODO_WRITE
      ],
      ...config
    });
    
    this.persona = {
      role: 'Expert Git & Version Control Specialist',
      style: 'Precise, methodical, history-conscious, collaborative',
      identity: 'Version control expert who ensures clean git history and smooth collaboration',
      focus: 'Branch management, commit quality, merge strategies, release management',
      corePrinciples: [
        'Clean git history tells the story of the project',
        'Atomic commits with clear messages',
        'Feature branches keep main stable',
        'Merge conflicts are opportunities to collaborate',
        'Tags and releases preserve important milestones'
      ]
    };
    
    this.gitWorkflow = {
      branchingStrategy: 'git-flow',
      commitStandards: 'conventional-commits',
      mergeStrategy: 'squash-and-merge',
      releaseProcess: [
        'Create release branch',
        'Update version numbers',
        'Generate changelog',
        'Create tag',
        'Merge to main',
        'Deploy'
      ]
    };
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Git Manager executing task', { taskType });
    
    switch (taskType) {
      case 'create-branch':
        return await this._createBranch(input);
        
      case 'commit-changes':
        return await this._commitChanges(input);
        
      case 'create-pull-request':
        return await this._createPullRequest(input);
        
      case 'manage-merge':
        return await this._manageMerge(input);
        
      case 'create-release':
        return await this._createRelease(input);
        
      case 'resolve-conflicts':
        return await this._resolveConflicts(input);
        
      case 'analyze-history':
        return await this._analyzeHistory(input);
        
      case 'setup-hooks':
        return await this._setupGitHooks(input);
        
      case 'cleanup-branches':
        return await this._cleanupBranches(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _createBranch(input) {
    const {
      branchName,
      fromBranch = 'main',
      branchType = 'feature',
      description
    } = input;
    
    const branch = {
      name: this._formatBranchName(branchType, branchName),
      type: branchType,
      fromBranch,
      createdAt: new Date().toISOString(),
      status: 'creating'
    };
    
    try {
      // Ensure we're on the latest version of the base branch
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `git checkout ${fromBranch} && git pull origin ${fromBranch}`,
        description: `Update ${fromBranch} branch`
      });
      
      // Create and checkout new branch
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `git checkout -b ${branch.name}`,
        description: `Create branch ${branch.name}`
      });
      
      // Push branch to remote with upstream tracking
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `git push -u origin ${branch.name}`,
        description: 'Push branch to remote'
      });
      
      // Create branch documentation if needed
      if (description) {
        const branchDoc = this._generateBranchDocumentation(branch, description);
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: `.git/branch-docs/${branch.name}.md`,
          content: branchDoc
        });
      }
      
      branch.status = 'created';
      
      return {
        branch,
        summary: `Created branch ${branch.name} from ${fromBranch}`
      };
    } catch (error) {
      this.logger.error('Branch creation failed', { branchName, error: error.message });
      branch.status = 'failed';
      branch.error = error.message;
      return { branch, summary: `Failed to create branch: ${error.message}` };
    }
  }

  async _commitChanges(input) {
    const {
      message,
      files = [],
      type = 'feat',
      scope,
      breaking = false,
      amend = false
    } = input;
    
    const commit = {
      message: this._formatCommitMessage(type, scope, message, breaking),
      files: [],
      hash: null,
      status: 'preparing'
    };
    
    try {
      // Get current status
      const status = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'git status --porcelain',
        description: 'Check git status'
      });
      
      // Stage files
      if (files.length > 0) {
        // Stage specific files
        for (const file of files) {
          await this.invokeTool(ClaudeCodeTool.BASH, {
            command: `git add "${file}"`,
            description: `Stage ${file}`
          });
          commit.files.push(file);
        }
      } else {
        // Stage all changes
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: 'git add -A',
          description: 'Stage all changes'
        });
        
        // Parse staged files from status
        commit.files = this._parseStagedFiles(status.stdout);
      }
      
      // Run pre-commit checks
      const preCommitCheck = await this._runPreCommitChecks();
      if (!preCommitCheck.passed) {
        throw new Error(`Pre-commit checks failed: ${preCommitCheck.errors.join(', ')}`);
      }
      
      // Create commit
      const commitCommand = amend 
        ? `git commit --amend -m "${commit.message}"`
        : `git commit -m "${commit.message}"`;
      
      const commitResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: commitCommand,
        description: amend ? 'Amend commit' : 'Create commit'
      });
      
      // Get commit hash
      const hashResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'git rev-parse HEAD',
        description: 'Get commit hash'
      });
      commit.hash = hashResult.stdout.trim();
      
      commit.status = 'completed';
      
      return {
        commit,
        summary: `Committed ${commit.files.length} files: ${commit.message}`
      };
    } catch (error) {
      this.logger.error('Commit failed', { message, error: error.message });
      commit.status = 'failed';
      commit.error = error.message;
      return { commit, summary: `Commit failed: ${error.message}` };
    }
  }

  async _createPullRequest(input) {
    const {
      title,
      description,
      fromBranch,
      toBranch = 'main',
      reviewers = [],
      labels = [],
      draft = false
    } = input;
    
    const pullRequest = {
      title,
      fromBranch: fromBranch || await this._getCurrentBranch(),
      toBranch,
      number: null,
      url: null,
      status: 'creating'
    };
    
    try {
      // Push latest changes
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `git push origin ${pullRequest.fromBranch}`,
        description: 'Push branch changes'
      });
      
      // Get commit comparison
      const comparison = await this._getCommitComparison(pullRequest.fromBranch, toBranch);
      
      // Generate PR body
      const prBody = this._generatePRBody(description, comparison);
      
      // Create PR using gh CLI
      const prCommand = [
        'gh pr create',
        `--title "${title}"`,
        `--body "${prBody}"`,
        `--base ${toBranch}`,
        `--head ${pullRequest.fromBranch}`,
        draft ? '--draft' : '',
        reviewers.length > 0 ? `--reviewer ${reviewers.join(',')}` : '',
        labels.length > 0 ? `--label ${labels.join(',')}` : ''
      ].filter(Boolean).join(' ');
      
      const prResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: prCommand,
        description: 'Create pull request'
      });
      
      // Parse PR number and URL from output
      const prInfo = this._parsePRInfo(prResult.stdout);
      pullRequest.number = prInfo.number;
      pullRequest.url = prInfo.url;
      
      // Add PR template if needed
      if (comparison.hasBreakingChanges) {
        await this._addBreakingChangeNotice(pullRequest.number);
      }
      
      pullRequest.status = 'created';
      
      return {
        pullRequest,
        summary: `Created PR #${pullRequest.number}: ${title}`
      };
    } catch (error) {
      this.logger.error('PR creation failed', { title, error: error.message });
      pullRequest.status = 'failed';
      pullRequest.error = error.message;
      return { pullRequest, summary: `PR creation failed: ${error.message}` };
    }
  }

  async _manageMerge(input) {
    const {
      prNumber,
      mergeStrategy = 'squash',
      deleteBranch = true,
      skipChecks = false
    } = input;
    
    const merge = {
      prNumber,
      strategy: mergeStrategy,
      startedAt: new Date().toISOString(),
      checks: {},
      status: 'checking'
    };
    
    try {
      // Get PR details
      const prDetails = await this._getPRDetails(prNumber);
      merge.fromBranch = prDetails.headBranch;
      merge.toBranch = prDetails.baseBranch;
      
      // Run merge checks
      if (!skipChecks) {
        merge.checks = await this._runMergeChecks(prNumber);
        if (!merge.checks.allPassed) {
          throw new Error(`Merge checks failed: ${merge.checks.failures.join(', ')}`);
        }
      }
      
      // Perform merge based on strategy
      let mergeCommand;
      switch (mergeStrategy) {
        case 'squash':
          mergeCommand = `gh pr merge ${prNumber} --squash --auto`;
          break;
        case 'merge':
          mergeCommand = `gh pr merge ${prNumber} --merge --auto`;
          break;
        case 'rebase':
          mergeCommand = `gh pr merge ${prNumber} --rebase --auto`;
          break;
        default:
          throw new Error(`Unknown merge strategy: ${mergeStrategy}`);
      }
      
      if (deleteBranch) {
        mergeCommand += ' --delete-branch';
      }
      
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: mergeCommand,
        description: `Merge PR #${prNumber}`
      });
      
      // Update local main branch
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'git checkout main && git pull origin main',
        description: 'Update main branch'
      });
      
      merge.status = 'completed';
      merge.completedAt = new Date().toISOString();
      
      return {
        merge,
        summary: `Merged PR #${prNumber} using ${mergeStrategy} strategy`
      };
    } catch (error) {
      this.logger.error('Merge failed', { prNumber, error: error.message });
      merge.status = 'failed';
      merge.error = error.message;
      return { merge, summary: `Merge failed: ${error.message}` };
    }
  }

  async _createRelease(input) {
    const {
      version,
      releaseType = 'minor',
      generateChangelog = true,
      createTag = true,
      draft = false
    } = input;
    
    const release = {
      version: version || await this._getNextVersion(releaseType),
      tag: null,
      changelog: null,
      artifacts: [],
      status: 'preparing'
    };
    
    try {
      // Create release branch
      await this._createBranch({
        branchName: release.version,
        branchType: 'release',
        fromBranch: 'main'
      });
      
      // Update version files
      await this._updateVersionFiles(release.version);
      
      // Generate changelog if requested
      if (generateChangelog) {
        release.changelog = await this._generateChangelog(release.version);
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: 'CHANGELOG.md',
          content: release.changelog
        });
      }
      
      // Commit version changes
      await this._commitChanges({
        message: `Release version ${release.version}`,
        type: 'chore',
        scope: 'release'
      });
      
      // Create and push tag
      if (createTag) {
        release.tag = `v${release.version}`;
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: `git tag -a ${release.tag} -m "Release ${release.version}"`,
          description: `Create tag ${release.tag}`
        });
        
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: `git push origin ${release.tag}`,
          description: 'Push tag to remote'
        });
      }
      
      // Create GitHub release
      const releaseCommand = [
        'gh release create',
        release.tag,
        `--title "Release ${release.version}"`,
        generateChangelog ? '--notes-file CHANGELOG.md' : '',
        draft ? '--draft' : ''
      ].filter(Boolean).join(' ');
      
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: releaseCommand,
        description: 'Create GitHub release'
      });
      
      // Merge release branch back to main
      await this._createPullRequest({
        title: `Release ${release.version}`,
        description: release.changelog,
        fromBranch: `release/${release.version}`,
        labels: ['release']
      });
      
      release.status = 'completed';
      
      return {
        release,
        summary: `Created release ${release.version}`
      };
    } catch (error) {
      this.logger.error('Release creation failed', { version: release.version, error: error.message });
      release.status = 'failed';
      release.error = error.message;
      return { release, summary: `Release failed: ${error.message}` };
    }
  }

  async _resolveConflicts(input) {
    const {
      branch,
      strategy = 'manual',
      favorOurs = false,
      favorTheirs = false
    } = input;
    
    const resolution = {
      branch: branch || await this._getCurrentBranch(),
      conflicts: [],
      resolved: [],
      status: 'analyzing'
    };
    
    try {
      // Get conflict status
      const conflictStatus = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'git status --porcelain',
        description: 'Check conflict status'
      });
      
      // Parse conflicted files
      resolution.conflicts = this._parseConflictedFiles(conflictStatus.stdout);
      
      if (resolution.conflicts.length === 0) {
        resolution.status = 'no-conflicts';
        return {
          resolution,
          summary: 'No conflicts found'
        };
      }
      
      // Resolve conflicts based on strategy
      for (const file of resolution.conflicts) {
        let resolved = false;
        
        if (strategy === 'auto' || favorOurs || favorTheirs) {
          // Automatic resolution
          if (favorOurs) {
            await this.invokeTool(ClaudeCodeTool.BASH, {
              command: `git checkout --ours "${file}"`,
              description: `Resolve ${file} using ours`
            });
            resolved = true;
          } else if (favorTheirs) {
            await this.invokeTool(ClaudeCodeTool.BASH, {
              command: `git checkout --theirs "${file}"`,
              description: `Resolve ${file} using theirs`
            });
            resolved = true;
          } else {
            // Try automatic merge
            const mergeResult = await this._attemptAutoMerge(file);
            resolved = mergeResult.success;
          }
        } else {
          // Manual resolution guidance
          const conflictAnalysis = await this._analyzeConflict(file);
          resolution.resolved.push({
            file,
            analysis: conflictAnalysis,
            resolution: 'manual-required'
          });
        }
        
        if (resolved) {
          await this.invokeTool(ClaudeCodeTool.BASH, {
            command: `git add "${file}"`,
            description: `Stage resolved ${file}`
          });
          resolution.resolved.push({
            file,
            resolution: strategy
          });
        }
      }
      
      // Check if all conflicts are resolved
      const remainingConflicts = await this._checkRemainingConflicts();
      
      if (remainingConflicts === 0) {
        // Complete the merge
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: 'git commit --no-edit',
          description: 'Complete merge'
        });
        resolution.status = 'resolved';
      } else {
        resolution.status = 'partial';
      }
      
      return {
        resolution,
        summary: `Resolved ${resolution.resolved.length}/${resolution.conflicts.length} conflicts`
      };
    } catch (error) {
      this.logger.error('Conflict resolution failed', { branch: resolution.branch, error: error.message });
      resolution.status = 'failed';
      resolution.error = error.message;
      return { resolution, summary: `Resolution failed: ${error.message}` };
    }
  }

  async _analyzeHistory(input) {
    const {
      branch = 'main',
      since,
      until,
      author,
      pattern,
      stats = true
    } = input;
    
    const analysis = {
      branch,
      commits: [],
      statistics: {},
      contributors: {},
      trends: []
    };
    
    try {
      // Build log command
      const logCommand = [
        'git log',
        `--pretty=format:'%H|%an|%ae|%ad|%s'`,
        '--date=iso',
        branch,
        since ? `--since="${since}"` : '',
        until ? `--until="${until}"` : '',
        author ? `--author="${author}"` : '',
        pattern ? `--grep="${pattern}"` : ''
      ].filter(Boolean).join(' ');
      
      const logResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: logCommand,
        description: 'Get commit history'
      });
      
      // Parse commits
      analysis.commits = this._parseCommitLog(logResult.stdout);
      
      // Generate statistics
      if (stats) {
        analysis.statistics = {
          totalCommits: analysis.commits.length,
          commitTypes: this._analyzeCommitTypes(analysis.commits),
          averageCommitsPerDay: this._calculateCommitFrequency(analysis.commits),
          busiestDay: this._findBusiestDay(analysis.commits)
        };
        
        // Analyze contributors
        analysis.contributors = this._analyzeContributors(analysis.commits);
        
        // Identify trends
        analysis.trends = this._identifyTrends(analysis.commits);
      }
      
      // Generate history report
      const report = this._generateHistoryReport(analysis);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `git-reports/history-${Date.now()}.md`,
        content: report
      });
      
      return {
        analysis,
        summary: `Analyzed ${analysis.commits.length} commits on ${branch}`
      };
    } catch (error) {
      this.logger.error('History analysis failed', { branch, error: error.message });
      return {
        analysis,
        summary: `Analysis failed: ${error.message}`
      };
    }
  }

  async _setupGitHooks(input) {
    const {
      hooks = ['pre-commit', 'commit-msg', 'pre-push'],
      huskyEnabled = true
    } = input;
    
    const setup = {
      hooks: {},
      huskyConfig: null,
      status: 'configuring'
    };
    
    try {
      if (huskyEnabled) {
        // Install husky
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: 'npm install --save-dev husky',
          description: 'Install husky'
        });
        
        // Initialize husky
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: 'npx husky install',
          description: 'Initialize husky'
        });
        
        // Add to package.json scripts
        await this._updatePackageJsonScripts({
          prepare: 'husky install'
        });
      }
      
      // Create hooks
      for (const hookName of hooks) {
        const hookContent = await this._generateHookContent(hookName);
        
        if (huskyEnabled) {
          // Create husky hook
          await this.invokeTool(ClaudeCodeTool.BASH, {
            command: `npx husky add .husky/${hookName} "${hookContent.command}"`,
            description: `Add ${hookName} hook`
          });
        } else {
          // Create traditional git hook
          const hookPath = `.git/hooks/${hookName}`;
          await this.invokeTool(ClaudeCodeTool.WRITE, {
            file_path: hookPath,
            content: hookContent.script
          });
          
          // Make executable
          await this.invokeTool(ClaudeCodeTool.BASH, {
            command: `chmod +x ${hookPath}`,
            description: `Make ${hookName} executable`
          });
        }
        
        setup.hooks[hookName] = {
          enabled: true,
          path: huskyEnabled ? `.husky/${hookName}` : `.git/hooks/${hookName}`
        };
      }
      
      // Create commitlint config for commit-msg hook
      if (hooks.includes('commit-msg')) {
        const commitlintConfig = this._generateCommitlintConfig();
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: '.commitlintrc.js',
          content: commitlintConfig
        });
        
        // Install commitlint
        await this.invokeTool(ClaudeCodeTool.BASH, {
          command: 'npm install --save-dev @commitlint/cli @commitlint/config-conventional',
          description: 'Install commitlint'
        });
      }
      
      setup.status = 'completed';
      
      return {
        setup,
        summary: `Configured ${Object.keys(setup.hooks).length} git hooks`
      };
    } catch (error) {
      this.logger.error('Hook setup failed', { error: error.message });
      setup.status = 'failed';
      setup.error = error.message;
      return { setup, summary: `Hook setup failed: ${error.message}` };
    }
  }

  async _cleanupBranches(input) {
    const {
      olderThanDays = 30,
      merged = true,
      pattern,
      dryRun = true,
      excludePatterns = ['main', 'master', 'develop', 'release/*']
    } = input;
    
    const cleanup = {
      branches: {
        local: [],
        remote: []
      },
      deleted: [],
      kept: [],
      status: 'analyzing'
    };
    
    try {
      // Get all branches
      const localBranches = await this._getLocalBranches();
      const remoteBranches = await this._getRemoteBranches();
      
      // Filter branches for cleanup
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      for (const branch of localBranches) {
        if (this._shouldCleanupBranch(branch, excludePatterns, pattern)) {
          const branchInfo = await this._getBranchInfo(branch.name);
          
          if (branchInfo.lastCommitDate < cutoffDate) {
            if (!merged || branchInfo.merged) {
              cleanup.branches.local.push(branch);
            }
          }
        }
      }
      
      // Check remote branches
      for (const branch of remoteBranches) {
        if (this._shouldCleanupBranch(branch, excludePatterns, pattern)) {
          const branchInfo = await this._getBranchInfo(branch.name, true);
          
          if (branchInfo.lastCommitDate < cutoffDate) {
            if (!merged || branchInfo.merged) {
              cleanup.branches.remote.push(branch);
            }
          }
        }
      }
      
      // Perform cleanup
      if (!dryRun) {
        // Delete local branches
        for (const branch of cleanup.branches.local) {
          try {
            await this.invokeTool(ClaudeCodeTool.BASH, {
              command: `git branch -d ${branch.name}`,
              description: `Delete local branch ${branch.name}`
            });
            cleanup.deleted.push(branch.name);
          } catch (e) {
            cleanup.kept.push({
              branch: branch.name,
              reason: 'Deletion failed'
            });
          }
        }
        
        // Delete remote branches
        for (const branch of cleanup.branches.remote) {
          try {
            await this.invokeTool(ClaudeCodeTool.BASH, {
              command: `git push origin --delete ${branch.name.replace('origin/', '')}`,
              description: `Delete remote branch ${branch.name}`
            });
            cleanup.deleted.push(branch.name);
          } catch (e) {
            cleanup.kept.push({
              branch: branch.name,
              reason: 'Remote deletion failed'
            });
          }
        }
      }
      
      cleanup.status = dryRun ? 'dry-run' : 'completed';
      
      // Generate cleanup report
      const report = this._generateCleanupReport(cleanup, dryRun);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `git-reports/cleanup-${Date.now()}.md`,
        content: report
      });
      
      return {
        cleanup,
        summary: dryRun 
          ? `Found ${cleanup.branches.local.length + cleanup.branches.remote.length} branches to clean up`
          : `Deleted ${cleanup.deleted.length} branches`
      };
    } catch (error) {
      this.logger.error('Branch cleanup failed', { error: error.message });
      cleanup.status = 'failed';
      cleanup.error = error.message;
      return { cleanup, summary: `Cleanup failed: ${error.message}` };
    }
  }

  // Helper methods
  _formatBranchName(type, name) {
    const formatted = name.toLowerCase().replace(/\s+/g, '-');
    return `${type}/${formatted}`;
  }

  _formatCommitMessage(type, scope, message, breaking) {
    let formatted = type;
    if (scope) formatted += `(${scope})`;
    formatted += ': ' + message;
    if (breaking) formatted = formatted.replace(':', '!:');
    return formatted;
  }

  _generateBranchDocumentation(branch, description) {
    return `# Branch: ${branch.name}

**Type**: ${branch.type}
**Created**: ${branch.createdAt}
**From**: ${branch.fromBranch}

## Description
${description}

## Related Issues
- 

## Testing Notes
- 
`;
  }

  _parseStagedFiles(statusOutput) {
    const lines = statusOutput.split('\n');
    const staged = [];
    
    for (const line of lines) {
      if (line.startsWith('A') || line.startsWith('M') || line.startsWith('D')) {
        staged.push(line.substring(3));
      }
    }
    
    return staged;
  }

  async _runPreCommitChecks() {
    try {
      // Run linting
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'npm run lint',
        description: 'Run linting'
      });
      
      // Run tests
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'npm test',
        description: 'Run tests'
      });
      
      return { passed: true };
    } catch (error) {
      return { 
        passed: false, 
        errors: [error.message] 
      };
    }
  }

  async _getCurrentBranch() {
    const result = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: 'git branch --show-current',
      description: 'Get current branch'
    });
    return result.stdout.trim();
  }

  async _getCommitComparison(fromBranch, toBranch) {
    const result = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `git log ${toBranch}..${fromBranch} --oneline`,
      description: 'Get commit comparison'
    });
    
    const commits = result.stdout.split('\n').filter(Boolean);
    const hasBreakingChanges = commits.some(c => c.includes('!:'));
    
    return {
      commits,
      hasBreakingChanges,
      count: commits.length
    };
  }

  _generatePRBody(description, comparison) {
    return `${description || ''}

## Changes
This PR includes ${comparison.count} commits${comparison.hasBreakingChanges ? ' including breaking changes' : ''}.

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console errors
${comparison.hasBreakingChanges ? '- [ ] Breaking changes documented' : ''}
`;
  }

  _parsePRInfo(output) {
    const numberMatch = output.match(/#(\d+)/);
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    
    return {
      number: numberMatch ? parseInt(numberMatch[1]) : null,
      url: urlMatch ? urlMatch[0] : null
    };
  }

  async _addBreakingChangeNotice(prNumber) {
    await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `gh pr comment ${prNumber} --body "⚠️ This PR contains breaking changes. Please review carefully."`,
      description: 'Add breaking change notice'
    });
  }

  async _getPRDetails(prNumber) {
    const result = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `gh pr view ${prNumber} --json headRefName,baseRefName`,
      description: 'Get PR details'
    });
    
    const details = JSON.parse(result.stdout);
    return {
      headBranch: details.headRefName,
      baseBranch: details.baseRefName
    };
  }

  async _runMergeChecks(prNumber) {
    const checks = {
      conflicts: false,
      ciPassed: false,
      approved: false,
      allPassed: false,
      failures: []
    };
    
    // Check for conflicts
    const conflictCheck = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `gh pr view ${prNumber} --json mergeable`,
      description: 'Check merge conflicts'
    });
    const mergeable = JSON.parse(conflictCheck.stdout);
    checks.conflicts = !mergeable.mergeable;
    if (checks.conflicts) checks.failures.push('Has conflicts');
    
    // Check CI status
    const ciCheck = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `gh pr checks ${prNumber}`,
      description: 'Check CI status'
    });
    checks.ciPassed = !ciCheck.stdout.includes('fail');
    if (!checks.ciPassed) checks.failures.push('CI failed');
    
    // Check approvals
    const approvalCheck = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `gh pr view ${prNumber} --json reviews`,
      description: 'Check approvals'
    });
    const reviews = JSON.parse(approvalCheck.stdout);
    checks.approved = reviews.reviews.some(r => r.state === 'APPROVED');
    if (!checks.approved) checks.failures.push('Not approved');
    
    checks.allPassed = !checks.conflicts && checks.ciPassed && checks.approved;
    
    return checks;
  }

  async _getNextVersion(releaseType) {
    // Get current version from package.json
    const packageJson = await this.invokeTool(ClaudeCodeTool.READ, {
      file_path: 'package.json'
    });
    const pkg = JSON.parse(packageJson);
    const currentVersion = pkg.version || '0.0.0';
    
    // Parse version
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // Calculate next version
    let nextVersion;
    switch (releaseType) {
      case 'major':
        nextVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        nextVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        nextVersion = `${major}.${minor}.${patch + 1}`;
        break;
      default:
        nextVersion = currentVersion;
    }
    
    return nextVersion;
  }

  async _updateVersionFiles(version) {
    // Update package.json
    const packageJson = await this.invokeTool(ClaudeCodeTool.READ, {
      file_path: 'package.json'
    });
    const pkg = JSON.parse(packageJson);
    pkg.version = version;
    
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: 'package.json',
      content: JSON.stringify(pkg, null, 2)
    });
    
    // Update package-lock.json if exists
    try {
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: 'npm install',
        description: 'Update package-lock.json'
      });
    } catch (e) {
      // No package-lock.json, skip
    }
  }

  async _generateChangelog(version) {
    // Get commits since last tag
    const lastTag = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: 'git describe --tags --abbrev=0',
      description: 'Get last tag'
    });
    
    const commits = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `git log ${lastTag.stdout.trim()}..HEAD --pretty=format:'%s|%h'`,
      description: 'Get commits since last release'
    });
    
    // Group commits by type
    const grouped = this._groupCommitsByType(commits.stdout);
    
    // Generate changelog
    let changelog = `# Changelog\n\n## ${version} - ${new Date().toISOString().split('T')[0]}\n\n`;
    
    if (grouped.feat.length > 0) {
      changelog += '### Features\n' + grouped.feat.map(c => `- ${c}`).join('\n') + '\n\n';
    }
    
    if (grouped.fix.length > 0) {
      changelog += '### Bug Fixes\n' + grouped.fix.map(c => `- ${c}`).join('\n') + '\n\n';
    }
    
    if (grouped.other.length > 0) {
      changelog += '### Other Changes\n' + grouped.other.map(c => `- ${c}`).join('\n') + '\n\n';
    }
    
    return changelog;
  }

  _groupCommitsByType(commitsOutput) {
    const lines = commitsOutput.split('\n').filter(Boolean);
    const grouped = {
      feat: [],
      fix: [],
      other: []
    };
    
    for (const line of lines) {
      const [message, hash] = line.split('|');
      if (message.startsWith('feat')) {
        grouped.feat.push(message + ` (${hash})`);
      } else if (message.startsWith('fix')) {
        grouped.fix.push(message + ` (${hash})`);
      } else {
        grouped.other.push(message + ` (${hash})`);
      }
    }
    
    return grouped;
  }

  _parseConflictedFiles(statusOutput) {
    const lines = statusOutput.split('\n');
    const conflicted = [];
    
    for (const line of lines) {
      if (line.includes('UU') || line.includes('AA') || line.includes('DD')) {
        conflicted.push(line.substring(3));
      }
    }
    
    return conflicted;
  }

  async _attemptAutoMerge(file) {
    try {
      // Try git's auto-merge
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `git checkout --merge ${file}`,
        description: `Auto-merge ${file}`
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async _analyzeConflict(file) {
    const content = await this.invokeTool(ClaudeCodeTool.READ, {
      file_path: file
    });
    
    // Count conflict markers
    const conflicts = (content.match(/<<<<<<<|=======/g) || []).length / 2;
    
    return {
      file,
      conflicts,
      recommendation: conflicts > 5 ? 'Consider splitting into smaller changes' : 'Manual review recommended'
    };
  }

  async _checkRemainingConflicts() {
    const result = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: 'git diff --name-only --diff-filter=U',
      description: 'Check remaining conflicts'
    });
    
    return result.stdout.split('\n').filter(Boolean).length;
  }

  _parseCommitLog(logOutput) {
    const lines = logOutput.split('\n').filter(Boolean);
    const commits = [];
    
    for (const line of lines) {
      const [hash, author, email, date, message] = line.split('|');
      commits.push({
        hash,
        author,
        email,
        date: new Date(date),
        message
      });
    }
    
    return commits;
  }

  _analyzeCommitTypes(commits) {
    const types = {};
    
    for (const commit of commits) {
      const type = commit.message.split(':')[0].split('(')[0];
      types[type] = (types[type] || 0) + 1;
    }
    
    return types;
  }

  _calculateCommitFrequency(commits) {
    if (commits.length === 0) return 0;
    
    const firstDate = commits[commits.length - 1].date;
    const lastDate = commits[0].date;
    const days = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    
    return commits.length / Math.max(1, days);
  }

  _findBusiestDay(commits) {
    const dayCount = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const commit of commits) {
      const day = days[commit.date.getDay()];
      dayCount[day] = (dayCount[day] || 0) + 1;
    }
    
    return Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }

  _analyzeContributors(commits) {
    const contributors = {};
    
    for (const commit of commits) {
      if (!contributors[commit.author]) {
        contributors[commit.author] = {
          commits: 0,
          email: commit.email,
          firstCommit: commit.date,
          lastCommit: commit.date
        };
      }
      
      contributors[commit.author].commits++;
      contributors[commit.author].lastCommit = commit.date;
    }
    
    return contributors;
  }

  _identifyTrends(commits) {
    const trends = [];
    
    // Check for increased activity
    const recentCommits = commits.filter(c => {
      const daysSince = (new Date() - c.date) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    });
    
    if (recentCommits.length > commits.length * 0.3) {
      trends.push('High recent activity');
    }
    
    // Check for common patterns
    const fixCommits = commits.filter(c => c.message.startsWith('fix'));
    if (fixCommits.length > commits.length * 0.4) {
      trends.push('Many bug fixes - consider quality improvements');
    }
    
    return trends;
  }

  _generateHistoryReport(analysis) {
    return `# Git History Analysis

**Branch**: ${analysis.branch}
**Total Commits**: ${analysis.statistics.totalCommits}
**Average Commits/Day**: ${analysis.statistics.averageCommitsPerDay.toFixed(2)}
**Busiest Day**: ${analysis.statistics.busiestDay}

## Commit Types
${Object.entries(analysis.statistics.commitTypes)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `- ${type}: ${count}`)
  .join('\n')}

## Top Contributors
${Object.entries(analysis.contributors)
  .sort((a, b) => b[1].commits - a[1].commits)
  .slice(0, 5)
  .map(([name, data]) => `- ${name}: ${data.commits} commits`)
  .join('\n')}

## Trends
${analysis.trends.map(t => `- ${t}`).join('\n')}
`;
  }

  async _generateHookContent(hookName) {
    const hooks = {
      'pre-commit': {
        command: 'npm run lint && npm test',
        script: `#!/bin/sh
npm run lint || exit 1
npm test || exit 1
`
      },
      'commit-msg': {
        command: 'npx --no -- commitlint --edit "$1"',
        script: `#!/bin/sh
npx --no -- commitlint --edit "$1"
`
      },
      'pre-push': {
        command: 'npm test',
        script: `#!/bin/sh
npm test || exit 1
`
      }
    };
    
    return hooks[hookName] || hooks['pre-commit'];
  }

  async _updatePackageJsonScripts(scripts) {
    const packageJson = await this.invokeTool(ClaudeCodeTool.READ, {
      file_path: 'package.json'
    });
    const pkg = JSON.parse(packageJson);
    
    pkg.scripts = { ...pkg.scripts, ...scripts };
    
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: 'package.json',
      content: JSON.stringify(pkg, null, 2)
    });
  }

  _generateCommitlintConfig() {
    return `module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert']
    ],
    'subject-case': [2, 'always', 'sentence-case']
  }
};`;
  }

  async _getLocalBranches() {
    const result = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: 'git branch --format="%(refname:short)|%(committerdate:iso)"',
      description: 'Get local branches'
    });
    
    return result.stdout.split('\n').filter(Boolean).map(line => {
      const [name, date] = line.split('|');
      return { name, lastCommitDate: new Date(date) };
    });
  }

  async _getRemoteBranches() {
    const result = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: 'git branch -r --format="%(refname:short)|%(committerdate:iso)"',
      description: 'Get remote branches'
    });
    
    return result.stdout.split('\n').filter(Boolean).map(line => {
      const [name, date] = line.split('|');
      return { name, lastCommitDate: new Date(date) };
    });
  }

  _shouldCleanupBranch(branch, excludePatterns, includePattern) {
    // Check exclude patterns
    for (const pattern of excludePatterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(branch.name)) return false;
      } else {
        if (branch.name === pattern) return false;
      }
    }
    
    // Check include pattern
    if (includePattern) {
      const regex = new RegExp(includePattern);
      return regex.test(branch.name);
    }
    
    return true;
  }

  async _getBranchInfo(branchName, isRemote = false) {
    const mergedCheck = await this.invokeTool(ClaudeCodeTool.BASH, {
      command: `git branch ${isRemote ? '-r' : ''} --merged main`,
      description: 'Check merged branches'
    });
    
    return {
      name: branchName,
      merged: mergedCheck.stdout.includes(branchName),
      lastCommitDate: new Date() // Simplified
    };
  }

  _generateCleanupReport(cleanup, dryRun) {
    return `# Branch Cleanup Report

**Mode**: ${dryRun ? 'Dry Run' : 'Executed'}
**Date**: ${new Date().toISOString()}

## Summary
- Local branches to clean: ${cleanup.branches.local.length}
- Remote branches to clean: ${cleanup.branches.remote.length}
- Total deleted: ${cleanup.deleted.length}

## Local Branches
${cleanup.branches.local.map(b => `- ${b.name}`).join('\n')}

## Remote Branches  
${cleanup.branches.remote.map(b => `- ${b.name}`).join('\n')}

${!dryRun ? `
## Deleted Branches
${cleanup.deleted.map(b => `- ${b}`).join('\n')}

## Kept Branches
${cleanup.kept.map(k => `- ${k.branch}: ${k.reason}`).join('\n')}
` : ''}
`;
  }
}