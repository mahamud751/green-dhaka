import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, date, money, statusLabel, time, track } from '../api';
import { launchImageLibrary } from 'react-native-image-picker';
import { useApp } from '../state';
import {
  Button,
  C,
  Empty,
  Field,
  Loader,
  PageTitle,
  Pill,
  s,
  Screen,
  Txt,
} from '../components/ui';
import { Icon, LogoMark, MaterialArt } from '../components/Icon';
import { useOrder } from './Orders';
export function Onboarding() {
  const a = useApp(),
    { t } = a;
  const [nid, setNid] = useState(''),
    [vehicle, setVehicle] = useState(''),
    [scale, setScale] = useState(''),
    [area, setArea] = useState(a.areaId);
  const zone = a.areas.find(x => x.id === area);
  return (
    <Screen
      title={t('A partner in a greener city.', 'সবুজ শহরের পার্টনার হোন।')}
      footer={
        <Button
          title={t('Submit for verification', 'যাচাইয়ের জন্য পাঠান')}
          loading={a.busy}
          disabled={nid.length < 5 || vehicle.length < 2 || scale.length < 3}
          onPress={() =>
            void a.run(async () => {
              await api.request('/partner/onboard', 'POST', {
                nidRef: nid,
                vehicle,
                scaleDetails: scale,
                areaId: area,
                lat: zone?.lat,
                lng: zone?.lng,
              });
              await a.refreshUser();
              a.go('verification');
            })
          }
        />
      }
    >
      <View style={s.card}>
        <Icon name="shield" color={C.green} size={32} />
        <Text style={s.h2}>
          {t('Trusted people. Fair pickups.', 'বিশ্বস্ত মানুষ। ন্যায্য পিকআপ।')}
        </Text>
        <Txt>
          {t(
            'Tell us about your business. Our team verifies identity, vehicle and scale before you receive any jobs.',
            'আপনার ব্যবসার তথ্য দিন। কাজ দেওয়ার আগে আমাদের টিম পরিচয়, যানবাহন ও স্কেল যাচাই করবে।',
          )}
        </Txt>
      </View>
      <Field
        label={t(
          'Private KYC / NID document reference',
          'ব্যক্তিগত KYC / NID নথির রেফারেন্স',
        )}
        value={nid}
        onChangeText={setNid}
        placeholder={t(
          'Reference from your verification appointment',
          'যাচাই সাক্ষাৎকারের রেফারেন্স',
        )}
      />
      <Txt style={s.small}>
        {t(
          'Ask support for a verification appointment and provide identity documents privately. Never upload NID images as pickup photos.',
          'সহায়তায় যাচাইয়ের সাক্ষাৎকার নিন এবং পরিচয়পত্র ব্যক্তিগতভাবে দিন। পিকআপ ছবিতে NID আপলোড করবেন না।',
        )}
      </Txt>
      <Field
        label={t('Vehicle', 'যানবাহন')}
        value={vehicle}
        onChangeText={setVehicle}
        placeholder={t('Cargo bicycle, van…', 'কার্গো সাইকেল, ভ্যান…')}
      />
      <Field
        label={t('Digital scale details', 'ডিজিটাল স্কেলের বিবরণ')}
        value={scale}
        onChangeText={setScale}
        placeholder={t(
          'Model, capacity, calibration…',
          'মডেল, ধারণক্ষমতা, ক্যালিব্রেশন…',
        )}
      />
      <Text style={s.h3}>{t('Your service area', 'আপনার সেবার এলাকা')}</Text>
      <View style={s.wrap}>
        {a.areas.map(x => (
          <Pressable
            key={x.id}
            style={[
              s.pill,
              { backgroundColor: area === x.id ? C.green : C.white },
            ]}
            onPress={() => setArea(x.id)}
          >
            <Text
              style={[s.pillText, { color: area === x.id ? C.white : C.green }]}
            >
              {a.lang === 'bn' ? x.nameBn : x.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
export function PartnerHome() {
  const a = useApp(),
    { t } = a;
  const [profile, setProfile] = useState<any>(null),
    [offers, setOffers] = useState<any[]>([]),
    [jobs, setJobs] = useState<any[]>([]),
    [now, setNow] = useState(Date.now()),
    [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [error, setError] = useState(''),
    [editLoc, setEditLoc] = useState(false);
  const load = async () => {
    try {
      const [p, o, j] = await Promise.all([
        api.request('/partner/me'),
        api.request('/partner/offers'),
        api.request('/partner/orders'),
      ]);
      setProfile(p);
      setOffers(o);
      setJobs(
        j.filter(
          (x: any) =>
            !['completed', 'cancelled', 'no_partner_found'].includes(x.status),
        ),
      );
      setLat(v => v || String(p.lat));
      setLng(v => v || String(p.lng));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 4000),
      clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
    };
  }, []);
  if (!a.user)
    return (
      <Screen>
        <Empty
          title={t('Partner sign in', 'পার্টনার প্রবেশ')}
          body={t(
            'Sign in with your verified partner phone number.',
            'যাচাইকৃত পার্টনার মোবাইল নম্বর দিয়ে প্রবেশ করুন।',
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
  if (!profile)
    return (
      <Screen>
        {error ? (
          <Empty
            icon="navigation"
            title={t('Couldn’t load your workspace', 'কাজের তথ্য লোড হয়নি')}
            body={error}
            action={
              <Button
                title={t('Try again', 'আবার চেষ্টা')}
                onPress={() => void load()}
              />
            }
          />
        ) : (
          <Loader
            label={t('Loading your workspace…', 'আপনার কাজের তথ্য আসছে…')}
          />
        )}
      </Screen>
    );
  const live = offers.filter(f => new Date(f.expiresAt).getTime() > now);
  const approved = profile.kycStatus === 'approved';
  const setOnline = (online: boolean) =>
    void a.run(async () => {
      await api.request('/partner/online', 'POST', {
        online,
        lat: Number(lat),
        lng: Number(lng),
      });
      await load();
    });
  return (
    <Screen>
      <View style={s.between}>
        <View style={{ gap: 2 }}>
          <View style={[s.row, { gap: 6 }]}>
            <LogoMark size={24} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.green }}>
              {t('Green Dhaka Partner', 'গ্রিন ঢাকা পার্টনার')}
            </Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink }}>
            {t('Hi', 'হ্যালো')},{' '}
            {a.user.name?.split(' ')[0] || t('partner', 'পার্টনার')} 👋
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Notifications', 'বিজ্ঞপ্তি')}
          onPress={() => a.go('notifications')}
          style={pt.round}
        >
          <Icon name="bell" color={C.green} size={21} />
        </Pressable>
      </View>
      <View style={[pt.status, !profile.online && pt.statusOff]}>
        <View style={s.between}>
          <View style={[s.row, { gap: 12, flexShrink: 1 }]}>
            <View
              style={[
                pt.statusDot,
                { backgroundColor: profile.online ? '#8FE3B5' : '#C9D1CC' },
              ]}
            />
            <View style={{ flexShrink: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: profile.online ? C.white : C.ink,
                }}
              >
                {profile.online
                  ? t('You’re Online', 'আপনি অনলাইনে')
                  : t('You’re Offline', 'আপনি অফলাইনে')}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: profile.online ? '#CFE9DC' : C.muted,
                }}
              >
                {profile.online
                  ? t(
                      'Receiving nearby pickup requests',
                      'কাছের পিকআপ অনুরোধ আসছে',
                    )
                  : approved
                  ? t('Go online to receive pickups', 'পিকআপ পেতে অনলাইনে যান')
                  : t(
                      'Waiting for admin approval',
                      'অ্যাডমিন অনুমোদনের অপেক্ষায়',
                    )}
              </Text>
            </View>
          </View>
          <Switch
            accessibilityLabel={t('Go online', 'অনলাইনে যান')}
            value={profile.online}
            disabled={!approved || a.busy}
            trackColor={{ false: '#D8DFD2', true: '#5FB08B' }}
            thumbColor={C.white}
            onValueChange={setOnline}
          />
        </View>
        <View
          style={[pt.stats, !profile.online && { backgroundColor: '#F2F5F3' }]}
        >
          {[
            [String(jobs.length), t('Active', 'চলমান')],
            [
              profile.rating ? '★ ' + profile.rating.toFixed(1) : '—',
              t('Rating', 'রেটিং'),
            ],
            [
              approved ? t('Verified', 'যাচাইকৃত') : t('Pending', 'অপেক্ষমাণ'),
              t('KYC', 'KYC'),
            ],
          ].map(([value, label], n) => (
            <View
              key={label}
              style={[
                pt.stat,
                n > 0 && {
                  borderLeftWidth: 1,
                  borderLeftColor: profile.online ? '#2A7A5B' : C.line,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '800',
                  color: profile.online ? C.white : C.ink,
                }}
              >
                {value}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: profile.online ? '#CFE9DC' : C.muted,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {!approved && (
        <View style={s.notice}>
          <Txt style={s.noticeText}>
            {t(
              'Your account needs admin approval before you can go online and receive pickups.',
              'পিকআপ পেতে অনলাইনে যাওয়ার আগে অ্যাডমিনের অনুমোদন প্রয়োজন।',
            )}
          </Txt>
          <Button
            title={t('Contact support', 'সহায়তায় যোগাযোগ')}
            variant="ghost"
            onPress={() => a.go('support')}
          />
        </View>
      )}
      {live.map(f => {
        const seconds = Math.max(
          0,
          Math.ceil((new Date(f.expiresAt).getTime() - now) / 1000),
        );
        return (
          <View key={f.id} style={pt.offer}>
            <View style={pt.offerHead}>
              <View style={[s.row, { gap: 8 }]}>
                <Icon name="bolt" color={C.white} size={18} />
                <Text
                  style={{ color: C.white, fontWeight: '800', fontSize: 15 }}
                >
                  {t('New pickup request', 'নতুন পিকআপ অনুরোধ')}
                </Text>
              </View>
              <View style={pt.timer}>
                <Text
                  style={{ color: '#A3560C', fontWeight: '800', fontSize: 14 }}
                >
                  {seconds}s
                </Text>
              </View>
            </View>
            <View style={pt.timerTrack}>
              <View
                style={[pt.timerFill, { width: `${(seconds / 20) * 100}%` }]}
              />
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={s.between}>
                <View style={[s.row, { gap: 8 }]}>
                  <Icon name="pin" color={C.green} size={18} />
                  <Text
                    style={{ fontSize: 16, fontWeight: '700', color: C.ink }}
                  >
                    {f.order.address.area.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: C.muted }}>
                  {f.order.slotStart
                    ? `${date(f.order.slotStart, a.lang)} · ${time(
                        f.order.slotStart,
                        a.lang,
                      )}`
                    : t('Instant pickup', 'এখনই পিকআপ')}
                </Text>
              </View>
              <View style={[s.wrap, { gap: 8 }]}>
                {f.order.items.map((i: any) => (
                  <View key={i.id} style={pt.chip}>
                    <Text style={{ fontSize: 13, color: '#3F4C46' }}>
                      {a.lang === 'bn' ? i.item.nameBn : i.item.name} •{' '}
                      {Number(i.estimatedQty)} {i.item.unit}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.between}>
                <Txt style={{ fontSize: 13 }}>
                  {t('Estimated scrap value', 'আনুমানিক স্ক্র্যাপ মূল্য')}
                </Txt>
                <Text
                  style={{ fontSize: 24, fontWeight: '800', color: C.green }}
                >
                  {money(f.order.estimatedValue)}
                </Text>
              </View>
              <Button
                title={t('Accept Pickup', 'পিকআপ গ্রহণ করুন')}
                icon="check"
                disabled={seconds === 0}
                loading={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    await api.request(
                      '/partner/orders/' + f.order.id + '/accept',
                      'POST',
                    );
                    a.go('partnerOrder', f.order.id);
                  })
                }
              />
            </View>
          </View>
        );
      })}
      {!!jobs.length && (
        <Text style={pt.section}>{t('Active pickups', 'চলমান পিকআপ')}</Text>
      )}
      {jobs.map(job => (
        <Pressable
          key={job.id}
          accessibilityRole="button"
          onPress={() => a.go('partnerOrder', job.id)}
          style={({ pressed }) => [pt.job, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={pt.jobIcon}>
            <Icon name="truck" color={C.green} size={22} />
          </View>
          <View style={[s.grow, { gap: 3 }]}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 15, fontWeight: '700', color: C.ink }}
            >
              {job.address.line1}
            </Text>
            <Txt style={{ fontSize: 12 }}>
              {job.address.area?.name} · {job.items.length}{' '}
              {job.items.length === 1
                ? t('material', 'উপকরণ')
                : t('materials', 'উপকরণ')}{' '}
              · {money(job.estimatedValue)}
            </Txt>
            <View style={pt.jobStatus}>
              <Text
                style={{ fontSize: 11, fontWeight: '700', color: '#2B5C9A' }}
              >
                {job.status
                  .replace(/_/g, ' ')
                  .replace(/^./, (c: string) => c.toUpperCase())}
              </Text>
            </View>
          </View>
          <Icon name="chevron" color={C.green} size={20} stroke={2.4} />
        </Pressable>
      ))}
      {!live.length && !jobs.length && (
        <View style={pt.empty}>
          <View style={pt.radar}>
            <View style={pt.radarInner}>
              <Icon name="navigation" color={C.white} size={26} />
            </View>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>
            {profile.online
              ? t('Looking for pickups near you', 'কাছের পিকআপ খুঁজছি')
              : t('Your next job awaits', 'পরবর্তী কাজ অপেক্ষায়')}
          </Text>
          <Txt style={{ textAlign: 'center', fontSize: 13 }}>
            {t(
              'New requests appear here with a 20-second timer to accept.',
              'নতুন অনুরোধ এখানে ২০ সেকেন্ডের টাইমারসহ আসবে।',
            )}
          </Txt>
        </View>
      )}
      <Text style={pt.section}>{t('Tools', 'টুলস')}</Text>
      <View style={pt.group}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditLoc(v => !v)}
          style={[pt.toolRow, pt.toolLine]}
        >
          <View style={pt.toolIcon}>
            <Icon name="gps" color={C.green} size={20} />
          </View>
          <View style={s.grow}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>
              {t('Dispatch location', 'কাজের অবস্থান')}
            </Text>
            <Txt style={{ fontSize: 12 }}>
              {Number(profile.lat).toFixed(4)}, {Number(profile.lng).toFixed(4)}
            </Txt>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.green }}>
            {editLoc ? t('Close', 'বন্ধ') : t('Update', 'আপডেট')}
          </Text>
        </Pressable>
        {editLoc && (
          <View style={{ gap: 10, paddingVertical: 12 }}>
            <Txt style={{ fontSize: 12 }}>
              {t(
                'Nearby jobs are matched from this point. Update it when you move to another area.',
                'এই স্থান থেকে কাছের কাজ মেলানো হয়। অন্য এলাকায় গেলে আপডেট করুন।',
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
            <Button
              title={t('Save location', 'অবস্থান সেভ')}
              variant="secondary"
              disabled={!approved}
              onPress={() => {
                setOnline(profile.online);
                setEditLoc(false);
              }}
            />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => a.go('verification')}
          style={pt.toolRow}
        >
          <View style={pt.toolIcon}>
            <Icon name="idcard" color={C.green} size={20} />
          </View>
          <View style={s.grow}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>
              {t('Verification documents', 'যাচাইয়ের কাগজপত্র')}
            </Text>
            <Txt style={{ fontSize: 12 }}>
              {t('NID and portrait photo', 'এনআইডি ও ছবি')}
            </Txt>
          </View>
          <Icon name="chevron" color="#9AA59F" size={18} />
        </Pressable>
      </View>
    </Screen>
  );
}
export function PartnerOrder() {
  const a = useApp(),
    { t } = a;
  const { order: o, error, load } = useOrder(a.route.id, true);
  const [quantities, setQuantities] = useState<Record<string, string>>({}),
    [otp, setOtp] = useState(''),
    [cash, setCash] = useState(false),
    [stars, setStars] = useState(5),
    [rated, setRated] = useState(false),
    [reweigh, setReweigh] = useState(false);
  if (!o)
    return (
      <Screen title={t('Pickup job', 'পিকআপের কাজ')}>
        {error ? (
          <Empty
            icon="truck"
            title={t('Couldn’t load pickup', 'পিকআপ লোড হয়নি')}
            body={error}
          />
        ) : (
          <Loader label={t('Loading pickup…', 'পিকআপ আসছে…')} />
        )}
      </Screen>
    );
  const endpoint =
    o.status === 'partner_assigned'
      ? 'depart'
      : o.status === 'on_the_way'
      ? 'arrive'
      : null;
  const steps = [
    t('Accepted', 'গৃহীত'),
    t('On the way', 'পথে'),
    t('Arrived', 'পৌঁছেছি'),
    t('Weighed', 'ওজন'),
    t('Done', 'সম্পন্ন'),
  ];
  const reached =
    o.status === 'partner_assigned'
      ? 0
      : o.status === 'on_the_way'
      ? 1
      : o.status === 'arrived'
      ? 2
      : o.status === 'weighing'
      ? 3
      : o.status === 'completed'
      ? 4
      : 0;
  const stage: [string, string, string] =
    o.status === 'partner_assigned'
      ? [
          'truck',
          t('Head to the pickup', 'পিকআপে রওনা দিন'),
          t(
            'Start the trip when you leave so the seller can follow.',
            'রওনা দিলে যাত্রা শুরু চাপুন, বিক্রেতা জানতে পারবেন।',
          ),
        ]
      : o.status === 'on_the_way'
      ? [
          'navigation',
          t('On the way', 'পথে আছেন'),
          t(
            'Tap “I’ve arrived” at the door.',
            'দরজায় পৌঁছে “আমি পৌঁছেছি” চাপুন।',
          ),
        ]
      : o.status === 'arrived'
      ? [
          'scale',
          t('Weigh the materials', 'উপকরণের ওজন দিন'),
          t(
            'Use the digital scale in front of the seller.',
            'বিক্রেতার সামনে ডিজিটাল স্কেলে ওজন করুন।',
          ),
        ]
      : o.status === 'weighing'
      ? [
          'key',
          t('Pay cash & verify OTP', 'নগদ দিন ও OTP যাচাই করুন'),
          o.weightsApproved
            ? t(
                'Seller approved. Pay cash, then ask for the OTP.',
                'বিক্রেতা অনুমোদন করেছেন। নগদ দিয়ে OTP চান।',
              )
            : t(
                'Waiting for the seller to approve the weights.',
                'বিক্রেতার ওজন অনুমোদনের অপেক্ষা।',
              ),
        ]
      : o.status === 'completed'
      ? [
          'check',
          t('Pickup completed', 'পিকআপ সম্পন্ন'),
          t(
            'Cash settled and handover confirmed.',
            'নগদ পরিশোধ ও হস্তান্তর সম্পন্ন।',
          ),
        ]
      : [
          'info',
          statusLabel(o.status),
          t(
            'Contact support if you need help.',
            'সাহায্যে সহায়তায় যোগাযোগ করুন।',
          ),
        ];
  const editingWeights =
    o.status === 'arrived' ||
    (o.status === 'weighing' && (!o.weightsApproved || reweigh));
  const qtyOf = (i: (typeof o.items)[number]) => {
    const typed = quantities[i.id];
    if (editingWeights && typed !== undefined && typed !== '')
      return Number(typed) || 0;
    return i.finalQty !== null ? Number(i.finalQty) : Number(i.estimatedQty);
  };
  const liveValue = Math.round(
    o.items.reduce((sum, i) => sum + qtyOf(i) * i.lockedRate, 0),
  );
  const typedAny = o.items.some(
    i => quantities[i.id] !== undefined && quantities[i.id] !== '',
  );
  const cashDue = Math.max(
    0,
    (o.finalValue || 0) - o.fee + Math.min(o.creditUsed, o.fee),
  );
  return (
    <Screen
      title={t('Pickup Job', 'পিকআপের কাজ')}
      subtitle={'GD-' + o.id.slice(0, 8).toUpperCase()}
      footer={
        endpoint ? (
          <Button
            title={
              endpoint === 'depart'
                ? t('Start trip · on my way', 'যাত্রা শুরু · পথে আছি')
                : t('I’ve arrived', 'আমি পৌঁছেছি')
            }
            icon={endpoint === 'depart' ? 'truck' : 'pin'}
            loading={a.busy}
            onPress={() =>
              void a.run(async () => {
                await api.request(
                  '/partner/orders/' + o.id + '/' + endpoint,
                  'POST',
                );
                await load();
              })
            }
          />
        ) : undefined
      }
    >
      <View style={[s.row, { gap: 14 }]}>
        <View style={po.ring}>
          <View style={po.dot}>
            <Icon name={stage[0]} color={C.white} size={22} stroke={2.2} />
          </View>
        </View>
        <View style={[s.grow, { gap: 3 }]}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>
            {stage[1]}
          </Text>
          <Txt style={{ fontSize: 13, lineHeight: 19 }}>{stage[2]}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {steps.map((label, i) => {
          const done = i < reached || o.status === 'completed',
            current = i === reached && o.status !== 'completed';
          return (
            <View key={label} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                }}
              >
                <View
                  style={[
                    po.line,
                    { opacity: i === 0 ? 0 : 1 },
                    (done || current) && { backgroundColor: C.green },
                  ]}
                />
                <View
                  style={[
                    po.step,
                    done && { backgroundColor: C.green },
                    current && {
                      backgroundColor: C.white,
                      borderWidth: 3,
                      borderColor: C.green,
                    },
                  ]}
                >
                  {done && (
                    <Icon name="check" color={C.white} size={14} stroke={2.6} />
                  )}
                  {current && <View style={po.inner} />}
                </View>
                <View
                  style={[
                    po.line,
                    { opacity: i === steps.length - 1 ? 0 : 1 },
                    done && i + 1 <= reached && { backgroundColor: C.green },
                    o.status === 'completed' && { backgroundColor: C.green },
                  ]}
                />
              </View>
              <Text
                style={[
                  po.stepLabel,
                  (done || current) && { color: C.ink, fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={po.card}>
        <View style={s.between}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
            {t('Pickup address', 'পিকআপ ঠিকানা')}
          </Text>
          <View style={po.when}>
            <Icon
              name={o.slotStart ? 'calendar' : 'bolt'}
              color={o.slotStart ? C.green : '#A3560C'}
              size={14}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: o.slotStart ? C.green : '#A3560C',
              }}
            >
              {o.slotStart
                ? `${date(o.slotStart, a.lang)} · ${time(o.slotStart, a.lang)}`
                : t('Instant', 'এখনই')}
            </Text>
          </View>
        </View>
        <View style={[s.row, { gap: 12, alignItems: 'flex-start' }]}>
          <View style={po.iconCircle}>
            <Icon name="pin" color={C.green} size={20} />
          </View>
          <View style={s.grow}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
              {o.address.line1 || o.address.area?.name}
            </Text>
            <Txt style={{ fontSize: 13 }}>
              {[o.address.landmark, o.address.area?.name]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          </View>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          {!!o.address.lat && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${o.address.lat},${o.address.lng}`,
                )
              }
              style={({ pressed }) => [
                po.navigate,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icon name="navigation" color={C.white} size={18} />
              <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>
                {t('Navigate', 'নেভিগেট')}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => a.go('support')}
            style={({ pressed }) => [
              po.support,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="phone" color={C.green} size={18} />
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 15 }}>
              {t('Call via support', 'সহায়তায় কল')}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={po.card}>
        <View style={s.between}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
            {t('Materials', 'উপকরণ')}
          </Text>
          <Txt style={{ fontSize: 12 }}>
            {t('Rates locked at booking', 'বুকিংয়ে দর লক')}
          </Txt>
        </View>
        {o.items.map(i => {
          const cat = a.categories.find(c => c.id === i.item.categoryId);
          const weighing = ['arrived', 'weighing'].includes(o.status);
          return (
            <View key={i.id} style={po.item}>
              <View style={[s.row, { gap: 12 }]}>
                <View style={po.thumb}>
                  {cat ? (
                    <MaterialArt kind={cat.icon} size={46} />
                  ) : (
                    <Icon name="recycle" color={C.green} />
                  )}
                </View>
                <View style={s.grow}>
                  <Text
                    style={{ fontSize: 15, fontWeight: '700', color: C.ink }}
                  >
                    {a.lang === 'bn' ? i.item.nameBn : i.item.name}
                  </Text>
                  <Txt style={{ fontSize: 12 }}>
                    {i.finalQty !== null
                      ? `${Number(i.finalQty)} ${i.item.unit} (${t(
                          'est.',
                          'আনু.',
                        )} ${Number(i.estimatedQty)})`
                      : `${t('Est.', 'আনুমানিক')} ${Number(i.estimatedQty)} ${
                          i.item.unit
                        }`}{' '}
                    × {money(i.lockedRate)}/{i.item.unit}
                  </Txt>
                  {!!i.notes && (
                    <Txt style={{ fontSize: 12, color: '#A3560C' }}>
                      “{i.notes}”
                    </Txt>
                  )}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
                  {money(qtyOf(i) * i.lockedRate)}
                </Text>
              </View>
              {editingWeights && weighing && (
                <View style={po.scale}>
                  <Icon name="scale" color={C.green} size={20} />
                  <TextInput
                    accessibilityLabel={
                      t('Digital scale quantity', 'ডিজিটাল স্কেলের পরিমাণ') +
                      ' ' +
                      i.item.name
                    }
                    value={
                      quantities[i.id] ??
                      (i.finalQty !== null ? String(i.finalQty) : '')
                    }
                    keyboardType="decimal-pad"
                    placeholder={t('Scale reading', 'স্কেলের রিডিং')}
                    placeholderTextColor="#9CA89D"
                    onChangeText={v =>
                      setQuantities(prev => ({ ...prev, [i.id]: v }))
                    }
                    style={po.scaleInput}
                  />
                  <Text style={{ fontSize: 15, color: C.muted }}>
                    {i.item.unit}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={[s.between, po.total]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
            {editingWeights && typedAny
              ? t('Scale value', 'স্কেলের মূল্য')
              : o.finalValue !== null
              ? t('Final scrap value', 'চূড়ান্ত মূল্য')
              : t('Estimated value', 'আনুমানিক মূল্য')}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.green }}>
            {money(
              editingWeights && typedAny
                ? liveValue
                : o.finalValue ?? o.estimatedValue,
            )}
          </Text>
        </View>
      </View>
      {editingWeights && (
        <>
          <View style={s.notice}>
            <Txt style={s.noticeText}>
              {t(
                'Show the digital scale to the seller. Enter actual quantities for every item. Changing any weight requires the seller to approve again.',
                'বিক্রেতাকে ডিজিটাল স্কেল দেখান। প্রতিটি উপকরণের প্রকৃত পরিমাণ দিন। ওজন বদলালে আবার বিক্রেতার অনুমোদন লাগবে।',
              )}
            </Txt>
          </View>
          <Button
            title={t('Submit final weights', 'চূড়ান্ত ওজন জমা দিন')}
            icon="scale"
            loading={a.busy}
            disabled={o.items.some(i => {
              const q = quantities[i.id] ?? i.finalQty;
              return (
                q === null ||
                q === undefined ||
                q === '' ||
                !Number.isFinite(Number(q)) ||
                Number(q) < 0
              );
            })}
            onPress={() =>
              void a.run(async () => {
                await api.request(
                  '/partner/orders/' + o.id + '/weigh',
                  'POST',
                  {
                    items: o.items.map(i => ({
                      id: i.id,
                      quantity: Number(quantities[i.id] ?? i.finalQty),
                    })),
                  },
                );
                await load();
              })
            }
          />
        </>
      )}
      {o.status === 'weighing' && o.weightsApproved && !reweigh && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setReweigh(true)}
          style={{ alignSelf: 'center', paddingVertical: 2 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.muted }}>
            {t(
              'Change weights (seller re-approves)',
              'ওজন বদলান (বিক্রেতা আবার অনুমোদন করবেন)',
            )}
          </Text>
        </Pressable>
      )}
      {o.status === 'weighing' && (
        <View style={po.cashCard}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>
            {t('Cash & handover', 'নগদ ও হস্তান্তর')}
          </Text>
          <View style={po.cashAmount}>
            <Txt style={{ fontSize: 13, color: '#3F4C46' }}>
              {t('Cash to pay seller', 'বিক্রেতাকে নগদ দিন')}
            </Txt>
            <Text style={{ fontSize: 34, fontWeight: '800', color: C.green }}>
              {money(cashDue)}
            </Text>
            <View
              style={[
                po.approval,
                !o.weightsApproved && { backgroundColor: '#FDF0DA' },
              ]}
            >
              <Icon
                name={o.weightsApproved ? 'check' : 'clock'}
                color={o.weightsApproved ? C.green : '#9A5B0B'}
                size={14}
                stroke={2.4}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: o.weightsApproved ? C.green : '#9A5B0B',
                }}
              >
                {o.weightsApproved
                  ? t('Seller approved weights', 'বিক্রেতা ওজন অনুমোদন করেছেন')
                  : t(
                      'Waiting for seller approval',
                      'বিক্রেতার অনুমোদনের অপেক্ষা',
                    )}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cash, disabled: !o.weightsApproved }}
            disabled={!o.weightsApproved}
            onPress={() => setCash(v => !v)}
            style={[
              po.step2,
              cash && { borderColor: C.green, backgroundColor: '#EEF8F1' },
              !o.weightsApproved && { opacity: 0.5 },
            ]}
          >
            <View style={[po.stepNum, cash && { backgroundColor: C.green }]}>
              {cash ? (
                <Icon name="check" color={C.white} size={15} stroke={2.6} />
              ) : (
                <Text style={{ fontWeight: '800', color: C.green }}>1</Text>
              )}
            </View>
            <Text
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.ink }}
            >
              {t(
                `I paid ${money(cashDue)} in cash`,
                `আমি ${money(cashDue)} নগদ দিয়েছি`,
              )}
            </Text>
          </Pressable>
          <View
            style={[
              po.step2,
              { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
              !cash && { opacity: 0.5 },
            ]}
          >
            <View style={[s.row, { gap: 12 }]}>
              <View style={po.stepNum}>
                <Text style={{ fontWeight: '800', color: C.green }}>2</Text>
              </View>
              <View style={s.grow}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>
                  {t('Ask the seller for the OTP', 'বিক্রেতার কাছে OTP চান')}
                </Text>
                <Txt style={{ fontSize: 12 }}>
                  {t(
                    'Only the seller can see it, in their app.',
                    'শুধু বিক্রেতা তাঁর অ্যাপে এটি দেখেন।',
                  )}
                </Txt>
              </View>
            </View>
            <View>
              <View style={po.otpRow} pointerEvents="none">
                {[0, 1, 2, 3].map(n => (
                  <View
                    key={n}
                    style={[
                      po.otpBox,
                      otp.length === n && cash && { borderColor: C.green },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 26, fontWeight: '800', color: C.ink }}
                    >
                      {otp[n] ? '•' : ''}
                    </Text>
                  </View>
                ))}
              </View>
              <TextInput
                accessibilityLabel={t(
                  '4-digit handover OTP',
                  '৪ সংখ্যার হস্তান্তর OTP',
                )}
                value={otp}
                editable={cash}
                maxLength={4}
                keyboardType="number-pad"
                onChangeText={v => setOtp(v.replace(/\D/g, ''))}
                style={po.otpInput}
                caretHidden
              />
            </View>
          </View>
          <Button
            title={t('Verify OTP & complete', 'OTP যাচাই করে সম্পন্ন')}
            icon="check"
            loading={a.busy}
            disabled={!cash || !o.weightsApproved || otp.length !== 4}
            onPress={() =>
              void a.run(async () => {
                await api.request(
                  '/partner/orders/' + o.id + '/complete',
                  'POST',
                  { otp, cashPaid: cash },
                );
                track('otp_verified', { orderId: o.id });
                track('order_completed', { orderId: o.id });
                await load();
              })
            }
          />
        </View>
      )}
      {(['arrived', 'weighing'].includes(o.status) ||
        (o.status === 'completed' && o.photos.length > 0)) && (
        <View style={s.card}>
          <Text style={s.h3}>
            {t('Scale & material photos', 'স্কেল ও উপকরণের ছবি')}
          </Text>
          <View style={s.wrap}>
            {o.photos.map(p => (
              <Image
                key={p.id}
                source={{
                  uri: api.baseUrl + p.url,
                  headers: { Authorization: 'Bearer ' + api.token },
                }}
                style={{ width: 78, height: 78, borderRadius: 12 }}
              />
            ))}
          </View>
          {o.status !== 'completed' &&
            o.photos.filter(p => p.uploadedBy === a.user?.id).length < 5 && (
              <Button
                title={t('Add weighing photo', 'ওজনের ছবি যোগ করুন')}
                icon="camera"
                variant="secondary"
                onPress={() =>
                  void a.run(async () => {
                    const result = await launchImageLibrary({
                      mediaType: 'photo',
                      selectionLimit: 1,
                      quality: 0.7,
                      maxWidth: 1600,
                      maxHeight: 1600,
                    });
                    const photo = result.assets?.[0];
                    if (!photo) return;
                    const form = new FormData();
                    form.append('file', {
                      uri: photo.uri,
                      type: photo.type || 'image/jpeg',
                      name: photo.fileName || 'weighing.jpg',
                    } as any);
                    await api.request(
                      '/orders/' + o.id + '/photos',
                      'POST',
                      form,
                    );
                    await load();
                  })
                }
              />
            )}
        </View>
      )}
      {o.status === 'completed' && (
        <>
          <Empty
            icon="check"
            title={t('A job well done.', 'কাজ সফলভাবে সম্পন্ন।')}
            body={t(
              'Cash settled. Materials collected. Thank you for keeping Dhaka moving greener.',
              'নগদ পরিশোধ হয়েছে। উপকরণ সংগ্রহ হয়েছে। ঢাকাকে সবুজ রাখার জন্য ধন্যবাদ।',
            )}
          />
          <View style={s.card}>
            <Text style={s.h3}>
              {t('Rate your customer', 'বিক্রেতাকে রেটিং দিন')}
            </Text>
            {rated ? (
              <Pill>{t('Rating saved', 'রেটিং সেভ হয়েছে')}</Pill>
            ) : (
              <>
                <View style={[s.row, { justifyContent: 'center' }]}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Pressable
                      key={n}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} stars`}
                      onPress={() => setStars(n)}
                      hitSlop={6}
                    >
                      <Text
                        style={{
                          fontSize: 36,
                          color: n <= stars ? '#E9A23B' : '#D5DCD0',
                        }}
                      >
                        ★
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Button
                  title={t('Save rating', 'রেটিং সেভ')}
                  variant="secondary"
                  onPress={() =>
                    void a.run(async () => {
                      await api.request('/orders/' + o.id + '/rating', 'POST', {
                        stars,
                      });
                      track('rating_submitted', { orderId: o.id });
                      setRated(true);
                    })
                  }
                />
              </>
            )}
          </View>
        </>
      )}
      {o.status === 'disputed' && (
        <View style={s.notice}>
          <Txt style={s.noticeText}>
            {t(
              'This pickup is paused for admin review. Contact support for help.',
              'অ্যাডমিন যাচাইয়ের জন্য পিকআপ স্থগিত। সহায়তায় যোগাযোগ করুন।',
            )}
          </Txt>
        </View>
      )}
    </Screen>
  );
}
export function Earnings() {
  const a = useApp(),
    { t, run } = a;
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void run(async () => {
      const d = await api.request('/partner/earnings');
      d.orders?.sort((x: any, y: any) =>
        String(y.updatedAt).localeCompare(String(x.updatedAt)),
      );
      setData(d);
    });
  }, [run]);
  return (
    <Screen header={<PageTitle title={t('Earnings', 'আয়ের হিসাব')} />}>
      {!data ? (
        <Loader label={t('Loading earnings…', 'আয়ের হিসাব আসছে…')} />
      ) : (
        <>
          <View style={en.hero}>
            <Text style={{ fontSize: 14, color: '#CFE9DC' }}>
              {t('Cash paid to sellers', 'বিক্রেতাদের নগদ পরিশোধ')}
            </Text>
            <Text style={{ fontSize: 44, fontWeight: '800', color: C.white }}>
              {money(data?.cashPaid || 0)}
            </Text>
            <View style={en.heroNote}>
              <Icon name="info" color="#CFE9DC" size={14} />
              <Text style={{ fontSize: 12, color: '#CFE9DC', flexShrink: 1 }}>
                {t(
                  'Settlement outflow, not profit. Resale revenue is outside the app.',
                  'এটি পরিশোধের হিসাব, লাভ নয়। পুনর্বিক্রয় আয় অ্যাপের বাইরে।',
                )}
              </Text>
            </View>
          </View>
          <View style={[s.row, { gap: 10 }]}>
            {[
              ['check', String(data?.completed || 0), t('Pickups', 'পিকআপ')],
              [
                'star',
                data?.rating ? data.rating.toFixed(1) : '—',
                t('Rating', 'রেটিং'),
              ],
              [
                'wallet',
                money(data?.commissionDue || 0),
                t('Commission due', 'প্রদেয় কমিশন'),
              ],
            ].map(([icon, value, label]) => (
              <View key={label} style={en.tile}>
                <View style={en.tileIcon}>
                  <Icon name={icon} color={C.green} size={18} stroke={2.2} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>
                  {value}
                </Text>
                <Txt style={{ fontSize: 11, textAlign: 'center' }}>{label}</Txt>
              </View>
            ))}
          </View>
          <View style={en.card}>
            <View style={s.between}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
                {t('Commission rates', 'কমিশনের হার')}
              </Text>
              <View style={en.pill}>
                <Text
                  style={{ fontSize: 12, fontWeight: '700', color: C.green }}
                >
                  {t('Default', 'সাধারণ')} {data?.commissionPercent || 0}%
                </Text>
              </View>
            </View>
            {data?.categoryCommission?.length ? (
              data.categoryCommission.map((c: any) => (
                <View key={c.id} style={s.between}>
                  <Txt style={{ fontSize: 14 }}>
                    {a.lang === 'bn' ? c.nameBn : c.name}
                  </Txt>
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: C.ink }}
                  >
                    {c.commissionPercent}%
                  </Text>
                </View>
              ))
            ) : (
              <Txt style={{ fontSize: 13 }}>
                {t(
                  'The default rate applies to every category.',
                  'সব ক্যাটাগরিতে সাধারণ হার প্রযোজ্য।',
                )}
              </Txt>
            )}
          </View>
          <Text style={en.section}>
            {t('Settlement history', 'পরিশোধের ইতিহাস')}
          </Text>
          {data?.orders?.length ? (
            <View style={en.card}>
              {data.orders.map((o: any, n: number) => (
                <Pressable
                  key={o.id}
                  accessibilityRole="button"
                  onPress={() => a.go('partnerOrder', o.id)}
                  style={[
                    en.row,
                    n < data.orders.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: C.line,
                    },
                  ]}
                >
                  <View style={en.rowIcon}>
                    <Icon name="check" color={C.green} size={17} stroke={2.4} />
                  </View>
                  <View style={s.grow}>
                    <Text
                      style={{ fontSize: 14, fontWeight: '700', color: C.ink }}
                    >
                      GD-{o.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Txt style={{ fontSize: 12 }}>
                      {date(o.updatedAt, a.lang)} · {time(o.updatedAt, a.lang)}
                    </Txt>
                  </View>
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: C.ink }}
                  >
                    {money(o.finalValue - o.fee + o.creditUsed)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Empty
              icon="wallet"
              title={t('No settlements yet', 'এখনও কোনো পরিশোধ নেই')}
              body={t(
                'Completed pickups appear here with the cash you paid.',
                'সম্পন্ন পিকআপ ও পরিশোধিত নগদ এখানে দেখাবে।',
              )}
            />
          )}
        </>
      )}
    </Screen>
  );
}
const pt = StyleSheet.create({
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { backgroundColor: C.forest, borderRadius: 22, padding: 18, gap: 16 },
  statusOff: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#1D6C4F',
    borderRadius: 14,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  offer: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8771A',
    overflow: 'hidden',
  },
  offerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8771A',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timer: {
    backgroundColor: '#FFF1DE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerTrack: { height: 5, backgroundColor: '#FDE7C8' },
  timerFill: { height: 5, backgroundColor: '#B85A0C' },
  chip: {
    backgroundColor: '#F1F4F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#6F7D76',
    marginBottom: -8,
    textTransform: 'uppercase',
  },
  job: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
  },
  jobIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobStatus: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3EEFB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 26,
    paddingHorizontal: 20,
  },
  radar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  radarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  toolLine: { borderBottomWidth: 1, borderBottomColor: C.line },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
const po = StyleSheet.create({
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCEEDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, height: 3, backgroundColor: '#D9DED6' },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D3D8D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.green },
  stepLabel: { fontSize: 11, color: C.muted, textAlign: 'center' },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 15,
    gap: 14,
  },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F4F7F5',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.green,
    borderRadius: 13,
    minHeight: 48,
  },
  support: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#BFE3CC',
    backgroundColor: C.mint,
    borderRadius: 13,
    minHeight: 48,
  },
  item: {
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: C.green,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 54,
    backgroundColor: '#F7FBF8',
  },
  scaleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    paddingVertical: 8,
  },
  cashCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#BFE3CC',
    padding: 15,
    gap: 12,
  },
  cashAmount: {
    backgroundColor: '#F2F8F4',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  approval: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E1F4E8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  step2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 13,
  },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  otpBox: {
    width: 56,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CED8D2',
    backgroundColor: '#F7FAF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
    fontSize: 1,
  },
  total: {
    backgroundColor: '#F2F8F4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
});
const en = StyleSheet.create({
  hero: { backgroundColor: C.forest, borderRadius: 22, padding: 20, gap: 6 },
  heroNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#124C37',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 15,
    gap: 10,
  },
  pill: {
    backgroundColor: C.mint,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#6F7D76',
    textTransform: 'uppercase',
    marginBottom: -8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
