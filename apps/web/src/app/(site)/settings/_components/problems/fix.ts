/**
 * What became of a review item. The importer keeps these until the run ends;
 * a list that drops settled items at once never needs one.
 */
export type PickedFix = Readonly<{
  kind: 'picked';
  /** "Top Boy (2019)", "Wednesday S02E01" */
  label: string;
  rows: number;
  /** waiting: still undoable (the toast's grace); then sent once */
  status: 'waiting' | 'sending' | 'sent' | 'failed';
  /** Episodes in the history from this fix; counted only once it is `sent` */
  imported: number;
}>;

export type Fix = Readonly<{ kind: 'skipped'; rows: number }> | PickedFix;
