'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORY_LAYOUTS } from '@/lib/settings';

export default function SettingsMenu() {
  const pathname = usePathname();
  
  return (
    <nav>
      <ul>
        {Object.entries(CATEGORY_LAYOUTS).map(([category, info]) => {
          const href = `/settings/${category}`;
          const isActive = pathname === href;
          
          return (
            <li key={category}>
              <Link 
                href={href}
                className={isActive ? 'active' : ''}
              >
                {info.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
} 