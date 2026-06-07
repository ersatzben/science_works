// Map a project name (as used in writing frontmatter or card titles) to the
// canonical projects-page slug, so links can deep-link to /projects#<slug>
// (opens that project's modal). Keep slugs in sync with src/pages/projects.astro.
// Aliases cover naming drift (e.g. "AI for Science" vs "AI and Science").
const SLUGS = {
  'institutional dynamism': 'institutional-dynamism',
  'ai and science': 'ai-and-science',
  'ai for science': 'ai-and-science',
  'the research economy': 'the-research-economy',
  'research economy': 'the-research-economy',
  'software for science': 'software-for-science',
  'a story of british science': 'a-story-of-british-science',
  'the story of british science': 'a-story-of-british-science',
};

export function projectSlug(name) {
  return SLUGS[(name || '').trim().toLowerCase()] || null;
}

// A href to the project's modal, falling back to the projects index if unknown.
export function projectHref(name) {
  const slug = projectSlug(name);
  return slug ? `/projects#${slug}` : '/projects';
}
