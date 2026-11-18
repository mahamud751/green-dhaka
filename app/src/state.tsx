import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, track } from './api';
import type {
  Address,
  Area,
  Category,
  Config,
  Draft,
  Language,
  Rate,
  Route,
  User,
} from './types';
import type { Asset } from 'react-native-image-picker';
type State = {
  ready: boolean;
  user: User | null;
  lang: Language;
  t: (en: string, bn: string) => string;
  setLang: (l: Language) => void;
  config: Config | null;
  areas: Area[];
  categories: Category[];
  rates: Rate[];
  addresses: Address[];
  address: Address | undefined;
  areaId: string;
  setAreaId: (s: string) => void;
  setAddressId: (s: string) => void;
  offline: boolean;
  route: Route;
  tab: string;
  go: (name: string, id?: string, param?: string) => void;
  back: () => void;
  switchTab: (tab: string) => void;
  refresh: () => Promise<void>;
  refreshUser: () => Promise<void>;
  draft: Draft[];
  setDraft: React.Dispatch<React.SetStateAction<Draft[]>>;
  photos: Asset[];
  setPhotos: React.Dispatch<React.SetStateAction<Asset[]>>;
  busy: boolean;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  logout: () => Promise<void>;
};
const Context = createContext<State>(null!);
export const useApp = () => useContext(Context);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [user, setUser] = useState<User | null>(null),
    [lang, setLanguage] = useState<Language>('en');
  const [config, setConfig] = useState<Config | null>(null),
    [areas, setAreas] = useState<Area[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [rates, setRates] = useState<Rate[]>([]),
    [addresses, setAddresses] = useState<Address[]>([]);
  const [areaId, setArea] = useState('dhanmondi'),
    [addressId, setAddressId] = useState(''),
    [offline, setOffline] = useState(false),
    [stack, setStack] = useState<Route[]>([{ name: 'home' }]),
    [tab, setTab] = useState('home'),
    [draft, setDraft] = useState<Draft[]>([]),
    [photos, setPhotos] = useState<Asset[]>([]),
    [busy, setBusy] = useState(false);
  const t = useCallback(
    (en: string, bn: string) => (lang === 'bn' ? bn : en),
    [lang],
  );
  const refreshUser = useCallback(async () => {
    if (!api.token) {
      setUser(null);
      setAddresses([]);
      return;
    }
    const u = await api.request<User>('/me');
    setUser(u);
    setLanguage(u.language);
    const a = await api.request<Address[]>('/addresses');
    setAddresses(a);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const [c, a, cat, r] = await Promise.all([
        api.request<Config>('/config'),
        api.request<Area[]>('/areas'),
        api.request<Category[]>('/categories'),
        api.request<Rate[]>('/rates?area=' + areaId),
      ]);
      setConfig(c);
      setAreas(a);
      setCategories(cat);
      setRates(r);
      setOffline(false);
      await AsyncStorage.setItem(
        'gd-catalogue-' + areaId,
        JSON.stringify({ c, a, cat, r, cachedAt: new Date().toISOString() }),
      );
    } catch (e) {
      const cached = await AsyncStorage.getItem('gd-catalogue-' + areaId);
      if (cached) {
        const { c, a, cat, r } = JSON.parse(cached);
        setConfig(c);
        setAreas(a);
        setCategories(cat);
        setRates(r);
      }
      setOffline(true);
      throw e;
    }
  }, [areaId]);
  const initialRefresh = useRef(refresh);
  useEffect(() => {
    void (async () => {
      try {
        await api.init();
        const saved = await AsyncStorage.getItem('gd-language');
        if (saved === 'bn') setLanguage('bn');
        await Promise.allSettled([initialRefresh.current(), refreshUser()]);
        track('app_open');
      } finally {
        setReady(true);
      }
    })();
  }, [refreshUser]);
  useEffect(() => {
    if (!ready) return;
    void refresh().catch(() => {});
    const timer = setInterval(() => void refresh().catch(() => {}), 45000);
    return () => clearInterval(timer);
  }, [areaId, ready, refresh]);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        Alert.alert(
          t('Something needs attention', 'একটু খেয়াল করুন'),
          (e as Error).message,
        );
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [t],
  );
  const go = useCallback(
    (name: string, id?: string, param?: string) =>
      setStack(s => [...s, { name, id, param }]),
    [],
  );
  const back = useCallback(
    () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );
  const switchTab = useCallback((name: string) => {
    setTab(name);
    setStack([{ name }]);
  }, []);
  const setAreaId = (id: string) => {
    setArea(id);
    setAddressId('');
  };
  const address =
    addresses.find(a => a.id === addressId) ||
    addresses.find(a => a.areaId === areaId);
  const setLang = (l: Language) => {
    setLanguage(l);
    void AsyncStorage.setItem('gd-language', l);
  };
  const logout = async () => {
    await api.session('');
    setUser(null);
    setAddresses([]);
    setDraft([]);
    switchTab('home');
  };
  return (
    <Context.Provider
      value={{
        ready,
        user,
        lang,
        t,
        setLang,
        config,
        areas,
        categories,
        rates,
        addresses,
        address,
        areaId,
        setAreaId,
        setAddressId,
        offline,
        route: stack[stack.length - 1],
        tab,
        go,
        back,
        switchTab,
        refresh,
        refreshUser,
        draft,
        setDraft,
        photos,
        setPhotos,
        busy,
        run,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
