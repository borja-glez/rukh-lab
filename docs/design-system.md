# Sistema de diseño de Rukh

Fuente de verdad del sistema de diseño compartido por la web del curso (`rukh-lab`) y la demo
(`rukh-web`). Los tokens viven en `src/styles/tokens.css` y se copiaron tal cual del portfolio
(repo `borjaglez.com`, `src/styles/global.css`, bloque `:root` más `color-scheme`). La demo guarda una
copia sincronizada con `pnpm sync:tokens` y un test de hash falla si diverge. La última línea de este
documento registra el sha256 del fichero; `pnpm tokens:hash --write` la recalcula y
`tests/tokens-hash.test.ts` la comprueba.

## Principios

- Un solo fichero de tokens, un solo hash. Cambiar un color se hace aquí y en `tokens.css`, nunca en
  una copia.
- Cada color lleva su par claro/oscuro con `light-dark()`. Ningún componente escribe un color
  literal salvo el blanco sobre `--ok` en botones pulsados.
- Estética de plano técnico: retícula de puntos en los márgenes, marcos con ticks en las esquinas,
  etiquetas en monoespaciada y mayúsculas, títulos grandes con interletrado negativo.
- Contraste mínimo AA en ambos temas (Lighthouse `color-contrast` como aserción en CI).
- Todo objetivo táctil mide al menos 44 px de alto.

## Tokens de color

| Token              | Claro                   | Oscuro                  | Uso                                                                 |
| ------------------ | ----------------------- | ----------------------- | ------------------------------------------------------------------- |
| `--paper`          | `#f4f6f9`               | `#0e1622`               | Fondo de la página y `meta theme-color`                             |
| `--ink`            | `#14243a`               | `#e6ecf3`               | Texto principal, marcas, botón primario                             |
| `--ink-2`          | `#3d4f66`               | `#b4c0cf`               | Texto de cuerpo (`.body`, `.prose`)                                 |
| `--muted`          | `#5b6b80`               | `#8494a8`               | Etiquetas, pies, navegación inactiva                                |
| `--line`           | `#c5cfdc`               | `#2b3a4e`               | Bordes y reglas                                                     |
| `--line-soft`      | `#dde4ec`               | `#1e2a3a`               | Borde de la cabecera, código en línea                               |
| `--diagram-stroke` | `#8fa3bc`               | `#55697f`               | Trazos de diagramas y ticks del rail                                |
| `--brand`          | `#1a5276`               | `#7fb3d9`               | Enlaces, hover del botón primario                                   |
| `--accent`         | `#f2a23a`               | `#f2a23a`               | Foco visible, selección, ticks activos, subrayado activo            |
| `--accent-text`    | `#b86a0b`               | `#f2a23a`               | Texto de acento con contraste AA (`.label--accent`, enlace "Jugar") |
| `--event`          | `#3f7cac`               | `#6fa8d6`               | Eventos en diagramas, `Callout` "así se hace hoy"                   |
| `--ok`             | `#1f5c46`               | `#5fbf95`               | Estado "vigente", lección completada, chips en verde                |
| `--hover-soft`     | `#e6edf4`               | `#1b2636`               | Fondo de hover en botones secundarios y tarjetas                    |
| `--grid-dot`       | `#d3dbe6`               | `#1d2939`               | Punto de la retícula de fondo                                       |
| `--selection-fg`   | `#14243a`               | `#14243a`               | Texto seleccionado sobre `--accent`                                 |
| `--split-1..5`     | ver fichero             | ver fichero             | Escala de cinco azules para gráficos y barras                       |
| `--frame-bg`       | `rgba(255,255,255,.55)` | `rgba(255,255,255,.03)` | Fondo de `FigureFrame` y tarjetas                                   |
| `--chip-bg`        | `rgba(255,255,255,.6)`  | `rgba(255,255,255,.04)` | Fondo de chips y código en línea                                    |
| `--box-fill`       | `#ffffff`               | `#121c2b`               | Cajas de diagramas                                                  |
| `--card-hover`     | `#ffffff`               | `#15202f`               | Tarjeta en hover                                                    |
| `--header-bg`      | `rgba(244,246,249,.82)` | `rgba(14,22,34,.82)`    | Cabecera fija con desenfoque                                        |

## Tokens de espacio y tipografía

| Token            | Valor                                          | Uso                                  |
| ---------------- | ---------------------------------------------- | ------------------------------------ |
| `--gutter`       | `clamp(20px, 4vw, 48px)`                       | Margen lateral de todo el contenido  |
| `--gutter-rail`  | `clamp(72px, 10vw, 140px)`; `20px` bajo 720 px | Hueco para el rail en páginas con él |
| `--section-gap`  | `clamp(80px, 12vh, 140px)`                     | Separación entre secciones           |
| `--header-h`     | `56px`                                         | Altura de la cabecera fija           |
| `--container`    | `1180px`; `1280px` desde 1440 px               | Ancho máximo de contenido            |
| `--text-body`    | `clamp(16px, 1.25vw, 18px)`                    | Cuerpo de texto                      |
| `--font-display` | Bricolage Grotesque 300-800                    | Títulos, cuerpo, botones             |
| `--font-mono`    | IBM Plex Mono 400/500                          | Etiquetas, código, navegación, pies  |

Las fuentes las sirve la API de fuentes de Astro (`fontProviders.fontsource()`), autoalojadas en
`/_astro/fonts/`, con `<Font cssVariable preload>` en el `<head>`. Los subconjuntos `latin` y
`latin-ext` cubren el español.

