# chess-lm · copias sincronizadas

Todo lo que hay en esta carpeta (salvo este fichero) es una **copia** de
`../rukh-web/src/lib/chess-lm/`, el tokenizador que la demo usa para hablar con el modelo:

| Fichero               | Qué es                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| `tokenizer.ts`        | Vocabulario fijo UCI (`buildVocab`, `UciTokenizer`, `eloBin`)              |
| `san-chars.ts`        | Tokenizador a nivel de carácter sobre SAN numerado                         |
| `bpe.ts`              | Aplicación de fusiones BPE (formato `tokenizers`) sobre texto UCI          |
| `index.ts`            | Reexporta los tres                                                         |
| `vocab.json`          | Vocabulario exportado desde Python (`rukh data tokenize --export-fixture`) |
| `bpe.json`            | BPE entrenado sobre 200 000 partidas UCI de 2025-01                        |
| `fixtures/games.json` | 20 partidas codificadas desde Python para las pruebas de paridad           |

No se editan aquí. La fuente de verdad en TypeScript es `rukh-web`; la fuente de verdad de los
JSON es `rukh/artifacts/tokenizer/` (y, una vez publicado, `chorcat/rukh-tokenizer` en el Hub).

- `pnpm sync:tokenizer` vuelve a copiarlos (`scripts/sync-tokenizer.mjs`).
- `tests/tokenizer-copies.test.ts` compara el sha256 de cada copia con el original cuando la
  carpeta `../rukh-web` existe; si no existe (clon aislado, CI), el test se salta con un mensaje.
