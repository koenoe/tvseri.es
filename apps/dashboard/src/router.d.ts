import type { ComponentType } from 'react';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    headerContent?: ComponentType;
    title?: string;
  }
}
