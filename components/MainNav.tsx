'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MainNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/videos', label: '视频' },
    { href: '/subscriptions', label: '订阅' },
    { href: '/settings', label: '设置' },
    { href: '/logs', label: '日志' },
  ];
  
  return (
    <nav className="hidden md:block">
      <ul className="flex space-x-6">
        {navItems.map(item => (
          <li key={item.href}>
            <Link 
              href={item.href} 
              className={`main-nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
} 