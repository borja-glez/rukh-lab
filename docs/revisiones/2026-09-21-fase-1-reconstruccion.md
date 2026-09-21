# Revisión por reconstrucción de la fase 1 (M0-M6) · 2026-09-21

Una tercera revisión de la fase 1, con un método distinto del de las dos anteriores: en vez de
leer las lecciones, **hacerlas**. Leer `rukh-lab` de M0 a M6 y construir el modelo únicamente con
lo que dan, sin abrir el repositorio `rukh` salvo para recuperar datos o comprobar que una cifra
cuadraba.

El paquete que salió de ahí fue un andamio de verificación y no se publica: su valor estaba en
construirlo, porque es lo que destapó los huecos, y mantener una segunda implementación en
paralelo sería un pasivo que se desincronizaría del `rukh` real. Lo que queda es este registro y
las correcciones que ya están en las lecciones.

El veredicto en una frase: **el curso explicaba excelentemente y no se podía seguir**. Las
lecciones argumentan cada decisión, publican los números medidos y cuentan los errores que
costaron tiempo; lo que no tenían era el código de las decisiones que argumentan. Un lector con
experiencia podía reconstruir el decoder; un lector del nivel al que apunta el curso, no.

Lo que sigue es el inventario, módulo a módulo, de lo que faltaba y de lo que ahora está.

---

## El dato que abre la auditoría

Antes de la revisión, `rukh-lab` tenía **181 bloques de código** en sus diecinueve lecciones. De
esos, los bloques de Python sumaban unas 480 líneas, y **la mayor parte eran scripts de laboratorio**
(`labs/m1/explore.py`, `labs/m2/params.py`, `labs/m3/bidirectional.py`…), es decir, código que
_usa_ el modelo. El paquete `rukh` mide 23 441 líneas, de las que el camino del modelo
—tokenizador, empaquetado, dataloader, decoder, encoder, bucles, LoRA, DPO, GRPO, evaluación,
exportación— son unas 6 000.

La lección M2 dice literalmente: «Al terminar tendrás `src/rukh/models/decoder.py`: el modelo
completo en unas doscientas líneas». Esas doscientas líneas no estaban en el curso.

---

## M0 · Taller

**Estaba**: la prosa, los cuatro comandos, sus salidas reales, la justificación de cada filtro de
la descarga y el argumento del oráculo verificable. Todo correcto.

**Faltaba**:

| Qué                                   | Por qué importa                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `env.info()` y `find_stockfish()`     | La lección enseña la salida de `rukh info` y nunca cómo se produce                |
| `BaseConfig` con `extra="forbid"`     | El ejercicio 2 se apoya en un comportamiento que no está escrito en ningún sitio  |
| `engine.check()` y `limit_strength()` | `uci_elo_min/max` se leen del motor, no se escriben a mano, y eso es el argumento |
| `where_clause()` / `build_query()`    | La SQL del `--dry-run` es el entregable del módulo y no había forma de generarla  |

**Corregido en el curso**: sección nueva «El código del taller», con las cuatro piezas y el
callout que explica el `max_elo` que M4 añadiría después.

---

## M1 · Datos y tokenización

**Estaba**: la mejor parte teórica del curso. La comparación de las tres tokenizaciones con
números medidos, el argumento del empaquetado en flujo frente al padding, las fugas entre splits,
el callout del índice que se copiaba a los workers. El esquema de `PackedDataset` comentado línea
a línea.

**Faltaba**, y aquí el hueco era grave porque M1 es la base de todo:

| Qué                                                      | Estado antes                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `UciTokenizer` y la enumeración de las 2 030 entradas    | Descrita en prosa; el ejercicio 3 la invoca sin mostrarla                       |
| `clean_movetext` y `san_to_uci`                          | Descritas en prosa                                                              |
| `pack_games`: cómo se escriben `tokens.npy`/`starts.npy` | No aparecía                                                                     |
| `PackedDataset` completo                                 | Solo un «(esquema)» sin `__getstate__` ni `start_at_game=False`                 |
| `make_loader`                                            | Descrito en prosa                                                               |
| BPE a mano                                               | La teoría dice «conviene saber construirla a mano una vez» y nunca se construye |
| `train_bpe`                                              | El ejercicio 5 lo invoca sin mostrarlo                                          |

