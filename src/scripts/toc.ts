/**
 * Highlights the current section in the lesson TOC (`[data-toc-link]`) and the
 * rail (`[data-rail-tick]`) as headings scroll into view.
 */
const headings = Array.from(document.querySelectorAll<HTMLElement>('.prose h2[id], .prose h3[id]'));
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
const rail = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-tick]'));

function activate(id: string) {
  tocLinks.forEach((link) => {
    const active = link.dataset.tocLink === id;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  /* The rail only has h2 stops: a h3 lights up its parent section. */
  const section = document.getElementById(id);
  const h2 =
    section?.tagName === 'H2'
      ? section
      : (section?.previousElementSibling && closestH2(section)) || null;
  const railId = h2?.id ?? id;
  rail.forEach((stop) => stop.classList.toggle('is-active', stop.dataset.railTick === railId));
}

function closestH2(el: Element): HTMLElement | null {
  let node: Element | null = el.previousElementSibling;
  while (node) {
    if (node.tagName === 'H2') return node as HTMLElement;
    node = node.previousElementSibling;
  }
  return null;
}

if (headings.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Map<string, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = (entry.target as HTMLElement).id;
        if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
        else visible.delete(id);
      });
      if (visible.size > 0) {
        const [id] = [...visible.entries()].sort((a, b) => a[1] - b[1])[0];
        activate(id);
      }
    },
    { rootMargin: '-56px 0px -60% 0px', threshold: 0 },
  );
  headings.forEach((h) => observer.observe(h));
  activate(headings[0].id);
}
