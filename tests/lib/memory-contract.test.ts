import { describe, expect, it } from 'vitest';
import { loadCourseLessons } from '@/lib/course-content';
import { TOOLS, TOOLS_EN } from '@/data/tools';

describe('memory tool teaching contract', () => {
  it('uses one-target operation arrays in both languages, including single edits', () => {
    const memory = loadCourseLessons().memory;
    for (const prose of [memory.zh, memory.en]) {
      const examples = Array.from(prose.matchAll(/```json\s*\n([\s\S]*?)```/g));
      expect(examples.length).toBeGreaterThan(0);
      for (const [, example] of examples) {
        const args = JSON.parse(example);
        expect(['memory', 'user']).toContain(args.target);
        expect(Array.isArray(args.operations)).toBe(true);
        expect(args.operations.length).toBeGreaterThan(0);
        expect(args).not.toHaveProperty('action');
        for (const op of args.operations) {
          expect(['add', 'patch', 'remove']).toContain(op.action);
          if (op.action !== 'remove') expect(op.content).toEqual(expect.any(String));
          if (op.action !== 'add') expect(op.old_text).toEqual(expect.any(String));
        }
      }
    }
  });

  it('advertises the same required call shape in both tool cards', () => {
    for (const tools of [TOOLS, TOOLS_EN]) {
      const memory = tools.find((tool) => tool.id === 'memory');
      expect(memory).toBeDefined();
      const schema = JSON.parse(memory!.schema).parameters;
      expect(schema.required).toEqual(expect.arrayContaining(['target', 'operations']));
      expect(schema.properties.operations.type).toBe('array');
      expect(schema.properties.operations.items.required).toContain('action');
    }
  });
});
