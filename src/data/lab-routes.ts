/**
 * The contract of every lab: what it costs, what it leaves on disk, and whether you can skip it.
 *
 * The information already existed, but in the other repo: `rukh/docs/reproducir.md` and
 * `rukh/docs/runbooks/*.md` list every command with its wall clock, its output and its Hub
 * shortcut. A reader of the course could not see it without leaving the course, so a lab that
 * costs four hours of GPU looked exactly like one that costs three seconds, and someone without
 * a 5090 had no way to tell which ones they could still do.
 *
 * One table per lab lesson, at the top, rather than one box per lab: forty-four boxes repeat the
 * same five labels forty-four times, and the question a reader actually has -- *which of these do
 * I have to run tonight?* -- is answered by comparing the rows, not by reading them one at a time.
 *
 * Routes:
 * - `imprescindible`: seconds or a couple of minutes, and the next lab assumes you ran it.
 * - `con-gpu`: real machine time. Reference machine is an RTX 5090; expect more elsewhere.
 * - `observar`: nothing to run. Read the output, answer the question.
 *
 * `skip` is the `rukh pull` (or equivalent) that leaves the same artifact on disk without paying
 * the clock. A `con-gpu` row with no `skip` is one you either run or read.
 */
export type Route = 'imprescindible' | 'con-gpu' | 'observar';

export interface LabRoute {
  /** Matches the lab heading in the MDX, e.g. `Lab 3b`. */
  lab: string;
  /** What the lab does, in half a line. */
  what: string;
  route: Route;
  /** Wall clock on the reference machine, or an em dash when there is nothing to run. */
  clock: string;
  /** The artifact or the check that tells you it worked. */
  gives: string;
  /** The shortcut that leaves the same thing on disk. */
  skip?: string;
}

export const routeLabels: Record<Route, string> = {
  imprescindible: 'imprescindible',
  'con-gpu': 'cuesta máquina',
  observar: 'solo observar',
};

export const routeHelp: Record<Route, string> = {
  imprescindible: 'Segundos o pocos minutos, y el lab siguiente da por hecho que lo corriste.',
  'con-gpu': 'Tiempo real de GPU, red o motor. El reloj es el de la RTX 5090 de referencia.',
  observar: 'No se ejecuta nada: se lee la salida y se responde a la pregunta.',
};