## Mecánica del tema

- `html { color-scheme: light dark }`: sin preferencia guardada manda el sistema.
- `html[data-theme='light' | 'dark']` fija el esquema. Todos los colores resuelven con `light-dark()`,
  así que no hay variables duplicadas por tema.
- Sin flash: `Base.astro` inserta en el `<head>` el contenido exacto de `src/scripts/theme-init.js`
  (una línea que lee `localStorage['rukh:theme']` y pone `data-theme`). `astro.config.mjs` calcula el
  hash sha256 de ese mismo fichero y lo añade a `security.csp.scriptDirective.hashes`; el test
  `tests/theme-script-hash.test.ts` vigila que sigan coincidiendo.
- `src/scripts/theme.ts` gestiona los botones (`data-theme-option`), `aria-pressed`, `localStorage`
  y `meta theme-color`. El estado activo del botón se resuelve solo con CSS (sin flash).
- Los bloques de código (expressive-code) siguen el mismo `data-theme`: `themeCssSelector`
  apunta a `[data-theme='light' | 'dark']` y, sin atributo, `prefers-color-scheme`.

## Componentes

| Componente           | Qué es                                                                                                                        | Notas                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Header`             | Cabecera fija de 56 px: marca `rukh · lab`, navegación (Curso · Glosario · Cheatsheets · Proyecto) y enlace "Jugar" a la demo | Glosario y Cheatsheets se ocultan bajo 720 px (siguen en el pie). Elementos de 44 px de alto |
| `Footer`             | Marca, enlaces internos y externos (demo, GitHub, Hugging Face), licencias                                                    | Rejilla de dos columnas; una en móvil                                                        |
| `Rail`               | Rail vertical con un tick por sección, activado por `IntersectionObserver`                                                    | Solo en lecciones y desde 1100 px; `aria-hidden`                                             |
| `SectionHead`        | `NN / etiqueta ———— // tipo`                                                                                                  | Igual que el portfolio                                                                       |
| `FigureFrame`        | Marco con cuatro ticks en las esquinas y fondo `--frame-bg`                                                                   | Usado por `Figure` (MDX) y tarjetas de resultados                                            |
| `ThemeToggle`        | Dos botones (claro/oscuro) en píldora                                                                                         | `aria-pressed` sincronizado por `theme.ts`                                                   |
| Botones (`.btn`)     | Píldora de 44 px mínimo; `--primary` (tinta sobre papel), `--secondary` (borde), `--small`                                    | `aria-pressed='true'` en secundario pinta `--ok` (lección completada)                        |
| Etiquetas (`.label`) | Monoespaciada, 11 px, mayúsculas, `--muted`; variantes `--ink`, `--accent`, `--plain`                                         | `.caption` es la misma familia sin mayúsculas                                                |
| Chips (`.chip`)      | Estado de módulo o lección: `--live` (verde), `--draft` (ámbar)                                                               | Monoespaciada                                                                                |
| `.section__title`    | Título de sección grande, peso 500, interletrado −0.035em                                                                     | `--narrow` limita a 22ch                                                                     |
| `.prose`             | Prosa de lección a 72ch, `h2` con regla superior, tablas con cabecera en mono                                                 | Los componentes MDX viven dentro                                                             |

## Componentes MDX (lecciones)

`Callout` (`teoria`, `mundo-real`, `entrevista`, `hoy`, `roto`), `Exercise`, `Solution`, `Term`,
`Figure`, `Tabs`, `NotebookLink`, `ModelBadge`, `ResultsTable`, `DemoEmbed`. Registro en
`src/components/mdx/index.ts`; plantilla y uso en `docs/runbooks/lessons.md`.

## Divergencias respecto al portfolio

- Sin i18n por diccionarios: cada página fija su `lang` (`es` por defecto, `en` en `/proyecto/` y
  `/en/`). No hay redirección por idioma guardado.
- `tokens.css` solo contiene el bloque `:root`, `color-scheme` y las dos media queries que cambian
  tokens; la base y los patrones (`.label`, `.btn`, `.section`…) están en `global.css`.
- Los botones miden 44 px de alto como mínimo (el portfolio usa 14 px de padding sin mínimo) y todos
  los controles de cabecera también.
- `Rail` es `position: sticky` dentro del layout de lección y sus ticks son secciones de la lección,
  no un rail fijo de página.
- Foco visible global con `--accent` (el portfolio solo lo define en el toggle de tema).
- Dos tokens derivados en `global.css`, no en `tokens.css`: `--accent-text-aa`
  (`light-dark(#9a5809, #f2a23a)`) y `--event-text-aa` (`light-dark(#2f6a99, #6fa8d6)`). Los
  originales `--accent-text` (#b86a0b) y `--event` (#3f7cac) dan 3,8:1 y 4,1:1 sobre `--paper` en
  claro, por debajo de AA para etiquetas de 11 px; el texto pequeño usa las variantes `-aa` y
  los bordes y trazos siguen usando los originales.
- Favicon SVG con una torre (`--ink`) en lugar de PNG.
- Clave de tema en `localStorage`: `rukh:theme` (en el portfolio, `bg-portfolio-theme`).
- CSP con hashes generada por Astro. Como expressive-code colorea la sintaxis con atributos
  `style`, solo `style-src-attr` admite `'unsafe-inline'`; `style-src` y `script-src` siguen siendo
  solo por hash.

tokens.css sha256: d4d3d58f692847ea7f29127f0ee5763217656eff911785dc43d4b9b25e6fb38b
