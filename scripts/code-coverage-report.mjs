#!/usr/bin/env node
/**
 * Writes `docs/cobertura-de-codigo.md`: how much of `rukh` the course has actually shown.
 *
 * The course promises that every line of the engine is in a lesson, and a promise about 20 000
 * lines has to be a number, not a claim. This reads every code block of every lesson, resolves it
 * against the file it cites at the tag it cites, and reports what is covered and what is not — by
 * group, because the policy is not the same for the engine (all of it, inlined) and for the test
 * suite (the tests that teach a contract; the rest linked with a line saying what they guarantee).
 *
 * `node scripts/code-coverage-report.mjs [--write]`. Without `--write` it prints to stdout.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  blocksIn,
  fileAt,
  findRange,
  lessonFiles,
  looksLikeRepoFile,
  normalise,
  readLesson,
  tagForModule,
} from './lib/course-code.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(root, '..');
const write = process.argv.includes('--write');

/** Left out on purpose: generated, inert, or about the repository rather than the project. */
const LINKED_ONLY = [
  /^uv\.lock$/,
  /^LICENSE$/,
  /(^|\/)README\.md$/,
  /^\.github\//,
  /^tests\/fixtures\//,
  /^gold\//,
  /^mlflow\.db$/,
  /^docs\//,
  /^\.gitattributes$/,
];

const GROUPS = [
  ['src/rukh/data/cards/', 'Model cards (Jinja)'],
  ['src/', 'El motor (`src/rukh`)'],
  ['tests/', 'La suite de tests'],
  ['configs/', 'Configuraciones'],
  ['labs/', 'Labs'],
  ['scripts/', 'Scripts'],
];

const groupOf = (path) =>
  GROUPS.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'Raíz del repo';

if (!existsSync(resolve(workspace, 'rukh/.git'))) {
  console.log('code-coverage-report: ../rukh not found, nothing to report.');
  process.exit(0);
}

/** For every file of `rukh`, which of its non-blank lines the course has shown, and where. */
const shown = new Map();
for (const rel of lessonFiles(root)) {
  const lesson = readLesson(root, rel);
  for (const block of blocksIn(lesson.mdx)) {
    if (!looksLikeRepoFile(block.title) || !block.src) continue;
    const repo = block.src.repo ?? 'rukh';
    if (repo !== 'rukh') continue;
    const tag = block.src.tag ?? tagForModule(lesson.module);
    const text = tag ? fileAt(workspace, repo, tag, block.src.file) : null;
    if (!text) continue;
    const found = findRange(text, block.code);
    if (!found) continue;
    const key = `${block.src.file}@${tag}`;
    if (!shown.has(key)) shown.set(key, { lines: new Set(), lessons: new Set() });
    const entry = shown.get(key);
    entry.lessons.add(rel.replace(/\.mdx$/, ''));
    for (let l = found[0]; l <= found[1]; l += 1) entry.lines.add(l);
  }
}

const filesAt = (tag) =>
  execFileSync('git', ['-C', resolve(workspace, 'rukh'), 'ls-tree', '-r', '--name-only', tag], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('artifacts/'));

/**
 * A line of `rukh` at `p6` counts as shown when any module showed it at any tag where the line was
 * the same. A file that never changed is shown once; one that changed in M4 needs its M4 version.
 */
const rows = [];
for (const file of filesAt('p6')) {
  if (LINKED_ONLY.some((re) => re.test(file))) continue;
  const final = fileAt(workspace, 'rukh', 'p6', file);
  if (final === null) continue;
  const body = normalise(final).split('\n');
  const code = body.map((line, i) => [i + 1, line]).filter(([, line]) => line.trim() !== '');
  const covered = new Set();
  const lessons = new Set();
  for (const tag of ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
    const entry = shown.get(`${file}@${tag}`);
    if (!entry) continue;
    const at = fileAt(workspace, 'rukh', tag, file);
    if (at === null) continue;
    const there = normalise(at).split('\n');
    for (const l of entry.lines) {
      /* A line shown at an older tag counts at `p6` when the text is still there. Same position
         first: `return None` appears forty times, and `indexOf` alone would credit the first one
         every time and leave the other thirty-nine looking unshown. */
      const text = there[l - 1];
      if (text === undefined) continue;
      if (body[l - 1] === text) {
        covered.add(l);
        continue;
      }
      const i = body.indexOf(text);
      if (i !== -1) covered.add(i + 1);
    }
    for (const lesson of entry.lessons) lessons.add(lesson);
  }
  const hit = code.filter(([n]) => covered.has(n)).length;
  rows.push({
    file,
    group: groupOf(file),
    total: code.length,
    covered: hit,
    lessons: [...lessons],
  });
}

const sum = (list) =>
  list.reduce((acc, r) => ({ total: acc.total + r.total, covered: acc.covered + r.covered }), {
    total: 0,
    covered: 0,
  });
const pct = ({ covered, total }) =>
  total === 0 ? '—' : `${((100 * covered) / total).toFixed(1)} %`;

const byGroup = new Map();
for (const r of rows) byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), r]);

