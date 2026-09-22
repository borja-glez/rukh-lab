#!/usr/bin/env node
/**
 * The tool that keeps the course honest about code.
 *
 * `verify`   every block that claims to be a file of a sibling repo is that file, verbatim, at the
 *            module's tag, and its `<Src lines="…">` says where.
 * `coverage` how much of each file of `rukh` the course has actually shown by the end of a module,
 *            counting every block of that module and the ones before it.
 * `show`     a file at a tag with line numbers, to pick ranges from.
 * `split`    the MDX for a file at a tag, already cut into blocks at top-level definitions.
 *
 * Needs the sibling clones (`../rukh`, `../rukh-web`); it exits 0 with a note when they are not
 * there, because a fresh clone of this repo alone still has to build.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  REPOS,
  blocksIn,
  fileAt,
  findDedented,
  findRange,
  lessonFiles,
  looksLikeRepoFile,
  normalise,
  parseRange,
  readLesson,
  tagForModule,
} from './lib/course-code.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(root, '..');
const [command = 'verify', ...rest] = process.argv.slice(2);

/** Files the course quotes by link instead of inlining: generated, or noise. See docs/codigo.md. */
const LINKED_ONLY = [
  /^uv\.lock$/,
  /^LICENSE$/,
  /^tests\/fixtures\//,
  /^gold\//,
  /^mlflow\.db$/,
  /^docs\//,
  /^\.gitattributes$/,
];

const isLinkedOnly = (path) => LINKED_ONLY.some((re) => re.test(path));

/** Which policy a file falls under, for the breakdown the headline number would hide. */
function groupOf(path) {
  if (path.startsWith('src/rukh/data/cards/')) return 'cards';
  if (path.startsWith('src/')) return 'src/rukh';
  if (path.startsWith('tests/')) return 'tests';
  if (path.startsWith('configs/')) return 'configs';
  if (path.startsWith('labs/')) return 'labs';
  if (path.startsWith('scripts/')) return 'scripts';
  return 'raíz';
}

function requireSiblings() {
  const missing = Object.keys(REPOS).filter((r) => !existsSync(resolve(workspace, r)));
  if (missing.length > 0) {
    console.log(
      `course-code: sibling repo(s) not found (${missing.join(', ')}), nothing to check.`,
    );
    process.exit(0);
  }
}

/**
 * Rewrites every `<Src lines="…">` to the range where its block actually sits.
 *
 * Nobody counts lines by hand, and after `pnpm format` nobody could: Prettier trims the blank
 * lines at the edges of a code block, so a block written to start on the blank line before a
 * definition starts one line later once it is formatted. The workflow is write, format, `fix`,
 * `verify`; a block whose content is not in the file at all is reported, never "fixed".
 */
function fix() {
  requireSiblings();
  let changed = 0;
  let reindented = 0;
  const problems = [];
  for (const rel of lessonFiles(root)) {
    const lesson = readLesson(root, rel);
    const lines = lesson.mdx.split('\n');
    for (const block of blocksIn(lesson.mdx)) {
      if (!looksLikeRepoFile(block.title) || !block.src) continue;
      const repo = block.src.repo ?? 'rukh';
      const tag = REPOS[repo]?.tagged
        ? (block.src.tag ?? tagForModule(lesson.module))
        : (block.src.tag ?? 'main');
      const text = tag ? fileAt(workspace, repo, tag, block.src.file) : null;
      if (text === null) {
        problems.push(`${rel}:${block.openLine} ${repo}@${tag} has no ${block.src.file}`);
        continue;
      }
      let found = findRange(text, block.code);
      if (found === null) {
        /* Same content, wrong indentation: restore the file's own lines and keep going. */
        const dedented = findDedented(text, block.code);
        if (dedented === null) {
          problems.push(`${rel}:${block.openLine} ${block.src.file}: the block is not in the file`);
          continue;
        }
        const open = lines.findIndex((l, i) => i >= block.openLine - 1 && /^\s*`{3,}/.test(l));
        let close = open + 1;
        while (close < lines.length && !/^\s*`{3,}\s*$/.test(lines[close])) close += 1;
        lines.splice(open + 1, close - open - 1, ...dedented.lines);
        reindented += 1;
        found = [dedented.from, dedented.to];
      }
      const wanted = `${found[0]}-${found[1]}`;
      const at = block.src.line - 1;
      const before = lines[at];
      const after = /lines="[^"]*"/.test(before)
        ? before.replace(/lines="[^"]*"/, `lines="${wanted}"`)
        : before.replace('/>', `lines="${wanted}" />`);
      if (after !== before) {
        lines[at] = after;
        changed += 1;
      }
    }
    const next = lines.join('\n');
    if (next !== lesson.mdx) writeFileSync(resolve(root, 'src/content/lessons', rel), next);
  }
  console.log(`course-code: rewrote ${changed} line range(s), reindented ${reindented} block(s)`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  if (problems.length > 0) process.exit(1);
}