**Error factual encontrado**: la teoría decía que la enumeración «descarta `a1b3` o `a1c2`, que
ninguna pieza puede hacer». Los dos **son saltos de caballo legales** (desplazamientos (1,2) y
(2,1)) y están en el vocabulario. Los pares que de verdad se descartan son del tipo `a1b4` (1,3) o
`a1c4` (2,3). Está corregido, y hay un test que lo fija
(`tests/test_tokenizer.py::test_no_move_a_queen_or_knight_cannot_make`).

**Hueco pedagógico que el esquema tapaba**: el `PackedDataset` publicado cargaba `starts.npy` con
un `np.load` normal. Eso es exactamente el bug que el callout «Los tokens no se copian; el índice
sí» narra tres páginas antes, así que la lección contaba el fallo y publicaba el código que lo
tiene. Ahora el código publicado es el arreglado y el callout tiene su contrapartida visible.

---

## M2 · El decoder

**Estaba**: la mejor explicación de atención que he leído en un curso —los cuatro pasos con
números, la escala 1/√d como «el mando de volumen antes del amplificador», la máscara causal como
definición de la tarea y no como detalle—, la receta justificada número a número, la historia de la
escalera torcida y la de la métrica de puzles que medía un bug.

**Faltaba el modelo**:

| Qué                                                 | Estado antes                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `layers.py` (SelfAttention, Mlp, Block, RoPE)       | Cuatro fragmentos de 1 a 4 líneas                                  |
| `decoder.py` (`MoveDecoder` entero)                 | No aparecía. Lab 1 dice «Escribe `decoder.py`»                     |
| `DecoderConfig` y los presets                       | Solo sus valores citados en prosa                                  |
| `train/common.py` (param_groups, autocast, compile) | Un fragmento de 2 líneas del weight decay                          |
| `train/schedule.py`                                 | Un fragmento de 4 líneas                                           |
| `train/loop.py` (el bucle entero)                   | No aparecía                                                        |
| `train/checkpoint.py`                               | No aparecía; «un checkpoint no es guardar pesos» sin el checkpoint |
| `infer/sampler.py` (`prompt_ids`, `pick_move`)      | Solo el fragmento de la máscara                                    |
| `eval/elo.py` (Newton + bootstrap + peldaños)       | La fórmula en prosa, el código no                                  |
| `export/onnx.py` (cuantización, paridad, ejes)      | Solo `LastStepLogits`                                              |

**Corregido en el curso**: sección nueva «El modelo, entero» en la parte 1 (layers + decoder +
sampler completo), sección nueva «El bucle, antes de lanzarlo» en la parte 2 (param_groups,
autocast, compile, schedule, el bucle, `evaluate`, `save_checkpoint`), el ajuste de Elo con su
bootstrap y su detección de separación, la tabla `DEFAULT_RUNGS` con su procedencia, y las cuatro
funciones de la exportación en la parte 3.

---

## M3 · El encoder

**Estaba**: la sección sobre métricas con clase rara es, con diferencia, la parte más transferible
del curso entero. El 96,78 % que no significa nada, el F1 de 0,0000 en el umbral de fábrica, el
procedimiento de las dos mitades `tune`/`score`, el desalineamiento entre `mse_loss` y Spearman.

**Faltaba**:

| Qué                                        | Estado antes                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `encoder.py`                               | Dos líneas (`causal=True` / `causal=False`) y el `pool`                     |
| `heads.py`                                 | Tres líneas de firmas con un comentario cada una                            |
| `MultiHead.loss` con su máscara de errores | Descrita en prosa                                                           |
| `pairwise_rank_loss`                       | Descrita en prosa; es el arreglo del módulo                                 |
| `squares.py` (`fen_to_tokens`)             | Descrito en prosa                                                           |
| `train/mmm.py` (`apply_masking`)           | El lab lo invoca sin mostrarlo                                              |
| `eval/metrics.py`                          | «son cuarenta líneas y no merecen una dependencia», sin las cuarenta líneas |
| `eval/heuristic.py`                        | Descrita con precisión en prosa                                             |
| Los tres modos de congelado                | Descritos; el detalle del `eval` para dropout, también, pero sin código     |

