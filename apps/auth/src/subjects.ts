import { createSubjects } from '@openauthjs/openauth/subject';
import { UserSchema } from '@tvseri.es/schemas';

export const subjects = createSubjects({
  user: UserSchema,
});
