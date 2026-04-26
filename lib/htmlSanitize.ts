/**
 * Strip dangerous tags / attributes / inline styles from product description
 * HTML before exporting to marketplace CSVs. Marketplaces tend to reject or
 * mis-render <script>, <iframe>, inline styles, event handlers and javascript:
 * URLs, and they also strip Shopify-specific Liquid wrappers we don't want.
 */
const DANGEROUS_TAGS = [
  'script', 'style', 'iframe', 'embed', 'object', 'link', 'meta',
  'form', 'input', 'button', 'select', 'textarea', 'noscript', 'base',
];

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'a', 'img', 'hr', 'blockquote', 'pre', 'code', 'small', 'sub', 'sup',
]);

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'width', 'height']);

function sanitizeNode(node: Element): void {
  // Remove disallowed attributes
  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value.toLowerCase().trim();
    if (name.startsWith('on')) {
      node.removeAttribute(attr.name);
      continue;
    }
    if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
      node.removeAttribute(attr.name);
      continue;
    }
    if (!ALLOWED_ATTRS.has(name)) {
      node.removeAttribute(attr.name);
    }
  }
  // Recurse
  for (const child of Array.from(node.children)) {
    sanitizeNode(child);
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || !window.DOMParser) return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return '';

  // Drop dangerous tag subtrees outright
  for (const tag of DANGEROUS_TAGS) {
    root.querySelectorAll(tag).forEach(n => n.remove());
  }
  // Comment nodes
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  let cur = walker.nextNode();
  while (cur) {
    comments.push(cur);
    cur = walker.nextNode();
  }
  comments.forEach(c => c.parentNode?.removeChild(c));

  // Unwrap (keep text, drop tag) for tags not in allowlist
  const allElements = Array.from(root.querySelectorAll('*'));
  for (const el of allElements) {
    if (!ALLOWED_TAGS.has(el.tagName.toLowerCase())) {
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    } else {
      sanitizeNode(el);
    }
  }

  return root.innerHTML
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
