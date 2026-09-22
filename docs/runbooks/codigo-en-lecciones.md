# Runbook · el código en las lecciones

Cómo se muestra código en el curso. Es la regla más estricta del repo y la única que tiene un
verificador propio (`pnpm verify:code`), porque es la que se rompió sin que nadie lo notara: al
cerrar la fase 1, **84 de los 91 bloques de código del curso eran paráfrasis**. Funciones reescritas
para la lección, docstrings en español donde el repo los tiene en inglés, y dos bloques citando
`src/rukh/eval/metrics.py`, un fichero que nunca existió. Quien escribiera lo que el curso enseñaba
no obtenía `rukh`: obtenía algo que se le parecía.

## La regla

**Todo bloque de código de una lección es un fichero de un repo hermano, literal, en la etiqueta con
la que cerró el módulo.** Ni resumido, ni traducido, ni "simplificado para la lección".

Si un bloque no puede mostrar el fichero entero, no se elide con `…`: **se parten en varios
bloques**, cada uno con su rango contiguo y su prosa entre medias. Un fichero explicado en cinco
bloques consecutivos que cubren de la línea 1 a la última es exactamente lo que necesita alguien que
va a escribirlo.

## La forma

Cada bloque lleva un `<Src>` **en la línea siguiente**, sin línea en blanco entre los dos:

````mdx
```python title="src/rukh/env.py"
def collect() -> EnvReport:
    """Collect the environment report. Never raises because torch or Stockfish are absent."""
    torch_version, cuda, gpu = _torch_info()
```

<Src file="src/rukh/env.py" tag="p0" lines="41-44" />
````

- `title=` es lo que ve el lector en la barra del bloque: la ruta dentro del repo, tal cual.
- `<Src file>` **tiene que ser idéntico** a `title=`.
- `tag` es la etiqueta del módulo: `p0` para M0, `p1` para M1… hasta `p6`. Es la fotografía del repo
  el día que cerró ese hito, y por eso es el enlace correcto: el lector ve en GitHub exactamente lo
  que la lección le enseñó. `main` tiene la versión de hoy, que en algunos ficheros ya es otra.
- `lines` es el rango real, 1-indexado, del fichero en esa etiqueta. Si te equivocas, el verificador
  te dice el rango correcto.
- `repo="rukh-web"` (o `rukh-lab`) para los otros dos repos, que no tienen etiquetas por hito: ahí
  `tag="main"`.
- `note="…"` para una coletilla corta ("sin cambios desde M2").

Bloques con cuatro acentos graves cuando el contenido lleva tres (las plantillas Jinja de las model
cards llevan bloques Markdown dentro).

### Dos trampas de formato que rompen el código sin que se note

**Prettier reescribe el código de un bloque cuyo lenguaje conoce.** Python y TOML no los conoce, así
que la mayor parte del curso está a salvo; YAML, TypeScript, JSON, CSS y Markdown sí, y los reformatea
en silencio (comillas simples por dobles, sangría perdida). El bloque deja de ser el fichero y el
lector no lo puede saber. La guarda va **en la línea de encima** de la apertura del bloque:

````mdx
{/* prettier-ignore */}
```yaml title="configs/data/pipeline.yaml"
````

`pnpm verify:code` la exige en todo bloque de un lenguaje que Prettier conozca, y la lista está en
`scripts/course-code.mjs`. No se pone en los bloques de Python: sobra y ensucia.

**Prettier recorta las líneas en blanco de los extremos de un bloque.** Un bloque escrito para
empezar en la línea vacía que separa dos definiciones empieza una línea más tarde en cuanto se
formatea, y el `lines` deja de cuadrar. Por eso el flujo de trabajo es **escribir, formatear,
`fix`, verificar**, y `fix` reescribe los rangos por ti:

```bash
pnpm format && pnpm fix:code && pnpm verify:code
```

Nadie cuenta líneas a mano.

**Un componente en línea nunca empieza una línea.** MDX lee una línea que empieza por `<` como un
elemento de bloque, así que una frase cortada antes de un `<Term>` se renderiza como dos párrafos con
la frase partida por la mitad. Se junta con la línea anterior, aunque pase de 100 columnas: en
Markdown la anchura no se aplica a la prosa. El verificador también comprueba esto.

## Qué se muestra y qué se enlaza

`docs/cobertura-de-codigo.md` lleva la cuenta. La política:

| Qué                                                | Cómo                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/rukh/**/*.py`                                 | Íntegro, en el curso. Es el motor: sin él no hay proyecto.                   |
| `configs/**`, `pyproject.toml`, `.python-version`  | Íntegros. Son cortos y cada clave es una decisión.                           |
| `labs/**`                                          | Íntegros, en la lección de labs del módulo.                                  |
| `src/rukh/data/cards/*.jinja`                      | La primera entera; las variantes, por diferencia.                            |
| `tests/**`                                         | Los que enseñan un contrato, enteros; el resto, tabla con enlace.            |
| `scripts/**`                                       | Íntegros.                                                                    |
| `uv.lock`, `LICENSE`, `tests/fixtures/**`, `gold/` | Ni se muestran ni se inventarían. Son generados o inertes.                   |
| `README.md`, `.github/workflows/**`, `docs/**`     | Ni se muestran ni se inventarían. No enseñan nada del proyecto.              |
| `rukh-web`                                         | Lo que toca al modelo (tokenizador, worker ONNX, tablero); el resto, enlace. |

