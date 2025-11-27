import { App, TFile } from 'obsidian';

/**
 * Read frontmatter from a file using Obsidian's metadata cache
 * Falls back to parsing if cache is not ready
 */
export async function readFrontmatter<T extends Record<string, unknown>>(
  app: App,
  file: TFile
): Promise<T | null> {
  try {
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.frontmatter) {
      // Clone to avoid mutation issues and normalize keys
      const frontmatter = { ...cache.frontmatter } as T;
      return normalizeFrontmatterKeys(frontmatter);
    }

    // Fallback: read and parse manually
    const content = await app.vault.read(file);
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    // Use Obsidian's YAML parser if available
    const yaml = (window as unknown as { parseYaml?: (s: string) => unknown }).parseYaml;
    if (yaml) {
      const parsed = yaml(match[1]) as T;
      return normalizeFrontmatterKeys(parsed);
    }

    return null;
  } catch (error) {
    console.error(`Failed to read frontmatter from ${file.path}:`, error);
    return null;
  }
}

/**
 * Normalize frontmatter keys to handle space/underscore variations
 * flowtime uses spaces in YAML (e.g., "expected energy"),
 * but we also support underscores
 */
function normalizeFrontmatterKeys<T extends Record<string, unknown>>(frontmatter: T): T {
  const normalized = { ...frontmatter };

  // Map of space-separated keys to underscore versions
  const keyMappings: Record<string, string> = {
    'expected energy': 'expected_energy',
    'creation date': 'creation_date',
    'modification date': 'modification_date',
    'due to': 'due_to',
    'depends on': 'depends_on',
  };

  for (const [spaceKey, underscoreKey] of Object.entries(keyMappings)) {
    if (spaceKey in normalized && !(underscoreKey in normalized)) {
      (normalized as Record<string, unknown>)[underscoreKey] = (
        normalized as Record<string, unknown>
      )[spaceKey];
    }
  }

  return normalized;
}

/**
 * Update frontmatter atomically using Obsidian's API
 */
export async function updateFrontmatter<T extends Record<string, unknown>>(
  app: App,
  file: TFile,
  updates: Partial<T>
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        frontmatter[key] = value;
      }
    }
  });
}

/**
 * Create a new file with frontmatter
 */
export async function createFileWithFrontmatter(
  app: App,
  path: string,
  frontmatter: Record<string, unknown>,
  content = ''
): Promise<TFile> {
  const yamlContent = formatFrontmatterYAML(frontmatter);
  const fullContent = `${yamlContent}\n${content}`;

  const file = await app.vault.create(path, fullContent);
  return file;
}

/**
 * Format frontmatter as YAML string
 */
function formatFrontmatterYAML(frontmatter: Record<string, unknown>): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) {
      continue;
    } else if (value === null) {
      lines.push(`${key}:`);
    } else if (typeof value === 'string') {
      // Quote strings that might cause YAML issues
      if (needsQuoting(value)) {
        lines.push(`${key}: "${escapeYamlString(value)}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Check if a string value needs quoting in YAML
 */
function needsQuoting(value: string): boolean {
  // Quote if contains special characters or looks like a date/number/boolean
  if (!value) return false;
  if (value.includes(':') || value.includes('#') || value.includes('\n')) return true;
  if (value.startsWith('[') || value.startsWith('{')) return true;
  if (/^[\d.-]+$/.test(value)) return true;
  if (['true', 'false', 'yes', 'no', 'null'].includes(value.toLowerCase())) return true;
  return false;
}

/**
 * Escape special characters in a YAML string
 */
function escapeYamlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Safely get an integer from frontmatter
 */
export function safeInt(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely get a string from frontmatter
 */
export function safeString(value: unknown, defaultValue = ''): string {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}
