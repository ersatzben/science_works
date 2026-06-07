// People lookup — the single source of truth for anyone on the /about page.
// Flattens every group in people.json into a by-name index so other surfaces
// (e.g. writing author bios) can point at a person by name instead of copying
// their role/bio/photo. Photos in people.json are bare filenames; we return the
// full public path so callers can use it directly.
import people from '../data/people.json';

const PHOTO_DIR = '/assets/images/people/';

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

// Returns { name, role, bio, photo } for a known person, or null for someone
// not on the about page (e.g. an external/guest writer).
export function getPerson(name) {
  return byName[name] ?? null;
}
