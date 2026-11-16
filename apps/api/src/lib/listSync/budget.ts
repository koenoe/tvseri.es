/**
 * How many list changes the nightly job may make. A night with more than
 * this is more likely a bug (a key format or count change) than real data:
 * the cap keeps such a bug from emptying everyone's Finished and In progress
 * lists in one run. What it refuses heals on later nights, as the job derives
 * everything from current data.
 *
 * "Run" = one Lambda invocation (a batch of up to 10 users): the job has no
 * shared state across invocations, and at today's scale a night is one batch.
 */
const NIGHTLY_CAP = { perRun: 50, perUser: 10 } as const;

export type ChangeBudget = Readonly<{
  /** Claims one change for the user: false once a cap is reached */
  take: (userId: string) => boolean;
  /** Gives a claim back: the change it was for wasn't made */
  refund: (userId: string) => void;
}>;

export const createChangeBudget = (
  caps: Readonly<{ perRun: number; perUser: number }> = NIGHTLY_CAP,
): ChangeBudget => {
  const perUser = new Map<string, number>();
  const reported = new Set<string>();
  let total = 0;

  const refuse = (key: string, message: string) => {
    if (!reported.has(key)) {
      reported.add(key);
      console.error(`[CAP] ${message}; the rest is left for a later night`);
    }
    return false;
  };

  return {
    refund: (userId) => {
      const used = perUser.get(userId) ?? 0;
      if (used > 0) {
        perUser.set(userId, used - 1);
        total -= 1;
      }
    },
    take: (userId) => {
      if (total >= caps.perRun) {
        return refuse(
          'run',
          `Nightly list changes reached ${caps.perRun} in this run`,
        );
      }
      const used = perUser.get(userId) ?? 0;
      if (used >= caps.perUser) {
        return refuse(
          userId,
          `Nightly list changes for user ${userId} reached ${caps.perUser}`,
        );
      }
      perUser.set(userId, used + 1);
      total += 1;
      return true;
    },
  };
};
