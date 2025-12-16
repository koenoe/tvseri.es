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

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

function DrawerOverlayComponent({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/80', className)}
      {...props}
    />
  );
}

DrawerOverlayComponent.displayName = DrawerPrimitive.Overlay.displayName;
const DrawerOverlay = memo(DrawerOverlayComponent);

function DrawerContentComponent({
  children,
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

DrawerContentComponent.displayName = 'DrawerContent';
const DrawerContent = memo(DrawerContentComponent);

function DrawerHeaderComponent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
      {...props}
    />
  );
}

DrawerHeaderComponent.displayName = 'DrawerHeader';
const DrawerHeader = memo(DrawerHeaderComponent);

function DrawerFooterComponent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

DrawerFooterComponent.displayName = 'DrawerFooter';
const DrawerFooter = memo(DrawerFooterComponent);

function DrawerTitleComponent({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

DrawerTitleComponent.displayName = DrawerPrimitive.Title.displayName;
const DrawerTitle = memo(DrawerTitleComponent);

function DrawerDescriptionComponent({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

DrawerDescriptionComponent.displayName =
  DrawerPrimitive.Description.displayName;
const DrawerDescription = memo(DrawerDescriptionComponent);

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
