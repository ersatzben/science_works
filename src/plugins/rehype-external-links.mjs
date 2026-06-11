// Open external links (http/https) from markdown & MDX in a new tab, with
// rel="noopener noreferrer" for safety. Internal/relative links and in-page
// #anchors (footnote refs/backrefs, #writers, etc.) are left untouched so
// on-page navigation still behaves. Dependency-free walk so there's nothing to
// install. Applies to all rendered article content (essays are the only
// markdown/MDX on the site).
export default function rehypeExternalLinks() {
  const isExternal = (href) => typeof href === 'string' && /^https?:\/\//i.test(href);
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const href = node.properties && node.properties.href;
      if (isExternal(href)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noopener', 'noreferrer'];
      }
    }
    if (node.children) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}