**Corregido en el curso**: el encoder entero con `_key_mask` y su callout sobre `_tracing()`, las
tres cabezas y la pérdida conjunta, `fen_to_tokens` con la transposición fila/columna comentada,
`apply_masking` con el porqué de los dos sorteos independientes, las cuarenta líneas de métricas
(rangos medios, ROC AUC por Mann-Whitney, precisión media, F1, elección de umbral, reparto por
grupo) y las cuatro funciones de la heurística.

---

## M4 · Fine-tuning

**Estaba**: el mejor capítulo narrativo del curso. El agujero de los doce tokens sin gradiente, el
corpus plano, la aritmética de partidas necesarias, la corrida de control, `best.pt` que no es el
resultado de un afinado. `TARGETS` y `LoRALinear.forward` sí estaban.

**Faltaba**: `LoRALinear.__init__` (que es donde vive el `B = 0` y la construcción en el
dispositivo correcto), `apply_lora` (donde vive el congelado), `_target_slices`, `merge_lora` y
`merged_state_dict`, y `load_init_weights`.

**Corregido en el curso**: el constructor con sus dos comentarios que no están en ningún tutorial,
`apply_lora` con la frase de que congelar los embeddings **también** es parte del método,
`_target_slices`, las dos versiones del plegado con la diferencia entre mutar y no mutar, y
`load_init_weights` con el bloque del bucle que rechaza `--resume` junto a `init_from`.

---

## M5 · Alineamiento

**Estaba**: el argumento del instrumento —«para medir una diferencia, mide la diferencia»— con su
aritmética, el control que dio 0,975 en vez de 0,5 y los dos bugs que destapó, `dpo_loss`,
`elo_difference` y el estimador k3 de la KL.

**Faltaba**: `RewardModel` y `preference_loss`/`preference_accuracy`, el fichero entero de
recompensas verificables (que es el objeto del módulo), `group_advantages`, `sample_group`,
`grpo_loss`, `games_for_edge`, `run_match`, y las dos funciones de DPO donde vive el error
silencioso (`batches` con su índice `last`, y `move_logprobs`).

**Corregido en el curso**: las seis funciones de `rewards.py` con las cuatro reglas de diseño
escritas como reglas, `group_advantages` y `sample_group` con el porqué del muestreo con reemplazo,
`grpo_loss`, el reward model con la defensa de la cabeza sin acotar, `games_for_edge` y `run_match`
con su guarda de número par, y `batches`/`move_logprobs` con el callout de la referencia en modo
`eval`.

---

## M6 · Evaluar, exportar, publicar

**Estaba**: prácticamente todo lo que necesita. Es un módulo de método y de lectura de números, y
los dos están completos. Lab 1 (el suelo del instrumento medido cuatro veces) es un ejemplo de
cómo se estrena un instrumento.

**Faltaba**: el esquema de `results.json` y la generación de las cards desde él, que es lo que
sostiene la frase «ningún número de la tabla única se escribe a mano».

**Corregido en el curso**: `StageResult` con el porqué del hash de pesos separado del hash de
fichero, y `card_for` con la regla del `n/a`.

---

## Corrección: el pipeline de datos era un hueco mayor de lo que dijo la primera pasada

La primera versión de este documento cerraba diciendo que `evals` y `pairs` «no bloquean construir
el modelo, solo reconstruir el dataset de DPO». **Eso estaba mal, y el error fue metodológico**: el
listado de `src/rukh/data/` se leyó con un `tail` que se comió los nueve primeros ficheros por
orden alfabético. Al mirarlos enteros, uno de ellos no es opcional en absoluto.

