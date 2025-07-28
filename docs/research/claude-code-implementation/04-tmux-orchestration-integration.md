# Tmux Orchestration Integration for Claude Code BMAD

## Overview

Integration with Tmux-Orchestrator enables persistent, parallel agent execution with sophisticated session management for continuous development workflows.

## Architecture Integration

### Three-Tier Hierarchy Mapping

```
Tmux-Orchestrator              →    Claude Code BMAD
─────────────────────────────────────────────────────
Orchestrator (Top)            →    Context Manager Agent
Project Managers (Middle)     →    Scrum Master Agents
Engineers (Bottom)            →    Dev/QA/DevOps Agents
```

### Session Structure
```bash
tmux-orchestrator/
├── orchestrator-session
│   └── context-manager-agent
├── project-sessions/
│   ├── epic-3.6-webrtc/
│   │   ├── scrum-master
│   │   ├── dev-frontend
│   │   ├── dev-backend
│   │   └── qa-agent
│   └── epic-3.9-voice/
│       ├── scrum-master
│       ├── dev-agent
│       └── qa-agent
└── support-sessions/
    ├── monitor-agent
    ├── git-manager
    └── devops-agent
```

## Implementation Strategy

### 1. Session Initialization

```bash
#!/bin/bash
# init-claude-tmux.sh

# Create orchestrator session
tmux new-session -d -s orchestrator -n context-manager
tmux send-keys -t orchestrator:context-manager "claude-code --agent context-manager --mode orchestrator" C-m

# Create project sessions
create_project_session() {
  local project=$1
  local epic=$2
  
  tmux new-session -d -s "project-$project" -n scrum-master
  tmux send-keys -t "project-$project:scrum-master" \
    "claude-code --agent scrum-master --epic $epic --mode project-manager" C-m
  
  # Add development windows
  tmux new-window -t "project-$project" -n dev-frontend
  tmux new-window -t "project-$project" -n dev-backend
  tmux new-window -t "project-$project" -n qa
}

# Create support session
tmux new-session -d -s support -n monitor
tmux send-keys -t support:monitor "claude-code --agent monitor --mode continuous" C-m
```

### 2. Agent Communication via Tmux

```yaml
# tmux-agent-config.yaml
communication:
  method: tmux_pipe
  channels:
    orchestrator:
      pipe: /tmp/claude-orchestrator.pipe
      format: json
    
    inter_agent:
      directory: /tmp/claude-agents/
      pattern: "{from_agent}-to-{to_agent}.pipe"
    
    broadcast:
      pipe: /tmp/claude-broadcast.pipe
      subscribers: all

tmux_commands:
  send_message: |
    echo '${message}' | tmux load-buffer -
    tmux paste-buffer -t ${target_session}:${target_window}
  
  read_output: |
    tmux capture-pane -t ${session}:${window} -p
  
  check_status: |
    tmux list-windows -t ${session} -F "#{window_name}:#{pane_current_command}"
```

### 3. Session Management for Non-Stop Development

```python
# session_manager.py
class TmuxSessionManager:
    def __init__(self):
        self.sessions = {}
        self.orchestrator_pipe = "/tmp/claude-orchestrator.pipe"
    
    def create_agent_session(self, agent_type, config):
        """Create a new tmux session for an agent"""
        session_name = f"{agent_type}-{config['epic']}"
        
        cmd = f"""
        tmux new-session -d -s {session_name} -n main
        tmux send-keys -t {session_name}:main \
          'claude-code --agent {agent_type} --config {json.dumps(config)}' C-m
        """
        
        subprocess.run(cmd, shell=True)
        self.sessions[session_name] = {
            'agent_type': agent_type,
            'config': config,
            'status': 'running'
        }
    
    def coordinate_agents(self):
        """Orchestrator coordination logic"""
        while True:
            # Check agent statuses
            for session in self.sessions:
                output = self.get_session_output(session)
                self.process_agent_output(session, output)
            
            # Distribute tasks
            tasks = self.get_pending_tasks()
            for task in tasks:
                best_agent = self.find_best_agent(task)
                self.assign_task(best_agent, task)
            
            time.sleep(30)  # Check every 30 seconds
    
    def handle_agent_failure(self, session):
        """Restart failed agents"""
        if self.sessions[session]['status'] == 'failed':
            self.restart_session(session)
            self.restore_agent_context(session)
```

### 4. Multi-Agent Coordination

