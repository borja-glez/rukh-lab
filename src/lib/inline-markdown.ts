/**
 * The bit of Markdown that the glossary definitions are written in, rendered inline.
 *
 * `terms.json` is data, not content: Astro's Markdown pipeline never sees it, so a definition
 * reached the page with its backticks and asterisks intact —`` `ignore_index` `` and
 * `**grupo**` printed as typed. The definitions are ours, one paragraph long, and use three
 * marks and no others, so this renders those three rather than pulling in a Markdown parser
 * that would have to be kept updated for `code`, `strong` and `em`.
 *
 * Escaping runs first and over the whole string, which is what makes `set:html` safe here and
 * is not optional: `<pad>`, `<mask>` and `n > 3,84` appear in real definitions and would
 * otherwise be parsed as markup and disappear. Code spans come out before the emphasis passes,
 * so an asterisk inside backticks stays an asterisk, as it does in Markdown.
 */

const ESCAPED: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** `U+0000` never appears in the source text, so it cannot collide with a placeholder. */
const HOLE = '\u0000';

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (char) => ESCAPED[char]);
}

/** `` `a` **b** *c* `` → `<code>a</code> <strong>b</strong> <em>c</em>`, everything else escaped. */
export function inlineMarkdown(text: string): string {
  const spans: string[] = [];
  const withoutCode = escapeHtml(text).replace(/`([^`]+)`/g, (_match, body: string) => {
    spans.push(body);
    return `${HOLE}${spans.length - 1}${HOLE}`;
  });
  const emphasized = withoutCode
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return emphasized.replace(
    new RegExp(`${HOLE}(\\d+)${HOLE}`, 'g'),
    (_match, index: string) => `<code>${spans[Number(index)]}</code>`,
  );
}
