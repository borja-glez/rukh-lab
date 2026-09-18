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
- Cada término técnico que aparece por primera vez enlaza al glosario con `<Term id="…">`. Si no
  existe, se añade a `src/content/glossary/terms.json` (id en kebab-case, definición con el proyecto
  delante, módulo donde se aprende, alias).
- Los enlaces a la demo llevan parámetros (`?mock=1`, `?stage=dpo&elo=1500`) y se hacen con
  `<DemoEmbed>`; las islas que ejecutan modelos viven en la demo, no aquí.
- Las visualizaciones (islas Preact) leen JSON de `src/data/`, que llega con `pnpm sync:data` desde
  `rukh/artifacts/web/`. Reservar la altura de la isla en CSS para evitar CLS.
- Anchura de prosa 72ch; tablas anchas dentro de `<div class="table-wrap">`.

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
| `Callout`      | Aparte con etiqueta                                                     | `kind`: `teoria` · `mundo-real` · `entrevista` · `hoy` · `roto`; `title?`   |
| `Exercise`     | Ejercicio enmarcado                                                     | `title`, `n?`                                                               |
| `Solution`     | Desplegable con la solución (dentro de `Exercise`)                      | `label?`                                                                    |
| `Term`         | Término enlazado al glosario; popover solo con `(hover: hover)`, en táctil es un enlace | `id` (de `terms.json`)                                                      |
| `Figure`       | Figura con marco y pie                                                  | `caption`, `n?`                                                             |
| `Tabs`         | Pestañas accesibles; contenido en `slot="tab-0"`, `slot="tab-1"`…       | `labels: string[]`                                                          |
| `NotebookLink` | Enlace a un notebook del repo ML                                        | `path` (p. ej. `labs/m1/01-explore.ipynb`), `label?`                        |
| `ModelBadge`   | Insignia a una model/dataset card del Hub                               | `repo` (`chorcat/rukh-small`), `kind?: model \| dataset`, `label?`          |
| `ResultsTable` | La tabla única desde `src/data/results.json`                            | `lang?`, `emptyText?`                                                       |
| `DemoEmbed`    | Tarjeta con enlace a la demo (iframe opcional con `embed`)              | `query`, `title`, `note?`, `embed?`                                         |

El popover de `Term` existe solo en dispositivos con `(hover: hover)` (ratón o trackpad, al pasar por
encima o al enfocar con teclado); en pantallas táctiles el término es un enlace normal al glosario,
así que la definición nunca debe ser imprescindible para seguir el párrafo.

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
