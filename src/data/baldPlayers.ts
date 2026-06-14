/** Competition players designated as bald for Mystery Stats easter egg. */
const BALD_PLAYER_DISPLAY_NAMES = new Set(
  ['Big Bald Ben', 'Little Bald Rob', 'AndyB'].map((name) => name.toLowerCase())
);

export function isBaldPlayer(displayName: string): boolean {
  return BALD_PLAYER_DISPLAY_NAMES.has(displayName.trim().toLowerCase());
}
