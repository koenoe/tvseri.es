import * as v from 'valibot';

export const PreferredImagesSchema = v.object({
  backdropImagePath: v.string(),
  backdropColor: v.string(),
  titleTreatmentImagePath: v.optional(v.string()),
});

export type PreferredImages = v.InferOutput<typeof PreferredImagesSchema>;
