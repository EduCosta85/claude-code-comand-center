import { existsSync, readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import type { AgentDef, SkillDef, HookDef, PluginDef } from "./types";

const HOME = homedir();

// ── YAML frontmatter parser (simple, no dependencies) ──
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      // Remove quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      meta[key] = val;
    }
  }
  return { meta, body: match[2] };
}

function parseList(val?: string): string[] {
  if (!val) return [];
  // Handle "Tool1, Tool2, Tool3" format
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

// ── Agents ──
function scanAgentsDir(dir: string, scope: "global" | "project"): AgentDef[] {
  if (!existsSync(dir)) return [];
  const agents: AgentDef[] = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const filePath = join(dir, file);
    const content = readFileSync(filePath, "utf-8");
    const { meta, body } = parseFrontmatter(content);

    agents.push({
      name: meta.name || basename(file, ".md"),
      description: meta.description || "",
      tools: parseList(meta.tools),
      disallowedTools: parseList(meta.disallowedTools),
      model: meta.model,
      permissionMode: meta.permissionMode,
      maxTurns: meta.maxTurns ? Number(meta.maxTurns) : undefined,
      memory: meta.memory,
      skills: parseList(meta.skills),
      mcpServers: parseList(meta.mcpServers),
      systemPrompt: body.slice(0, 1000),
      scope,
      filePath,
    });
  }
  return agents;
}

export function getAgents(projectDir?: string): AgentDef[] {
  const global = scanAgentsDir(join(HOME, ".claude", "agents"), "global");
  const project = projectDir ? scanAgentsDir(join(projectDir, ".claude", "agents"), "project") : [];
  return [...global, ...project];
}

