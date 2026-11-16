import type { User } from '@tvseri.es/schemas';

type Properties = Record<string, unknown>;

type FindUserById = (
  userId: string,
) => Promise<Pick<User, 'role'> | null | undefined>;

/**
 * OpenAuth's refresh hook (our patch, `IssuerInput.refresh`): on every
 * refresh of a user's token, re-read the role from their user item (one
 * GetItem, only on a refresh, never per request), so a role changed by hand
 * in the database reaches the next access token instead of waiting for a new
 * sign-in. Anything else stays as signed in. A failed read keeps the token's
 * role (a refresh must never fail, or sign the user out, over it); a user
 * that is gone keeps it too (the API refuses them anyway).
 *
 * The role in the token only decides what the web shows (the Admin entry):
 * the API's `requireAuthAdmin` reads the role from the user item on every
 * request, so a demotion takes effect there at once.
 */
export const createRefreshProperties =
  (findUserById: FindUserById) =>
  async ({
    properties,
    type,
  }: Readonly<{ properties: Properties; type: string }>): Promise<
    Properties | undefined
  > => {
    if (type !== 'user' || typeof properties.id !== 'string') {
      return undefined;
    }
    try {
      const user = await findUserById(properties.id);
      if (!user || user.role === properties.role) {
        return undefined;
      }
      return { ...properties, role: user.role };
    } catch (error) {
      console.error(
        '[refresh] Role lookup failed, keeping the token role',
        error,
      );
      return undefined;
    }
  };