```yaml
# coordination-config.yaml
agent_groups:
  frontend_team:
    leader: ui-architect
    members:
      - dev-frontend-1
      - dev-frontend-2
      - ux-agent
    tmux_layout: |
      tmux split-window -h -t frontend-team
      tmux split-window -v -t frontend-team
      tmux select-layout -t frontend-team tiled
  
  backend_team:
    leader: architect
    members:
      - dev-backend-1
      - dev-backend-2
      - devops
    coordination:
      method: shared_buffer
      sync_interval: 60s

parallel_execution:
  max_sessions: 10
  resource_limits:
    per_session:
      memory: 2GB
      cpu_percent: 25
  
  scheduling:
    strategy: round_robin
    priorities:
      critical: immediate
      high: next_available
      normal: queue
      low: batch
```

### 5. Persistent State Management

```bash
# State persistence across tmux sessions
STATE_DIR="/var/claude-agents/state"

save_session_state() {
  local session=$1
  local state_file="$STATE_DIR/$session.state"
  
  # Capture current state
  tmux capture-pane -t $session -p > "$state_file.output"
  
  # Save environment
  tmux show-environment -t $session > "$state_file.env"
  
  # Save working directory
  tmux display-message -t $session -p '#{pane_current_path}' > "$state_file.pwd"
}

restore_session_state() {
  local session=$1
  local state_file="$STATE_DIR/$session.state"
  
  # Restore environment
  while IFS= read -r line; do
    tmux set-environment -t $session "$line"
  done < "$state_file.env"
  
  # Restore working directory
  local pwd=$(cat "$state_file.pwd")
  tmux send-keys -t $session "cd $pwd" C-m
}
```

## Advanced Integration Features

### 1. Cross-Project Knowledge Sharing

```python
class CrossProjectCoordinator:
    def __init__(self):
        self.knowledge_graph = "/var/claude-agents/knowledge/graph.db"
        self.project_sessions = self.discover_project_sessions()
    
    def share_pattern(self, pattern, source_project):
        """Share successful patterns across projects"""
        pattern_data = {
            'pattern': pattern,
            'source': source_project,
            'timestamp': datetime.now(),
            'success_metrics': self.calculate_metrics(pattern)
        }
        
        # Broadcast to relevant projects
        for project in self.project_sessions:
            if self.is_pattern_relevant(pattern, project):
                self.send_to_project(project, pattern_data)
    
    def coordinate_dependencies(self):
        """Manage cross-project dependencies"""
        dependencies = self.analyze_dependencies()
        
        for dep in dependencies:
            if dep['blocking']:
                self.pause_dependent_work(dep)
                self.prioritize_blocker(dep)
```

### 2. Automatic Scaling

```yaml
# auto-scaling.yaml
scaling_rules:
  scale_up:
    triggers:
      - metric: task_queue_length
        threshold: 20
        action: spawn_dev_agent
      
      - metric: response_time
        threshold: 5s
        action: spawn_support_agent
    
    limits:
      max_agents_per_type:
        dev: 5
        qa: 3
        monitor: 2
  
  scale_down:
    triggers:
      - metric: idle_time
        threshold: 10m
        action: terminate_agent
      
      - metric: task_queue_length
        threshold: 5
        action: consolidate_agents
```

### 3. Tmux Layout Management

```bash
#!/bin/bash
# layout-manager.sh

apply_development_layout() {
  local session=$1
  
  # Create optimal layout for development
  tmux select-window -t $session:main
  tmux split-window -h -p 30 -t $session  # 70/30 split
  tmux split-window -v -p 50 -t $session.1  # Split right pane
  
  # Assign panes
  tmux send-keys -t $session.0 "# Main development pane" C-m
  tmux send-keys -t $session.1 "# Test runner" C-m
  tmux send-keys -t $session.2 "# Logs and monitoring" C-m
}

apply_monitoring_layout() {
  local session=$1
  
  # Create monitoring dashboard layout
  tmux select-window -t $session:dashboard
  tmux split-window -h -p 50 -t $session
  tmux split-window -v -p 66 -t $session.0
  tmux split-window -v -p 50 -t $session.0
  tmux split-window -v -p 50 -t $session.1
  
  # Assign monitoring views
  tmux send-keys -t $session.0 "watch -n 1 'claude-agents status'" C-m
  tmux send-keys -t $session.1 "tail -f /var/log/claude-agents/errors.log" C-m
  tmux send-keys -t $session.2 "htop -F claude-agents" C-m
  tmux send-keys -t $session.3 "claude-agents metrics --live" C-m
}
```

### 4. Session Persistence and Recovery

