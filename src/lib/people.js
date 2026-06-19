// People lookup — the single source of truth for anyone on the /about page.
// Flattens every group in people.json into a by-name index so other surfaces
// (e.g. writing author bios) can point at a person by name instead of copying
// their role/bio/photo. Photos in people.json are bare filenames; we return the
// full public path so callers can use it directly.
import people from '../data/people.json';

const PHOTO_DIR = '/assets/images/people/';

// Name → URL slug, matching the glyphs convention (firstname-lastname).
export const slugify = (name) =>
  (name || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const byName = {};
for (const group of Object.values(people)) {
  for (const p of group) {
    byName[p.name] = {
      name: p.name,
      role: p.role,
      bio: p.bio,
      photo: p.photo ? PHOTO_DIR + p.photo : undefined,
    };
  }
}

// Team members get dedicated /people/<slug> profile pages (core staff with
// substantive bios). External board/advisors/contributors do not — their
// primary identity lives elsewhere, so a thin page here would be low value.
const profileNames = new Set((people.team ?? []).map((p) => p.name));

// Full team records (incl. social handles) for building the profile pages and
// the Organization `member` graph. Photo is returned as a full public path.
export const team = (people.team ?? []).map((p) => ({
  ...p,
  slug: slugify(p.name),
  path: `/people/${slugify(p.name)}`,
  photo: p.photo ? PHOTO_DIR + p.photo : undefined,
}));

// Returns { name, role, bio, photo } for a known person, or null for someone
// not on the about page (e.g. an external/guest writer).
export function getPerson(name) {
  return byName[name] ?? null;
}

// Returns `/people/<slug>` for someone with a profile page, or null otherwise.
// Used to link About cards and essay bylines to the canonical profile.
export function profilePath(name) {
  return profileNames.has(name) ? `/people/${slugify(name)}` : null;
}
