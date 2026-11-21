/**
 * Where How it works switches drawings, shared by the drawing, the space
 * that holds its shape while its chunk loads, and the dialog (kept out of
 * the drawing's module, so the dialog doesn't pull the chunk). Across only
 * from lg, where the dialog gives it about its design size (the 11-unit
 * lines stay at 10px or more); below that top to bottom, capped at 440px
 * (at most 1.23×), in the phone's sheet and the narrowed dialog.
 */
export const ACROSS = 'block w-full max-lg:hidden';
export const DOWN = 'mx-auto block w-full max-w-[440px] lg:hidden';

/** The dialog narrows to the capped drawing plus its 24px padding */
export const DIALOG_WIDTH = 'w-250 sm:max-lg:w-[488px]';