// ── Skills ──
function scanSkillsDir(dir: string, scope: "global" | "project" | "plugin", pluginName?: string): SkillDef[] {
  if (!existsSync(dir)) return [];
  const skills: SkillDef[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(dir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;

    const content = readFileSync(skillFile, "utf-8");
    const { meta } = parseFrontmatter(content);

    skills.push({
      name: meta.name || entry.name,
      description: meta.description || "",
      argumentHint: meta["argument-hint"],
      allowedTools: parseList(meta["allowed-tools"]),
      context: meta.context,
      agent: meta.agent,
      model: meta.model,
      userInvocable: meta["user-invocable"] !== "false",
      disableModelInvocation: meta["disable-model-invocation"] === "true",
      scope,
      pluginName,
      filePath: skillFile,
    });
  }
  return skills;
}

export function getSkills(projectDir?: string): SkillDef[] {
  const global = scanSkillsDir(join(HOME, ".claude", "skills"), "global");
  const project = projectDir ? scanSkillsDir(join(projectDir, ".claude", "skills"), "project") : [];

  // Scan plugin skills
  const pluginSkills: SkillDef[] = [];
  const pluginCacheDir = join(HOME, ".claude", "plugins", "cache");
  if (existsSync(pluginCacheDir)) {
    for (const marketplace of readdirSync(pluginCacheDir, { withFileTypes: true })) {
      if (!marketplace.isDirectory()) continue;
      const mDir = join(pluginCacheDir, marketplace.name);
      for (const plugin of readdirSync(mDir, { withFileTypes: true })) {
        if (!plugin.isDirectory()) continue;
        const pDir = join(mDir, plugin.name);
        // Find latest version
        const versions = readdirSync(pDir, { withFileTypes: true }).filter((d) => d.isDirectory());
        if (versions.length === 0) continue;
        const latest = join(pDir, versions[versions.length - 1].name);
        const skillsDir = join(latest, "skills");
        pluginSkills.push(...scanSkillsDir(skillsDir, "plugin", plugin.name));
      }
    }
  }

  return [...global, ...project, ...pluginSkills];
}

// ── Hooks ──
function parseHooksFromSettings(filePath: string, source: "global" | "project"): HookDef[] {
  if (!existsSync(filePath)) return [];
  try {
    const content = JSON.parse(readFileSync(filePath, "utf-8"));
    const hooks: HookDef[] = [];
    const hooksConfig = content.hooks || {};

    for (const [eventType, entries] of Object.entries(hooksConfig)) {
      for (const entry of entries as Array<{ matcher?: string; hooks: Array<{ type: string; command: string; timeout?: number }> }>) {
        for (const hook of entry.hooks || []) {
          hooks.push({
            eventType,
            matcher: entry.matcher,
            command: hook.command,
            type: hook.type,
            timeout: hook.timeout,
            source,
          });
        }
      }
    }
    return hooks;
  } catch {
    return [];
  }
}

function parsePluginHooks(hookJsonPath: string, pluginName: string): HookDef[] {
  if (!existsSync(hookJsonPath)) return [];
  try {
    const content = JSON.parse(readFileSync(hookJsonPath, "utf-8"));
    const hooks: HookDef[] = [];
    const hooksConfig = content.hooks || {};

    for (const [eventType, entries] of Object.entries(hooksConfig)) {
      for (const entry of entries as Array<{ matcher?: string; hooks: Array<{ type: string; command: string; timeout?: number }> }>) {
        for (const hook of entry.hooks || []) {
          hooks.push({
            eventType,
            matcher: entry.matcher,
            command: hook.command,
            type: hook.type,
            timeout: hook.timeout,
            source: "plugin",
            pluginName,
          });
        }
      }
    }
    return hooks;
  } catch {
    return [];
  }
}

export function getHooks(projectDir?: string): HookDef[] {
  const global = parseHooksFromSettings(join(HOME, ".claude", "settings.json"), "global");
  const project = projectDir
    ? [
        ...parseHooksFromSettings(join(projectDir, ".claude", "settings.json"), "project"),
        ...parseHooksFromSettings(join(projectDir, ".claude", "settings.local.json"), "project"),
      ]
    : [];

  // Plugin hooks
  const pluginHooks: HookDef[] = [];
  const pluginCacheDir = join(HOME, ".claude", "plugins", "cache");
  if (existsSync(pluginCacheDir)) {
    for (const marketplace of readdirSync(pluginCacheDir, { withFileTypes: true })) {
      if (!marketplace.isDirectory()) continue;
      const mDir = join(pluginCacheDir, marketplace.name);
      for (const plugin of readdirSync(mDir, { withFileTypes: true })) {
        if (!plugin.isDirectory()) continue;
        const pDir = join(mDir, plugin.name);
        const versions = readdirSync(pDir, { withFileTypes: true }).filter((d) => d.isDirectory());
        if (versions.length === 0) continue;
        const latest = join(pDir, versions[versions.length - 1].name);
        pluginHooks.push(...parsePluginHooks(join(latest, "hooks", "hooks.json"), plugin.name));
      }
    }
  }

  return [...global, ...project, ...pluginHooks];
}

// ── Plugins ──
export function getPlugins(): PluginDef[] {
  const settingsPath = join(HOME, ".claude", "settings.json");
  if (!existsSync(settingsPath)) return [];

  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const enabled = settings.enabledPlugins || {};
    const plugins: PluginDef[] = [];

    for (const [key, isEnabled] of Object.entries(enabled)) {
      const [name, marketplace] = key.split("@");
      // Try to read plugin.json for more info
      const pluginCacheDir = join(HOME, ".claude", "plugins", "cache");
      let description = "";
      let version = "";

      if (existsSync(pluginCacheDir)) {
        const mDir = join(pluginCacheDir, marketplace);
        if (existsSync(mDir)) {
          const pDir = join(mDir, name);
          if (existsSync(pDir)) {
            const versions = readdirSync(pDir, { withFileTypes: true }).filter((d) => d.isDirectory());
            if (versions.length > 0) {
              const latest = join(pDir, versions[versions.length - 1].name);
              const pjson = join(latest, ".claude-plugin", "plugin.json");
              if (existsSync(pjson)) {
                const meta = JSON.parse(readFileSync(pjson, "utf-8"));
                description = meta.description || "";
                version = meta.version || versions[versions.length - 1].name;
              }
            }
          }
        }
      }

      plugins.push({
        name,
        version,
        description,
        enabled: isEnabled as boolean,
        scope: marketplace,
      });
    }
    return plugins;
  } catch {
    return [];
  }
}
