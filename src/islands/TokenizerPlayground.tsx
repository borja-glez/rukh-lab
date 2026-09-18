/**
 * TokenizerPlayground (lesson M1): paste a PGN and see the same game under the three
 * tokenizations, with ids, counters and a warning past 200 tokens. Runs entirely in the
 * browser (chess.js for PGN → UCI/SAN; the tokenizers in src/lib/chess-lm, copies of the
 * demo's). Styles live in src/styles/global.css (`.tp*`), never inline (CSP).
 */
import { Chess } from 'chess.js';
import { useId, useMemo, useState } from 'preact/hooks';
import { loadBpe, type BpeFile, type BpeTokenizer } from '../lib/chess-lm/bpe';
import { SanCharTokenizer } from '../lib/chess-lm/san-chars';
import { UciTokenizer } from '../lib/chess-lm/tokenizer';

/** Légal's mate: a legal 13-ply miniature (checked with chess.js in the build). */
export const DEFAULT_PGN =
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#';
export const BLOCK = 200;

type Result = '1-0' | '0-1' | '1/2-1/2';
const RESULTS: Result[] = ['1-0', '0-1', '1/2-1/2'];

/*
 * bpe.json arrives with `pnpm sync:tokenizer` once the BPE is trained (lab 5). The glob
 * resolves to nothing at build time when the file is missing, so the island still builds
 * and the BPE row explains what is pending instead of failing the whole page.
 */
const bpeFiles = import.meta.glob<BpeFile>('../lib/chess-lm/bpe.json', {
  eager: true,
  import: 'default',
});
const bpeJson = Object.values(bpeFiles)[0];

const uciTokenizer = new UciTokenizer();
const sanTokenizer = new SanCharTokenizer();
let bpeTokenizer: BpeTokenizer | null = null;
try {
  bpeTokenizer = bpeJson ? loadBpe(bpeJson) : null;
} catch {
  bpeTokenizer = null;
}

type ChipKind = 'special' | 'elo' | 'move' | 'char' | 'merge';

interface Chip {
  token: string;
  id: number;
  kind: ChipKind;
  /** BPE only: how many whole moves the token spans (≥ 2 marks a multi-move merge). */
  moves?: number;
}

interface Parsed {
  uci: string[];
  san: string[];
}

