import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/state';
import { C, s, Tabs } from './src/components/ui';
import { LogoMark } from './src/components/Icon';
import { Verification } from './src/screens/Verification';
import { Home } from './src/screens/Home';
import { Market } from './src/screens/Market';
import { Materials, Details, Schedule } from './src/screens/Booking';
import {
  Addresses,
  Auth,
  Credit,
  NewAddress,
  Notifications,
  Profile,
  Settings,
  Support,
  Waitlist,
} from './src/screens/Account';
import { Invoice, Orders, Track } from './src/screens/Orders';
import {
  Earnings,
  Onboarding,
  PartnerHome,
  PartnerOrder,
} from './src/screens/Partner';
const screens: Record<string, React.ComponentType> = {
  home: Home,
  market: Market,
  materials: Materials,
  details: Details,
  schedule: Schedule,
  auth: Auth,
  profile: Profile,
  settings: Settings,
  addresses: Addresses,
  newAddress: NewAddress,
  waitlist: Waitlist,
  credit: Credit,
  support: Support,
  notifications: Notifications,
  orders: Orders,
  track: Track,
  invoice: Invoice,
  onboarding: Onboarding,
  verification: Verification,
  partner: PartnerHome,
  partnerOrders: Orders,
  partnerOrder: PartnerOrder,
  earnings: Earnings,
};
function Router() {
  const a = useApp();
  const { back, route, tab, ready, user, switchTab } = a;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === tab) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [back, route.name, tab]);
  useEffect(() => {
    if (ready && user?.role === 'PARTNER' && route.name === 'home')
      switchTab('partner');
  }, [ready, user?.role, route.name, switchTab]);
  if (!a.ready)
    return (
      <View
        style={[s.page, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <LogoMark size={112} />
        <View
          style={{
            position: 'absolute',
            bottom: '30%',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>
            Green Dhaka
          </Text>
          <ActivityIndicator color={C.green} />
        </View>
      </View>
    );
  const ScreenComponent = screens[a.route.name] || Home;
  const topLevel = [
    'home',
    'market',
    'orders',
    'credit',
    'profile',
    'partner',
    'partnerOrders',
    'earnings',
  ].includes(a.route.name);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScreenComponent key={a.route.name + (a.route.id || '')} />
      </SafeAreaView>
      {topLevel ? (
        <Tabs />
      ) : (
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.white }} />
      )}
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Router />
      </AppProvider>
    </SafeAreaProvider>
  );
}
