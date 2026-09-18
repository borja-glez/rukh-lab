/** Heading as Astro's `render()` returns it. */
export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface TocItem {
  slug: string;
  text: string;
  depth: number;
  children: TocItem[];
}

/**
 * Nests headings of depth `min..max` (h2 and h3 by default) into a tree.
 * Headings shallower than `min` are ignored (the h1 is the lesson title).
 */
export function buildToc(headings: readonly Heading[], min = 2, max = 3): TocItem[] {
  const root: TocItem[] = [];
  let current: TocItem | null = null;
  for (const h of headings) {
    if (h.depth < min || h.depth > max) continue;
    const item: TocItem = { slug: h.slug, text: h.text, depth: h.depth, children: [] };
    if (h.depth === min || !current) {
      root.push(item);
      current = item;
    } else {
      current.children.push(item);
    }
  }
  return root;
}