/** Every citation in the course: one entry per block that claims to be a repo file. */
function citations() {
  const out = [];
  for (const rel of lessonFiles(root)) {
    const lesson = readLesson(root, rel);
    for (const block of blocksIn(lesson.mdx)) {
      if (!looksLikeRepoFile(block.title)) continue;
      out.push({ lesson: rel, module: lesson.module, block });
    }
  }
  return out;
}

/**
 * An inline component at the start of a line splits the paragraph in two.
 *
 * MDX reads a line that begins with `<` as a JSX block, so a sentence broken before a `<Term>` —
 * which is what a 100-column wrap does naturally — renders as two paragraphs with the sentence cut
 * in half, and `pnpm format` then makes the split permanent by inserting the blank line itself.
 * Indented lines are fine (a list item, a callout body), so only column zero is checked.
 */
function inlineAtLineStart() {
  const problems = [];
  /* A heading, another component or a finished sentence above means the component opens a new
     paragraph, which is fine. Anything else means the sentence above runs into it. */
  const opensAParagraph = (line) =>
    line === undefined || line.startsWith('#') || /[>.:!?]$/.test(line.trim());
  for (const rel of lessonFiles(root)) {
    const lines = readLesson(root, rel).mdx.split('\n');
    lines.forEach((line, i) => {
      if (!/^<(Term|ModelBadge|NotebookLink)\b/.test(line)) return;
      let above = i - 1;
      while (above >= 0 && lines[above].trim() === '') above -= 1;
      if (opensAParagraph(lines[above])) return;
      const name = /^<(\w+)/.exec(line)[1];
      problems.push(`${rel}:${i + 1} a sentence runs into a <${name}> that starts the line`);
    });
  }
  return problems;
}

/**
 * A fence in a language Prettier knows has to be guarded, or Prettier rewrites the code inside it.
 *
 * `embeddedLanguageFormatting` is on because turning it off changes how the MDX printer treats a
 * JSX element at the start of a line and de-indents list continuations. So the guard is per block:
 * `{/* prettier-ignore *\/}` on the line above. Python and TOML need none — Prettier does not know
 * them — which is why this only bit the YAML configs, the TypeScript of the demo and the README.
 */
const PRETTIER_KNOWS = new Set([
  'css',
  'graphql',
  'handlebars',
  'html',
  'js',
  'json',
  'jsonc',
  'jsx',
  'less',
  'markdown',
  'md',
  'mdx',
  'mjs',
  'scss',
  'ts',
  'tsx',
  'vue',
  'yaml',
  'yml',
]);

function unguardedFences() {
  const problems = [];
  for (const rel of lessonFiles(root)) {
    const { mdx } = readLesson(root, rel);
    const lines = mdx.split('\n');
    for (const block of blocksIn(mdx)) {
      if (!looksLikeRepoFile(block.title)) continue;
      if (!PRETTIER_KNOWS.has(block.lang.toLowerCase())) continue;
      const above = lines[block.openLine - 2]?.trim();
      if (above !== '{/* prettier-ignore */}') {
        problems.push(
          `${rel}:${block.openLine} a ${block.lang} block with no {/* prettier-ignore */}`,
        );
      }
    }
  }
  return problems;
}

