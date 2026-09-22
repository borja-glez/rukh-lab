/**
 * Reading and checking the code a lesson shows.
 *
 * The rule the course follows: every code block that claims to be a file of `rukh` is that file,
 * byte for byte, at the tag the module closed with. Nothing is paraphrased, nothing is simplified
 * "for the lesson", and a block that skips lines says so by being several blocks.
 *
 * A block declares itself twice, and both halves have to agree:
 *
 * ```python title="src/rukh/env.py"
 * …
 * ```
 * <Src file="src/rukh/env.py" tag="p0" lines="30-39" />
 *
 * The fence title is what the reader sees; the `<Src>` right below it is the citation (the link to
 * GitHub) and, at the same time, the machine-readable claim this module checks.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Repositories a lesson may quote. `tagged` repos resolve a citation against the module's tag. */
export const REPOS = {
  rukh: { tagged: true },
  'rukh-web': { tagged: false },
  'rukh-lab': { tagged: false },
};

/** A fence title is a file of a repo when it starts here, or is one of the root files below. */
const DIRS = [
  'src/',
  'tests/',
  'configs/',
  'labs/',
  'scripts/',
  'docs/',
  'e2e/',
  'nginx/',
  '.github/',
];

const ROOT_FILES = new Set([
  '.gitattributes',
  '.gitignore',
  '.python-version',
  '.prettierrc',
  'Dockerfile',
  'LICENSE',
  'README.md',
  'astro.config.mjs',
  'eslint.config.js',
  'package.json',
  'playwright.config.ts',
  'pyproject.toml',
  'uv.lock',
  'vitest.config.ts',
]);

export function looksLikeRepoFile(title) {
  if (!title) return false;
  return DIRS.some((d) => title.startsWith(d)) || ROOT_FILES.has(title);
}

/** `p0`…`p6` from `m0`…`m6`: the tag the module closed with. */
export function tagForModule(module) {
  const m = /^m([0-6])$/.exec(module ?? '');
  return m ? `p${m[1]}` : null;
}

export function lessonFiles(root) {
  const dir = resolve(root, 'src/content/lessons');
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.split('\\').join('/'))
    .sort();
}

export function readLesson(root, rel) {
  const mdx = readFileSync(resolve(root, 'src/content/lessons', rel), 'utf8');
  const module = /^module:\s*(\S+)\s*$/m.exec(mdx)?.[1] ?? null;
  return { rel, mdx, module };
}

/**
 * Fenced blocks, with the `<Src>` that follows them when there is one.
 *
 * Fences may be indented (inside `<Exercise>`) and may use more than three backticks: a block that
 * quotes Markdown, like the Jinja model cards, needs four. The closing fence is the first one with
 * the same run of backticks at the same or smaller indent.
 */
export function blocksIn(mdx) {
  const lines = mdx.split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^(\s*)(`{3,})([A-Za-z0-9]*)(.*)$/.exec(lines[i]);
    if (!open) continue;
    const [, indent, ticks, lang, meta] = open;
    const closing = new RegExp(`^\\s{0,${indent.length}}${ticks}\\s*$`);
    let end = i + 1;
    while (end < lines.length && !closing.test(lines[end])) end += 1;
    const body = lines.slice(i + 1, end);
    const dedent = indent.length
      ? body.map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
      : body;
    blocks.push({
      lang,
      title: /title="([^"]*)"/.exec(meta)?.[1] ?? null,
      code: dedent.join('\n'),
      openLine: i + 1,
      src: srcAfter(lines, end + 1),
    });
    i = end;
  }
  return blocks;
}

/** The `<Src …/>` on the first non-blank line after a fence, if that is what is there. */
function srcAfter(lines, from) {
  let i = from;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (i >= lines.length) return null;
  const tag = /^\s*<Src\s([^>]*?)\/>\s*$/.exec(lines[i]);
  if (!tag) return null;
  /** @type {Record<string, string>} */
  const attrs = {};
  for (const m of tag[1].matchAll(/([a-z]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return {
    file: attrs.file,
    tag: attrs.tag,
    lines: attrs.lines,
    repo: attrs.repo,
    note: attrs.note,
    line: i + 1,
  };
}

const cache = new Map();

/** A file as it was at a ref of a sibling repo. `null` when the path is not there. */
export function fileAt(workspace, repo, ref, path) {
  const key = `${repo}@${ref}:${path}`;
  if (cache.has(key)) return cache.get(key);
  let text;
  try {
    text = execFileSync('git', ['-C', resolve(workspace, repo), 'show', `${ref}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    text = null;
  }
  cache.set(key, text);
  return text;
}

/** Windows checkouts and pasted code differ in line endings and trailing spaces; neither counts. */
export function normalise(text) {
  return text
    .split('\r')
    .join('')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n+$/, '');
}

export function parseRange(lines) {
  const span = /^(\d+)-(\d+)$/.exec(lines ?? '');
  if (span) return [Number(span[1]), Number(span[2])];
  const one = /^(\d+)$/.exec(lines ?? '');
  return one ? [Number(one[1]), Number(one[1])] : null;
}

/**
 * Where a block sits in its file when indentation is ignored, and the file's own lines for it.
 *
 * Prettier used to reformat the code inside a fence it recognised (`embeddedLanguageFormatting` is
 * now `off`), and the most common damage was de-indenting a block taken from inside a function. The
 * content was still the file's, one indent level short, which no reader would notice and the
 * checker would reject. This finds those and hands back the real lines.
 */
export function findDedented(fileText, code) {
  const haystack = normalise(fileText).split('\n');
  const needle = normalise(code).split('\n');
  const bare = (s) => s.trim();
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (bare(haystack[i + j]) !== bare(needle[j])) {
        ok = false;
        break;
      }
    }
    if (ok)
      return { from: i + 1, to: i + needle.length, lines: haystack.slice(i, i + needle.length) };
  }
  return null;
}

/** Where a block sits in its file, so a wrong `lines=` can be corrected instead of guessed. */
export function findRange(fileText, code) {
  const haystack = normalise(fileText).split('\n');
  const needle = normalise(code).split('\n');
  if (needle.length === 0) return null;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return [i + 1, i + needle.length];
  }
  return null;
}
