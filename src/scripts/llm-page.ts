/**
 * Behaviour of /como-funciona-un-llm/:
 *
 * - Animated figures (`[data-llm-fig][data-animated]`) are held (`data-hold`) until they scroll
 *   into view, so a sequence starts at its first frame when the reader arrives, and held again
 *   when they leave, so forty looping figures do not burn a laptop battery off-screen. llm.css
 *   turns `data-hold` and `data-paused` into `animation-play-state: paused`.
 * - The pause button toggles `data-paused` (WCAG 2.2.2: motion that lasts more than five seconds
 *   can be paused).
 * - The chapter index highlights the chapter on screen and, on narrow screens, shows its name in
 *   the collapsed summary and closes itself after a jump.
 */

const figures = Array.from(document.querySelectorAll<HTMLElement>('[data-llm-fig][data-animated]'));

if ('IntersectionObserver' in window) {
  for (const figure of figures) figure.dataset.hold = '';
  const figureObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const figure = entry.target as HTMLElement;
        if (entry.isIntersecting) delete figure.dataset.hold;
        else figure.dataset.hold = '';
      }
    },
    { threshold: 0.2 },
  );
  figures.forEach((figure) => figureObserver.observe(figure));
}

for (const figure of figures) {
  const button = figure.querySelector<HTMLButtonElement>('[data-llm-toggle]');
  if (!button) continue;
  button.addEventListener('click', () => {
    const paused = figure.dataset.paused === undefined;
    if (paused) figure.dataset.paused = '';
    else delete figure.dataset.paused;
    button.textContent = paused ? 'reanudar' : 'pausar';
  });
}

const toc = document.querySelector<HTMLDetailsElement>('[data-llm-toc]');
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-llm-toc-link]'));
const tocCurrent = document.querySelector<HTMLElement>('[data-llm-toc-current]');
const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-llm-chapter]'));
const narrow = window.matchMedia('(max-width: 1023px)');

function activate(id: string) {
  for (const link of tocLinks) {
    const active = link.dataset.llmTocLink === id;
    link.classList.toggle('is-active', active);
    if (active) {
      link.setAttribute('aria-current', 'location');
      if (tocCurrent) tocCurrent.textContent = link.dataset.short ?? '';
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

if (toc) {
  /* Open by default in the markup (no JS, wide screens); a phone starts with it folded. */
  const sync = () => (toc.open = !narrow.matches);
  sync();
  narrow.addEventListener('change', sync);
  for (const link of tocLinks) {
    link.addEventListener('click', () => {
      if (narrow.matches) toc.open = false;
    });
  }
}

if (chapters.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Map<string, number>();
  const chapterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id;
        if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
        else visible.delete(id);
      }
      if (visible.size > 0) {
        const [id] = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        activate(id);
      }
    },
    { rootMargin: '-120px 0px -55% 0px', threshold: 0 },
  );
  chapters.forEach((chapter) => chapterObserver.observe(chapter));
}

export {};