**No hay secciones que hagan inventario de lo que no se muestra** ("Los tests que se quedan en un
enlace", "Lo que se enlaza en vez de pegarse", "Los dos ficheros que el curso no muestra"). Hablan
del curso, no del proyecto, y el lector no aprende nada de ellas. Si un test o un fichero no pegado
importa para entender algo, se nombra con su enlace **en la prosa donde importa**, o se ejecuta en
una caja «Ejecútalo»; si no importa, no se menciona.

## Ficheros que cambian en un módulo posterior

No se repite el fichero entero. Se muestran **los trozos nuevos o cambiados**, cada uno con su
`lines` de la etiqueta nueva, y la prosa dice dónde encajan ("entre `_torch_info` y `collect`") y qué
había antes. El verificador comprueba el trozo contra la etiqueta nueva, así que un bloque de M4 con
`tag="p4"` es la versión de M4 y no la de M2.

## Las herramientas

```bash
pnpm verify:code                                   # todos los bloques, contra su etiqueta
pnpm fix:code                                      # reescribe los `lines` al rango real
node scripts/course-code.mjs show p2 src/rukh/models/decoder.py    # el fichero numerado
node scripts/course-code.mjs split p2 src/rukh/models/decoder.py   # MDX ya cortado en bloques
node scripts/course-code.mjs coverage --all --top=60               # qué queda sin mostrar
```

`split` corta en los límites de `def`/`class` de primer nivel y emite el MDX con su `<Src>` ya
puesto. Es el punto de partida de una lección de código: se pega, se reordena y se escribe la prosa
entre los bloques. Lo que **no** hay que hacer nunca es escribir el código a mano desde la memoria:
así nacieron las 84 paráfrasis.

## La prosa alrededor del código

Un bloque sin explicación es un volcado, y un volcado no es un curso. Antes o después de cada bloque:

1. **Qué hace**, en una frase que no repita el nombre de la función.
2. **Por qué así**: la decisión que hay dentro. Un `TRY_CAST` en vez de un `CAST`, un `eps` en el
   denominador, el orden de dos opciones UCI. Si el código no tiene ninguna decisión dentro (un
   `__init__.py` de reexportes, un dataclass de cinco campos), una frase basta y se pasa al
   siguiente.
3. **Qué se rompe si se hace de otra forma**, cuando se sabe porque se rompió. Esas van en
   `<Callout kind="roto">`.

No se explica lo obvio: nadie necesita que le cuenten que `import os` importa `os`. Se explica lo que
un lector que sabe Python pero no sabe de modelos no puede deducir del código.

## Estructura de un módulo

Cada módulo de la fase 1 va así:

1. **Una lección de apertura** conceptual: qué se va a construir, la teoría justa para decidir, y las
   decisiones del módulo. Poco código o ninguno.
2. **Varias lecciones de código**, una por pieza coherente (el decoder, la receta de entrenamiento,
   el muestreo, la exportación…). Cada una muestra su código íntegro y lo explica.
3. **Una lección de resultados** (`lo-que-salio`) donde la hay: las medidas del hito, con su tabla.
4. **Una lección de labs** al final: los `labs/<módulo>/*.py` enteros, sus rutas
   (`src/data/lab-routes.ts`) y los ejercicios.

## Tiempos

`duration` (minutos al teclado) se estima con la forma del contenido, no a ojo:

```
duration ≈ redondeo a 5 de (30 + líneas_de_código / 6 + líneas_de_prosa / 25)
```

`runtime` (minutos de reloj sin nadie delante) solo lo llevan las lecciones que lanzan algo:
entrenamientos, descargas, partidas contra el motor. Sale de `rukh/docs/reproducir.md`.

## Lo que una lección de código pesa

Una lección con sesenta bloques renderiza unas 11 000 etiquetas y 600 KB de HTML (66 KB comprimido),
frente a las 500 etiquetas y 14 KB de una lección conceptual. Lo produce expressive-code, que emite
un `span` por token resaltado, y no hay forma de evitarlo sin renunciar al resaltado.

Medido en la lección más grande de la fase 1 (`m4/05-qlora-con-transformers`) con Chrome DevTools:
accesibilidad 100, buenas prácticas 100, SEO 100. **El rendimiento no está medido**: Lighthouse no
arranca en la máquina de referencia (`EPERM` al limpiar el perfil temporal de `chrome-launcher`), y la
lista de URLs de `lighthouserc.json` sigue cubriendo solo las lecciones de apertura, que son las
ligeras. Antes de añadir una lección de código a esa lista hay que medirla donde Lighthouse funcione:
el umbral es 0,95 y un DOM de 11 000 nodos puede no llegar en un ejecutor lento.

## Antes de publicar

```bash
pnpm verify:code && pnpm check && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Y `node scripts/course-code.mjs coverage --all` para ver qué falta. Un módulo no se cierra con
ficheros de `src/rukh` sin mostrar salvo que estén en la tabla de "solo enlace" de arriba.
