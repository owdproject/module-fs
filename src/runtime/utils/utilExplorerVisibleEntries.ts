/** Filter directory listing entries based on hidden-file preference. */
export function filterVisibleEntries(
  names: string[],
  showHidden: boolean,
): string[] {
  if (showHidden) return names
  return names.filter((name) => !name.startsWith('.'))
}
