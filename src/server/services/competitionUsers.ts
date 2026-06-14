import { isReservedOrganiserDisplayName } from './auth';

const BOOTSTRAP_ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'AdminTomsom';

function normalizeDisplayName(name: string): string {
  return name.trim();
}

/** SQL fragment — bind bootstrap organiser display name as the next parameter. */
export function competitionUserWhere(alias?: string): string {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}is_admin = 0 AND LOWER(${prefix}display_name) != LOWER(?)`;
}

export function competitionUserBindParams(): [string] {
  return [normalizeDisplayName(BOOTSTRAP_ADMIN_USERNAME)];
}

export function isExcludedFromCompetition(displayName: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return isReservedOrganiserDisplayName(displayName);
}

/** @deprecated use competitionUserWhere() */
export const COMPETITION_USER_SQL = competitionUserWhere();

export { BOOTSTRAP_ADMIN_USERNAME as ORGANISER_USERNAME };