export const labRoutes: Record<string, LabRoute[]> = {
  'm1/10-labs-del-pipeline': [
    {
      lab: 'Lab 1',
      what: 'Explorar el parquet con DuckDB',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'las consultas de Elo, longitud y resultado, en pantalla',
    },
    {
      lab: 'Lab 2',
      what: 'De SAN a UCI con python-chess',
      route: 'con-gpu',
      clock: '10-20 min de CPU',
      gives: 'data/uci/, 5 896 388 partidas',
      skip: 'rukh pull rukh-games-1800',
    },
    {
      lab: 'Lab 3',
      what: 'Las tres tokenizaciones y sus estadísticas',
      route: 'con-gpu',
      clock: '3-8 min el BPE y el UCI; el SAN, ~1,5 h y es opcional',
      gives: 'artifacts/tokenizer/bpe.json, data/tokens/',
      skip: 'rukh pull rukh-tokenizer',
    },
    {
      lab: 'Lab 4',
      what: 'Dataset y DataLoader con empaquetado por bloques',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'el precio del padding, medido',
    },
    {
      lab: 'Lab 5',
      what: 'Entrenar un BPE y mirar las fusiones',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'las primeras fusiones, impresas',
    },
    {
      lab: 'Lab 6',
      what: 'El resto del pipeline, que leen M2 a M6',
      route: 'con-gpu',
      clock: '~2,5 h, casi todo en data evals',
      gives: 'positions, evals, puzzles, pairs, elite y elo-bins',
      skip: 'rukh pull --module m2 trae los cuatro caros',
    },
  ],
  'm2/03-la-receta-de-entrenamiento': [
    {
      lab: 'tiny',
      what: 'Entrenar tiny de principio a fin, para ver el bucle entero funcionar',
      route: 'con-gpu',
      clock: '3 min de entrenamiento + ~10 de suite rápida',
      gives: 'checkpoints/tiny/best.pt, artifacts/eval/tiny/',
      skip: 'rukh pull tiny',
    },
    {
      lab: 'small',
      what: 'small entero, el primer modelo que juega por encima de 1200 Elo',
      route: 'con-gpu',
      clock: '42 min + ~30 de las 160 partidas',
      gives: 'checkpoints/small/best.pt y su fila en results.json',
      skip: 'rukh pull small',
    },
  ],
  'm2/07-exportar-a-onnx': [
    {
      lab: 'Exportar a ONNX',
      what: 'Los tres ONNX con su comprobación de paridad, y los JSON de las dos islas',
      route: 'con-gpu',
      clock: '~12 min de exportación + minutos de los dos scripts',
      gives: 'model{,-fp16,-int8}.onnx, parity.json, attention.json',
      skip: 'los tres ONNX están publicados en chorcat/rukh-small',
    },
  ],
  'm2/10-labs-del-decoder': [
    {
      lab: 'Lab 1',
      what: 'Contar los parámetros del decoder contra la fórmula cerrada',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'el desglose por bloque, que cuadra con el total',
    },
    {
      lab: 'Lab 2',
      what: 'Dibujar la máscara causal y demostrar que el futuro no entra',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'una diferencia de cero exacto entre la salida completa y la truncada',
    },
    {
      lab: 'Lab 3',
      what: 'Sacar los 96 mapas de atención de una partida corta',
      route: 'observar',
      clock: '—',
      gives: 'artifacts/web/m2/attention.json, que dibuja la isla de la lección 7',
    },
    {
      lab: 'Lab 4',
      what: 'Exportar la repetición del entrenamiento checkpoint a checkpoint desde MLflow',
      route: 'observar',
      clock: '—',
      gives: 'artifacts/web/m2/training-replay.json',
    },
  ],
  'm2/11-mas-datos-no-mas-red': [
    {
      lab: 'Corrida v2',
      what: 'Más datos con la misma red pequeña',
      route: 'con-gpu',
      clock: '~45 min',
      gives: 'checkpoints/small-v2/best.pt',
    },
    {
      lab: 'Corrida v3',
      what: 'La Elite de 44 meses, tokenizada y entrenada',
      route: 'con-gpu',
      clock: '~1,5 h de descarga + 5 min de tokenizar + ~45 de entrenar',
      gives: 'data/elite/games.parquet, checkpoints/small-v3/best.pt',
      skip: 'rukh pull rukh-games-elite, y rukh pull small para el modelo',
    },
    {
      lab: 'Corrida v4',
      what: 'medium-v4: la capacidad, cuando por fin está justificada',
      route: 'con-gpu',
      clock: '4 h 3 min + ~30 de evaluación',
      gives: 'checkpoints/medium-v4/best.pt, la base de M4 y M5',
      skip: 'rukh pull medium-v4',
    },
  ],
  'm3/03-labs-del-encoder': [
    {
      lab: 'Lab 1',
      what: 'El encoder bidireccional y el enmascarado',
      route: 'con-gpu',
      clock: 'segundos el script, 15 min el preentrenamiento',
      gives: 'checkpoints/encoder-mmm/best.pt, 75,2 % en jugadas tapadas',
      skip: 'rukh pull encoder-mmm-v4 trae la versión grande',
    },
    {
      lab: 'Lab 2',
      what: 'Las tres cabezas con el tronco congelado',
      route: 'imprescindible',
      clock: '1-3 min',
      gives: 'el probe, y la prueba de que no mueve el tronco',
    },
    {
      lab: 'Lab 3',
      what: 'Las tres etapas y la curva por etiquetas',
      route: 'con-gpu',
      clock: '1-3 min cada etapa, ~6 la curva',
      gives: 'la curva 10/25/50/100 % dentro del checkpoint',
    },
    {
      lab: 'Lab 3b',
      what: 'La otra entrada: las casillas desde cero',
      route: 'con-gpu',
      clock: '~10 min',
      gives: 'el contraste que justifica la entrada elegida',
    },
    {
      lab: 'Lab 4',
      what: 'Medir contra la heurística',
      route: 'con-gpu',
      clock: '~5 min',
      gives: 'F1 frente a la línea base, y las correlaciones',
    },
    {
      lab: 'Lab 5',
      what: 'La versión v4, exportar, embeddings y la isla',
      route: 'con-gpu',
      clock: '40 + 3 + 5 + 5 min',
      gives: 'el encoder que sirve la demo, y value-bar.json',
      skip: 'rukh pull encoder-mmm-v4 y rukh pull encoder-v4',
    },
  ],
  'm4/10-labs-de-afinado': [
    {
      lab: 'Lab 1',
      what: 'Mirar el corpus antes de culpar al modelo',
      route: 'observar',
      clock: '—',
      gives: 'el histograma que explica el agujero de Elo',
    },
    {
      lab: 'Lab 2',
      what: 'Descargar el tramo bajo que faltaba',
      route: 'con-gpu',
      clock: '5-10 min de red + ~5 de conversión',
      gives: 'data/uci-low/, 2,3 M partidas',
    },
    {
      lab: 'Lab 3',
      what: 'El corpus plano y el afinado condicionado',
      route: 'con-gpu',
      clock: '~15 min de datos + ~20 de afinado',
      gives: 'checkpoints/medium-elo/step-3800.pt',
      skip: 'rukh pull medium-elo',
    },
    {
      lab: 'Lab 4',
      what: 'LoRA escrita a mano',
      route: 'imprescindible',
      clock: 'segundos, es un test',
      gives: 'tests/unit/test_lora.py en verde',
    },
    {
      lab: 'Lab 5',
      what: 'La envoltura HF y la prueba contra peft',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'los mismos logits que peft, hasta 1e-5',
    },
    {
      lab: 'Lab 6',
      what: '¿Faltan partidas o no hay diferencia?',
      route: 'con-gpu',
      clock: '~26 min por condición: 2 h 36 el barrido, 52 min el control',
      gives: 'artifacts/eval/medium-elo-elo-sweep/ y su control',
      skip: 'rukh pull --module m4 trae los cinco resultados ya medidos',
    },
    {
      lab: 'Lab 7',
      what: 'Estilo con adaptadores',
      route: 'con-gpu',
      clock: '~5 min de rebanadas, 7 por adaptador, 15 el grafo adaptable',
      gives: 'checkpoints/lora-{e4,d4}/adapter.safetensors, 1,6 MB',
      skip: 'rukh pull lora-e4 y rukh pull lora-d4',
    },
    {
      lab: 'Lab 8',
      what: 'Qwen3 con QLoRA, por el mismo harness',
      route: 'con-gpu',
      clock: '~10 min de PGN, el afinado, ~40 de evaluación',
      gives: 'checkpoints/qwen3-pgn-qlora/',
      skip: 'rukh pull qwen3-pgn-qlora',
    },
    {
      lab: 'Lab 9',
      what: 'Publicar y encender el selector de la demo',
      route: 'con-gpu',
      clock: '~26 min por etapa + 12 por exportación',
      gives: 'los repos del Hub y el selector de la demo',
    },
  ],
  'm5/09-labs-de-alineamiento': [
    {
      lab: 'Lab 1',
      what: '¿Cuántas partidas cuesta la pregunta?',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'la tabla de precios, en pantalla',
    },
    {
      lab: 'Lab 2',
      what: 'El control que tiene que dar 0,5000',
      route: 'imprescindible',
      clock: '~1 min',
      gives: '0,5000 clavado; si no, el instrumento está roto',
    },
    {
      lab: 'Lab 3',
      what: 'Agrupar las dos direcciones de un enfrentamiento',
      route: 'con-gpu',
      clock: '~4 min por dirección',
      gives: 'la tabla agrupada y el residuo del triángulo',
    },
    {
      lab: 'Lab 4',
      what: 'Cuánto se mueve la recompensa con la profundidad',
      route: 'imprescindible',
      clock: '~2 min',
      gives: 'las tablas de la galería de reward hacking',
    },
    {
      lab: 'Lab 5',
      what: 'Construir pares con las jugadas del propio modelo',
      route: 'con-gpu',
      clock: '~35 min el corpus entero; el recorte de 500, minutos',
      gives: 'data/pairs-onpolicy/pairs.parquet y su manifiesto',
      skip: 'rukh pull rukh-pairs-dpo',
    },
    {
      lab: 'Lab 6',
      what: 'DPO con dos fuentes de pares, y la trampa de no igualarlas',
      route: 'con-gpu',
      clock: '~4 min dentro de política, ~8 fuera',
      gives: 'checkpoints/medium-v4-dpo-{on,off}policy/dpo.pt',
      skip: 'rukh pull medium-v4-dpo-onpolicy',
    },
    {
      lab: 'Lab 7',
      what: 'Ventajas de grupo a mano',
      route: 'observar',
      clock: '—',
      gives: 'la resta de la media del grupo, hecha a lápiz',
    },
    {
      lab: 'Lab 8',
      what: 'Romper la recompensa a propósito',
      route: 'imprescindible',
      clock: '~2 min',
      gives: 'los pares que la recompensa rota invierte',
    },
    {
      lab: 'Lab 9',
      what: 'El reward model, y por qué su número depende de la semilla',
      route: 'con-gpu',
      clock: '~4 min por semilla',
      gives: 'checkpoints/rm/reward.pt, run.json',
      skip: 'rukh pull rm',
    },
    {
      lab: 'Lab 10',
      what: 'GRPO a dos tasas, y elegir sin restar',
      route: 'con-gpu',
      clock: '~12 min cada tasa + ~4 por dirección del duelo',
      gives: 'checkpoints/medium-v4-grpo*/grpo.pt',
      skip: 'rukh pull medium-v4-grpo',
    },
    {
      lab: 'Lab 11',
      what: 'La suite, la exportación y el Hub',
      route: 'con-gpu',
      clock: '~26 min por etapa + 12 por exportación',
      gives: 'las filas de la tabla y los repos del Hub',
    },
  ],
  'm6/09-labs-de-cierre': [
    {
      lab: 'Lab 1',
      what: 'El suelo del instrumento, medido cuatro veces',
      route: 'con-gpu',
      clock: '~12 min cada tirada (48 en total) + 35 la escalera',
      gives: 'artifacts/web/ladder-floor.json y los ocho peldaños',
    },
    {
      lab: 'Lab 2',
      what: 'La tabla entera con un comando',
      route: 'con-gpu',
      clock: '2 h 48 min las once etapas',
      gives: 'results.json, benchmarks.md, nightly.json',
      skip: 'con --dry-run imprime el plan sin medir nada',
    },
    {
      lab: 'Lab 3',
      what: 'Lo que cuesta el int8, en Elo',
      route: 'con-gpu',
      clock: '41 min: 14 por precisión, ORT en CPU',
      gives: 'artifacts/web/parity-cost.json',
    },
    {
      lab: 'Lab 4',
      what: 'Las cards y la colección, regeneradas desde la tabla',
      route: 'imprescindible',
      clock: '~3 min, y con --dry-run no toca el Hub',
      gives: 'cada README del Hub, regenerado desde la tabla',
    },
    {
      lab: 'Lab 5',
      what: 'La arena: dos etapas, en tu navegador',
      route: 'observar',
      clock: '—',
      gives: 'dos modelos del curso jugando en la demo',
    },
    {
      lab: 'Lab 6',
      what: 'Los puzles, en vivo, contra la fila de la tabla',
      route: 'imprescindible',
      clock: 'segundos',
      gives: 'artifacts/web/puzzles.json, los 150 de la demo',
    },
    {
      lab: 'Lab 7',
      what: 'El README maestro y el post',
      route: 'observar',
      clock: '—',
      gives: 'el cierre escrito del proyecto',
    },
  ],
};
