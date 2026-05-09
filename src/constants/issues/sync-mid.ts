export const SYNC_MID_ISSUE = (midName: string) => {
  const shortName = midName.split(' - ')[0].trim();
  return {
    title: `Sync MID: ${shortName}`,
    description: `Run "MID Checks - ${shortName}" skill for ${shortName}.`,
  };
};
