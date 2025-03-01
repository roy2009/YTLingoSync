'use client';

import { useEffect, useState, ReactNode } from 'react';

export default function HydrationErrorSuppressor({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return <>{isClient ? children : null}</>;
} 