function parsePgn(pgn: string): Parsed {
  const chess = new Chess();
  chess.loadPgn(pgn.trim());
  const history = chess.history({ verbose: true });
  if (history.length === 0) throw new Error('la partida no tiene jugadas');
  return {
    uci: history.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`),
    san: history.map((m) => m.san),
  };
}

/** The numbered SAN text the char-level scheme encodes: `1.e4 e5 2.Nf3 ... 1-0`. */
function sanText(san: string[], result: Result): string {
  const parts = san.map((move, i) => (i % 2 === 0 ? `${i / 2 + 1}.${move}` : move));
  return `${parts.join(' ')} ${result}`;
}

function kindOf(token: string): ChipKind {
  if (/^<[wb]\d{4}>$/.test(token)) return 'elo';
  if (token.startsWith('<') && token.endsWith('>')) return 'special';
  return 'move';
}

function uciChips(uci: string[], whiteElo: number, blackElo: number, result: Result): Chip[] {
  const ids = uciTokenizer.encodeGame(uci.join(' '), whiteElo, blackElo, result, Infinity);
  return uciTokenizer.decode(ids).map((token, i) => ({ token, id: ids[i]!, kind: kindOf(token) }));
}

function sanChips(text: string): Chip[] {
  const ids = sanTokenizer.encode(text);
  return ids.map((id) => {
    const token = sanTokenizer.tokens[id] ?? '?';
    const special = token.startsWith('<') && token.endsWith('>');
    return { token: token === ' ' ? '␣' : token, id, kind: special ? 'special' : 'char' };
  });
}

/** BPE sees the moves concatenated without spaces (`e2e4e7e5...`), like `bpe_text` in Python. */
function bpeChips(uci: string[]): Chip[] {
  if (!bpeTokenizer) return [];
  const bounds: number[] = [];
  let offset = 0;
  for (const move of uci) {
    offset += move.length;
    bounds.push(offset);
  }
  const tokens = bpeTokenizer.tokenize(uci.join(''));
  const ids = bpeTokenizer.encode(uci.join(''));
  let cursor = 0;
  return tokens.map((token, i) => {
    const start = cursor;
    const end = cursor + token.length;
    cursor = end;
    /* Whole moves inside [start, end): count move boundaries that fall inside the span. */
    let whole = 0;
    let moveStart = 0;
    for (const b of bounds) {
      if (moveStart >= start && b <= end) whole += 1;
      moveStart = b;
    }
    return {
      token,
      id: ids[i] ?? -1,
      kind: whole >= 2 ? 'merge' : kindOf(token),
      moves: whole,
    };
  });
}

/** A deterministic legal game of up to 120 moves, for the "> 200 tokens" warning. */
export function longGamePgn(seed = 1, maxPlies = 240): string {
  let s = seed >>> 0;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const chess = new Chess();
  let plies = 0;
  while (!chess.isGameOver() && plies < maxPlies) {
    const moves = chess.moves();
    chess.move(moves[Math.floor(rnd() * moves.length)]!);
    plies += 1;
  }
  return chess.pgn();
}

interface Row {
  scheme: 'uci' | 'san' | 'bpe';
  title: string;
  note: string;
  chips: Chip[];
  pending?: string;
}

function ChipList({ chips }: { chips: Chip[] }) {
  return (
    <ul class="tp-chips">
      {chips.map((chip, i) => (
        <li
          key={`${i}-${chip.id}`}
          class={`tp-chip tp-chip--${chip.kind}`}
          data-id={chip.id}
          data-moves={chip.moves}
          title={chip.kind === 'merge' ? `${chip.moves} jugadas en un token` : undefined}
        >
          <span class="tp-chip__tok">{chip.token}</span>
          <span class="tp-chip__id">{chip.id}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TokenizerPlayground() {
  const [pgn, setPgn] = useState(DEFAULT_PGN);
  const [whiteElo, setWhiteElo] = useState(1800);
  const [blackElo, setBlackElo] = useState(1900);
  const [result, setResult] = useState<Result>('1-0');
  const base = useId();

  const outcome = useMemo(() => {
    try {
      const parsed = parsePgn(pgn);
      const rows: Row[] = [
        {
          scheme: 'uci',
          title: 'Vocabulario fijo UCI',
          note: 'una jugada, un token; control y Elo delante, resultado detrás',
          chips: uciChips(parsed.uci, whiteElo, blackElo, result),
        },
        {
          scheme: 'san',
          title: 'Carácter (SAN)',
          note: 'un carácter, un token, sobre el SAN numerado más el resultado',
          chips: sanChips(sanText(parsed.san, result)),
        },
        {
          scheme: 'bpe',
          title: 'BPE',
          note: 'fusiones aprendidas sobre las jugadas sin espacios; resaltadas las que abarcan varias jugadas',
          chips: bpeChips(parsed.uci),
          pending: bpeTokenizer
            ? undefined
            : 'Pendiente: bpe.json llega con pnpm sync:tokenizer cuando el BPE del lab 5 esté entrenado.',
        },
      ];
      return { ok: true as const, rows, plies: parsed.uci.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false as const, message };
    }
  }, [pgn, whiteElo, blackElo, result]);

  const onElo = (setter: (n: number) => void) => (event: Event) => {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (Number.isFinite(value)) setter(value);
  };

  return (
    <div
      class="tp"
      data-tokenizer-playground
      data-state={outcome.ok ? 'ok' : 'error'}
      data-bpe={bpeTokenizer ? 'ready' : 'pending'}
    >
      <div class="tp__controls">
        <div class="tp__field tp__field--pgn">
          <label class="label" for={`${base}-pgn`}>
            PGN
          </label>
          <textarea
            id={`${base}-pgn`}
            class="tp__textarea"
            rows={4}
            spellcheck={false}
            value={pgn}
            onInput={(e) => setPgn((e.currentTarget as HTMLTextAreaElement).value)}
          />
        </div>
        <div class="tp__field">
          <label class="label" for={`${base}-w`}>
            Elo blancas
          </label>
          <input
            id={`${base}-w`}
            class="tp__input"
            type="number"
            min={600}
            max={3300}
            step={50}
            value={whiteElo}
            onInput={onElo(setWhiteElo)}
          />
        </div>
        <div class="tp__field">
          <label class="label" for={`${base}-b`}>
            Elo negras
          </label>
          <input
            id={`${base}-b`}
            class="tp__input"
            type="number"
            min={600}
            max={3300}
            step={50}
            value={blackElo}
            onInput={onElo(setBlackElo)}
          />
        </div>
        <div class="tp__field">
          <label class="label" for={`${base}-r`}>
            Resultado
          </label>
          <select
            id={`${base}-r`}
            class="tp__input"
            value={result}
            onChange={(e) => setResult((e.currentTarget as HTMLSelectElement).value as Result)}
          >
            {RESULTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div class="tp__actions">
          <button
            type="button"
            class="btn btn--secondary btn--small"
            onClick={() => setPgn(DEFAULT_PGN)}
          >
            Mate de Légal
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--small"
            onClick={() => setPgn(longGamePgn())}
          >
            Partida larga
          </button>
        </div>
      </div>

      {outcome.ok ? (
        <div class="tp__rows">
          <p class="caption tp__summary">
            {outcome.plies} medias jugadas · bloque de {BLOCK} tokens
          </p>
          {outcome.rows.map((row) => {
            const n = row.chips.length;
            const over = n > BLOCK;
            return (
              <section
                key={row.scheme}
                class="tp-row"
                data-scheme={row.scheme}
                aria-labelledby={`${base}-${row.scheme}`}
              >
                <header class="tp-row__head">
                  <h4 class="tp-row__title" id={`${base}-${row.scheme}`}>
                    {row.title}
                  </h4>
                  {row.pending ? (
                    <span class="caption tp-row__pending">{row.pending}</span>
                  ) : (
                    <span class="tp-row__count" data-count={n}>
                      <strong>{n}</strong> tokens
                    </span>
                  )}
                  {over && (
                    <span class="tp-row__warn" data-warning role="status">
                      más de {BLOCK}: el dataloader la truncaría
                    </span>
                  )}
                </header>
                <p class="caption tp-row__note">{row.note}</p>
                {row.chips.length > 0 && <ChipList chips={row.chips} />}
              </section>
            );
          })}
          <p class="caption tp__legend">
            <span class="tp-chip tp-chip--special tp-chip--legend">control</span>
            <span class="tp-chip tp-chip--elo tp-chip--legend">Elo</span>
            <span class="tp-chip tp-chip--move tp-chip--legend">jugada / carácter</span>
            <span class="tp-chip tp-chip--merge tp-chip--legend">fusión de varias jugadas</span>
            <span>· cada ficha muestra token · id</span>
          </p>
        </div>
      ) : (
        <div class="tp__error" role="alert">
          <p class="tp__error-main">
            No he podido leer ese PGN. Comprueba que cada jugada es legal en su posición y que no
            falta ninguna; es lo mismo que hace <code>san_to_uci</code> en Python al devolver{' '}
            <code>None</code>.
          </p>
          <p class="caption tp__error-detail" title={outcome.message}>
            Detalle del analizador: <code>{outcome.message}</code>
          </p>
        </div>
      )}
    </div>
  );
}
