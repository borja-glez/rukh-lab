/**
 * The chapters of /como-funciona-un-llm/: the whole course told as one story about how a language
 * model works, without code. Each chapter says where the course does that step with Rukh, so the
 * page is a map into the lessons as much as an explainer.
 *
 * `lesson` is a lesson collection id (`m2/01-el-decoder`) and `anchor` a heading id inside it,
 * exactly as Astro slugs it (accents kept). tests/llm-chapters.test.ts checks that every lesson
 * and glossary term exists; e2e/llm.spec.ts checks that every anchor lands on a heading.
 */
export interface CourseLink {
  lesson: string;
  anchor?: string;
  label: string;
}

/** A topic the chapter explains that the course does not do (yet). */
export interface OutsideNote {
  label: string;
  /** `outside`: not in the course; `planned`: a phase-2 module that has no lessons yet. */
  kind: 'outside' | 'planned';
  /** Module anchor on /curso/ for a planned topic (`a1`). */
  module?: string;
}

export interface Chapter {
  id: string;
  n: string;
  title: string;
  /** Short name for the chapter index. */
  short: string;
  links: CourseLink[];
  /** Glossary ids listed under the chapter as its vocabulary. */
  terms: string[];
  outside?: OutsideNote[];
  /** Two or three self-check questions, answered in one or two sentences (inline markdown). */
  check?: { q: string; a: string }[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'idea',
    n: '00',
    title: 'Un autocompletado gigante',
    short: 'La idea',
    links: [
      { lesson: 'm0/00-taller', anchor: 'qué-vas-a-construir', label: 'M0 · el taller: qué vas a construir' },
    ],
    terms: ['modelo-de-lenguaje', 'token'],
    check: [
      {
        q: "Si un LLM solo predice el siguiente trozo de texto, ¿de dónde sale que sepa resumir o traducir?",
        a: "De que, con suficiente escala, acertar el siguiente trozo obliga a aprender gramática, hechos y razonamiento; resumir o traducir es seguir prediciendo con delante un texto que lo pide.",
      },
      {
        q: "¿Qué diferencia hay entre Rukh y un chat, vistos como máquinas?",
        a: "Ninguna de fondo: los dos predicen el siguiente token. Cambia qué es un token (una jugada frente a un trozo de palabra) y la escala.",
      },
    ],
  },
  {
    id: 'redes',
    n: '01',
    title: 'Antes de nada: qué es una red neuronal',
    short: 'Redes neuronales',
    links: [
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'embeddings-por-qué-2-030--512',
        label: 'M2 · el decoder: dónde viven los 39 millones de números',
      },
      {
        lesson: 'm2/03-la-receta-de-entrenamiento',
        anchor: 'teoría-justa-los-cinco-números-de-la-receta',
        label: 'M2 · la receta de entrenamiento',
      },
    ],
    terms: ['capa', 'descenso-de-gradiente', 'perdida'],
    check: [
      {
        q: "¿Qué es un peso?",
        a: "Un número ajustable de la red. La entrada se multiplica por los pesos y se suma; todo lo que el modelo sabe está guardado en esos números.",
      },
      {
        q: "¿Para qué hace falta una no linealidad entre capa y capa?",
        a: "Sin ella, apilar capas de multiplicar y sumar equivaldría a una sola capa. Esa curva intermedia es lo que deja aprender relaciones complejas.",
      },
      {
        q: "Al entrenar, ¿qué cambia exactamente?",
        a: "Solo los pesos. La forma de la red es fija; el entrenamiento mueve los números un poco cada vez en la dirección que reduce el error.",
      },
    ],
  },
  {
    id: 'tokens',
    n: '02',
    title: 'Del texto a los tokens',
    short: 'Tokens y BPE',
    links: [
      {
        lesson: 'm1/01-datos-y-tokenizacion',
        anchor: 'qué-es-un-token-y-por-qué-la-elección-importa',
        label: 'M1 · qué es un token y por qué la elección importa',
      },
      {
        lesson: 'm1/01-datos-y-tokenizacion',
        anchor: 'tokens-especiales-como-interfaz-de-control',
        label: 'M1 · tokens especiales como interfaz de control',
      },
      {
        lesson: 'm1/06-los-tres-vocabularios',
        anchor: 'bpepy-dejar-que-los-datos-decidan',
        label: 'M1 · los tres vocabularios: el BPE deja que los datos decidan',
      },
      { lesson: 'm1/09-el-tokenizador-en-el-navegador', label: 'M1 · el tokenizador en el navegador' },
      {
        lesson: 'm1/10-labs-del-pipeline',
        anchor: 'lab-5--las-fusiones-del-bpe',
        label: 'M1 · lab 5: las fusiones del BPE',
      },
    ],
    terms: ['token', 'bpe', 'fusion-bpe', 'vocabulario', 'contexto'],
    check: [
      {
        q: "¿Por qué no se tokeniza por palabras enteras?",
        a: "Porque el vocabulario se dispara y cualquier palabra nueva (un nombre, una errata) se queda sin número. Los trozos de BPE cubren cualquier texto con un vocabulario fijo.",
      },
      {
        q: "En BPE, ¿quién decide qué trozos existen?",
        a: "Los datos: se fusiona una y otra vez la pareja de símbolos más frecuente del texto de entrenamiento. Nadie le dice qué es una sílaba.",
      },
      {
        q: "¿Por qué un texto en español puede costar más tokens que el mismo en inglés?",
        a: "Si el tokenizador se entrenó sobre todo con inglés, sus trozos frecuentes son ingleses y el español se corta en pedazos más pequeños.",
      },
    ],
  },
  {
    id: 'embeddings',
    n: '03',
    title: 'De tokens a vectores',
    short: 'Embeddings',
    links: [
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'embeddings-por-qué-2-030--512',
        label: 'M2 · embeddings: por qué 2 030 × 512',
      },
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'tied-embeddings-la-misma-tabla-para-leer-y-para-escribir',
        label: 'M2 · tied embeddings: la misma tabla para leer y escribir',
      },
      {
        lesson: 'm1/01-datos-y-tokenizacion',
        anchor: 'lectura-de-10-minutos-n-gramas-word2vec-y-rnn',
        label: 'M1 · lectura: n-gramas, word2vec y RNN',
      },
      {
        lesson: 'm3/01-el-encoder',
        anchor: 'pooling-una-representación-de-la-posición',
        label: 'M3 · pooling: un vector para toda la posición',
      },
    ],
    terms: ['embedding', 'tied-embeddings', 'pooling'],
    outside: [{ label: 'Búsqueda por similitud de embeddings (RAG)', kind: 'planned', module: 'a1' }],
    check: [
      {
        q: "Si «gato» es el 7412 y «perro» el 7415, ¿se parecen para el modelo?",
        a: "No: el id es solo un número de fila. El parecido aparece en el vector de esa fila, que se aprende al entrenar.",
      },
      {
        q: "¿Qué significa que dos tokens estén cerca en el mapa de embeddings?",
        a: "Que se usan en contextos parecidos. Nadie etiqueta las columnas; la cercanía sale de que juntarlos ayudaba a predecir.",
      },
    ],
  },
  {
    id: 'posiciones',
    n: '04',
    title: 'El orden importa',
    short: 'Posiciones',
    links: [
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'posiciones-tabla-aprendida-o-rope',
        label: 'M2 · posiciones: tabla aprendida o RoPE',
      },
      { lesson: 'm3/09-exportar-el-encoder', label: 'M3 · exportar el encoder (y sus posiciones)' },
    ],
    terms: ['rope', 'contexto'],
    check: [
      {
        q: "¿Por qué hace falta darle al modelo la posición de cada token?",
        a: "Porque la atención mezcla vectores con una suma ponderada, y a una suma le da igual el orden: «el perro muerde al hombre» y al revés serían lo mismo.",
      },
      {
        q: "Con RoPE, ¿qué información de posición le llega a la atención?",
        a: "Sobre todo la distancia entre los dos tokens que compara, no su posición absoluta: «dos antes que yo» se lee igual en cualquier punto del texto.",
      },
    ],
  },
  {
    id: 'atencion',
    n: '05',
    title: 'Atención: quién escucha a quién',
    short: 'Atención',
    links: [
      { lesson: 'm2/01-el-decoder', anchor: 'atención-con-números', label: 'M2 · atención con números' },
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'la-máscara-causal-que-aquí-no-es-opcional',
        label: 'M2 · la máscara causal',
      },
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'multi-cabeza-ocho-de-64-en-vez-de-una-de-512',
        label: 'M2 · multi-cabeza: ocho de 64 en vez de una de 512',
      },
      {
        lesson: 'm2/07-exportar-a-onnx',
        anchor: 'ver-la-atención-attentionmap',
        label: 'M2 · ver la atención del modelo entrenado',
      },
      { lesson: 'm2/10-labs-del-decoder', label: 'M2 · labs: 96 mapas de atención' },
    ],
    terms: ['atencion', 'cabeza-de-atencion', 'mascara-causal', 'softmax'],
    check: [
      {
        q: "En la atención, ¿qué papel juegan la consulta, la clave y el valor?",
        a: "La consulta es lo que busca un token, la clave lo que ofrece cada uno para ser encontrado y el valor lo que entrega si lo eligen. La salida mezcla los valores según lo bien que encajan consulta y clave.",
      },
      {
        q: "¿Para qué sirve la máscara causal durante el entrenamiento?",
        a: "Para que ningún token vea los que vienen después. Sin ella, predecir la palabra siguiente sería copiarla.",
      },
      {
        q: "¿Qué ganas con varias cabezas de atención?",
        a: "Varias preguntas a la vez: cada cabeza puede fijarse en una relación distinta (el sujeto, la palabra anterior…) sin costar más parámetros.",
      },
    ],
  },
  {
    id: 'bloque',
    n: '06',
    title: 'El bloque transformer',
    short: 'El bloque',
    links: [
      {
        lesson: 'm2/01-el-decoder',
        anchor: 'el-bloque-pre-norm-y-por-qué-doce-capas-se-dejan-entrenar',
        label: 'M2 · el bloque pre-norm y por qué doce capas se dejan entrenar',
      },
      { lesson: 'm2/02-el-decoder-a-mano', label: 'M2 · el decoder a mano' },
      { lesson: 'm3/02-capas-compartidas', label: 'M3 · capas compartidas por decoder y encoder' },
    ],
    terms: ['transformer', 'residual', 'pre-norm', 'capa'],
    check: [
      {
        q: "¿Qué hace la atención y qué hace el MLP dentro de un bloque?",
        a: "La atención mueve información entre posiciones; el MLP procesa cada posición por separado con lo que le trajo la atención.",
      },
      {
        q: "¿Por qué la conexión residual deja entrenar redes de muchas capas?",
        a: "Porque cada bloque suma una corrección en vez de sustituir el vector, y la señal de error tiene un camino directo de vuelta hasta los primeros bloques.",
      },
    ],
  },
  {
    id: 'arquitecturas',
    n: '07',
    title: 'Decoder, encoder y los dos juntos',
    short: 'Decoder y encoder',
    links: [
      {
        lesson: 'm3/01-el-encoder',
        anchor: 'causal-frente-a-bidireccional-la-línea-que-lo-cambia-todo',
        label: 'M3 · causal frente a bidireccional',
      },
      {
        lesson: 'm3/01-el-encoder',
        anchor: 'qué-se-pierde-y-qué-se-gana-al-dejar-de-predecir-el-futuro',
        label: 'M3 · qué se pierde y qué se gana al dejar de predecir el futuro',
      },
      { lesson: 'm3/03-el-encoder-a-mano', label: 'M3 · el encoder a mano' },
      {
        lesson: 'm3/01-el-encoder',
        anchor: 'tres-cabezas-sobre-un-mismo-tronco',
        label: 'M3 · tres cabezas sobre un mismo tronco',
      },
    ],
    terms: ['decoder', 'encoder', 'mlm', 'cabeza'],
    outside: [{ label: 'Encoder-decoder (traducción, T5, Whisper)', kind: 'outside' }],
    check: [
      {
        q: "¿Qué separa a un decoder de un encoder?",
        a: "La máscara: el decoder solo mira hacia atrás y puede escribir texto nuevo; el encoder mira a los dos lados y entiende mejor lo que ya está escrito.",
      },
      {
        q: "Si un encoder no predice el siguiente token, ¿cómo se entrena?",
        a: "Rellenando huecos: se tapan tokens al azar (MLM) y tiene que reconstruirlos mirando a ambos lados.",
      },
    ],
  },
  {
    id: 'preentrenamiento',
    n: '08',
    title: 'Preentrenar: adivinar lo siguiente, millones de veces',
    short: 'Preentrenamiento',
    links: [
      {
        lesson: 'm2/03-la-receta-de-entrenamiento',
        anchor: 'teoría-justa-los-cinco-números-de-la-receta',
        label: 'M2 · la receta de entrenamiento: los cinco números',
      },
      {
        lesson: 'm2/03-la-receta-de-entrenamiento',
        anchor: 'looppy-el-bucle',
        label: 'M2 · el bucle de entrenamiento',
      },
      {
        lesson: 'm2/11-mas-datos-no-mas-red',
        anchor: 'el-diagnóstico-cabe-en-una-división',
        label: 'M2 · más datos, no más red: tokens por parámetro',
      },
      {
        lesson: 'm3/01-el-encoder',
        anchor: 'masked-move-modeling-15--801010-y-un-menos-cien',
        label: 'M3 · masked move modeling: preentrenar tapando',
      },
    ],
    terms: [
      'preentrenamiento',
      'perdida',
      'descenso-de-gradiente',
      'retropropagacion',
      'adamw',
      'perplejidad',
      'lote',
    ],
    check: [
      {
        q: "¿Por qué una sola frase da muchos ejemplos de entrenamiento a la vez?",
        a: "Porque el objetivo es la misma frase desplazada un token: en cada posición el modelo predice la siguiente, así que una frase de diez tokens son diez predicciones corregidas de golpe.",
      },
      {
        q: "¿Por qué la pérdida de un modelo recién creado ronda el logaritmo del tamaño del vocabulario?",
        a: "Porque un modelo sin entrenar reparte la probabilidad casi por igual entre los V tokens: acierta como quien adivina al azar, y la pérdida de adivinar al azar entre V opciones es justo el logaritmo de V.",
      },
      {
        q: '¿Cómo sabe cada peso hacia dónde moverse, sin probarlos uno a uno?',
        a: 'Por la retropropagación: el error recorre la red una vez hacia atrás y la culpa se multiplica eslabón a eslabón, así que cada peso recibe su parte y su signo en una sola pasada.',
      },
    ],
  },
  {
    id: 'muestreo',
    n: '09',
    title: 'De números a una palabra: el muestreo',
    short: 'Muestreo',
    links: [
      {
        lesson: 'm2/04-muestrear-jugadas',
        anchor: 'teoría-justa-tres-perillas-y-un-orden',
        label: 'M2 · muestrear: tres perillas y un orden',
      },
      { lesson: 'm0/04-el-tablero', label: 'M0 · el modelo propone, el navegador filtra' },
      {
        lesson: 'm6/01-evaluar',
        anchor: 'el-elo-es-un-par-modelo-y-muestreo',
        label: 'M6 · el Elo es un par: modelo y muestreo',
      },
    ],
    terms: ['logits', 'softmax', 'temperatura', 'top-k', 'top-p'],
    outside: [{ label: 'Top-p (nucleus): el curso usa top-k', kind: 'outside' }],
    check: [
      {
        q: "¿Qué cambia al subir la temperatura y qué no cambia?",
        a: "Reparte más la probabilidad y las opciones raras salen más a menudo; el orden de preferencia del modelo no cambia.",
      },
      {
        q: "¿Qué diferencia hay entre top-k y top-p?",
        a: "Top-k se queda siempre con un número fijo de candidatos; top-p con los justos para sumar una probabilidad, así que se adapta a lo seguro que esté el modelo.",
      },
    ],
  },
  {
    id: 'generacion',
    n: '10',
    title: 'Escribir token a token',
    short: 'Generar y KV cache',
    links: [
      { lesson: 'm2/04-muestrear-jugadas', anchor: 'gamepy-una-partida-entera', label: 'M2 · una partida entera, jugada a jugada' },
      {
        lesson: 'm2/08-jugar-en-el-navegador',
        anchor: 'el-worker-quien-posee-la-sesión',
        label: 'M2 · jugar en el navegador: el worker que ejecuta el modelo',
      },
    ],
    terms: ['kv-cache', 'contexto', 'webgpu'],
    outside: [{ label: 'KV cache: Rukh recalcula (200 tokens no lo necesitan)', kind: 'outside' }],
    check: [
      {
        q: "¿Por qué las respuestas de un chat aparecen palabra a palabra?",
        a: "Porque se fabrican así: cada token elegido se añade al texto y el modelo vuelve a calcular el siguiente.",
      },
      {
        q: "¿Qué guarda la KV cache y qué se ahorra con ella?",
        a: "Las claves y los valores de atención de los tokens ya procesados. Ahorra recalcularlos en cada paso, a cambio de memoria.",
      },
    ],
  },
  {
    id: 'afinado',
    n: '11',
    title: 'Afinar: de loro culto a asistente',
    short: 'Afinado y LoRA',
    links: [
      { lesson: 'm4/01-fine-tuning', anchor: 'qué-es-afinar-un-modelo', label: 'M4 · qué es afinar un modelo' },
      {
        lesson: 'm4/01-fine-tuning',
        anchor: 'cuatro-maneras-de-afinar-y-cuándo-se-usa-cada-una',
        label: 'M4 · cuatro maneras de afinar',
      },
      {
        lesson: 'm4/01-fine-tuning',
        anchor: 'condicionar-con-un-token-qué-puede-y-qué-no',
        label: 'M4 · condicionar con un token (la plantilla de chat de Rukh)',
      },
      {
        lesson: 'm4/01-fine-tuning',
        anchor: 'lora-notas-adhesivas-en-vez-de-reimprimir-el-libro',
        label: 'M4 · LoRA: notas adhesivas en vez de reimprimir el libro',
      },
      { lesson: 'm4/03-lora', label: 'M4 · LoRA escrito a mano' },
      { lesson: 'm4/05-qlora-con-transformers', label: 'M4 · QLoRA con transformers' },
    ],
    terms: ['fine-tuning', 'sft', 'instruction-tuning', 'plantilla-de-chat', 'lora', 'qlora', 'olvido-catastrofico'],
    check: [
      {
        q: "¿Qué aprende un modelo en el SFT que no sabía tras el preentrenamiento?",
        a: "Sobre todo un formato y un comportamiento: esperar su turno, contestar lo que se pregunta y parar. Casi ningún conocimiento nuevo.",
      },
      {
        q: "¿Por qué LoRA ocupa tan poco?",
        a: "Porque congela el modelo y solo entrena dos matrices estrechas junto a algunas capas; su producto corrige la original en unas pocas direcciones.",
      },
      {
        q: "¿Qué es el olvido catastrófico y cómo se evita?",
        a: "Perder lo que el modelo ya sabía mientras aprende lo nuevo. Con pasos pequeños, pocos, y volviendo a medir lo de antes.",
      },
    ],
  },
  {
    id: 'alineamiento',
    n: '12',
    title: 'Alinear: enseñarle lo que preferimos',
    short: 'Alineamiento',
    links: [
      {
        lesson: 'm5/01-alineamiento',
        anchor: 'tres-caminos-y-cómo-se-elige',
        label: 'M5 · tres caminos y cómo se elige',
      },
      {
        lesson: 'm5/01-alineamiento',
        anchor: 'un-par-de-preferencia-no-dice-cuánto-vale-nada',
        label: 'M5 · un par de preferencia no dice cuánto vale nada',
      },
      {
        lesson: 'm5/01-alineamiento',
        anchor: 'dpo-la-referencia-que-no-hay-que-entrenar',
        label: 'M5 · DPO: la referencia que no hay que entrenar',
      },
      { lesson: 'm5/02-el-reward-model', label: 'M5 · el reward model' },
      {
        lesson: 'm5/04-grpo-y-las-recompensas',
        anchor: 'grpo-el-grupo-es-el-baseline',
        label: 'M5 · GRPO: el grupo es el baseline',
      },
      {
        lesson: 'm5/08-lo-que-salio',
        anchor: 'la-galería-de-reward-hacking',
        label: 'M5 · la galería de reward hacking',
      },
    ],
    terms: ['alineamiento', 'rlhf', 'reward-model', 'dpo', 'grpo', 'recompensa-verificable', 'kl', 'reward-hacking'],
    check: [
      {
        q: "¿Por qué alinear con comparaciones y no con más ejemplos?",
        a: "Porque para muchas tareas no hay una respuesta perfecta que copiar, pero sí es fácil decir cuál de dos es mejor, y comparar es más barato que calificar.",
      },
      {
        q: "¿Qué es el reward hacking?",
        a: "Que el modelo encuentra un agujero en la recompensa y sube la nota sin mejorar lo que queríamos, por ejemplo alargando las respuestas.",
      },
      {
        q: "¿Para qué sirve la penalización KL?",
        a: "Es una correa: resta puntos cuanto más se aleja el modelo de la versión de partida, para que no pierda lo que sabía persiguiendo la recompensa.",
      },
    ],
  },
  {
    id: 'evaluacion',
    n: '13',
    title: 'Evaluar sin engañarse',
    short: 'Evaluación',
    links: [
      {
        lesson: 'm6/01-evaluar',
        anchor: 'métricas-de-dominio-frente-a-proxies',
        label: 'M6 · métricas de dominio frente a proxies',
      },
      {
        lesson: 'm2/06-el-elo-y-la-suite',
        anchor: 'teoría-justa-de-partidas-a-un-número',
        label: 'M2 · el Elo: de partidas a un número',
      },
      {
        lesson: 'm3/08-medir-sin-enganarse',
        anchor: 'fuga-de-datos-por-qué-el-reparto-va-por-partida',
        label: 'M3 · fuga de datos: por qué el reparto va por partida',
      },
      {
        lesson: 'm6/01-evaluar',
        anchor: 'reproducibilidad-cuánto-se-mueve-el-montaje-cuando-no-cambias-nada',
        label: 'M6 · reproducibilidad: cuánto se mueve sin cambiar nada',
      },
    ],
    terms: ['proxy', 'elo', 'fuga-de-datos', 'intervalo-de-confianza', 'baseline'],
    check: [
      {
        q: "¿Por qué una pérdida baja no garantiza un buen modelo?",
        a: "Porque es un proxy: suele moverse con la calidad, pero no es la tarea. Hay que medir con pruebas de la tarea misma.",
      },
      {
        q: "¿Qué es la contaminación de un benchmark?",
        a: "Que las preguntas de evaluación estaban en los datos de entrenamiento: la nota mide memoria, no capacidad.",
      },
      {
        q: "¿Por qué un Elo sin intervalo de confianza es una anécdota?",
        a: "Porque con pocas partidas el azar mueve el número decenas de puntos; sin el margen no sabes si una mejora es real.",
      },
    ],
  },
  {
    id: 'despliegue',
    n: '14',
    title: 'Servirlo: cuantizar y ejecutar',
    short: 'Despliegue',
    links: [
      {
        lesson: 'm2/07-exportar-a-onnx',
        anchor: 'quantizepy-la-mitad-y-la-cuarta-parte',
        label: 'M2 · cuantizar: la mitad y la cuarta parte',
      },
      {
        lesson: 'm6/01-evaluar',
        anchor: 'cuantización-y-paridad-el-95--es-otro-modelo',
        label: 'M6 · cuantización y paridad: el 95 % es otro modelo',
      },
      { lesson: 'm6/06-int8-y-el-jugador-onnx', label: 'M6 · int8 y el jugador ONNX' },
      { lesson: 'm2/08-jugar-en-el-navegador', label: 'M2 · jugar en el navegador' },
    ],
    terms: ['cuantizacion', 'onnx', 'paridad', 'webgpu', 'model-card'],
    check: [
      {
        q: "¿Qué se gana y qué se arriesga al cuantizar?",
        a: "Se gana tamaño y velocidad al guardar cada peso con menos bits; se arriesga que el redondeo cambie la respuesta donde dos opciones estaban casi empatadas.",
      },
      {
        q: "¿Qué mide la paridad y qué no?",
        a: "En cuántos casos el modelo cuantizado responde lo mismo que el original. No dice si las respuestas que cambian son peores: eso se mide en la tarea.",
      },
    ],
  },
  {
    id: 'hoy',
    n: '15',
    title: 'Los LLM de hoy, más allá de Rukh',
    short: 'Más allá',
    links: [
      {
        lesson: 'm5/04-grpo-y-las-recompensas',
        anchor: 'la-recompensa-verificable-cuatro-reglas-y-el-fallo-que-evita-cada-una',
        label: 'M5 · la recompensa verificable (la base de los modelos que razonan)',
      },
      { lesson: 'm0/00-taller', anchor: 'qué-vas-a-construir', label: 'M0 · el taller: la fase 2 del curso' },
    ],
    terms: [
      'prompt-de-sistema',
      'aprendizaje-en-contexto',
      'mezcla-de-expertos',
      'multimodal',
      'razonamiento',
      'alucinacion',
      'rag',
      'agente',
    ],
    outside: [
      { label: 'Contexto largo y mezcla de expertos', kind: 'outside' },
      { label: 'RAG: embeddings y recuperación', kind: 'planned', module: 'a1' },
      { label: 'Agentes con herramientas', kind: 'planned', module: 'a2' },
      { label: 'MCP', kind: 'planned', module: 'a5' },
    ],
    check: [
      {
        q: "Cuando pones ejemplos en el prompt y el modelo los imita, ¿ha aprendido algo?",
        a: "No en sus pesos: el aprendizaje en contexto no cambia ningún número del modelo. Usa lo que tiene delante en ese momento y lo olvida al acabar la conversación.",
      },
      {
        q: "¿Por qué un modelo alucina?",
        a: "Porque está entrenado para producir la continuación más verosímil, no para comprobar que sea cierta; si no sabe algo, lo verosímil sigue saliendo.",
      },
      {
        q: "¿Qué le añade RAG a un modelo?",
        a: "Los documentos relevantes, buscados por significado y pegados en el contexto antes de la pregunta: contesta leyendo, puede citar y se actualiza sin reentrenar.",
      },
    ],
  },
  {
    id: 'cierre',
    n: '16',
    title: 'Todo en una línea',
    short: 'Resumen',
    links: [],
    terms: [],
  },
];

export const chapterById = (id: string): Chapter => {
  const chapter = CHAPTERS.find((c) => c.id === id);
  if (!chapter) throw new Error(`llm-chapters: unknown chapter "${id}"`);
  return chapter;
};
