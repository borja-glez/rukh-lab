/**
 * The course as one journey, told twice: once as the chess apprentice Rukh grows into, and once
 * as the stage of building any language model that each module teaches.
 *
 * The apprentice is the running analogy the lessons open and close with. It is here, in one
 * place, so the map at the top of each module and the recap at the end of it tell the same
 * story in the same words, and a lesson never has to rebuild the whole itinerary in prose.
 */
export interface Stop {
  /** Module id, as in `src/content/modules/`. */
  id: string;
  /** The short name on the map. */
  name: string;
  /** The same step in the vocabulary of any LLM project. */
  stage: string;
  /** Where the apprentice is: one or two sentences, in the analogy. */
  apprentice: string;
  /** Why this step exists, without chess. */
  why: string;
  /** What the reader has in their hands at the end of the module. */
  achieved: string;
  /** The module as a flow: what it takes in, what it builds, what it hands on. */
  flow: { takes: string[]; builds: string[]; gives: string[] };
}

export const STOPS: readonly Stop[] = [
  {
    id: 'm0',
    name: 'El taller',
    stage: 'Entorno reproducible',
    apprentice:
      'Todavía no hay aprendiz. Montas el club donde va a estudiar: el tablero, un árbitro de confianza, un cuaderno donde apuntar cada sesión y una biblioteca de partidas.',
    why: 'Sin un entorno que se instala igual cada vez y un juez fiable, ningún número de los módulos siguientes valdría nada.',
    achieved:
      'Un repositorio que se instala con una orden, Stockfish respondiendo, MLflow anotando cada ejecución, dos meses de partidas de Lichess en disco y un tablero web que solo acepta jugadas legales.',
    flow: {
      takes: ['un directorio vacío', 'Lichess y Stockfish, fuera'],
      builds: ['entorno uv con CUDA', 'Stockfish y MLflow', 'descarga con manifiesto', 'tablero legal en la web'],
      gives: ['repo rukh', '6 M partidas en parquet', 'demo sin modelo'],
    },
  },
  {
    id: 'm1',
    name: 'Datos y tokens',
    stage: 'Datos y tokenización',
    apprentice:
      'Le enseñas el alfabeto: qué es una jugada escrita. Y ordenas la biblioteca para que pueda leer millones de partidas sin esperar.',
    why: 'Lo que un modelo puede aprender depende de qué es un token y de qué datos ve. Un error aquí viaja hasta el final sin avisar.',
    achieved:
      'Seis millones de partidas limpias convertidas en lotes de enteros, tres tokenizaciones comparadas con números, seis datasets publicados y el mismo tokenizador en Python y en el navegador.',
    flow: {
      takes: ['6 M partidas en PGN', 'evaluaciones de Lichess'],
      builds: ['PGN → UCI', 'posiciones y pares', 'tres tokenizadores', 'lotes en memmap'],
      gives: ['6 datasets en el Hub', 'tokenizador Python y TS'],
    },
  },
  {
    id: 'm2',
    name: 'El decoder',
    stage: 'Preentrenar un GPT',
    apprentice:
      'Lee millones de partidas y aprende a adivinar la jugada siguiente. Juega de oído: sabe qué suele venir, todavía no por qué.',
    why: 'Predecir el siguiente token es el corazón de cualquier LLM. Todo lo que viene después se construye sobre este modelo.',
    achieved:
      'Tres GPT entrenados desde cero en una GPU, más del 99 % de jugadas legales sin ayuda, un Elo medido con su margen de error y el modelo jugando en tu navegador.',
    flow: {
      takes: ['lotes de tokens', 'el tokenizador'],
      builds: ['GPT escrito a mano', 'receta de entrenamiento', 'muestreo y Elo', 'export a ONNX'],
      gives: ['tiny, small, medium', 'demo jugable'],
    },
  },
  {
    id: 'm3',
    name: 'El encoder',
    stage: 'Embeddings y clasificar',
    apprentice:
      'Aprende a mirar una posición entera y juzgarla: quién va mejor y si la última jugada fue un error.',
    why: 'Comprender no es continuar. Los encoders están detrás de los embeddings, los clasificadores y la búsqueda semántica.',
    achieved:
      'Una barra de evaluación y una alerta de error en vivo en la demo, y la costumbre de desconfiar de una exactitud alta sobre una clase rara.',
    flow: {
      takes: ['los mismos tokens', 'evaluaciones de Stockfish'],
      builds: ['encoder bidireccional', 'masked move modeling', 'cabezas de valor y error', 'métricas honestas'],
      gives: ['rukh-encoder', 'barra de evaluación'],
    },
  },
  {
    id: 'm4',
    name: 'Fine-tuning',
    stage: 'SFT y LoRA',
    apprentice:
      'Clases particulares: jugar como un 1500 o como los maestros. Con LoRA no se reescribe su libro; se le pegan notas adhesivas encima.',
    why: 'Adaptar un modelo que ya existe es lo que harás casi siempre en la práctica: barato, rápido y reversible.',
    achieved:
      'Un selector de Elo que cambia cómo juega, un adaptador de 1,6 MB que se cambia en caliente, QLoRA sobre Qwen3 y la prueba de que afinar cambia el estilo pero no la fuerza.',
    flow: {
      takes: ['medium-v4 preentrenado', 'partidas por tramo de Elo'],
      builds: ['corpus equilibrado', 'LoRA a mano', 'adaptadores de estilo', 'QLoRA de Qwen3'],
      gives: ['medium-elo', 'adaptadores de 1,6 MB', 'selector en la demo'],
    },
  },
  {
    id: 'm5',
    name: 'Alineamiento',
    stage: 'Preferencias: DPO, GRPO',
    apprentice:
      'Llega un entrenador que le dice cuál de dos jugadas prefiere o le puntúa cada intento. El riesgo: que aprenda a agradar al juez en vez de jugar mejor.',
    why: 'Así se pasa de imitar a preferir. Es la misma técnica que convierte un LLM base en un asistente.',
    achieved:
      'Tres métodos que mejoran a su base con el margen de error separado del cero (DPO +65 y +57, GRPO +44 Elo) y una galería de trampas a la recompensa, medidas.',
    flow: {
      takes: ['medium-v4', 'pares de preferencia'],
      builds: ['reward model', 'DPO', 'GRPO', 'arena cara a cara'],
      gives: ['medium-dpo y medium-grpo', 'galería de trampas'],
    },
  },
  {
    id: 'm6',
    name: 'Evaluar y publicar',
    stage: 'Medir y desplegar',
    apprentice:
      'Toca competir en serio: torneos con rating oficial, una ficha de jugador que cuenta la verdad y partidas en público.',
    why: 'Un modelo que no se mide igual cada día ni se puede usar no existe fuera de tu disco.',
    achieved:
      'Todas las etapas medidas el mismo día con una orden, dos rivales externos, el coste real del int8, veintiuna model cards y la demo final con arena y puzles.',
    flow: {
      takes: ['todas las etapas', 'dos modelos públicos'],
      builds: ['escalera calibrada', 'tabla cada noche', 'int8 medido', 'cards desde la tabla'],
      gives: ['tabla única', '21 model cards', 'demo final'],
    },
  },
];

/** The part of the journey that is still ahead: phase 2, drawn as one dimmed stop. */
export const NEXT_PHASE = {
  name: 'El entrenador',
  stage: 'Agentes, RAG, MCP',
  apprentice:
    'En la fase 2 el aprendiz se convierte en entrenador: busca en libros, usa el motor como herramienta y comenta tus partidas.',
};
