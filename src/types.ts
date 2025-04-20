import { Language } from "./preferencePopup/languages";

export type ViewPopupEvent = {
  preferredLanguage: Language;
  host: string;
  isHidden: boolean;
  theme: 'dark' | 'light';
};

interface AnalyticsEvent {
  event: 'popup' | 'install' | 'uninstall';
  site?: string;
  meta?: object;
  os_name?: string;
  os_version?: string;
  session_id?: string;
}