const lines = [];
lines.push('# Cobertura de código del curso');
lines.push('');
lines.push(
  'Generado por `node scripts/code-coverage-report.mjs --write`. Cuenta, para cada fichero de',
);
lines.push(
  '`rukh` en la etiqueta `p6`, cuántas de sus líneas con contenido aparecen en alguna lección, y las',
);
lines.push(
  'resuelve contra la etiqueta que cita el bloque. Las líneas en blanco no cuentan: Prettier las',
);
lines.push('recorta de los extremos de un bloque, así que nunca pertenecen a ninguno.');
lines.push('');
lines.push('## Por grupo');
lines.push('');
lines.push('| Grupo | Líneas mostradas | Total | Cobertura |');
lines.push('| ----- | ---------------- | ----- | --------- |');
for (const [group, list] of [...byGroup].sort((a, b) => sum(b[1]).total - sum(a[1]).total)) {
  const t = sum(list);
  lines.push(`| ${group} | ${t.covered} | ${t.total} | ${pct(t)} |`);
}
const all = sum(rows);
lines.push(`| **Total** | **${all.covered}** | **${all.total}** | **${pct(all)}** |`);
lines.push('');
lines.push('Fuera de la cuenta, por política y no por olvido: `uv.lock` (generado), `LICENSE`,');
lines.push(
  'los `README.md`, `.github/`, `tests/fixtures/`, `gold/` y `docs/`. No enseñan nada del proyecto.',
);
lines.push('');
lines.push('## Por hito: lo que el lector tiene escrito al cerrar cada módulo');
lines.push('');
lines.push(
  'La tabla de arriba mide contra `p6`, que es el estado final, y por eso castiga a los ficheros que',
);
lines.push(
  'varios módulos editan: el curso enseña la versión de cada etiqueta, y una línea que cambió después',
);
lines.push(
  'no aparece igual en `p6`. La pregunta que de verdad importa es otra: **al cerrar el módulo N, ¿está',
);
lines.push(
  'en el curso cada línea del motor tal como está en `pN`?** Eso es lo que mide esta tabla, contando',
);
lines.push('todo lo que enseñaron ese módulo y los anteriores.');
lines.push('');
lines.push(
  'Las dos son un **suelo**, no una medida exacta. Una línea mostrada en una etiqueta anterior se',
);
lines.push(
  'reconoce por su texto, y en un fichero repetitivo (`cli.py` tiene decenas de `) -> None:`) varias',
);
lines.push(
  'líneas idénticas se acreditan una sola vez. Donde el número baja, mira la tabla de abajo: dice qué',
);
lines.push('lección muestra cada fichero, y casi siempre son varias.');
lines.push('');
lines.push('| Hito | Líneas mostradas | Total en `src/rukh` | Cobertura |');
lines.push('| ---- | ---------------- | ------------------- | --------- |');
for (let n = 0; n <= 6; n += 1) {
  const tag = `p${n}`;
  let total = 0;
  let hit = 0;
  for (const file of filesAt(tag)) {
    if (!file.startsWith('src/') || file.startsWith('src/rukh/data/cards/')) continue;
    const text = fileAt(workspace, 'rukh', tag, file);
    if (text === null) continue;
    const body = normalise(text).split('\n');
    const code = new Set(
      body.map((line, i) => (line.trim() === '' ? 0 : i + 1)).filter((i) => i > 0),
    );
    total += code.size;
    /* Any earlier tag counts, as long as the text of that line is the same at this one. */
    for (const earlier of ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'].slice(0, n + 1)) {
      const entry = shown.get(`${file}@${earlier}`);
      if (!entry) continue;
      const at = fileAt(workspace, 'rukh', earlier, file);
      if (at === null) continue;
      const there = normalise(at).split('\n');
      for (const l of entry.lines) {
        const line = there[l - 1];
        if (line === undefined) continue;
        if (body[l - 1] === line && code.has(l)) {
          hit += code.delete(l) ? 1 : 0;
          continue;
        }
        const i = body.indexOf(line);
        if (i !== -1 && code.has(i + 1)) hit += code.delete(i + 1) ? 1 : 0;
      }
    }
  }
  const pctTag = total === 0 ? '—' : `${((100 * hit) / total).toFixed(1)} %`;
  lines.push(`| \`${tag}\` (M${n}) | ${hit} | ${total} | ${pctTag} |`);
}
lines.push('');
lines.push('## Ficheros que no están completos');
lines.push('');
const missing = rows.filter((r) => r.covered < r.total).sort((a, b) => b.total - a.total);
if (missing.length === 0) {
  lines.push('Ninguno: todas las líneas de todos los ficheros están en alguna lección.');
} else {
  lines.push('| Fichero | Mostradas | Total | Lecciones que lo muestran |');
  lines.push('| ------- | --------- | ----- | ------------------------- |');
  for (const r of missing) {
    const where = r.lessons.length > 0 ? r.lessons.map((l) => `\`${l}\``).join(', ') : '—';
    lines.push(`| \`${r.file}\` | ${r.covered} | ${r.total} | ${where} |`);
  }
}
lines.push('');

const out = `${lines.join('\n')}\n`;
if (write) {
  writeFileSync(resolve(root, 'docs/cobertura-de-codigo.md'), out);
  console.log(`code-coverage-report: wrote docs/cobertura-de-codigo.md (${pct(all)})`);
} else {
  process.stdout.write(out);
}
