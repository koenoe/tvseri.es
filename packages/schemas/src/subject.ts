import {
  createSubjects,
  type SubjectPayload,
} from '@openauthjs/openauth/subject';
import * as v from 'valibot';
import { RoleSchema } from './user';

export const subjects = createSubjects({
  user: v.object({
    id: v.string(),
    role: RoleSchema,
  }),
});

export type Subject = SubjectPayload<typeof subjects>;
