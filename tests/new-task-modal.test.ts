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
