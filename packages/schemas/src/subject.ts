import {
  createSubjects,
  type SubjectPayload,
} from '@openauthjs/openauth/subject';
import * as v from 'valibot';

export const subjects = createSubjects({
  user: v.object({
    id: v.string(),
  }),
});

export type Subject = SubjectPayload<typeof subjects>;