`labels.py` (262 líneas) es **la tabla supervisada de M3**: las 438 093 posiciones con sus tres
etiquetas. Sin ella los labs de M3 no se pueden hacer, no solo los de M5. Y sus tres decisiones son
precisamente las que la lección argumenta durante páginas: la etiqueta de error necesita la posición
anterior de la misma partida, su ausencia es `null` y nunca `0`, y el reparto va por `game_id` con
un CRC-32 y no por posición. El curso explicaba el razonamiento y no daba el código.

La segunda tanda cubre eso y lo que estaba en la misma situación:

| Fichero        | Líneas | Por qué no era opcional                                                            |
| -------------- | -----: | ---------------------------------------------------------------------------------- |
| `labels.py`    |    262 | La tabla supervisada de M3. Sin ella no hay labs de M3                             |
| `scoring.py`   |     57 | La convención de mate y el signo, compartida por `evals`, `labels` y `pairs`       |
| `pairs.py`     |    262 | El «dataset entero gratis» de M1 y el brazo off-policy de M5                       |
| `puzzles.py`   |    308 | Donde vive `rebuild_prefix`, que **es** el arreglo del bug del 1,07 % que M2 narra |
| `onpolicy.py`  |    235 | El otro brazo del experimento central de M5                                        |
| `elo_bins.py`  |    158 | El corpus plano, que **es** el experimento de M4                                   |
| `positions.py` |    197 | `fen4`, la clave con la que se cruza todo                                          |
| `evals.py`     |    183 | El semi join que M1 vende como «una de las habilidades más rentables del oficio»   |
| `manifest.py`  |     33 | El manifiesto que hace auditable cada paso                                         |

**Dos detalles que solo aparecen al escribir el código**, y que ahora están en las lecciones:

- `positions.fen4` usa `has_legal_en_passant()` y no `ep_square`. La casilla al paso se escribe
  solo cuando la captura es legal, que es la convención de las evaluaciones publicadas. Un `fen4`
  construido de la forma obvia coincide en casi todas las posiciones y discrepa justo en esas: el
  semi join se las salta en silencio y la cobertura sale más baja sin que nada diga por qué.
- La última componente de `line_rank_key` es la cadena de la jugada, y es lo que hace **total** el
  orden. Sin ella, dos ejecuciones sobre el mismo fichero pueden elegir «mejor línea» distinta cada
  vez que dos empatan.

La reconstrucción añadió aquí nueve ficheros y veintisiete pruebas, todas sobre filas pequeñas: que el primer ply no tiene etiqueta de error, que es `null` y no `0`, que ninguna partida
cruza el reparto, que el margen de los pares se mide desde el bando que mueve, que una jugada
ilegal mata el par, que el balance lo fija la fase más pequeña, que el prefijo de un puzle es la
partida reproducida, y que un puzle irreconstruible se descarta **con su motivo**.

## Lo que no se ha tocado

Hay código del repositorio `rukh` que sigue sin estar en el curso y **está bien así**, porque no es
el modelo y la lección lo trata como herramienta:

- el publicador de Hugging Face (`publish/`, 454 líneas), la caché SQLite de evaluación, el
  catálogo de `rukh pull` y el descargador de la Elite Database;
- la envoltura `PreTrainedModel` (`models/hf.py`), cuyo interés es la comparación contra `peft` y
  cuyos tres detalles no documentados sí están en la lección;
- `pgn_text.py` y el afinado de Qwen3 con QLoRA, que son deliberadamente «código de otros»;
- `style.py` y `elite.py`: M4 ya publica sus YAML y la lista de sus tests, y lo que enseñan
  (rebanadas con campos tipados en vez de SQL en un YAML) cabe donde está;
- el descargador reanudable de `evals` con su caché del Hub; lo que se enseña es la consulta y la
  consolidación, que es donde está el patrón;
- las tres webs (demo, tokenizador en TypeScript, islas del curso).

---

## Tercera pasada: los ocho que no aparecían en ninguna lección

