import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Language = 'zh-CN' | 'en-US';
type ThemeMode = 'system' | 'light' | 'dark';

type TranslationMap = Record<string, string>;

const LANGUAGE_KEY = 'app_language';
const THEME_KEY = 'app_theme';

const translations: Record<Language, TranslationMap> = {
  'zh-CN': {
    home: '首页',
    plans: '套餐',
    orders: '我的订单',
    profile: '个人中心',
    admin: '管理后台',
    login: '登录',
    register: '注册',
    logout: '退出',
    support: '联系我们',
    account: '账号',
    theme: '主题',
    language: '语言',
    preferencesTitle: '界面偏好',
    preferencesHint: '切换语言与主题',
    loginSubtitle: '支付、工单与邀请返利一体化的 AI 订阅服务',
    system: '跟随系统',
    light: '浅色',
    dark: '深色',
    buyNow: '立即订阅',
    refresh: '刷新',
    save: '保存',
    close: '关闭',
    submit: '提交',
    loading: '加载中...',
    orderDetail: '订单详情',
    ticketCenter: '工单中心',
    inviteRewards: '邀请返利',
    subscription: '订阅',
    security: '安全设置',
    systemOps: '安全与运维',
  },
  'en-US': {
    home: 'Home',
    plans: 'Plans',
    orders: 'Orders',
    profile: 'Profile',
    admin: 'Admin',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    support: 'Support',
    account: 'Account',
    theme: 'Theme',
    language: 'Language',
    preferencesTitle: 'Preferences',
    preferencesHint: 'Language and theme',
    loginSubtitle: 'AI subscriptions with payments, support, and referral rewards',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    buyNow: 'Subscribe',
    refresh: 'Refresh',
    save: 'Save',
    close: 'Close',
    submit: 'Submit',
    loading: 'Loading...',
    orderDetail: 'Order Detail',
    ticketCenter: 'Support Tickets',
    inviteRewards: 'Referral Rewards',
    subscription: 'Subscription',
    security: 'Security',
    systemOps: 'Security & Ops',
  },
};

interface AppPreferencesValue {
  language: Language;
  themeMode: ThemeMode;
  isDark: boolean;
  antdLocale: typeof zhCN;
  setLanguage: (language: Language) => void;
  setThemeMode: (theme: ThemeMode) => void;
  t: (key: string) => string;
}

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

/**
 * 读取浏览器首选语言，并在不支持时回退到中文。
 */
function getInitialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY) as Language | null;
  if (stored === 'zh-CN' || stored === 'en-US') {
    return stored;
  }
  return navigator.language.startsWith('en') ? 'en-US' : 'zh-CN';
}

/**
 * 读取用户主题设置，并在不存在时跟随系统。
 */
function getInitialThemeMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export const AppPreferencesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialThemeMode);
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [themeMode, isDark]);

  const value = useMemo<AppPreferencesValue>(
    () => ({
      language,
      themeMode,
      isDark,
      antdLocale: language === 'en-US' ? (enUS as typeof zhCN) : zhCN,
      setLanguage: setLanguageState,
      setThemeMode: setThemeModeState,
      t: (key: string) => translations[language][key] || translations['zh-CN'][key] || key,
    }),
    [isDark, language, themeMode],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
};

/**
 * 读取应用级语言与主题偏好。
 */
export function useAppPreferences(): AppPreferencesValue {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return context;
}