function verify() {
  requireSiblings();
  const problems = [...inlineAtLineStart(), ...unguardedFences()];
  const all = citations();
  for (const { lesson, module, block } of all) {
    const where = `${lesson}:${block.openLine}`;
    const src = block.src;
    if (!src) {
      problems.push(`${where} ${block.title}: no <Src …/> under the block`);
      continue;
    }
    if (src.file !== block.title) {
      problems.push(`${where} title is ${block.title} but <Src file> is ${src.file}`);
      continue;
    }
    const repo = src.repo ?? 'rukh';
    if (!REPOS[repo]) {
      problems.push(`${where} unknown repo "${repo}"`);
      continue;
    }
    const tag = REPOS[repo].tagged ? (src.tag ?? tagForModule(module)) : (src.tag ?? 'main');
    if (!tag) {
      problems.push(`${where} no tag, and module "${module}" does not imply one`);
      continue;
    }
    const text = fileAt(workspace, repo, tag, src.file);
    if (text === null) {
      problems.push(`${where} ${repo}@${tag} has no ${src.file}`);
      continue;
    }
    const found = findRange(text, block.code);
    if (found === null) {
      problems.push(`${where} ${src.file} at ${repo}@${tag}: the block is not in the file`);
      continue;
    }
    const claimed = parseRange(src.lines);
    if (claimed === null) {
      problems.push(
        `${where} ${src.file}: lines="${src.lines ?? ''}" is not a range; it is ${found[0]}-${found[1]}`,
      );
      continue;
    }
    if (claimed[0] !== found[0] || claimed[1] !== found[1]) {
      problems.push(
        `${where} ${src.file}: lines="${src.lines}" but the block is at ${found[0]}-${found[1]}`,
      );
    }
  }
  console.log(
    `course-code: ${all.length} code citation(s) in ${lessonFiles(root).length} lesson(s)`,
  );
  if (problems.length > 0) {
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error(`course-code: ${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log('course-code: every block is its file, verbatim, at the tag it cites.');
}

/** Lines of `rukh` at each tag, and which of them the course has shown by that module. */
function coverageModel() {
  const shown = new Map(); // `${repo}:${path}` -> Map(moduleIndex -> Set(line))
  for (const { module, block } of citations()) {
    const src = block.src;
    if (!src) continue;
    const repo = src.repo ?? 'rukh';
    const tag = REPOS[repo]?.tagged ? (src.tag ?? tagForModule(module)) : (src.tag ?? 'main');
    const text = fileAt(workspace, repo, tag, src.file);
    if (!text) continue;
    const found = findRange(text, block.code);
    if (!found) continue;
    const key = `${repo}:${src.file}`;
    const index = Number(/^m([0-6])$/.exec(module ?? '')?.[1] ?? -1);
    if (!shown.has(key)) shown.set(key, new Map());
    const byModule = shown.get(key);
    if (!byModule.has(index)) byModule.set(index, new Set());
    for (let l = found[0]; l <= found[1]; l += 1) byModule.get(index).add(l);
  }
  return shown;
}

function coverage() {
  requireSiblings();
  const shown = coverageModel();
  const rows = [];
  for (let n = 0; n <= 6; n += 1) {
    const tag = `p${n}`;
    const files = execFileSync(
      'git',
      ['-C', resolve(workspace, 'rukh'), 'ls-tree', '-r', '--name-only', tag],
      {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      },
    )
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('artifacts/') && !isLinkedOnly(s));
    for (const file of files) {
      const text = fileAt(workspace, 'rukh', tag, file);
      if (text === null) continue;
      /* Blank lines are not code, and they cannot be covered: Prettier trims them off the edges
         of a block, so the two that separate one definition from the next never belong to
         either block. Counting them would put a ceiling below 100 % for a reason that teaches
         the reader nothing. */
      const body = normalise(text).split('\n');
      const code = new Set();
      body.forEach((line, i) => {
        if (line.trim() !== '') code.add(i + 1);
      });
      const byModule = shown.get(`rukh:${file}`) ?? new Map();
      const upTo = new Set();
      for (const [index, set] of byModule) if (index <= n) for (const l of set) upTo.add(l);
      const covered = [...upTo].filter((l) => code.has(l)).length;
      rows.push({ module: `m${n}`, file, total: code.size, covered });
    }
  }
  const wanted = rest.includes('--all') ? rows : rows.filter((r) => r.module === 'm6');
  const missing = wanted.filter((r) => r.covered < r.total).sort((a, b) => b.total - a.total);
  const totals = wanted.reduce(
    (acc, r) => ({ total: acc.total + r.total, covered: acc.covered + r.covered }),
    { total: 0, covered: 0 },
  );
  console.log(
    `course-code: ${totals.covered}/${totals.total} lines shown (${((100 * totals.covered) / totals.total).toFixed(1)} %)`,
  );
  /* By group, because the policy is not the same for all of them: the engine is inlined whole, the
     test suite only where a test teaches a contract. One number hides which of the two slipped. */
  const groups = new Map();
  for (const r of wanted) {
    const group = groupOf(r.file);
    const acc = groups.get(group) ?? { total: 0, covered: 0 };
    groups.set(group, { total: acc.total + r.total, covered: acc.covered + r.covered });
  }
  for (const [group, acc] of [...groups].sort((a, b) => b[1].total - a[1].total)) {
    const pct = ((100 * acc.covered) / acc.total).toFixed(1);
    console.log(`  ${group.padEnd(16)} ${acc.covered}/${acc.total} (${pct} %)`);
  }
  console.log('');
  for (const r of missing.slice(
    0,
    Number(rest.find((a) => /^--top=/.test(a))?.split('=')[1] ?? 40),
  )) {
    console.log(`  ${r.module} ${r.file}: ${r.covered}/${r.total}`);
  }
  if (rest.includes('--json')) {
    writeFileSync(resolve(root, 'course-code-coverage.json'), JSON.stringify(rows, null, 2));
    console.log('course-code: wrote course-code-coverage.json');
  }
}

function show() {
  requireSiblings();
  const [tag, file] = rest;
  const text = fileAt(workspace, rest.includes('--web') ? 'rukh-web' : 'rukh', tag, file);
  if (text === null) {
    console.error(`course-code: ${file} is not at ${tag}`);
    process.exit(1);
  }
  normalise(text)
    .split('\n')
    .forEach((line, i) => console.log(`${String(i + 1).padStart(5)}  ${line}`));
}

const LANG = {
  py: 'python',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  json: 'json',
  ts: 'ts',
  tsx: 'tsx',
  mjs: 'js',
  jinja: 'markdown',
  md: 'markdown',
};

function split() {
  requireSiblings();
  const [tag, file] = rest;
  const max = Number(rest.find((a) => /^--max=/.test(a))?.split('=')[1] ?? 60);
  const text = fileAt(workspace, 'rukh', tag, file);
  if (text === null) {
    console.error(`course-code: ${file} is not at ${tag}`);
    process.exit(1);
  }
  const lines = normalise(text).split('\n');
  /* Cut before every top-level definition, then merge cuts that would leave tiny blocks. */
  const cuts = [0];
  lines.forEach((line, i) => {
    if (
      /^(def |class |@|[A-Z_]+ = |if __name__)/.test(line) &&
      i > 0 &&
      lines[i - 1].trim() === ''
    ) {
      cuts.push(i);
    }
  });
  cuts.push(lines.length);
  const ranges = [];
  let start = cuts[0];
  for (let i = 1; i < cuts.length; i += 1) {
    if (cuts[i] - start >= max || i === cuts.length - 1) {
      ranges.push([start + 1, cuts[i]]);
      start = cuts[i];
    }
  }
  const ext = file.split('.').pop();
  for (const [from, to] of ranges) {
    console.log('```' + (LANG[ext] ?? 'text') + ` title="${file}"`);
    console.log(lines.slice(from - 1, to).join('\n'));
    console.log('```');
    console.log(`<Src file="${file}" tag="${tag}" lines="${from}-${to}" />`);
    console.log('');
  }
}

const commands = { verify, coverage, show, split, fix };
if (!commands[command]) {
  console.error(
    `course-code: unknown command "${command}". One of ${Object.keys(commands).join(', ')}.`,
  );
  process.exit(1);
}
commands[command]();
