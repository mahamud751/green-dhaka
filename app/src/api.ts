import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
/** Production API. Release builds always use it (HTTPS only). */
export const PRODUCTION_API_URL = 'https://greendhaka.crazysolve.com';
/** Local development server for debug builds. */
export const DEFAULT_API_URL = !__DEV__
  ? PRODUCTION_API_URL
  : Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';
export const APP_VERSION = '1.0.0';
let baseUrl = DEFAULT_API_URL;
let installId = '';
let token = '';
export const api = {
  get baseUrl() {
    return baseUrl;
  },
  get token() {
    return token;
  },
  async init() {
    // Release builds are pinned to production; only debug builds can point
    // at another server through Connection settings.
    baseUrl = __DEV__
      ? (await AsyncStorage.getItem('gd-api-url')) || DEFAULT_API_URL
      : PRODUCTION_API_URL;
    const saved = await Keychain.getGenericPassword({
      service: 'green-dhaka-session',
    });
    token = saved ? saved.password : '';
  },
  async setUrl(url: string) {
    if (!/^https?:\/\//.test(url))
      throw Error('Enter an http:// or https:// API URL');
    baseUrl = url.replace(/\/+$/, '');
    await AsyncStorage.setItem('gd-api-url', baseUrl);
  },
  async session(value: string) {
    token = value;
    if (value)
      await Keychain.setGenericPassword('session', value, {
        service: 'green-dhaka-session',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    else
      await Keychain.resetGenericPassword({ service: 'green-dhaka-session' });
  },
  async request<T = any>(
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(baseUrl + path, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        body:
          body === undefined
            ? undefined
            : body instanceof FormData
            ? body
            : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw Error(
        'Unable to reach Green Dhaka. Check your connection and API address in settings.',
      );
    } finally {
      clearTimeout(timer);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && path !== '/auth/verify')
        await api.session('');
      throw Error(
        Array.isArray(result.message)
          ? result.message.join('\n')
          : result.message || 'Request failed',
      );
    }
    return result as T;
  },
};
export type AnalyticsEvent =
  | 'app_open'
  | 'address_set'
  | 'rates_viewed'
  | 'category_selected'
  | 'weight_entered'
  | 'slot_selected'
  | 'booking_confirmed'
  | 'partner_assigned'
  | 'order_cancelled'
  | 'otp_verified'
  | 'order_completed'
  | 'invoice_viewed'
  | 'referral_shared'
  | 'rating_submitted';
/** Fire-and-forget product analytics (PRD section 12). Never blocks the UI. */
export function track(
  name: AnalyticsEvent,
  extra: { orderId?: string; area?: string } = {},
) {
  if (!token) return;
  api
    .request('/events', 'POST', { name, appVersion: APP_VERSION, ...extra })
    .catch(() => {});
}
/**
 * Random per-install identifier kept in the device keychain. Sent once at
 * sign-in so the server can block same-device referral rewards; the server
 * stores only a hash of it.
 */
export async function deviceId() {
  if (installId) return installId;
  const service = 'green-dhaka-device';
  try {
    const saved = await Keychain.getGenericPassword({ service });
    if (saved) return (installId = saved.password);
  } catch {}
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16);
  installId = Array.from({ length: 8 }, hex).join('') + Date.now().toString(16);
  try {
    await Keychain.setGenericPassword('device', installId, {
      service,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch {}
  return installId;
}
export function money(value: number) {
  return '৳' + Math.round(value).toLocaleString('en-BD');
}
export function date(value: string, lang = 'en') {
  return new Date(value).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
  });
}
export function time(value: string, lang = 'en') {
  return new Date(value).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
  });
}
export function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase());
}
