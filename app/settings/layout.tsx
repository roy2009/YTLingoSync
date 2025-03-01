import './settings.css';
import SettingsMenu from './components/SettingsMenu';
import { NotificationProvider } from '../components/NotificationContext';
import React from 'react';

// 设置布局组件
export default function SettingsLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <NotificationProvider>
      <div className="page-container">
        <div className="content-container-sm">
          <div className="settings-container">
            <aside className="settings-sidebar">
              <SettingsMenu />
            </aside>
            <main className="settings-content">
              {children}
            </main>
          </div>
        </div>
      </div>
    </NotificationProvider>
  );
} 