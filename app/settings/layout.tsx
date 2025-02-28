import './settings.css';
import SettingsMenu from './components/SettingsMenu';
import { NotificationProvider } from '../components/NotificationContext';

// 设置布局组件
export default function SettingsLayout({ children }) {
  return (
    <NotificationProvider>
      <div className="settings-container">
        <aside className="settings-sidebar">
          <SettingsMenu />
        </aside>
        <main className="settings-content">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
} 