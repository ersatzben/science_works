import { visit } from 'unist-util-visit';

// Heading short names for the TOC rail:  ## Full heading [[TOC: Short name]]
// -> strips the marker from the visible heading, emits data-toc="Short name"
// on the rendered <h2>. The TOC script prefers data-toc over the full text.
const RE = /\s*\[\[TOC:\s*([^\]]+?)\]\]\s*$/;

export default function remarkTocAlias() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child.type !== 'text') continue;
        const m = child.value.match(RE);
        if (!m) { if (child.value.trim()) break; else continue; }
        child.value = child.value.slice(0, m.index).replace(/\s+$/, '');
        if (!child.value) node.children.splice(i, 1);
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), 'data-toc': m[1].trim() };
        return;
      }
    });
  };
}
