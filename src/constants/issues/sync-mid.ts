const shortNameOf = (midName: string) => midName.split(' - ')[0].trim();

/** Bank from a trailing "(GOAT - Axiom)" style suffix, e.g. "Axiom". */
const bankOf = (midName: string) => {
  const match = midName.match(/\(([^)]*)\)\s*$/);
  return match ? match[1].split(' - ').pop()!.trim() : '';
};

/**
 * `allMidNames` lets MIDs that share a short name (e.g. two "Maverick" MIDs)
 * be told apart by their bank: "Maverick (Axiom)" vs "Maverick (Avidia)".
 */
export const SYNC_MID_ISSUE = (midName: string, allMidNames: string[] = []) => {
  const shortName = shortNameOf(midName);
  const isShared = allMidNames.filter((n) => shortNameOf(n) === shortName).length > 1;
  const bank = isShared ? bankOf(midName) : '';
  const label = bank ? `${shortName} (${bank})` : shortName;
  return {
    title: `Sync MID: ${label}`,
    description: [
      `Run the "MID Checks - ${label}" skill for ${label}. Use only this skill; do not run the checks for any other MID.`,
      '',
      '1. Before logging in, get the list of active proxies and use one of them for the whole session.',
      '2. Log in and run the skill.',
      '3. If login fails (wrong password, locked account, etc.), use the reset password flow, then log in again with the new password and continue.',
      '4. If login still fails after the reset, stop and comment on this issue with the error and the step where it failed.',
    ].join('\n'),
  };
};
