/**
 * A username's claim in the Users table: an item of its own, keyed by the
 * name, holding the id of the user who has it. The auth service writes it
 * with a new user's generated handle, the API with a rename; both delete it
 * only when it names the acting user. One key format, so sign-up and rename
 * always claim the same item.
 */
export const handleClaimKey = (username: string) => `HANDLE#${username}`;
