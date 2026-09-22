# Runbook · escribir una lección

Cómo se escribe y publica una lección del curso. Las lecciones viven en
`src/content/lessons/<módulo>/<nn>-<slug>.mdx` y se escriben en el mismo hito que su lab, nunca al
final.

## Reglas de redacción

- En español, tono directo, sin referencias a los cursos de origen.
- "Teoría justa" ≤ 40 % del texto: un concepto entra cuando un lab lo necesita para decidir.
- Abre con **Qué vas a construir** y cierra con **Qué has aprendido** (qué se ha hecho, cómo se mide y
  qué viene después). La cheatsheet del módulo se añade sola desde
  `src/content/cheatsheets/<módulo>.json` (8-10 preguntas con respuesta corta).
- Cuando una salida de comando es necesaria, se pega la real y se antecede de la línea
  `Salida en la máquina de referencia (RTX 5090):`. Nada de salidas inventadas en una lección
  `vigente`.
- **Se ejecuta a medida que se escribe.** En cuanto lo escrito se puede probar, una
  `<Callout kind="ejecuta">` dice qué órdenes lanzar y qué mirar en la salida (ver abajo).
- Nada de secciones sobre el propio curso: inventarios de lo que se enlaza en vez de pegarse, la CI,
  el README, los ficheros generados. Ver `docs/runbooks/codigo-en-lecciones.md`.
- Cada término técnico que aparece por primera vez enlaza al glosario con `<Term id="…">`. Si no
  existe, se añade a `src/content/glossary/terms.json` (id en kebab-case, definición con el proyecto
  delante, módulo donde se aprende, alias).
- Los enlaces a la demo llevan parámetros (`?mock=1`, `?stage=dpo&elo=1500`) y se hacen con
  `<DemoEmbed>`; las islas que ejecutan modelos viven en la demo, no aquí.
- Las visualizaciones (islas Preact) leen JSON de `src/data/`, que llega con `pnpm sync:data` desde
  `rukh/artifacts/web/`. Reservar la altura de la isla en CSS para evitar CLS.
- Anchura de prosa 72ch; tablas anchas dentro de `<div class="table-wrap">`.

## Las cajas «Ejecútalo»

El lector escribe el código bloque a bloque; la caja `<Callout kind="ejecuta" title="…">` es la
parada en la que comprueba que lo que lleva escrito funciona. No es un ejercicio (no tiene pregunta
ni `<Solution>`): son las órdenes y lo que hay que mirar en su salida.

- **Cuándo**: en los momentos en que algo nuevo ya se puede ejecutar. El primer `uv sync`, la primera
  vez que una orden de la CLI responde, al terminar los tests de una pieza (`uv run pytest -m unit -q
tests/unit/test_<pieza>.py`), antes de lanzar algo largo (el `--dry-run`, una configuración de
  humo), al terminar un entrenamiento o una exportación (la evaluación, el fichero que tiene que
  existir), en la demo (`pnpm test`, `pnpm dev` con su query). No después de cada bloque de código:
  una lección de código típica tiene entre dos y cinco.
