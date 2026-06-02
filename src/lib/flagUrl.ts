/** Served from public/flags/4x3 (copied from flag-icons on postinstall). */
export function flagImageUrl(countryCode: string): string {
  return `/flags/4x3/${countryCode.toLowerCase()}.svg`;
}
