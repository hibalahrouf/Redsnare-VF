'use client'
import React, { useEffect, useState } from 'react';

interface NetworkGuardProps {
  children: React.ReactNode;
}

/**
 * NetworkGuard previously performed blockchain and contract validation checks.
 * These have been disabled to allow for a silent experience during development/testing.
 */
export function NetworkGuard({ children }: NetworkGuardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return <>{children}</>;
}