- **Qué lleva**: una frase de contexto, un bloque ` ```sh ` con las órdenes, y lo que hay que mirar:
  qué tiene que aparecer, qué fichero tiene que existir, qué significa si sale otra cosa.
- **Solo órdenes que existen en la etiqueta del módulo** y que funcionan en ese punto de la lección
  (que no dependan de un fichero que llega más abajo). Si una orden necesita GPU, datos descargados
  o un modelo entrenado, se dice.
- **Nada de salidas inventadas**: se describe lo que se espera ("tiene que imprimir `0.0.1`", "siete
  tests en verde") solo cuando se deduce del código o está medido; la salida real pegada sigue la
  regla de la "Salida en la máquina de referencia".
- Un bloque de código dentro de la caja va sin sangría y con una línea en blanco antes de
  `</Callout>`, como en el resto de callouts con código.

## Plantilla

````mdx
---
title: 'Título de la lección'
description: 'Una o dos frases: qué se construye y qué se aprende.'
module: m1 # m0..m6 | a1..a6
order: 1 # número de lección dentro del módulo
duration: 90 # minutos (lectura + lab)
level: base # base | medio | avanzado
status: borrador # borrador | vigente
updated: 2026-09-25
keywords:
  - token
  - BPE
artifacts:
  - kind: dataset # repo | dataset | tokenizer | model | adapter | demo | post | report | bot
    label: chorcat/rukh-games-1800
    href: https://huggingface.co/datasets/chorcat/rukh-games-1800
demo: '?mock=1' # opcional: query de la demo para esta lección
---

## Qué vas a construir

Un párrafo con el resultado tangible y por qué importa para el proyecto.

## Sección de trabajo

<Callout kind="teoria" title="Solo lo necesario para decidir">
  Teoría justa, con la decisión que habilita.
</Callout>

```bash title="Terminal"
uv run rukh data tokenize --config configs/data/uci.yaml
```
````

Salida en la máquina de referencia (RTX 5090):

```text
…salida real pegada…
```

<Exercise n="01" title="Título del ejercicio">
  Enunciado.
  <Solution>Solución de referencia.</Solution>
</Exercise>

## Qué has aprendido

Qué se ha hecho, cómo se mide (columnas de la tabla única que cambian) y qué viene después.

````

## Componentes disponibles (sin importar nada)

| Componente     | Uso                                                                     | Props                                                                       |
| -------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `Callout`      | Aparte con etiqueta                                                     | `kind`: `teoria` · `mundo-real` · `entrevista` · `hoy` · `roto` · `ejecuta`; `title?` |
| `Exercise`     | Ejercicio enmarcado                                                     | `title`, `n?`                                                               |
| `Solution`     | Desplegable con la solución (dentro de `Exercise`)                      | `label?`                                                                    |
| `Term`         | Término enlazado al glosario; popover solo con `(hover: hover)`, en táctil es un enlace | `id` (de `terms.json`)                                                      |
| `Figure`       | Figura con marco y pie                                                  | `caption`, `n?`                                                             |
| `Tabs`         | Pestañas accesibles; contenido en `slot="tab-0"`, `slot="tab-1"`…       | `labels: string[]`                                                          |
| `NotebookLink` | Enlace a un notebook del repo ML                                        | `path` (p. ej. `labs/m1/01-explore.ipynb`), `label?`                        |
| `ModelBadge`   | Insignia a una model/dataset card del Hub                               | `repo` (`chorcat/rukh-small`), `kind?: model \| dataset`, `label?`          |
| `ResultsTable` | La tabla única desde `src/data/results.json`                            | `lang?`, `emptyText?`                                                       |
| `DemoEmbed`    | Tarjeta con enlace a la demo (iframe opcional con `embed`)              | `query`, `title`, `note?`, `embed?`                                         |
| `Src`          | Citación bajo un bloque de código: fichero, etiqueta y líneas en GitHub | `file`, `tag?`, `lines?`, `repo?`, `note?` — ver `docs/runbooks/codigo-en-lecciones.md` |

## Islas (componentes Preact)

Las islas no van en el mapa `components` de `src/components/mdx/index.ts`: una directiva de cliente
(`client:visible`) solo funciona sobre un componente que el propio MDX importa, así que la lección
lo importa y Astro lo hidrata. Aun así **se registran** en ese fichero, en el export `islands`, para
que haya una sola lista de lo que una lección puede incrustar; `tests/mdx-registry.test.ts` lo
comprueba.

| Isla              | Lección | Datos                        |
| ----------------- | ------- | ---------------------------- |
| `TokenizerPlayground` | M1  | ninguno (corre en el navegador) |
| `TrainingReplay`  | M2      | `src/data/training-replay.json` |
| `AttentionMap`    | M2      | `src/data/attention.json`    |
| `ValueBar`        | M3      | `src/data/value-bar.json`    |

Convenciones de una isla nueva:

1. Un fichero por isla en `src/islands/<Nombre>.tsx`, con un comentario de cabecera que diga qué
   dibuja, de qué JSON lee y dónde están sus estilos.
2. **Estado "pendiente".** Toda isla que lea un JSON de `src/data/` tiene que funcionar con el
   marcador de posición (colección vacía, `meta.generated: null`) y explicar en pantalla qué lab lo
   genera. Nunca se dibujan cifras inventadas, ni siquiera de ejemplo.
3. El esquema del JSON se documenta en `src/data/README.md` antes de escribir la isla, y el fichero
   se versiona vacío para que el build y los tests no dependan del repo de ML.
4. **CSS en `src/styles/global.css`**, con un prefijo propio (`.tp*`, `.am*`, `.tr*`, `.vb*`) y la altura
   reservada (`min-height`, también en la consulta de 720 px) para no provocar CLS. Nada de
   `<style>` en la isla: la CSP solo admite estilos por atributo.
5. Colores desde los tokens de diseño. Para escalas continuas, buckets en un atributo `data-*` que
   solo mueven una custom property (ver `--am-level`), nunca un color literal.
6. Atributos de estado en la raíz (`data-<isla>`, `data-state="pending|ready"`) para que el E2E
   pueda comprobar las dos ramas sin depender de los datos.
7. Accesibilidad: cada control con su `<label>`, objetivo táctil de 44 px, nada que dependa del
   hover (el valor numérico de un tooltip tiene que estar también en el DOM), y `aria-valuetext` en
   los deslizadores. **Nada que dependa solo del color**: si una isla dibuja un signo, una alerta o
   dos series comparadas, el DOM tiene que decirlo también con palabras (`ValueBar` escribe "ventaja
   de las blancas" y enumera en texto los plies marcados) y las series se distinguen además por
   trazo (continuo frente a discontinuo), no solo por tono.
8. **Geometría continua, por atributos de presentación de SVG** (`x`, `width`, `points`), no por
   `style` inline ni por buckets: la CSP solo admite estilos por atributo y una barra con veinte
   reglas de CSS es peor que un rectángulo con su `width` calculado. Los buckets de la regla 5 son
   para el **color**; la posición y el tamaño van en el SVG. Y el eje de una serie ya acotada se
   fija (`ValueBar` usa `[-1, 1]` siempre): ajustar una escala acotada solo sirve para exagerar.
9. En la lección, un párrafo antes de la isla diciendo **exactamente qué hay que mirar**.

El popover de `Term` existe solo en dispositivos con `(hover: hover)` (ratón o trackpad, al pasar por
encima o al enfocar con teclado); en pantallas táctiles el término es un enlace normal al glosario,
así que la definición nunca debe ser imprescindible para seguir el párrafo.

Todo bloque que dice ser un fichero de un repo es ese fichero, literal, en la etiqueta del módulo,
y lleva un `<Src>` debajo que lo cita y lo hace verificable (`pnpm verify:code`). La regla completa
está en `docs/runbooks/codigo-en-lecciones.md` y no es negociable: es la que se rompió en la fase 1.

Los bloques de código usan expressive-code: ` ```bash title="Terminal" ` pone la barra de título;
` ```text ` para salidas. Los temas claro/oscuro siguen el tema del sitio.

## Publicar

1. `pnpm check && pnpm lint && pnpm format:check && pnpm test && pnpm build` en verde.
2. `pnpm e2e` y `pnpm lighthouse` (la lección nueva no entra en Lighthouse salvo que se añada a
   `lighthouserc.json`; la lección 0 sí está).
3. Cambiar `status` a `vigente` cuando las salidas reales estén pegadas y el lab esté cerrado.
4. Actualizar `status` del módulo en `src/content/modules/<módulo>.json` (`planned` → `live`).
5. Commit en inglés con Conventional Commits, p. ej. `feat(course): add lesson M1 tokenization`.
````
