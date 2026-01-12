declare module '*/notifications' {
  import React from 'react';
  export const AppProvider: React.FC<{ children?: React.ReactNode }>;
  export function useApp(): any;
}
