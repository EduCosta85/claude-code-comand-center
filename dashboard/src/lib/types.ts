export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, unknown>;
  summary?: string;
  timestamp: number;
  model_name?: string;
}

export interface AgentDef {
  name: string;
  description: string;
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  permissionMode?: string;
  maxTurns?: number;
  memory?: string;
  skills?: string[];
  mcpServers?: string[];
  systemPrompt: string;
  scope: "global" | "project";
  filePath: string;
}

export interface SkillDef {
  name: string;
  description: string;
  argumentHint?: string;
  allowedTools?: string[];
  context?: string;
  agent?: string;
  model?: string;
  userInvocable: boolean;
  disableModelInvocation: boolean;
  scope: "global" | "project" | "plugin";
  pluginName?: string;
  filePath: string;
}

export interface HookDef {
  eventType: string;
  matcher?: string;
  command: string;
  type: string;
  timeout?: number;
  source: "global" | "project" | "plugin";
  pluginName?: string;
}

export interface PluginDef {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  scope: string;
}

export interface SessionSummary {
  session_id: string;
  source_app: string;
  first_event: number;
  last_event: number;
  event_count: number;
  event_types: Record<string, number>;
  models: string[];
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

export interface Stats {
  total_events: number;
  events_today: number;
  active_sessions: number;
}

export interface RegistryAll {
  agents: AgentDef[];
  skills: SkillDef[];
  hooks: HookDef[];
  plugins: PluginDef[];
}
