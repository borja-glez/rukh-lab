# `src/data/` · JSON que leen las islas

Cada fichero de esta carpeta lo produce un lab del repo `rukh` en `artifacts/web/` y lo copia aquí
`pnpm sync:data`. **Ninguno se edita a mano.** Los que todavía no tiene medidos el controlador se
versionan como marcador de posición (colecciones vacías y `meta.generated: null`); las islas que los
leen detectan ese estado y muestran "pendiente" en vez de dibujar cifras inventadas.

| Fichero                | Lo genera                     | Lo lee                           |
| ---------------------- | ----------------------------- | -------------------------------- |
| `results.json`         | `rukh eval` (tabla única)     | `<ResultsTable>`                 |
| `tokenizer-stats.json` | `rukh data tokenize --stats`  | `<TokenizerStats>`               |
| `attention.json`       | `labs/m2/attention_export.py` | `src/islands/AttentionMap.tsx`   |
| `training-replay.json` | `labs/m2/replay_export.py`    | `src/islands/TrainingReplay.tsx` |
| `value-bar.json`       | `labs/m3/value_bar_export.py` | `src/islands/ValueBar.tsx`       |

## `attention.json` · esquema `rukh-attention/1`

```jsonc
{
  "schema": "rukh-attention/1",
  "game": {
    // Jugadas en UCI, en orden, tal como entran en el modelo. Son las etiquetas de las filas
    // y de las columnas del mapa: la posición i del array es el token de consulta i y la clave i.
    // Los tokens de control (<bos>, <w1800>, <b1900>) pueden incluirse con ese mismo nombre.
    "moves": ["e2e4", "e7e5", "g1f3"],
  },
  "layers": 12, // número de capas exportadas; debe ser weights.length
  "heads": 8, // cabezas por capa; debe ser weights[i].length
  // [capa][cabeza][consulta][clave]. Cada fila de consulta suma 1 sobre las claves que la máscara
  // causal deja ver (las posteriores valen 0). Cuadrada: weights[l][h].length === moves.length y
  // weights[l][h][q].length === moves.length.
  "weights": [
    [
      [
        [1.0, 0.0, 0.0],
        [0.62, 0.38, 0.0],
        [0.21, 0.47, 0.32],
      ],
    ],
  ],
  "meta": {
    "model": "rukh-small", // preset o repo del Hub
    "checkpoint": "checkpoints/small/best.pt",
    "generated": "2026-09-20T22:14:03Z", // null en el marcador de posición
  },
}
```

La isla normaliza el color por el máximo de la cabeza seleccionada, así que los pesos se exportan
tal cual salen del softmax, sin reescalar. Una partida de 20-30 jugadas es el tamaño cómodo: por
encima de 40 la tabla deja de leerse en un móvil.

## `training-replay.json` · esquema `rukh-training-replay/1`

```jsonc
{
  "schema": "rukh-training-replay/1",
  // Un elemento por **checkpoint** (`step-*.pt` del run), ordenados por `step` ascendente.
  // No uno por paso registrado en MLflow: el deslizador de la isla recorre checkpoints, y la
  // legalidad y el Elo solo se pueden medir donde quedan pesos en disco.
  "steps": [
    {
      "step": 1000, // pasos de optimizador completados; es el único campo garantizado
      "train_loss": 3.41, // entropía cruzada media del paso (métrica train/loss de MLflow)
      "val_loss": 3.38, // val/loss
      "val_top1": 0.29, // val/top1, fracción en [0, 1]
      "legality": 0.71, // opcional: legalidad sin máscara **por argmax**, fracción en [0, 1]
      "elo": 620, // opcional: Elo estimado; ausente cuando ese checkpoint no se evaluó
    },
  ],
  "meta": {
    "run": "small-20260919-013000", // nombre del run de MLflow
    "run_id": "f926711687b24bcca1712a314db977ac",
    "preset": "small",
    "max_steps": 20000,
    "checkpoints": "E:/.../checkpoints/small-20260919-013000", // de dónde salió cada entrada
    "generated": "2026-09-20T22:14:03Z", // null en el marcador de posición
  },
}
```

**Todos los campos menos `step` son opcionales.** `train_loss`, `val_loss` y `val_top1` se copian
de MLflow cuando esa métrica se registró en ese paso exacto: con las configuraciones que trae el
repo (`log_every: 10`, `eval_every: 250`/`500`, `ckpt_every: 1000`) siempre están, pero el escritor
no lo promete. `legality` exige `--with-legality` y `elo` exige `--with-elo`, que juega partidas
contra Stockfish para cada checkpoint y cuesta horas: lo normal es rellenarlo en unos pocos o en
ninguno. La isla escribe un guion en los que falten y deja un hueco en la línea correspondiente.

`legality` es la tasa **por argmax** (el token más probable, sin temperatura, sin top-k y sin
máscara), que es la definición del listón del ≥ 99 % de `GOAL.md` (D-026), no la muestreada.

## `value-bar.json` · esquema `rukh-value-bar/1`

```jsonc
{
  "schema": "rukh-value-bar/1",
  "game": {
    // Las dos notaciones de la **misma** partida y en el mismo orden: `moves` es lo que come el
    // modelo (UCI) y `san` es lo que lee una persona. `san[i]` y `moves[i]` son la jugada del ply
    // `i + 1`; la isla dibuja SAN y deja UCI en el DOM para que se pueda copiar.
    "moves": ["e2e4", "e7e5", "g1f3"],
    "san": ["e4", "e5", "Cf3"],
  },
  // Un elemento por **ply jugado**, ordenados por `ply` ascendente y empezando en 1. No hay
  // elemento para la posición inicial: las dos curvas valoran la posición *después* de la jugada,
  // que es la única sobre la que el encoder puede decir si esa jugada fue un error.
  "series": [
    {
      "ply": 1, // media jugada, 1 = la primera de las blancas; `series[i].ply === i + 1`
      "encoder": 0.08, // valor del encoder, tanh(cp/400) desde el punto de vista de las BLANCAS
      "stockfish": 0.06, // el mismo número calculado desde el `cp` de Stockfish, misma escala
      "blunder": false, // true si la cabeza `blunder` marca como error la jugada de este ply
    },
  ],
  "meta": {
    "model": "rukh-encoder", // preset o repo del Hub
    "checkpoint": "checkpoints/encoder-heads/best.pt",
    "white": "Byrne, D.", // nombres tal como vienen del PGN; null si la partida es anónima
    "black": "Fischer, R.",
    "event": "New York, 1956",
    "result": "0-1", // resultado de la partida, en notación PGN
    "value_scale": 400.0, // el 400 de tanh(cp/400): sin él las dos curvas no son comparables
    "threshold": 0.5, // probabilidad de la cabeza `blunder` a partir de la cual se marca el ply
    "generated": "2026-09-21T10:02:11Z", // null en el marcador de posición
  },
}
```

`encoder` y `stockfish` viven **en la misma escala acotada**, `tanh(cp / value_scale)` en `[-1, 1]`
y siempre desde el punto de vista de las blancas: positivo, ventaja blanca; negativo, ventaja negra.
Es lo que hace que las dos curvas se puedan dibujar sobre el mismo eje y que la distancia vertical
entre ellas signifique algo. Los dos campos son **opcionales** (`null` cuando esa fuente no valoró
ese ply): la isla deja un hueco en la línea en vez de bajarla a cero, igual que `TrainingReplay`.

Una partida de 40-60 plies es el tamaño cómodo. Por encima de 80 las etiquetas del eje dejan de
leerse en un móvil, y el deslizador pasa a necesitar demasiados pasos para llegar a un ply concreto.
