import type { Person } from "$lib/types";

/**
 * Format a person's display name for public lists and dropdowns:
 * - Uses first name only.
 * - If multiple people share the same first name (case-insensitive),
 *   appends the first initial of their last name with a dot (e.g. "Henrik K.").
 * - In admin views, the full name (first + last name) should be used instead.
 */
export function getPublicDisplayName(person: Person, allPersons: Person[] = []): string {
  if (!person) return "";
  const first = (person.firstName || "").trim();
  const last = (person.lastName || "").trim();

  if (!first) return last || "Unnamed";

  // Check if any other person has the same first name
  const duplicateFirstNames = allPersons.filter(
    p => p.id !== person.id && (p.firstName || "").trim().toLowerCase() === first.toLowerCase()
  );

  if (duplicateFirstNames.length > 0 && last) {
    return `${first} ${last.charAt(0).toUpperCase()}.`;
  }

  return first;
}

/**
 * Format a person's full name for admin views (First Name + Last Name).
 */
export function getAdminFullName(person: Person): string {
  if (!person) return "";
  const first = (person.firstName || "").trim();
  const last = (person.lastName || "").trim();
  return `${first} ${last}`.trim();
}

/**
 * Alphabetically sort persons by their first name, then last name.
 */
export function sortPersonsAlphabetically(persons: Person[]): Person[] {
  return [...persons].sort((a, b) => {
    const firstA = (a.firstName || "").toLowerCase();
    const firstB = (b.firstName || "").toLowerCase();
    const cmp = firstA.localeCompare(firstB, "en", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return (a.lastName || "").toLowerCase().localeCompare((b.lastName || "").toLowerCase(), "en", { sensitivity: "base" });
  });
}
