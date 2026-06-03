/** Standard Debug-branch local test data (see docs/DEBUG.md). */
export const DEBUG_TEST_USER_COUNT = 20;
export const DEBUG_USER_PREFIX = 'Test';
export const DEBUG_USER_PASSWORD = 'guest';
export const DEBUG_ADMIN_INDEX = 1;

export function debugDisplayName(index: number, prefix = DEBUG_USER_PREFIX): string {
  return `${prefix}${index}`;
}
