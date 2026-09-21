# Auditoría pedagógica y de experiencia · Fase 1 (M0–M6)

Fecha: 21 de septiembre de 2026  
Ámbito: contenido vigente de M0–M6 en el repositorio y en `https://lab.rukh.borjaglez.com/curso/`.

## Veredicto

La fase 1 está **bien organizada, es técnicamente sólida y puede llevar a un desarrollador sin experiencia previa en IA hasta un proyecto completo y evaluado**. Su mejor decisión didáctica es no presentar un modelo como magia: en cada hito se construye una pieza, se explica cómo se mide y se cuenta cuándo una conclusión tuvo que corregirse. Eso forma criterio técnico, no solo capacidad de copiar comandos.

No reescribiría el temario ni eliminaría rigor. Haría una pasada de **dosificación y señalización para principiantes**: M2 y M3 son más densos de lo que sugieren sus horas, y un alumno nuevo necesita distinguir con claridad qué debe ejecutar, qué puede descargar ya hecho, qué artefacto tiene que aparecer y qué puede dejar para una segunda lectura.

| Dimensión                    | Valoración                 | Motivo                                                                                                |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Secuencia M0→M6              | Muy alta                   | Cada módulo reutiliza el objeto anterior y M6 vuelve a medir todo con el mismo instrumento.           |
| Claridad conceptual          | Alta                       | Explicaciones concretas, cifras reales, glosario y decisiones justificadas.                           |
| Analogías y transferencia    | Alta                       | Especialmente fuerte en M0, M2, M5 y M6; las analogías sostienen una decisión.                        |
| Labs y proyecto              | Alta, con fricción inicial | Son reproducibles y tienen salidas reales, pero el coste de hardware/datos necesita rutas explícitas. |
| Figuras, islas y animación   | Muy alta                   | La animación se reserva para relaciones que cambian; el resto no se mueve por decoración.             |
| Carga cognitiva para cero IA | Media-alta                 | M2 y M3 concentran demasiada lectura, código y ejecución para las horas anunciadas.                   |

## Qué se comprobó

- Inventario de las 19 lecciones vigentes de M0–M6: unas 130.210 palabras, cheatsheets, glosario, componentes MDX, 25 páginas estáticas y navegación entre lecciones.
- Lectura de los puntos de entrada, cierres, labs, ejercicios, código, artefactos y transiciones; contraste con las revisiones editoriales y de reconstrucción ya presentes en `docs/revisiones/`.
- Revisión de SVG, islas y estilos responsivos. Bajo 560 px, los SVG mantienen tipografía legible mediante desplazamiento local; las animaciones respetan `prefers-reduced-motion`.
- Verificación del sitio publicado: índice y muestras de M0, M2, M5 y M6 devolvieron HTTP 200 con los títulos esperados.
- Verificación local: `pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build` y `pnpm e2e`. Resultado: 0 diagnósticos de Astro, 95 tests unitarios aprobados (2 omitidos), build de 25 páginas y 73 pruebas Playwright aprobadas, incluidas accesibilidad, CSP, móvil e islas.

El build deja avisos de Astro/Vite sobre Shiki con CSP y la directiva interna `use astro:head-inject`; no son fallos de contenido ni generaron errores de CSP en navegador, pero conviene vigilarlos al actualizar dependencias.

## El recorrido del alumno

```text
M0 entorno y reglas del juego
  → M1 datos, tokens y dataloader
    → M2 decoder, entrenamiento, inferencia y exportación
      → M3 encoder y métricas con clases raras
        → M4 fine-tuning y LoRA: cambia comportamiento
          → M5 preferencias y recompensa: optimiza una señal
            → M6 evaluación, paridad, publicación y límites de las conclusiones
```

La progresión es coherente. El proyecto no salta a DPO, GRPO o LoRA sin haber construido el decoder, fijado la máscara causal y aprendido a desconfiar de una métrica. M6 es un buen cierre: no añade otra técnica por novedad, sino que enseña a comparar y publicar de forma falsable.

## Revisión módulo a módulo

### M0 · Taller: repo, entorno, datos y tablero

**Está bien.** Es un arranque especialmente bueno para quien sabe desarrollar pero no IA. Declara el entregable, separa entorno, datos y tablero, y presenta `uv`, CUDA, Stockfish, MLflow y Node sin convertirlos en requisitos misteriosos. Las analogías del oráculo verificable y del tablero que no acepta jugadas ilegales conectan enseguida IA con tests, contratos y validación de entrada.

