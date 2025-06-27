import * as v from 'valibot';

export const PreferredImagesSchema = v.object({
  backdropColor: v.string(),
  backdropImagePath: v.string(),
  titleTreatmentImagePath: v.optional(v.string()),
});

export type PreferredImages = v.InferOutput<typeof PreferredImagesSchema>;
