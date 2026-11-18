'use client';

import { type ComponentProps, memo } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);
Drawer.displayName = 'Drawer';

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

function DrawerOverlayComponent({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Overlay>) {
  const classes = cn('fixed inset-0 z-50 bg-black/80', className);
  return <DrawerPrimitive.Overlay className={classes} {...props} />;
}

DrawerOverlayComponent.displayName = DrawerPrimitive.Overlay.displayName;
const DrawerOverlay = memo(DrawerOverlayComponent);

function DrawerContentComponent({
  children,
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content>) {
  const classes = cn(
    'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
    className,
  );
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content className={classes} {...props}>
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

DrawerContentComponent.displayName = 'DrawerContent';
const DrawerContent = memo(DrawerContentComponent);

function DrawerHeaderComponent({ className, ...props }: ComponentProps<'div'>) {
  const classes = cn('grid gap-1.5 p-4 text-center sm:text-left', className);
  return <div className={classes} {...props} />;
}

DrawerHeaderComponent.displayName = 'DrawerHeader';
const DrawerHeader = memo(DrawerHeaderComponent);

function DrawerFooterComponent({ className, ...props }: ComponentProps<'div'>) {
  const classes = cn('mt-auto flex flex-col gap-2 p-4', className);
  return <div className={classes} {...props} />;
}

DrawerFooterComponent.displayName = 'DrawerFooter';
const DrawerFooter = memo(DrawerFooterComponent);

function DrawerTitleComponent({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Title>) {
  const classes = cn(
    'text-lg font-semibold leading-none tracking-tight',
    className,
  );
  return <DrawerPrimitive.Title className={classes} {...props} />;
}

DrawerTitleComponent.displayName = DrawerPrimitive.Title.displayName;
const DrawerTitle = memo(DrawerTitleComponent);

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
};
