import fs from 'fs';
import path from 'path';

// Reads .claude/skills/*/SKILL.md so the UI can show what Claude skills
// exist for this project without anyone hand-maintaining a duplicate
// list — the skill files themselves (frontmatter + body) are the single
// source of truth, same as everything else in data/.

const SKILLS_DIR = path.resolve(process.cwd(), '.claude', 'skills');

export interface SkillDoc {
  id: string; // directory name, e.g. "find-trades"
  name: string;
  description: string;
  content: string; // the body, after frontmatter
  path: string; // absolute path to SKILL.md, for the UI's file:// link
}

function parseSkillFile(raw: string, fallbackName: string, filePath: string): SkillDoc {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { id: fallbackName, name: fallbackName, description: '', content: raw.trim(), path: filePath };
  }
  const [, frontmatter, body] = match;
  const fields: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return {
    id: fallbackName,
    name: fields.name || fallbackName,
    description: fields.description || '',
    content: body.trim(),
    path: filePath,
  };
}

export function getSkills(): SkillDoc[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillFile = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) return null;
      try {
        return parseSkillFile(fs.readFileSync(skillFile, 'utf-8'), entry.name, skillFile);
      } catch {
        return null;
      }
    })
    .filter((skill): skill is SkillDoc => skill !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function skillsDir(): string {
  return SKILLS_DIR;
}
