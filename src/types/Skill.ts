// Mirrors vite-plugins/skillsReader.ts's SkillDoc — parsed straight from
// .claude/skills/*/SKILL.md, not hand-maintained.
export interface Skill {
  id: string; // directory name, e.g. "find-trades"
  name: string;
  description: string;
  content: string; // the body, after frontmatter
  path: string; // absolute path to SKILL.md, for the UI's file:// link
}

export type Skills = Skill[];
