"use client";

// HeroUI v3 is built on React Aria Components and does not require a provider.
// This file is kept as a thin wrapper in case provider context is needed in future.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
