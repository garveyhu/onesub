import {
  DesktopOutlined,
  GlobalOutlined,
  MoonOutlined,
  SettingFilled,
  SunOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

import { useAppPreferences } from '@/contexts/app-preferences';

import './preference-switcher.less';

type ThemeMode = 'system' | 'light' | 'dark';

/**
 * 返回当前主题模式的预览图标，方便悬浮球和展开面板复用同一视觉语言。
 */
function getThemePreviewIcon(themeMode: ThemeMode) {
  if (themeMode === 'light') {
    return <SunOutlined />;
  }
  if (themeMode === 'dark') {
    return <MoonOutlined />;
  }
  return <DesktopOutlined />;
}

/**
 * 统一展示语言与主题切换，并以右下角悬浮球的方式提供全局入口。
 */
const PreferenceSwitcher = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { language, setLanguage, setThemeMode, t, themeMode } = useAppPreferences();

  useEffect(() => {
    if (!expanded) {
      return undefined;
    }

    /**
     * 当用户点击悬浮面板外部区域时收起，避免固定层长期遮挡内容。
     */
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expanded]);

  const currentLanguageLabel = language === 'zh-CN' ? '中' : 'EN';

  return (
    <div
      ref={rootRef}
      className={`preference-switcher ${expanded ? 'open' : ''}`}
    >
      <div className="preference-switcher-panel" aria-hidden={!expanded}>
        <div className="preference-switcher-panel-header">
          <div>
            <span className="preference-switcher-panel-kicker">OneSub</span>
            <h3>{t('preferencesTitle')}</h3>
            <p>{t('preferencesHint')}</p>
          </div>
          <div className="preference-switcher-panel-summary">
            <span>{currentLanguageLabel}</span>
            <span>{t(themeMode)}</span>
          </div>
        </div>

        <div className="preference-switcher-group">
          <div className="preference-switcher-meta">
            <span className="preference-switcher-meta-icon">
              <GlobalOutlined />
            </span>
            <div className="preference-switcher-meta-copy">
              <strong>{t('language')}</strong>
              <span>中文 / English</span>
            </div>
          </div>
          <div className="preference-switcher-track">
            <button
              type="button"
              className={`preference-switcher-option ${language === 'zh-CN' ? 'active' : ''}`}
              onClick={() => setLanguage('zh-CN')}
              title="中文"
            >
              <span className="preference-switcher-option-text">中文</span>
            </button>
            <button
              type="button"
              className={`preference-switcher-option ${language === 'en-US' ? 'active' : ''}`}
              onClick={() => setLanguage('en-US')}
              title="English"
            >
              <span className="preference-switcher-option-text">English</span>
            </button>
          </div>
        </div>

        <div className="preference-switcher-group">
          <div className="preference-switcher-meta">
            <span className="preference-switcher-meta-icon">
              {getThemePreviewIcon(themeMode)}
            </span>
            <div className="preference-switcher-meta-copy">
              <strong>{t('theme')}</strong>
              <span>{t(themeMode)}</span>
            </div>
          </div>
          <div className="preference-switcher-track preference-switcher-track-theme">
            <button
              type="button"
              className={`preference-switcher-option preference-switcher-option-theme ${
                themeMode === 'system' ? 'active' : ''
              }`}
              onClick={() => setThemeMode('system')}
              title={t('system')}
            >
              <DesktopOutlined />
              <span className="preference-switcher-option-text">{t('system')}</span>
            </button>
            <button
              type="button"
              className={`preference-switcher-option preference-switcher-option-theme ${
                themeMode === 'light' ? 'active' : ''
              }`}
              onClick={() => setThemeMode('light')}
              title={t('light')}
            >
              <SunOutlined />
              <span className="preference-switcher-option-text">{t('light')}</span>
            </button>
            <button
              type="button"
              className={`preference-switcher-option preference-switcher-option-theme ${
                themeMode === 'dark' ? 'active' : ''
              }`}
              onClick={() => setThemeMode('dark')}
              title={t('dark')}
            >
              <MoonOutlined />
              <span className="preference-switcher-option-text">{t('dark')}</span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="preference-switcher-trigger"
        onClick={() => setExpanded(open => !open)}
        aria-expanded={expanded}
        aria-label={t('preferencesTitle')}
      >
        <span className="preference-switcher-trigger-orbit" />
        <span className="preference-switcher-trigger-core">
          {getThemePreviewIcon(themeMode)}
        </span>
        <span className="preference-switcher-trigger-badge">
          <GlobalOutlined />
          {currentLanguageLabel}
        </span>
        <span className="preference-switcher-trigger-corner">
          <SettingFilled />
        </span>
      </button>
    </div>
  );
};

export default PreferenceSwitcher;