La pregunta «¿ya está al 100 %?» se contestó midiéndola en vez de afirmándola: extraer cada
`title="src/rukh/..."` de las diecinueve lecciones y compararlo con la lista de ficheros que hizo falta escribir.
Salieron **38 de 46**, y los ocho que faltaban no eran fontanería:

| Fichero                 | Por qué no podía faltar                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `eval/legality.py`      | La primera columna de la tabla única, con sus dos definiciones           |
| `eval/accuracy.py`      | La segunda: top-1 y top-3 por tramo de Elo                               |
| `infer/game.py`         | Cómo se juega una partida y qué se hace con una cortada                  |
| `train/heads.py`        | Los tres modos de congelado, que son el experimento central de M3        |
| `models/config.py`      | Sin él, el lab 1 de M2 no puede llamar a `preset("small")`               |
| `tokenize/san_chars.py` | Uno de los tres esquemas que M1 compara                                  |
| `data/manifest.py`      | La frase «cada paso deja un manifiesto» convertida en un modelo          |
| `paths.py`              | Diez líneas, y evitan que dos scripts discrepen sobre dónde está `data/` |

Y uno más que tampoco se había escrito en la reconstrucción: **`train/reward.py`**, el bucle del reward model, que es
un criterio de `GOAL.md` en M5.

Dos cosas que solo se ven al escribirlo:

- `set_training_mode` es la respuesta de un ejercicio de M3 convertida en código. **Congelar es más
  que `requires_grad = False`**: un módulo en modo `train` sigue aplicando dropout, así que la misma
  posición daría un vector distinto en cada época. Es el mismo detalle que M5 necesita otra vez con
  la referencia congelada de DPO.
- `adjudicate` estaba descrito en M6 y no en código. Anotar una partida cortada como tablas **no es
  neutral**: le regala medio punto al bando que iba perdiendo, y con un modelo que se queda sin
  contexto en las partidas largas ese sesgo apunta siempre al mismo lado.

**Resultado de la medición después de cerrarlos: 47 de 47.**

Un matiz honesto sobre ese número: cuenta que cada fichero aparece en el curso con sus partes
portantes y sus decisiones explicadas, no que esté volcado línea a línea. De `train/loop.py`, por
ejemplo, el curso enseña el bucle, `evaluate`, los grupos de parámetros, el planificador y el
checkpoint; no enseña las veinte líneas de construcción de directorios y logging que hay alrededor.
Esa es la frontera que se ha buscado: lo que hay que **entender y decidir** está; lo que es
andamiaje se cita.

## Cómo se comprobó que ahora sí se puede

1. El modelo se reescribió siguiendo las lecciones corregidas, fichero a fichero.
2. **83 pruebas en verde** sobre esa reconstrucción, incluidos los que el curso nombra como obligatorios:
   causalidad con diferencia exactamente nula, bidireccionalidad con diferencia no nula, las
   proporciones 80/10/10 contadas sobre diez mil tokens, el FEN que va y vuelve casilla a casilla,
   `y[:-1] == x[1:]`, el reparto que no cruza `game_id`, la pérdida de preferencia invariante a un
   desplazamiento constante, la KL no negativa en las dos direcciones y el recuento de parámetros
   contra la fórmula cerrada (5 309 952 / 38 971 392 / 115 120 128).
3. Una prueba de humo recorre la cadena entera sobre datos de juguete en treinta segundos:
   movetext → UCI → tokens → pack → dataloader → cinco pasos de entrenamiento → muestreo de una
   partida → legalidad → encoder + enmascarado + cabezas → LoRA identidad y plegado exacto. La
   pérdida arranca en 7,63, que es `ln(2030) = 7,616`: el número que la lección predice para un
   modelo sin entrenar.
4. En `rukh-lab`: `pnpm build`, `pnpm check` (0 errores), `pnpm lint`, `pnpm format:check`,
   `pnpm test` (102) y los **73 tests e2e** de Playwright, todos en verde con las lecciones
   ampliadas. (Un test de animación de M4 falla de vez en cuando bajo ocho workers en paralelo;
   pasa solo y pasa en dos pasadas completas seguidas, y está en una página que no se ha tocado.)
