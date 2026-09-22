import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A lesson may only point at files the reader can actually open.
 *
 * The course is written from a working folder that holds the three repos side by side plus a few
 * private files: the mission brief, the execution notes, the editor workspace. Those are not
 * published anywhere, so a sentence like "the >= 99 % bar of `GOAL.md`" sends the reader to look
 * for something that does not exist and cannot be made to exist — `GOAL.md` names Dokploy apps,
 * Hugging Face tokens and the points where the run stops to ask. Thirty-six such references had
 * accumulated across eleven lessons; what they all meant was the milestone's acceptance
 * criteria, which the glossary now defines as a concept of the course.
 *
 * Two checks, because only one of them can run everywhere:
 *
 * 1. The blocklist, always. No lesson names a working-folder file or an absolute local path.
 * 2. Resolution, when the sibling repos are checked out next to this one (they are on the
 *    author's machine and in a full clone; CI builds this repo alone, so the check skips rather
 *    than failing for the wrong reason).
 */

const LESSONS = resolve(__dirname, '../src/content/lessons');
const WORKSPACE = resolve(__dirname, '../..');
const REPOS = ['rukh', 'rukh-lab', 'rukh-web'];

/** Written by a command, not committed: `rukh pull` or a training run puts them there. */
const GENERATED = /^(artifacts|data|checkpoints)\//;

/** Lives in the working folder, outside every repo. Naming it strands the reader. */
const PRIVATE_TO_THE_AUTHOR = ['GOAL.md', 'RETOMAR-P4.md', 'CLAUDE.md', 'chess-lm.code-workspace'];

const EXTENSIONS = 'md|py|ts|tsx|yaml|yml|json|astro|mdx|txt|toml|cfg|sh';

const lessons = readdirSync(LESSONS, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => f.replace(/\\/g, '/'));

const read = (lesson: string) => readFileSync(resolve(LESSONS, lesson), 'utf8');

/**
 * The lesson's own words, with every fenced block removed.
 *
 * Since phase 1 started quoting `rukh` verbatim, a lesson contains thousands of lines the course
 * did not write, and some of them name things this test exists to forbid: the engine's own
 * docstrings cite `GOAL.md`, and pasted terminal output carries whatever path the machine printed.
 * Those are findings about `rukh`, to fix in `rukh`; what this test judges is what the course says
 * in its own voice. Removing the blocks is also what makes the check honest again -- before, it
 * passed only because the course was not showing the code.
 */
const prose = (lesson: string): string =>
  read(lesson).replace(/^([ \t]*)(`{3,})[\s\S]*?^\1\2[ \t]*$/gm, '');

/** Every `path/like/this.ext` in backticks, plus the bare filenames a sentence may shorten to. */
const referencesIn = (mdx: string): string[] => [
  ...new Set(
    [...mdx.matchAll(new RegExp(`\`([A-Za-z0-9_./-]+\\.(?:${EXTENSIONS}))\``, 'g'))].map(
      (m) => m[1],
    ),
  ),
];

const haveSiblings = REPOS.every((r) => existsSync(resolve(WORKSPACE, r)));

describe('file references in lessons', () => {
  it.each(lessons)('%s names no file the reader cannot open', (lesson) => {
    const mdx = prose(lesson);
    for (const name of PRIVATE_TO_THE_AUTHOR) {
      expect(mdx, `${lesson} points at ${name}, which is in no repo`).not.toContain(name);
    }
    /*
      `E:\work\ai\chess-lm\rukh\...` or `C:/Users/...`: a path on one machine and nowhere else.
      Six of these were sitting inside pasted command output, where they are easiest to miss and
      worst to leave: the reader greps for a directory that only exists on the author's disk. The
      fix is to elide everything above the repo root, not to stop pasting real output. Both
      separators, because Windows tools print each in different lines of the same run.
    */
    const driveLetter = /(?<![A-Za-z0-9])[A-Za-z]:[\\/](?![\\/])[A-Za-z0-9_\\/.-]*/g;
    const absolute = [...mdx.matchAll(driveLetter)].map((m) => m[0]);
    expect(absolute, `${lesson} has absolute local paths`).toEqual([]);
  });

  it.runIf(haveSiblings).each(lessons)('%s only names files that exist', (lesson) => {
    const missing = referencesIn(prose(lesson)).filter((ref) => {
      if (GENERATED.test(ref)) return false;
      /* A full path resolves against a repo root; a bare name only has to exist somewhere. */
      return !REPOS.some(
        (repo) =>
          existsSync(resolve(WORKSPACE, repo, ref)) ||
          existsSync(resolve(WORKSPACE, repo, 'src', ref)) ||
          found(repo, ref),
      );
    });
    expect(missing, `${lesson} names files that are in no repo`).toEqual([]);
  });
});

/** Walks a repo looking for a path that ends in `ref`, skipping the directories nobody commits. */
function found(repo: string, ref: string): boolean {
  const root = resolve(WORKSPACE, repo);
  const skip = new Set(['node_modules', '.git', 'dist', '.astro', 'test-results', '.venv']);
  const stack = [root];
  const tail = `/${ref}`;
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = `${dir}/${e.name}`.replace(/\\/g, '/');
      if (e.isDirectory()) {
        if (!skip.has(e.name)) stack.push(full);
      } else if (full.endsWith(tail)) {
        return true;
      }
    }
  }
  return false;
}
