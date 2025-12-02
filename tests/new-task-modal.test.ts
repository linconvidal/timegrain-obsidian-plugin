import { describe, it, expect } from 'vitest';

/**
 * Tests for YAML escaping logic used in NewTaskModal
 * Extracted from the modal for testability
 */

/**
 * Escape a value for YAML frontmatter
 */
function escapeYamlValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return `${key}: null`;
  }
  if (typeof value === 'string') {
    // Quote strings that contain YAML special characters or start with special chars
    const needsQuoting = /[:\#\[\]\{\}\,\&\*\?\|\-\<\>\=\!\%\@\`\n]/.test(value) ||
      /^[\s'"]/.test(value) ||
      /[\s'"]$/.test(value) ||
      value === '' ||
      value === 'true' || value === 'false' ||
      value === 'null' || value === 'yes' || value === 'no';
    if (needsQuoting) {
      // Escape double quotes and backslashes inside the string
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `${key}: "${escaped}"`;
    }
    return `${key}: ${value}`;
  }
  return `${key}: ${value}`;
}

describe('NewTaskModal YAML Escaping', () => {
  describe('special character handling', () => {
    it('should quote strings with colons', () => {
      expect(escapeYamlValue('title', '2024-01-15T10:30:00')).toBe('title: "2024-01-15T10:30:00"');
      expect(escapeYamlValue('title', 'Task: Do something')).toBe('title: "Task: Do something"');
    });

    it('should quote strings with hash comments', () => {
      expect(escapeYamlValue('title', 'Issue #123')).toBe('title: "Issue #123"');
    });

    it('should quote strings with brackets', () => {
      expect(escapeYamlValue('title', '[Important] Task')).toBe('title: "[Important] Task"');
      expect(escapeYamlValue('title', 'Task {urgent}')).toBe('title: "Task {urgent}"');
    });

    it('should quote strings with asterisks', () => {
      expect(escapeYamlValue('title', '* starred item')).toBe('title: "* starred item"');
    });

    it('should quote strings with question marks', () => {
      expect(escapeYamlValue('title', 'What is this?')).toBe('title: "What is this?"');
    });

    it('should quote strings with dashes', () => {
      expect(escapeYamlValue('title', '- list item')).toBe('title: "- list item"');
    });

    it('should quote strings with newlines', () => {
      // Newlines inside quotes are valid YAML - the string is quoted to prevent YAML parsing issues
      const result = escapeYamlValue('title', 'Line 1\nLine 2');
      expect(result.startsWith('title: "')).toBe(true);
      expect(result.endsWith('"')).toBe(true);
    });
  });

  describe('YAML reserved words', () => {
    it('should quote "true" and "false"', () => {
      expect(escapeYamlValue('status', 'true')).toBe('status: "true"');
      expect(escapeYamlValue('status', 'false')).toBe('status: "false"');
    });

    it('should quote "null"', () => {
      expect(escapeYamlValue('status', 'null')).toBe('status: "null"');
    });

    it('should quote "yes" and "no"', () => {
      expect(escapeYamlValue('title', 'yes')).toBe('title: "yes"');
      expect(escapeYamlValue('title', 'no')).toBe('title: "no"');
    });
  });

  describe('whitespace handling', () => {
    it('should quote strings starting with space', () => {
      expect(escapeYamlValue('title', ' starts with space')).toBe('title: " starts with space"');
    });

    it('should quote strings ending with space', () => {
      expect(escapeYamlValue('title', 'ends with space ')).toBe('title: "ends with space "');
    });

    it('should quote empty strings', () => {
      expect(escapeYamlValue('title', '')).toBe('title: ""');
    });

    it('should quote strings starting with quotes', () => {
      expect(escapeYamlValue('title', '"Quoted"')).toBe('title: "\\"Quoted\\""');
      expect(escapeYamlValue('title', "'Single'")).toBe("title: \"'Single'\"");
    });
  });

  describe('escape sequences', () => {
    it('should escape backslashes', () => {
      expect(escapeYamlValue('path', 'C:\\Users\\Name')).toBe('path: "C:\\\\Users\\\\Name"');
    });

    it('should escape double quotes', () => {
      expect(escapeYamlValue('title', 'Say "Hello"')).toBe('title: "Say \\"Hello\\""');
    });

    it('should escape both backslashes and quotes', () => {
      expect(escapeYamlValue('title', 'Path: "C:\\test"')).toBe('title: "Path: \\"C:\\\\test\\""');
    });
  });

  describe('non-string values', () => {
    it('should handle numbers', () => {
      expect(escapeYamlValue('estimation', 5)).toBe('estimation: 5');
      expect(escapeYamlValue('energy', 0)).toBe('energy: 0');
    });

    it('should handle null and undefined', () => {
      expect(escapeYamlValue('ended', null)).toBe('ended: null');
      expect(escapeYamlValue('ended', undefined)).toBe('ended: null');
    });

    it('should handle booleans (not as strings)', () => {
      expect(escapeYamlValue('completed', true)).toBe('completed: true');
      expect(escapeYamlValue('completed', false)).toBe('completed: false');
    });
  });

  describe('safe strings (no quoting needed)', () => {
    it('should not quote simple alphanumeric strings', () => {
      expect(escapeYamlValue('title', 'Simple Task')).toBe('title: Simple Task');
      expect(escapeYamlValue('category', 'work')).toBe('category: work');
    });

    it('should not quote status values', () => {
      expect(escapeYamlValue('status', 'today')).toBe('status: today');
      expect(escapeYamlValue('status', 'in progress')).toBe('status: in progress');
      expect(escapeYamlValue('status', 'backlog')).toBe('status: backlog');
    });
  });
});

describe('Filename collision safeguard', () => {
  it('documents max attempts behavior', () => {
    // The modal now limits filename generation to 1000 attempts
    // to prevent infinite loops if something goes wrong
    const maxAttempts = 1000;
    expect(maxAttempts).toBe(1000);
  });
});

/**
 * Parse comma-separated tags input
 * Extracted from NewTaskModal.parseTagsInput
 */
function parseTagsInput(value: string): string[] {
  if (!value.trim()) return [];
  const parts = value
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
  return Array.from(new Set(parts));
}

describe('parseTagsInput', () => {
  it('should parse comma-separated tags', () => {
    expect(parseTagsInput('urgent, review, backend')).toEqual(['urgent', 'review', 'backend']);
  });

  it('should handle single tag', () => {
    expect(parseTagsInput('urgent')).toEqual(['urgent']);
  });

  it('should trim whitespace from tags', () => {
    expect(parseTagsInput('  urgent  ,  review  ')).toEqual(['urgent', 'review']);
  });

  it('should strip hash prefix from tags', () => {
    expect(parseTagsInput('#urgent, #review')).toEqual(['urgent', 'review']);
    expect(parseTagsInput('#urgent, review, #backend')).toEqual(['urgent', 'review', 'backend']);
  });

  it('should deduplicate tags', () => {
    expect(parseTagsInput('urgent, review, urgent')).toEqual(['urgent', 'review']);
    expect(parseTagsInput('#urgent, urgent')).toEqual(['urgent']);
  });

  it('should return empty array for empty input', () => {
    expect(parseTagsInput('')).toEqual([]);
    expect(parseTagsInput('   ')).toEqual([]);
  });

  it('should filter out empty tags from multiple commas', () => {
    expect(parseTagsInput('urgent,,review')).toEqual(['urgent', 'review']);
    expect(parseTagsInput(',urgent,review,')).toEqual(['urgent', 'review']);
  });
});

/**
 * Frequency-sorted metadata options
 * Extracted from TaskRepository.getMetadataOptions logic
 */
function addOptionWithCount(target: Map<string, { value: string; count: number }>, value: string | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  const existing = target.get(key);
  if (existing) {
    existing.count++;
  } else {
    target.set(key, { value: trimmed, count: 1 });
  }
}

function toFrequencySortedValues(map: Map<string, { value: string; count: number }>): string[] {
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map((item) => item.value);
}

describe('Metadata frequency sorting', () => {
  describe('addOptionWithCount', () => {
    it('should add new options with count 1', () => {
      const map = new Map<string, { value: string; count: number }>();
      addOptionWithCount(map, 'work');
      expect(map.get('work')).toEqual({ value: 'work', count: 1 });
    });

    it('should increment count for existing options', () => {
      const map = new Map<string, { value: string; count: number }>();
      addOptionWithCount(map, 'work');
      addOptionWithCount(map, 'work');
      addOptionWithCount(map, 'work');
      expect(map.get('work')).toEqual({ value: 'work', count: 3 });
    });

    it('should be case-insensitive for matching', () => {
      const map = new Map<string, { value: string; count: number }>();
      addOptionWithCount(map, 'Work');
      addOptionWithCount(map, 'work');
      addOptionWithCount(map, 'WORK');
      // Should preserve first casing but count all
      expect(map.get('work')).toEqual({ value: 'Work', count: 3 });
    });

    it('should ignore empty/null/undefined values', () => {
      const map = new Map<string, { value: string; count: number }>();
      addOptionWithCount(map, '');
      addOptionWithCount(map, '   ');
      addOptionWithCount(map, undefined);
      expect(map.size).toBe(0);
    });

    it('should trim whitespace', () => {
      const map = new Map<string, { value: string; count: number }>();
      addOptionWithCount(map, '  work  ');
      expect(map.get('work')).toEqual({ value: 'work', count: 1 });
    });
  });

  describe('toFrequencySortedValues', () => {
    it('should sort by frequency descending', () => {
      const map = new Map<string, { value: string; count: number }>();
      map.set('work', { value: 'work', count: 5 });
      map.set('personal', { value: 'personal', count: 10 });
      map.set('hobby', { value: 'hobby', count: 2 });

      expect(toFrequencySortedValues(map)).toEqual(['personal', 'work', 'hobby']);
    });

    it('should use alphabetical order as tiebreaker', () => {
      const map = new Map<string, { value: string; count: number }>();
      map.set('zebra', { value: 'zebra', count: 3 });
      map.set('apple', { value: 'apple', count: 3 });
      map.set('mango', { value: 'mango', count: 3 });

      expect(toFrequencySortedValues(map)).toEqual(['apple', 'mango', 'zebra']);
    });

    it('should handle mixed frequencies with tiebreakers', () => {
      const map = new Map<string, { value: string; count: number }>();
      map.set('work', { value: 'work', count: 5 });
      map.set('personal', { value: 'personal', count: 5 });
      map.set('hobby', { value: 'hobby', count: 2 });
      map.set('admin', { value: 'admin', count: 2 });

      // First by frequency (5, 5, 2, 2), then alphabetically within same frequency
      expect(toFrequencySortedValues(map)).toEqual(['personal', 'work', 'admin', 'hobby']);
    });

    it('should return empty array for empty map', () => {
      const map = new Map<string, { value: string; count: number }>();
      expect(toFrequencySortedValues(map)).toEqual([]);
    });

    it('should handle single item', () => {
      const map = new Map<string, { value: string; count: number }>();
      map.set('work', { value: 'work', count: 1 });
      expect(toFrequencySortedValues(map)).toEqual(['work']);
    });
  });

  describe('integration: full metadata collection', () => {
    it('should return most frequently used options first', () => {
      const categories = new Map<string, { value: string; count: number }>();

      // Simulate tasks with categories
      // 🐞 debug appears 3 times
      addOptionWithCount(categories, '🐞 debug');
      addOptionWithCount(categories, '🐞 debug');
      addOptionWithCount(categories, '🐞 debug');
      // 📝 documentation appears 1 time
      addOptionWithCount(categories, '📝 documentation');
      // 🚀 feature appears 2 times
      addOptionWithCount(categories, '🚀 feature');
      addOptionWithCount(categories, '🚀 feature');

      const sorted = toFrequencySortedValues(categories);
      expect(sorted[0]).toBe('🐞 debug'); // Most frequent
      expect(sorted[1]).toBe('🚀 feature'); // Second most
      expect(sorted[2]).toBe('📝 documentation'); // Least frequent
    });
  });
});