**Cambiaría.** Añadiría una caja inicial con dos rutas: `seguir ejecutando` frente a `seguir con artefactos descargados`. Ver GPU, Stockfish, Python, Node y varias webs en el primer módulo puede hacer pensar que no se puede aprender sin una RTX 5090. El curso ya permite saltos con `rukh pull`; falta hacer visible esa decisión.

### M1 · Datos y tokenización

**Está muy bien.** Es el módulo que mejor convierte ideas abstractas en datos observables: la misma partida se ve bajo tres tokenizaciones, se mide el precio del padding y se cierra con un tokenizador interactivo. Fuga de datos, manifiestos y paridad Python/TypeScript introducen buenas prácticas antes de entrenar nada.

**Cambiaría.** El lab ocupa 270 minutos y casi 10.000 palabras. Al inicio de cada lab pondría una minitabla fija: _entrada que debe existir → comando → fichero que debe salir → comprobación de éxito → tiempo/red/GPU_. La información está, pero tenerla dispersa añade memoria de trabajo cuando el alumno aún no conoce parquet, UCI, BPE ni memmap.

### M2 · El decoder

**Es el núcleo más valioso del curso.** Atención causal, escala, máscara, embeddings, receta de entrenamiento, sampler, Elo, ONNX y paridad no se quedan en definiciones; se ligan a código y a una decisión. Las analogías de operaciones cotidianas son precisas, y las islas de atención y entrenamiento relacionan ecuación, tensor y comportamiento.

**Es la mayor prioridad editorial.** Sus cuatro partes suman 31.623 palabras para 8 h declaradas (3.953 palabras/hora), además de ejecutar entrenamientos. Para un lector de cero IA, leer, entender, tocar código y correr no cabe razonablemente en esa estimación. Recomiendo declarar dos hitos: (1) _entiendo y pruebo el decoder con `tiny`_; (2) _entreno/evalúo/exporto `small` o reutilizo el checkpoint publicado_. No hace falta quitar teoría; hace falta un corte donde el alumno pueda parar con un resultado válido. También separaría duración de lectura y duración de ejecución con GPU.

### M3 · El encoder

**Conceptualmente es excelente.** La comparación decoder/encoder hace sentido, y “medir sin engañarse” es de las partes más transferibles: exactitud en clase rara, F1, umbral, particiones y métricas que no responden a la misma pregunta. Enseñar que una cifra alta puede no significar nada evita errores reales de producto.

**Necesita más rampa.** Es el módulo más denso: 26.647 palabras para 6 h (4.441 palabras/hora). Introduce a la vez bidireccionalidad, MLM, FEN, varias cabezas, congelado y métricas. Abriría con un bloque visual de diez minutos: “M2 predice la siguiente jugada; M3 mira toda la posición y responde preguntas sobre ella”, seguido de una tabla _pieza heredada de M2 / pieza que cambia / métrica nueva / razón del cambio_.

### M4 · Fine-tuning e instrucción

**Muy buen módulo de criterio.** Explica con honestidad la diferencia entre cambiar comportamiento y mejorar competencia. El agujero de los tokens de Elo sin gradiente, los controles y los resultados negativos tienen más valor pedagógico que una historia de éxito sin controles. LoRA, adaptadores y QLoRA se conectan con un artefacto visible en la demo.

**Cambiaría.** Haría visible una tarjeta comparativa antes de los labs: SFT, condicionamiento por Elo, LoRA y QLoRA con _qué modifica / qué queda congelado / coste / evidencia que hay que mirar_. La explicación existe, pero el principiante debe reconstruir ese mapa mental según avanza.

### M5 · Alineamiento con recompensas verificables

**Está muy bien planteado.** La tesis “para medir una diferencia, mide la diferencia” organiza el módulo. La recompensa verificable evita la abstracción de un juez opaco, y la galería de reward hacking hace concreto el riesgo. DPO, reward model y GRPO no se venden como tres recetas equivalentes.

**Es el segundo punto de carga cognitiva.** DPO, off-policy/on-policy, Bradley–Terry, ventaja de grupo, KL y GRPO llegan muy próximos. Antes de la teoría añadiría un mapa de decisión: “tengo pares humanos → DPO; tengo preferencias que puede verificar un programa → GRPO; necesito una señal aprendida → reward model”, con los datos que pide cada camino. En los labs, los ejercicios son buenos, pero algunos usan el encabezado genérico “Ejercicio” sin número/título dentro de un lab; un título uniforme facilitaría retomarlos después de una pausa.

### M6 · Evaluar, exportar, publicar

**Es el cierre más maduro.** Explicar proxy con el cuentakilómetros, separar imitación de calidad y decir qué no se puede afirmar de un modelo convierte la fase en ingeniería y no marketing de IA. La tabla única, paridad, cards, colección y demo cierran el ciclo de un proyecto real.

