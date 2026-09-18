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
  // Un elemento por checkpoint evaluado, ordenados por `step` ascendente.
  "steps": [
    {
      "step": 1000, // pasos de optimizador completados
      "train_loss": 3.41, // entropía cruzada media del paso (métrica train/loss de MLflow)
      "val_loss": 3.38, // val/loss
      "val_top1": 0.29, // val/top1, fracción en [0, 1]
      "legality": 0.71, // opcional: legalidad sin máscara del checkpoint, fracción en [0, 1]
      "elo": 620, // opcional: Elo estimado; null cuando ese checkpoint no se evaluó
    },
  ],
  "meta": {
    "run": "small", // nombre del run de MLflow
    "preset": "small",
    "max_steps": 20000,
    "generated": "2026-09-20T22:14:03Z", // null en el marcador de posición
  },
}
```

`legality` y `elo` son opcionales porque evaluar cada checkpoint contra Stockfish cuesta horas: lo
normal es rellenarlos solo en unos pocos. La isla escribe un guion en los que falten.
