import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp } from '../state';
import { api, APP_VERSION, deviceId, money, track } from '../api';
import {
  Button,
  C,
  Empty,
  Field,
  PageTitle,
  Skeleton,
  s,
  Screen,
  Txt,
} from '../components/ui';
import { HeroArt, Icon } from '../components/Icon';
import type { Address, User } from '../types';
export function Auth() {
  const a = useApp(),
    { t } = a;
  const [phone, setPhone] = useState(''),
    [code, setCode] = useState(''),
    [sent, setSent] = useState(false),
    [cooldown, setCooldown] = useState(0),
    [referral, setReferral] = useState(''),
    [isDev, setDev] = useState(false);
  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown(v => v - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  const request = () =>
    void a.run(async () => {
      const result = await api.request('/auth/otp', 'POST', {
        phone: '+880' + phone.replace(/^0/, ''),
      });
      setDev(result.development);
      setSent(true);
      setCooldown(30);
    });
  const verify = () =>
    void a.run(async () => {
      const result = await api.request<{ token: string; user: User }>(
        '/auth/verify',
        'POST',
        {
          phone: '+880' + phone.replace(/^0/, ''),
          code,
          deviceId: await deviceId(),
          ...(referral ? { referralCode: referral } : {}),
        },
      );
      await api.session(result.token);
      await a.refreshUser();
      if (result.user.role === 'PARTNER') a.switchTab('partner');
      else a.back();
    });
  return (
    <Screen
      title={t('Welcome to Green Dhaka', 'গ্রিন ঢাকায় স্বাগতম')}
      footer={
        <Button
          title={
            sent
              ? t('Verify & get started', 'যাচাই করে শুরু করুন')
              : t('Send verification code', 'যাচাইকরণ কোড পাঠান')
          }
          disabled={sent ? code.length !== 6 : !/^0?1[3-9]\d{8}$/.test(phone)}
          loading={a.busy}
          onPress={sent ? verify : request}
          icon="arrow"
        />
      }
    >
      <View
        style={{
          backgroundColor: C.forest,
          borderRadius: 24,
          alignItems: 'center',
          padding: 12,
        }}
      >
        <HeroArt />
      </View>
      <View>
        <Txt style={s.step}>
          {t('A GREENER DHAKA STARTS WITH YOU', 'সবুজ ঢাকা শুরু আপনার হাত ধরে')}
        </Txt>
        <Text style={[s.title, { marginTop: 12 }]}>
          {sent
            ? t(
                'A little check.\nThen you’re in.',
                'ছোট্ট যাচাই।\nতারপরই শুরু।',
              )
            : t(
                'Good for your home.\nBetter for our city.',
                'আপনার ঘরের জন্য ভালো।\nআমাদের শহরের জন্য আরও ভালো।',
              )}
        </Text>
        <Txt style={{ marginTop: 12 }}>
          {sent
            ? t(
                `Enter the 6-digit code sent to +880${phone.replace(
                  /^0/,
                  '',
                )}.`,
                `+880${phone.replace(
                  /^0/,
                  '',
                )} নম্বরে পাঠানো ৬ সংখ্যার কোড দিন।`,
              )
            : t(
                'Sign in with your Bangladesh mobile number to book your first pickup.',
                'প্রথম পিকআপ বুক করতে আপনার বাংলাদেশি মোবাইল নম্বর দিয়ে প্রবেশ করুন।',
              )}
        </Txt>
      </View>
      {!sent ? (
        <>
          <View style={[s.row, { alignItems: 'flex-end' }]}>
            <View style={[s.input, { justifyContent: 'center' }]}>
              <Text style={s.h3}>+880</Text>
            </View>
            <View style={s.grow}>
              <Field
                label={t('Mobile number', 'মোবাইল নম্বর')}
                placeholder="1712345678"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
          </View>
          <Field
            label={t(
              'Have a referral code? (optional)',
              'রেফারেল কোড আছে? (ঐচ্ছিক)',
            )}
            value={referral}
            onChangeText={setReferral}
            autoCapitalize="characters"
            placeholder="GD…"
          />
        </>
      ) : (
        <>
          <Field
            label={t('Verification code', 'যাচাইকরণ কোড')}
            value={code}
            onChangeText={v => setCode(v.replace(/\D/g, ''))}
            maxLength={6}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            style={{ fontSize: 28, letterSpacing: 12, textAlign: 'center' }}
          />
          {isDev && (
            <View style={s.notice}>
              <Txt style={s.noticeText}>
                {t(
                  'Local development: use the DEV_OTP from backend/.env (default 123456). No SMS is sent.',
                  'স্থানীয় পরীক্ষায় backend/.env-এর DEV_OTP দিন (ডিফল্ট 123456)। SMS পাঠানো হয় না।',
                )}
              </Txt>
            </View>
          )}
          <Button
            title={
              cooldown
                ? t(
                    `Resend in ${cooldown}s`,
                    `${cooldown} সেকেন্ড পরে আবার পাঠান`,
                  )
                : t('Resend code', 'আবার কোড পাঠান')
            }
            variant="ghost"
            disabled={cooldown > 0}
            onPress={request}
          />
          <Button
            title={t('Change phone number', 'মোবাইল নম্বর পরিবর্তন')}
            variant="ghost"
            onPress={() => {
              setSent(false);
              setCode('');
            }}
          />
        </>
      )}
      {__DEV__ && (
        <Pressable onPress={() => a.go('settings')}>
          <Txt
            style={[
              s.small,
              { textAlign: 'center', textDecorationLine: 'underline' },
            ]}
          >
            {t('Connection settings', 'সংযোগ সেটিংস')}
          </Txt>
        </Pressable>
      )}
    </Screen>
  );
}
export function Profile() {
  const a = useApp(),
    { t } = a;
  const [name, setName] = useState(a.user?.name || ''),
    [editing, setEditing] = useState(false);
  const Row = ({
    icon,
    title,
    sub,
    onPress,
    last,
  }: {
    icon: string;
    title: string;
    sub?: string;
    onPress: () => void;
    last?: boolean;
  }) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        pf.row,
        !last && pf.rowLine,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={pf.rowIcon}>
        <Icon name={icon} color={C.green} size={20} />
      </View>
      <View style={s.grow}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>
          {title}
        </Text>
        {!!sub && <Txt style={{ fontSize: 12, lineHeight: 16 }}>{sub}</Txt>}
      </View>
      <Icon name="chevron" color="#9AA59F" size={18} />
    </Pressable>
  );
  return (
    <Screen header={<PageTitle title={t('Profile', 'প্রোফাইল')} />}>
      {!a.user ? (
        <Empty
          icon="user"
          title={t('Hello, neighbour.', 'হ্যালো, প্রতিবেশী।')}
          body={t(
            'Sign in to manage your pickups, addresses and credits.',
            'পিকআপ, ঠিকানা ও ক্রেডিট পরিচালনা করতে প্রবেশ করুন।',
          )}
          action={
            <Button
              title={t('Sign in', 'প্রবেশ করুন')}
              onPress={() => a.go('auth')}
            />
          }
        />
      ) : (
        <>
          <View style={pf.hero}>
            <View style={pf.avatar}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: C.white }}>
                {a.user.name?.[0]?.toUpperCase() || 'G'}
              </Text>
            </View>
            <View style={[s.grow, { gap: 3 }]}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.white }}>
                {a.user.name || t('Green neighbour', 'সবুজ প্রতিবেশী')}
              </Text>
              <Text style={{ fontSize: 14, color: '#CFE9DC' }}>
                {a.user.phone}
              </Text>
              <View style={pf.rolePill}>
                <Text
                  style={{ fontSize: 11, fontWeight: '700', color: C.forest }}
                >
                  {a.user.role === 'PARTNER'
                    ? t('Verified partner', 'পার্টনার')
                    : a.user.role === 'ADMIN'
                    ? t('Admin', 'অ্যাডমিন')
                    : t('Seller', 'বিক্রেতা')}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Edit name', 'নাম বদলান')}
              onPress={() => setEditing(v => !v)}
              style={pf.edit}
            >
              <Text
                style={{ fontSize: 13, fontWeight: '700', color: C.forest }}
              >
                {editing ? t('Close', 'বন্ধ') : t('Edit', 'এডিট')}
              </Text>
            </Pressable>
          </View>
          {editing && (
            <View style={s.card}>
              <Field
                label={t('Your name', 'আপনার নাম')}
                value={name}
                onChangeText={setName}
                maxLength={80}
              />
              <Button
                title={t('Save profile', 'প্রোফাইল সেভ করুন')}
                loading={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    await api.request('/me', 'PUT', { name, language: a.lang });
                    await a.refreshUser();
                    setEditing(false);
                  })
                }
              />
            </View>
          )}
          <Text style={pf.section}>{t('ACCOUNT', 'অ্যাকাউন্ট')}</Text>
          <View style={pf.group}>
            <Row
              icon="pin"
              title={t('Saved addresses', 'সংরক্ষিত ঠিকানা')}
              sub={
                a.addresses.length
                  ? t(
                      `${a.addresses.length} saved`,
                      `${a.addresses.length}টি সংরক্ষিত`,
                    )
                  : t('Add your pickup address', 'পিকআপ ঠিকানা যোগ করুন')
              }
              onPress={() => a.go('addresses')}
            />
            <Row
              icon="gift"
              title={t('Refer & Earn', 'রেফার করে আয়')}
              sub={t('Both get pickup credit', 'দুজনেই পিকআপ ক্রেডিট পান')}
              onPress={() => a.switchTab('credit')}
            />
            <Row
              icon="bell"
              title={t('Notifications', 'বিজ্ঞপ্তি')}
              onPress={() => a.go('notifications')}
              last
            />
          </View>
          {a.user.role === 'SELLER' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => a.go('onboarding')}
              style={({ pressed }) => [
                pf.partner,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={pf.partnerIcon}>
                <Icon name="truck" color={C.forest} size={24} />
              </View>
              <View style={s.grow}>
                <Text
                  style={{ fontSize: 16, fontWeight: '800', color: C.white }}
                >
                  {t('Become a pickup partner', 'পিকআপ পার্টনার হোন')}
                </Text>
                <Text style={{ fontSize: 13, color: '#CFE9DC', marginTop: 2 }}>
                  {t(
                    'Help your city. Grow your business.',
                    'শহরকে সাহায্য করুন। ব্যবসা বাড়ান।',
                  )}
                </Text>
              </View>
              <Icon name="arrow" color={C.white} size={20} />
            </Pressable>
          )}
          {a.user.role === 'PARTNER' && (
            <Button
              title={t('Open partner workspace', 'পার্টনারের কাজ দেখুন')}
              onPress={() => a.switchTab('partner')}
              icon="navigation"
            />
          )}
          {a.user.role === 'ADMIN' && (
            <Button
              title={t('Open admin web panel', 'অ্যাডমিন ওয়েব প্যানেল')}
              onPress={() =>
                void Linking.openURL(api.baseUrl + '/admin-panel/')
              }
              icon="settings"
            />
          )}
        </>
      )}
      <Text style={pf.section}>{t('PREFERENCES', 'পছন্দ')}</Text>
      <View style={pf.group}>
        <View style={[pf.row, pf.rowLine]}>
          <View style={pf.rowIcon}>
            <Icon name="globe" color={C.green} size={20} />
          </View>
          <Text
            style={[s.grow, { fontSize: 15, fontWeight: '600', color: C.ink }]}
          >
            {t('Language', 'ভাষা')}
          </Text>
          <View style={pf.langSwitch}>
            {(['en', 'bn'] as const).map(lang => (
              <Pressable
                key={lang}
                accessibilityRole="button"
                accessibilityState={{ selected: a.lang === lang }}
                onPress={() => a.setLang(lang)}
                style={[
                  pf.lang,
                  a.lang === lang && { backgroundColor: C.green },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: a.lang === lang ? C.white : '#5E6B65',
                  }}
                >
                  {lang === 'en' ? 'EN' : 'বাংলা'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Row
          icon="support"
          title={t('Help & Support', 'সহায়তা')}
          sub={t('Call or WhatsApp our team', 'কল বা হোয়াটসঅ্যাপ করুন')}
          onPress={() => a.go('support')}
          last={!__DEV__}
        />
        {__DEV__ && (
          <Row
            icon="settings"
            title={t('Connection settings', 'সংযোগ সেটিংস')}
            sub={t('Developer build only', 'শুধু ডেভেলপার বিল্ডে')}
            onPress={() => a.go('settings')}
            last
          />
        )}
      </View>
      {a.user && (
        <View style={pf.group}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void a.run(a.logout)}
            style={[pf.row, pf.rowLine]}
          >
            <View style={[pf.rowIcon, { backgroundColor: '#FCECE9' }]}>
              <Icon name="logout" color={C.red} size={20} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.red }}>
              {t('Sign out', 'বের হয়ে যান')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={pf.row}
            onPress={() =>
              Alert.alert(
                t('Delete your account?', 'অ্যাকাউন্ট মুছবেন?'),
                t(
                  'Your profile and saved addresses will be removed. Transaction records are retained for accounting.',
                  'প্রোফাইল ও ঠিকানা মুছে যাবে। হিসাবের জন্য লেনদেনের রেকর্ড থাকবে।',
                ),
                [
                  { text: t('Keep account', 'রাখুন'), style: 'cancel' },
                  {
                    text: t('Delete', 'মুছুন'),
                    style: 'destructive',
                    onPress: () =>
                      void a.run(async () => {
                        await api.request('/me', 'DELETE');
                        await a.logout();
                      }),
                  },
                ],
              )
            }
          >
            <View style={[pf.rowIcon, { backgroundColor: 'transparent' }]}>
              <Icon name="close" color="#9AA59F" size={18} />
            </View>
            <Txt style={{ fontSize: 14 }}>
              {t('Delete my account', 'আমার অ্যাকাউন্ট মুছুন')}
            </Txt>
          </Pressable>
        </View>
      )}
      <Txt style={{ fontSize: 11, textAlign: 'center' }}>
        Green Dhaka · v{APP_VERSION} ·{' '}
        {t('Made for our city', 'আমাদের শহরের জন্য')}
      </Txt>
    </Screen>
  );
}
export function Settings() {
  const a = useApp(),
    { t } = a;
  const [url, setUrl] = useState(api.baseUrl);
  return (
    <Screen title={t('Connection settings', 'সংযোগ সেটিংস')}>
      <View style={s.card}>
        <Text style={s.h2}>
          {t('Connect your local backend', 'স্থানীয় ব্যাকএন্ড সংযোগ')}
        </Text>
        <Txt>
          {t(
            'Android emulator: http://10.0.2.2:3000. iOS simulator: http://localhost:3000. Physical device: use your computer’s LAN IP on the same Wi-Fi.',
            'অ্যান্ড্রয়েড এমুলেটর: http://10.0.2.2:3000। iOS সিমুলেটর: http://localhost:3000। ফোনে একই Wi-Fi-তে কম্পিউটারের LAN IP দিন।',
          )}
        </Txt>
        <Field
          label="API URL"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Button
          title={t('Save & test connection', 'সেভ করে সংযোগ যাচাই')}
          loading={a.busy}
          onPress={() =>
            void a.run(async () => {
              const changed = api.baseUrl !== url.replace(/\/+$/, '');
              await api.setUrl(url);
              if (changed) await a.logout();
              await api.request('/health');
              await a.refresh();
              Alert.alert(
                t('Connected', 'সংযুক্ত'),
                t(
                  'PostgreSQL and API are ready.',
                  'PostgreSQL এবং API প্রস্তুত।',
                ),
              );
            })
          }
        />
      </View>
    </Screen>
  );
}
export function Addresses() {
  const a = useApp(),
    { t } = a;
  return (
    <Screen
      title={t('Your pickup addresses', 'আপনার পিকআপ ঠিকানা')}
      footer={
        <Button
          title={t('Add a new address', 'নতুন ঠিকানা যোগ করুন')}
          icon="plus"
          onPress={() => a.go('newAddress')}
        />
      }
    >
      <Txt>
        {t(
          'A familiar landmark helps your partner find you faster.',
          'পরিচিত একটি ল্যান্ডমার্ক পার্টনারকে দ্রুত পৌঁছাতে সাহায্য করে।',
        )}
      </Txt>
      {a.addresses.map(address => (
        <View
          key={address.id}
          style={[
            s.card,
            { borderColor: a.address?.id === address.id ? C.green : C.line },
          ]}
        >
          <Pressable
            onPress={() => {
              a.setAreaId(address.areaId);
              a.setAddressId(address.id);
              a.back();
            }}
            style={s.row}
          >
            <View style={s.iconCircle}>
              <Icon name="pin" color={C.green} />
            </View>
            <View style={s.grow}>
              <Text style={s.h3}>{address.label}</Text>
              <Txt style={s.small}>{address.line1}</Txt>
              <Txt style={s.small}>
                {address.area.name} · {address.landmark}
              </Txt>
            </View>
            <Icon
              name={a.address?.id === address.id ? 'check' : 'chevron'}
              color={C.green}
            />
          </Pressable>
          <View style={s.between}>
            <Button
              title={t('Edit', 'সম্পাদনা')}
              variant="ghost"
              onPress={() => a.go('newAddress', address.id)}
            />
            <Button
              title={t('Remove', 'সরান')}
              variant="danger"
              onPress={() =>
                void a.run(async () => {
                  await api.request('/addresses/' + address.id, 'DELETE');
                  await a.refreshUser();
                })
              }
            />
          </View>
        </View>
      ))}
      {!a.addresses.length && (
        <Empty
          icon="pin"
          title={t('Where’s home?', 'আপনার ঠিকানা কোথায়?')}
          body={t(
            'Save your first address to make booking a breeze.',
            'সহজে বুকিং করতে প্রথম ঠিকানা সেভ করুন।',
          )}
        />
      )}
      <Button
        title={t(
          'Outside our areas? Join the waitlist',
          'এলাকার বাইরে? অপেক্ষার তালিকায় যোগ দিন',
        )}
        variant="ghost"
        onPress={() => a.go('waitlist')}
      />
    </Screen>
  );
}
export function NewAddress() {
  const a = useApp(),
    { t } = a;
  const old = a.addresses.find(x => x.id === a.route.id);
  const [area, setArea] = useState(old?.areaId || a.areaId),
    [line, setLine] = useState(old?.line1 || ''),
    [label, setLabel] = useState(old?.label || 'Home'),
    [landmark, setLandmark] = useState(old?.landmark || ''),
    [lat, setLat] = useState(
      String(old?.lat || a.areas.find(x => x.id === area)?.lat || ''),
    ),
    [lng, setLng] = useState(
      String(old?.lng || a.areas.find(x => x.id === area)?.lng || ''),
    );
  return (
    <Screen
      title={
        old
          ? t('Edit address', 'ঠিকানা সম্পাদনা')
          : t('A place to pick up', 'পিকআপের ঠিকানা')
      }
      footer={
        <Button
          title={t('Save pickup address', 'পিকআপ ঠিকানা সেভ')}
          loading={a.busy}
          disabled={line.length < 5 || !lat || !lng}
          onPress={() =>
            void a.run(async () => {
              const address = await api.request<Address>(
                old ? '/addresses/' + old.id : '/addresses',
                old ? 'PUT' : 'POST',
                {
                  areaId: area,
                  label,
                  line1: line,
                  landmark,
                  lat: Number(lat),
                  lng: Number(lng),
                },
              );
              track('address_set', { area });
              await a.refreshUser();
              a.setAreaId(area);
              a.setAddressId(address.id);
              a.back();
            })
          }
        />
      }
    >
      <View style={s.card}>
        <Text style={s.h3}>{t('Your neighbourhood', 'আপনার এলাকা')}</Text>
        <View style={s.wrap}>
          {a.areas.map(x => (
            <Pressable
              key={x.id}
              onPress={() => {
                setArea(x.id);
                setLat(String(x.lat));
                setLng(String(x.lng));
              }}
              style={[
                s.pill,
                { backgroundColor: area === x.id ? C.green : C.bg },
              ]}
            >
              <Text
                style={[
                  s.pillText,
                  { color: area === x.id ? C.white : C.muted },
                ]}
              >
                {a.lang === 'bn' ? x.nameBn : x.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field
        label={t('Address label', 'ঠিকানার নাম')}
        value={label}
        onChangeText={setLabel}
        placeholder={t('Home, office, shop…', 'বাসা, অফিস, দোকান…')}
      />
      <Field
        label={t('House, road & floor', 'বাড়ি, রাস্তা ও তলা')}
        value={line}
        onChangeText={setLine}
        placeholder={t(
          'House 12, Road 7, 3rd floor',
          'বাড়ি ১২, রোড ৭, ৩য় তলা',
        )}
        multiline
      />
      <Field
        label={t('Nearby landmark', 'নিকটবর্তী ল্যান্ডমার্ক')}
        value={landmark}
        onChangeText={setLandmark}
        placeholder={t(
          'Opposite the lake entrance',
          'লেকের প্রবেশপথের বিপরীতে',
        )}
      />
      <View style={s.card}>
        <View style={s.row}>
          <Icon name="pin" color={C.green} />
          <Text style={s.h3}>
            {t('Your exact map coordinates', 'আপনার সঠিক মানচিত্র স্থানাঙ্ক')}
          </Text>
        </View>
        <Txt style={s.small}>
          {t(
            'The area centre is prefilled. Replace it with your actual latitude and longitude from your map app. Locations outside service zones are rejected.',
            'এলাকার কেন্দ্র দেওয়া আছে। মানচিত্র অ্যাপ থেকে আপনার সঠিক অক্ষাংশ ও দ্রাঘিমাংশ দিন। সেবার বাইরের অবস্থান গ্রহণ করা হবে না।',
          )}
        </Txt>
        <View style={s.row}>
          <View style={s.grow}>
            <Field
              label={t('Latitude', 'অক্ষাংশ')}
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.grow}>
            <Field
              label={t('Longitude', 'দ্রাঘিমাংশ')}
              value={lng}
              onChangeText={setLng}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
export function Waitlist() {
  const a = useApp(),
    { t } = a;
  const [area, setArea] = useState(''),
    [joined, setJoined] = useState(false);
  return (
    <Screen
      title={t(
        'Growing, one neighbourhood at a time',
        'একটি করে এলাকায় বাড়ছে আমাদের সেবা',
      )}
    >
      <Empty
        icon="pin"
        title={
          joined
            ? t('You’re on the list!', 'আপনার নাম তালিকায় আছে!')
            : t('Coming closer to you.', 'আপনার আরও কাছে আসছি।')
        }
        body={t(
          'We currently serve Gulshan/Banani, Dhanmondi and Mirpur. Leave your area to help us plan where to go next.',
          'আমরা এখন গুলশান/বনানী, ধানমন্ডি ও মিরপুরে সেবা দিচ্ছি। পরবর্তী এলাকা বাছাইয়ে আপনার এলাকার নাম দিন।',
        )}
      />
      {!joined && (
        <>
          <Field
            label={t('Your area', 'আপনার এলাকা')}
            value={area}
            onChangeText={setArea}
          />
          <Button
            title={t('Join the waitlist', 'অপেক্ষার তালিকায় যোগ দিন')}
            disabled={area.length < 2}
            loading={a.busy}
            onPress={() =>
              void a.run(async () => {
                await api.request('/waitlist', 'POST', { area });
                setJoined(true);
              })
            }
          />
        </>
      )}
    </Screen>
  );
}
export function Credit() {
  const a = useApp(),
    { t, run, user } = a;
  const [data, setData] = useState<{ balance: number; history: any[] }>({
      balance: 0,
      history: [],
    }),
    [ref, setRef] = useState<{ code: string; amount: number } | null>(null),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (user)
      void run(async () => {
        try {
          const [c, r] = await Promise.all([
            api.request('/credit'),
            api.request('/referral'),
          ]);
          setData(c);
          setRef(r);
        } finally {
          setLoaded(true);
        }
      });
  }, [run, user]);
  if (!a.user)
    return (
      <Screen>
        <Empty
          icon="wallet"
          title={t(
            'A little credit goes a long way.',
            'অল্প ক্রেডিট, অনেক সুবিধা।',
          )}
          body={t(
            'Sign in to view your pickup credit and invite friends.',
            'পিকআপ ক্রেডিট দেখতে ও বন্ধুদের আমন্ত্রণ করতে প্রবেশ করুন।',
          )}
          action={
            <Button
              title={t('Sign in', 'প্রবেশ করুন')}
              onPress={() => a.go('auth')}
            />
          }
        />
      </Screen>
    );
  const invite = () =>
    void a.run(async () => {
      await Share.share({
        message: t(
          `Make room for a greener Dhaka! Use my Green Dhaka code ${
            ref?.code
          }. We both get ${money(
            ref?.amount || 50,
          )} pickup credit after your first completed pickup.`,
          `সবুজ ঢাকার জন্য হাত বাড়ান! গ্রিন ঢাকায় আমার কোড ${
            ref?.code
          } ব্যবহার করুন। আপনার প্রথম পিকআপ শেষে দুজনেই ${money(
            ref?.amount || 50,
          )} পিকআপ ক্রেডিট পাব।`,
        ),
      });
      track('referral_shared');
    });
  const reward = money(ref?.amount || a.config?.referralAmount || 50);
  return (
    <Screen
      header={
        <View
          style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 12 }}
        >
          <Text style={{ fontSize: 19, fontWeight: '700', color: C.ink }}>
            {t(`Refer & Earn ${reward}`, `রেফার করে আয় ${reward}`)}
          </Text>
        </View>
      }
      footer={
        <Button
          title={t('Share & Invite', 'শেয়ার ও আমন্ত্রণ')}
          icon="share"
          onPress={invite}
        />
      }
    >
      <View style={ref_.banner}>
        <View style={s.between}>
          <View style={{ flexShrink: 1 }}>
            <Text style={ref_.bannerTitle}>
              {t('Refer a friend &', 'বন্ধুকে রেফার করুন,')}
            </Text>
            <Text style={[ref_.bannerTitle, { color: '#8FE3B5' }]}>
              {t(`Both Get ${reward} Credit`, `দুজনেই পান ${reward}`)}
            </Text>
          </View>
          <View style={ref_.coin}>
            <Text style={{ color: C.white, fontSize: 24, fontWeight: '800' }}>
              {reward}
            </Text>
          </View>
        </View>
        <Text style={ref_.bannerBody}>
          {t(
            `You and your friend both earn ${reward} Pickup Credit after their first completed pickup.`,
            `বন্ধুর প্রথম পিকআপ সম্পন্ন হলে আপনি ও আপনার বন্ধু দুজনেই ${reward} পিকআপ ক্রেডিট পাবেন।`,
          )}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={invite}
          style={({ pressed }) => [
            ref_.bannerButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="share" color={C.forest} size={20} stroke={2.2} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.forest }}>
            {t('Share & Invite', 'শেয়ার ও আমন্ত্রণ')}
          </Text>
        </Pressable>
      </View>
      <View style={[s.card, s.row, { gap: 14, alignItems: 'flex-start' }]}>
        <View style={ref_.walletIcon}>
          <Icon name="wallet" color={C.green} size={24} />
        </View>
        <View style={s.grow}>
          <Txt style={{ fontSize: 14, color: '#4E5B55' }}>
            {t('Available Pickup Credit', 'উপলব্ধ পিকআপ ক্রেডিট')}
          </Txt>
          {loaded ? (
            <Text style={[s.money, { fontSize: 36, marginVertical: 2 }]}>
              {money(data.balance)}
            </Text>
          ) : (
            <ActivityIndicator
              color={C.green}
              style={{ alignSelf: 'flex-start', marginVertical: 12 }}
            />
          )}
          <Txt style={{ fontSize: 12 }}>
            {t(
              'Use this credit only toward pickup charges. It cannot be cashed out.',
              'এই ক্রেডিট শুধু পিকআপ ফি-তে ব্যবহারযোগ্য। নগদে তোলা যাবে না।',
            )}
          </Txt>
        </View>
      </View>
      <Text style={ref_.label}>{t('HOW IT WORKS', 'যেভাবে কাজ করে')}</Text>
      <View style={[s.row, { alignItems: 'flex-start', gap: 0 }]}>
        {[
          ['userplus', t('Invite\nFriend', 'বন্ধুকে\nআমন্ত্রণ')],
          ['orders', t('Friend’s First\nPickup', 'বন্ধুর প্রথম\nপিকআপ')],
          [
            'wallet',
            t(`Earn ${reward}\nPickup Credit`, `${reward}\nক্রেডিট পান`),
          ],
        ].map(([icon, label], n) => (
          <React.Fragment key={icon}>
            {n > 0 && (
              <View style={{ paddingTop: 24 }}>
                <Icon name="chevron" color="#9AA59F" size={18} />
              </View>
            )}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={ref_.stepIcon}>
                <Icon name={icon} color={C.green} size={26} />
                <View style={ref_.stepBadge}>
                  <Text
                    style={{ color: C.white, fontSize: 11, fontWeight: '800' }}
                  >
                    {n + 1}
                  </Text>
                </View>
              </View>
              <Text style={ref_.stepText}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink }}>
          {t('Your Referral Code', 'আপনার রেফারেল কোড')}
        </Text>
        <View style={ref_.codeBox}>
          <Text selectable style={ref_.code}>
            {ref?.code || (loaded ? '—' : '······')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Share referral code', 'রেফারেল কোড শেয়ার')}
            onPress={invite}
            style={ref_.codeButton}
          >
            <Icon name="copy" color={C.green} size={20} />
          </Pressable>
        </View>
      </View>
      <Text style={s.h3}>{t('Credit activity', 'ক্রেডিটের বিবরণ')}</Text>
      {data.history.length ? (
        data.history.map(x => (
          <View key={x.id} style={[s.card, s.between]}>
            <View style={s.grow}>
              <Text style={[s.h3, { fontSize: 13 }]}>{x.reason}</Text>
              <Txt style={s.small}>
                {new Date(x.createdAt).toLocaleDateString()}
              </Txt>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: x.amount > 0 ? C.green : C.muted,
              }}
            >
              {x.amount > 0 ? '+' : ''}
              {money(x.amount)}
            </Text>
          </View>
        ))
      ) : (
        <Txt>
          {t(
            'Your next good deed could start right here.',
            'পরবর্তী ভালো কাজের শুরু এখানেই।',
          )}
        </Txt>
      )}
    </Screen>
  );
}
export function Support() {
  const a = useApp(),
    { t } = a;
  return (
    <Screen
      title={t('A real person, ready to help.', 'সাহায্যের জন্য আছি আমরা।')}
    >
      <Empty
        icon="support"
        title={t('Let’s sort it out.', 'একসঙ্গে সমাধান করি।')}
        body={t(
          'Questions about a pickup, a price, or a partner? Reach the Green Dhaka team.',
          'পিকআপ, দর বা পার্টনার নিয়ে প্রশ্ন? গ্রিন ঢাকা টিমের সঙ্গে যোগাযোগ করুন।',
        )}
      />
      {a.config?.supportPhone ? (
        <Button
          title={t('Call support', 'সহায়তার জন্য ফোন')}
          icon="phone"
          onPress={() => void Linking.openURL('tel:' + a.config!.supportPhone)}
        />
      ) : (
        <View style={s.notice}>
          <Txt style={s.noticeText}>
            {t(
              'Support contact has not been configured yet. The administrator can set it in the admin panel.',
              'সহায়তার নম্বর এখনও যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে নম্বর যোগ করা যাবে।',
            )}
          </Txt>
        </View>
      )}
      {!!a.config?.supportWhatsapp && (
        <Button
          title="WhatsApp"
          icon="share"
          variant="secondary"
          onPress={() =>
            void Linking.openURL(
              'https://wa.me/' + a.config!.supportWhatsapp.replace(/\D/g, ''),
            )
          }
        />
      )}
      <View style={s.card}>
        <Text style={s.h3}>
          {t('A note on safe pickups', 'নিরাপদ পিকআপের কথা')}
        </Text>
        <Txt>
          {t(
            'Check your partner’s identity. Review the weighed amounts. Share your OTP only at your door, after checking your cash payout.',
            'পার্টনারের পরিচয় যাচাই করুন। ওজন ও মূল্য মিলিয়ে নিন। নগদ টাকা বুঝে পেয়ে শুধু দরজায় OTP দিন।',
          )}
        </Txt>
      </View>
    </Screen>
  );
}
export function Notifications() {
  const a = useApp(),
    { t, run } = a;
  const [items, setItems] = useState<any[]>([]),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void run(async () => {
      try {
        setItems(await api.request('/notifications'));
      } finally {
        setLoaded(true);
      }
    });
  }, [run]);
  return (
    <Screen title={t('Your green updates', 'আপনার নতুন খবর')}>
      {items.map(n => (
        <Pressable
          key={n.id}
          onPress={() =>
            n.orderId &&
            a.go(
              a.user?.role === 'PARTNER' ? 'partnerOrder' : 'track',
              n.orderId,
            )
          }
          style={[s.card, s.row]}
        >
          <View style={s.iconCircle}>
            <Icon name="bell" color={C.green} />
          </View>
          <View style={s.grow}>
            <Text style={s.h3}>{n.title}</Text>
            <Txt style={s.small}>{n.body}</Txt>
            <Txt style={{ fontSize: 10, marginTop: 4 }}>
              {new Date(n.createdAt).toLocaleString()}
            </Txt>
          </View>
        </Pressable>
      ))}
      {!loaded && <Skeleton rows={4} height={84} />}
      {loaded && !items.length && (
        <Empty
          icon="bell"
          title={t('All quiet for now.', 'এখন সব শান্ত।')}
          body={t(
            'Your pickup updates will arrive here.',
            'পিকআপের সব আপডেট এখানেই পাবেন।',
          )}
        />
      )}
    </Screen>
  );
}
const ref_ = StyleSheet.create({
  banner: {
    backgroundColor: C.forest,
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },
  bannerTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: C.white,
  },
  bannerBody: { fontSize: 14, lineHeight: 21, color: '#D5EDE0' },
  coin: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#2A7A5B',
    borderWidth: 2,
    borderColor: '#5FB08B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#8FE3B5',
    borderRadius: 14,
    minHeight: 52,
  },
  walletIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#5E6B65',
  },
  stepIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  stepText: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
    color: C.ink,
    fontWeight: '500',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#BFE3CC',
    backgroundColor: C.white,
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 12,
  },
  code: { fontSize: 28, fontWeight: '800', color: C.green, letterSpacing: 2 },
  codeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
const pf = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.forest,
    borderRadius: 22,
    padding: 18,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A7A5B',
    borderWidth: 2,
    borderColor: '#5FB08B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#8FE3B5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  edit: {
    backgroundColor: '#E8F6EE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#6F7D76',
    marginBottom: -10,
  },
  group: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  rowLine: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.green,
    borderRadius: 18,
    padding: 16,
  },
  partnerIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#8FE3B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: '#EEF1EF',
    borderRadius: 12,
    padding: 3,
  },
  lang: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
});
