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

function requireSiblings() {
  const missing = Object.keys(REPOS).filter((r) => !existsSync(resolve(workspace, r)));
  if (missing.length > 0) {
    console.log(`course-code: sibling repo(s) not found (${missing.join(', ')}), nothing to check.`);
    process.exit(0);
  }
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

function verify() {
  requireSiblings();
  const problems = [];
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
      problems.push(`${where} ${src.file}: lines="${src.lines ?? ''}" is not a range; it is ${found[0]}-${found[1]}`);
      continue;
    }
    if (claimed[0] !== found[0] || claimed[1] !== found[1]) {
      problems.push(
        `${where} ${src.file}: lines="${src.lines}" but the block is at ${found[0]}-${found[1]}`,
      );
    }
  }
  console.log(`course-code: ${all.length} code citation(s) in ${lessonFiles(root).length} lesson(s)`);
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
    const files = execFileSync('git', ['-C', resolve(workspace, 'rukh'), 'ls-tree', '-r', '--name-only', tag], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('artifacts/') && !isLinkedOnly(s));
    for (const file of files) {
      const text = fileAt(workspace, 'rukh', tag, file);
      if (text === null) continue;
      const total = normalise(text).split('\n').length;
      const byModule = shown.get(`rukh:${file}`) ?? new Map();
      const upTo = new Set();
      for (const [index, set] of byModule) if (index <= n) for (const l of set) upTo.add(l);
      const covered = [...upTo].filter((l) => l <= total).length;
      rows.push({ module: `m${n}`, file, total, covered });
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
  for (const r of missing.slice(0, Number(rest.find((a) => /^--top=/.test(a))?.split('=')[1] ?? 40))) {
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

const LANG = { py: 'python', yaml: 'yaml', yml: 'yaml', toml: 'toml', json: 'json', ts: 'ts', tsx: 'tsx', mjs: 'js', jinja: 'markdown', md: 'markdown' };

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
    if (/^(def |class |@|[A-Z_]+ = |if __name__)/.test(line) && i > 0 && lines[i - 1].trim() === '') {
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

const commands = { verify, coverage, show, split };
if (!commands[command]) {
  console.error(`course-code: unknown command "${command}". One of ${Object.keys(commands).join(', ')}.`);
  process.exit(1);
}
commands[command]();