```python
# session_persistence.py
class SessionPersistence:
    def __init__(self):
        self.checkpoint_dir = "/var/claude-agents/checkpoints"
        self.recovery_scripts = "/var/claude-agents/recovery"
    
    def checkpoint_session(self, session_name):
        """Create session checkpoint"""
        checkpoint = {
            'timestamp': datetime.now().isoformat(),
            'session': session_name,
            'windows': self.get_windows(session_name),
            'panes': self.get_panes(session_name),
            'environment': self.get_environment(session_name),
            'agent_state': self.get_agent_state(session_name)
        }
        
        checkpoint_file = f"{self.checkpoint_dir}/{session_name}-{timestamp}.json"
        with open(checkpoint_file, 'w') as f:
            json.dump(checkpoint, f)
    
    def recover_session(self, checkpoint_file):
        """Recover session from checkpoint"""
        with open(checkpoint_file, 'r') as f:
            checkpoint = json.load(f)
        
        session_name = checkpoint['session']
        
        # Recreate session structure
        self.create_session(session_name)
        
        for window in checkpoint['windows']:
            self.create_window(session_name, window)
        
        # Restore agent state
        self.restore_agent_state(session_name, checkpoint['agent_state'])
        
        # Resume work
        self.resume_agent_work(session_name)
```

## Integration with Claude Code Tools

### Tool Wrapper for Tmux Operations

```python
# tmux_tool_wrapper.py
class TmuxToolWrapper:
    """Wrapper to execute Claude Code tools within tmux sessions"""
    
    def __init__(self, session_name):
        self.session = session_name
        self.tools = self.load_claude_tools()
    
    def execute_in_session(self, tool_name, params):
        """Execute a Claude Code tool in tmux session"""
        # Serialize tool call
        tool_call = {
            'tool': tool_name,
            'params': params,
            'session': self.session
        }
        
        # Send to tmux session
        cmd = f"echo '{json.dumps(tool_call)}' | tmux load-buffer -"
        subprocess.run(cmd, shell=True)
        
        tmux_cmd = f"tmux paste-buffer -t {self.session}"
        subprocess.run(tmux_cmd, shell=True)
        
        # Wait for and return result
        return self.get_tool_result()
    
    def batch_execute(self, tool_calls):
        """Execute multiple tools in parallel"""
        results = {}
        threads = []
        
        for call in tool_calls:
            thread = threading.Thread(
                target=lambda c=call: results.update({
                    c['id']: self.execute_in_session(c['tool'], c['params'])
                })
            )
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        return results
```

## Monitoring and Debugging

### Tmux Session Monitor

```bash
#!/bin/bash
# monitor-sessions.sh

monitor_all_sessions() {
  while true; do
    clear
    echo "=== Claude Agent Sessions ==="
    echo
    
    # List all sessions
    tmux list-sessions -F "#{session_name}: #{session_windows} windows" 2>/dev/null
    
    echo
    echo "=== Active Agents ==="
    
    # Show active agents
    for session in $(tmux list-sessions -F "#{session_name}" 2>/dev/null); do
      echo "Session: $session"
      tmux list-windows -t $session -F "  Window: #{window_name} - #{pane_current_command}" 2>/dev/null
    done
    
    echo
    echo "=== Resource Usage ==="
    ps aux | grep claude-code | grep -v grep | awk '{print $2, $3, $4, $11}'
    
    sleep 5
  done
}

# Debug helper
debug_session() {
  local session=$1
  echo "Debugging session: $session"
  
  # Capture all panes
  for pane in $(tmux list-panes -t $session -F "#{pane_id}"); do
    echo "=== Pane $pane ==="
    tmux capture-pane -t $pane -p | tail -50
  done
}
```

## Best Practices

### 1. Session Naming Convention
```
{agent_type}-{project}-{epic}-{instance}
Examples:
- dev-frontend-epic36-1
- qa-backend-epic37-2
- monitor-global-1
```

### 2. Resource Management
```yaml
resource_management:
  session_limits:
    max_per_project: 10
    max_total: 30
    
  cleanup:
    idle_timeout: 30m
    failed_retry: 3
    
  priorities:
    orchestrator: highest
    monitor: high
    development: normal
    support: low
```

### 3. Error Handling
```python
def handle_session_error(session, error):
    """Comprehensive error handling for tmux sessions"""
    
    error_handlers = {
        'session_died': restart_session,
        'out_of_memory': scale_down_and_restart,
        'permission_denied': fix_permissions,
        'network_error': retry_with_backoff
    }
    
    handler = error_handlers.get(error.type, default_error_handler)
    handler(session, error)
```

## Integration Benefits

1. **Persistent Development**: Agents continue working even if main process terminates
2. **Parallel Execution**: Multiple agents work simultaneously on different aspects
3. **Resource Isolation**: Each agent has its own environment and resources
4. **Easy Monitoring**: Visual inspection of agent work through tmux attach
5. **Failure Recovery**: Automatic session recovery and state restoration
6. **Scalability**: Dynamic agent spawning based on workload