**Cambiaría poco.** Añadiría una checklist imprimible: medir con la misma suite, registrar checkpoint y muestreo, comparar intervalos, comprobar paridad, regenerar card y publicar. El contenido ya lo incluye; la lista facilitaría reutilizar M6 como plantilla fuera del ajedrez.

## Labs y código del proyecto

### Lo que funciona

- Los labs siguen un orden causal: primero preparar/medir, después entrenar, al final publicar.
- Tienen comandos reales, salidas de referencia, ejercicios y soluciones. Se especifican ficheros, configuraciones, checkpoints y métricas.
- Los puntos de partida con `rukh pull --module …` permiten recuperar una etapa cara sin abandonar el módulo.
- El código expone decisiones importantes, no solo la interfaz de línea de comandos. Eso conecta la explicación con el proyecto real.

### Lo que mejoraría

1. Normalizar el contrato de cada lab: _prerrequisito → coste → comando → artefacto → cómo sé que pasó → siguiente paso_.
2. Etiquetar cada lab como **obligatorio para entender**, **recomendado si tienes GPU** o **reproducible descargando artefacto**. No todos deben sentirse obligatorios para progresar.
3. Mantener tiempos de RTX 5090, pero añadir expectativa de portátil/máquina normal y alternativa concreta. “42 minutos en referencia” no predice la experiencia propia.
4. Hacer uniforme el etiquetado de ejercicios y soluciones: M0–M4 suelen tener número y título; M5/M6 tienen algunos ejercicios sin ambos y soluciones fuera del bloque visual. No rompe el contenido, pero reduce escaneabilidad.

## SVG, animaciones e interactividad

El veredicto es muy bueno. Las figuras tienen pie, las relevantes tienen descripción accesible y no todo se anima porque sí. M4 usa movimiento cuando expresa un proceso —intervalo que se estrecha, eje que se recorre, señal por LoRA—; M5 deja estáticas las comparaciones numéricas y anima solo la línea base de grupo, donde el movimiento explica la resta. Las pruebas verifican animación, límites del `viewBox` y detención con reducción de movimiento.

La solución móvil es correcta: un SVG ancho conserva texto legible y se desplaza dentro de su marco en vez de encogerse hasta ser ilegible o provocar scroll horizontal de toda la página. Como mejora menor, pondría junto a la primera figura ancha un indicador discreto de “desliza para ver la figura completa”; funciona, pero no todo usuario infiere el desplazamiento horizontal.

Las islas no son decorativas: tokenizador, mapa de atención, repetición de entrenamiento, barra de valor, dial y leaderboard tienen estados pendientes/reales, controles etiquetados y pruebas de interacción. Es el uso apropiado de interactividad en un curso.

## Prioridades de cambio

| Prioridad     | Cambio                                                                         | Impacto esperado                                                         |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| P0 pedagógica | Separar lectura/ejecución o corregir horas de M2 y M3.                         | Evita que un principiante interprete el desfase como incapacidad propia. |
| P0 pedagógica | Añadir contrato visual por lab y rutas “ejecuto / descargo / observo”.         | Reduce bloqueos de entorno, hardware y datos.                            |
| P1            | Abrir M3 con mapa decoder vs encoder y M5 con mapa de métodos de alineamiento. | Reduce saltos de vocabulario.                                            |
| P1            | Checklist de M6 y títulos consistentes para ejercicios de M5/M6.               | Mejora reutilización y navegación.                                       |
| P2            | Pista de desplazamiento para SVG anchos en móvil.                              | Descubribilidad, no corrección funcional.                                |
| P2 técnica    | Vigilar avisos de Shiki/CSP y `use astro:head-inject` al actualizar Astro.     | Previene regresiones futuras.                                            |

## Qué no cambiaría

- No eliminaría el código completo ni lo sustituiría por notebooks opacos: el hilo de proyecto es la diferencia del curso.
- No convertiría resultados negativos, controles o bugs corregidos en notas al pie: son parte central de aprender IA.
- No añadiría animaciones por homogeneidad visual: la política actual de movimiento con significado es mejor y más accesible.
- No suavizaría las métricas hasta volverlas eslóganes: la claridad de M3 y M6 procede de decir qué mide cada número y qué no.

## Conclusión

La fase 1 ya tiene la arquitectura de un curso serio de IA generativa aplicada: construye un modelo desde los datos, lo transforma, lo evalúa con cautela y lo publica con evidencia. Para el desarrollador que parte de cero IA no quedan agujeros conceptuales importantes; lo que falta es más orientación de ritmo y de ruta de ejecución. Con esos cambios, sería excelente también para quien empieza sin perder profundidad.
