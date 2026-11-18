import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, date, money, statusLabel, time, track } from '../api';
import { useApp } from '../state';
import type { Order } from '../types';
import {
  Button,
  C,
  Empty,
  Field,
  IconButton,
  Loader,
  PageTitle,
  Pill,
  s,
  Screen,
  Skeleton,
  Txt,
} from '../components/ui';
import { Icon, MaterialArt } from '../components/Icon';
export function Orders() {
  const a = useApp(),
    { t, run, user, route } = a;
  const [orders, setOrders] = useState<Order[]>([]),
    [loaded, setLoaded] = useState(false),
    [filter, setFilter] = useState('upcoming');
  useEffect(() => {
    if (user)
      void run(async () => {
        try {
          setOrders(
            await api.request(
              user.role === 'PARTNER' ? '/partner/orders' : '/orders',
            ),
          );
        } finally {
          setLoaded(true);
        }
      });
  }, [run, route, user]);
  if (!a.user)
    return (
      <Screen>
        <Empty
          icon="orders"
          title={t('Every pickup tells a story.', 'প্রতিটি পিকআপ একটি গল্প।')}
          body={t(
            'Sign in to see your upcoming and past recycling pickups.',
            'আসন্ন ও পূর্বের রিসাইক্লিং পিকআপ দেখতে প্রবেশ করুন।',
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
  const shown = orders.filter(o =>
    filter === 'completed'
      ? o.status === 'completed'
      : filter === 'cancelled'
      ? o.status === 'cancelled'
      : !['completed', 'cancelled'].includes(o.status),
  );
  const tone = (status: string) =>
    status === 'completed'
      ? { bg: '#E1F4E8', fg: C.green }
      : status === 'cancelled'
      ? { bg: '#ECEFED', fg: '#5E6B65' }
      : ['searching_partner', 'no_partner_found', 'disputed'].includes(status)
      ? { bg: '#FDF0DA', fg: '#9A5B0B' }
      : { bg: '#E3EEFB', fg: '#2B5C9A' };
  const count = (f: string) =>
    orders.filter(o =>
      f === 'completed'
        ? o.status === 'completed'
        : f === 'cancelled'
        ? o.status === 'cancelled'
        : !['completed', 'cancelled'].includes(o.status),
    ).length;
  return (
    <Screen
      header={
        <PageTitle
          title={
            a.user.role === 'PARTNER'
              ? t('My Pickups', 'আমার পিকআপ')
              : t('My Orders', 'আমার অর্ডার')
          }
        />
      }
    >
      <View style={ol.segment}>
        {[
          ['upcoming', t('Upcoming', 'আসন্ন')],
          ['completed', t('Completed', 'সম্পন্ন')],
          ['cancelled', t('Cancelled', 'বাতিল')],
        ].map(([value, label]) => {
          const on = filter === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(value)}
              style={[ol.segmentItem, on && { backgroundColor: C.green }]}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: on ? C.white : '#5E6B65',
                }}
              >
                {label}
                {count(value) ? ` (${count(value)})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {shown.map(o => {
        const first = o.items[0],
          cat = a.categories.find(c => c.id === first?.item.categoryId),
          c = tone(o.status);
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            onPress={() =>
              a.go(
                a.user?.role === 'PARTNER'
                  ? 'partnerOrder'
                  : o.status === 'completed'
                  ? 'invoice'
                  : 'track',
                o.id,
              )
            }
            style={({ pressed }) => [ol.card, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[s.row, { gap: 14 }]}>
              <View style={ol.thumb}>
                {cat ? (
                  <MaterialArt kind={cat.icon} size={50} />
                ) : (
                  <Icon name="recycle" color={C.green} />
                )}
              </View>
              <View style={[s.grow, { gap: 3 }]}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 16, fontWeight: '700', color: C.ink }}
                >
                  {o.items
                    .map(i => (a.lang === 'bn' ? i.item.nameBn : i.item.name))
                    .join(', ')}
                </Text>
                <Txt style={{ fontSize: 12 }}>
                  GD-{o.id.slice(0, 8).toUpperCase()} ·{' '}
                  {date(o.slotStart || o.createdAt, a.lang)}
                  {o.address?.area?.name ? ' · ' + o.address.area.name : ''}
                </Txt>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>
                {money(o.netPayout)}
              </Text>
            </View>
            <View style={ol.footer}>
              <View style={[ol.status, { backgroundColor: c.bg }]}>
                <View style={[ol.statusDot, { backgroundColor: c.fg }]} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.fg }}>
                  {statusLabel(o.status)}
                </Text>
              </View>
              <View style={[s.row, { gap: 6 }]}>
                <Icon
                  name={o.type === 'instant' ? 'bolt' : 'calendar'}
                  color={C.muted}
                  size={15}
                />
                <Txt style={{ fontSize: 12 }}>
                  {o.type === 'instant'
                    ? t('Instant', 'এখনই')
                    : t('Scheduled', 'নির্ধারিত')}
                </Txt>
              </View>
              <View style={[s.row, { gap: 4 }]}>
                <Text
                  style={{ fontSize: 13, fontWeight: '700', color: C.green }}
                >
                  {a.user?.role === 'PARTNER'
                    ? t('Details', 'বিস্তারিত')
                    : o.status === 'completed'
                    ? t('Invoice', 'ইনভয়েস')
                    : t('Track', 'ট্র্যাক')}
                </Text>
                <Icon name="chevron" color={C.green} size={16} stroke={2.4} />
              </View>
            </View>
          </Pressable>
        );
      })}
      {!loaded && <Skeleton rows={3} />}
      {loaded && !shown.length && (
        <Empty
          icon="recycle"
          title={
            filter === 'upcoming'
              ? t('Nothing scheduled', 'কিছু নির্ধারিত নেই')
              : filter === 'completed'
              ? t('No completed pickups yet', 'এখনও সম্পন্ন পিকআপ নেই')
              : t('No cancellations', 'কোনো বাতিল নেই')
          }
          body={
            a.user.role === 'PARTNER'
              ? t(
                  'Accepted jobs appear here. Go online on the Jobs tab to receive requests.',
                  'গৃহীত কাজ এখানে দেখাবে। অনুরোধ পেতে কাজ ট্যাবে অনলাইনে যান।',
                )
              : t(
                  'Your pickups will appear here. Ready to turn a little clutter into cash?',
                  'পিকআপগুলো এখানেই দেখবেন। অব্যবহৃত জিনিস বিক্রি করতে প্রস্তুত?',
                )
          }
          action={
            a.user.role !== 'PARTNER' ? (
              <Button
                title={t('Book a pickup', 'পিকআপ বুক করুন')}
                onPress={() => a.go('materials')}
              />
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}
export function useOrder(id?: string, poll = false) {
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOrder(await api.request('/orders/' + id + (poll ? '/track' : '')));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, poll]);
  useEffect(() => {
    void load();
    if (!poll) return;
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load, poll]);
  return { order, error, load };
}
export function Track() {
  const a = useApp(),
    { t } = a;
  const { order: o, error, load } = useOrder(a.route.id, true);
  const lastStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Count the assignment once, when this screen sees the search succeed.
    if (
      o?.status === 'partner_assigned' &&
      lastStatus.current === 'searching_partner'
    )
      track('partner_assigned', { orderId: o.id });
    lastStatus.current = o?.status;
  }, [o?.status, o?.id]);
  const [reason, setReason] = useState(''),
    [cancelling, setCancelling] = useState(false),
    [disputing, setDisputing] = useState(false),
    [showPartner, setShowPartner] = useState(false);
  if (!o)
    return (
      <Screen title={t('Your pickup', 'আপনার পিকআপ')}>
        {error ? (
          <Empty
            icon="truck"
            title={t('Couldn’t load pickup', 'পিকআপ লোড হয়নি')}
            body={error}
            action={
              <Button
                title={t('Try again', 'আবার চেষ্টা')}
                onPress={() => void load()}
              />
            }
          />
        ) : (
          <Loader label={t('Getting your pickup…', 'পিকআপের তথ্য আসছে…')} />
        )}
      </Screen>
    );
  const addPhoto = () =>
    void a.run(async () => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.7,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      const p = result.assets?.[0];
      if (p) {
        const data = new FormData();
        data.append('file', {
          uri: p.uri,
          type: p.type || 'image/jpeg',
          name: p.fileName || 'photo.jpg',
        } as any);
        await api.request('/orders/' + o.id + '/photos', 'POST', data);
        await load();
      }
    });
  const active = ['partner_assigned', 'on_the_way', 'arrived'].includes(
    o.status,
  );
  // Rough ETA from the partner's last reported position: Dhaka city speed
  // (~15 km/h) plus a buffer for traffic and rain, shown as a 15-minute range.
  const eta = (() => {
    const p = o.partner;
    if (o.status === 'arrived' || o.status === 'weighing') return null;
    if (o.type === 'scheduled' && o.slotStart && o.status !== 'on_the_way')
      return null;
    if (!p?.lat || !p?.lng || !o.address.lat)
      return o.status === 'on_the_way' ? [20, 40] : [60, 90];
    const r = Math.PI / 180,
      dLat = (o.address.lat - p.lat) * r,
      dLng = (o.address.lng - p.lng) * r,
      h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(p.lat * r) *
          Math.cos(o.address.lat * r) *
          Math.sin(dLng / 2) ** 2,
      km = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    const low =
      Math.max(10, Math.ceil(((km / 15) * 60 + 10) / 5) * 5) +
      (o.status === 'partner_assigned' ? 15 : 0);
    return [low, low + 15];
  })();
  const n = (v: number) =>
    a.lang === 'bn'
      ? String(v).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)])
      : String(v);
  const etaText = eta
    ? t(
        `Arriving in ${eta[0]}–${eta[1]} mins`,
        `${n(eta[0])}–${n(eta[1])} মিনিটে পৌঁছাবেন`,
      )
    : o.slotStart && o.status === 'partner_assigned'
    ? `${date(o.slotStart, a.lang)} · ${time(o.slotStart, a.lang)}`
    : '';
  const heading: Record<string, [string, string]> = {
    searching_partner: [
      t('Finding your partner…', 'পার্টনার খুঁজছি…'),
      o.type === 'scheduled'
        ? t(
            'Your request is saved. We’ll match a verified partner closer to your slot.',
            'অনুরোধ সেভ হয়েছে। নির্ধারিত সময়ের কাছে যাচাইকৃত পার্টনার নিয়োগ হবে।',
          )
        : t(
            'Trying nearby verified partners. You’ll see a result within 5 minutes.',
            'কাছের যাচাইকৃত পার্টনার খুঁজছি। ৫ মিনিটের মধ্যে ফল পাবেন।',
          ),
    ],
    partner_assigned: [
      t('Partner Assigned!', 'পার্টনার নিয়োগ হয়েছে!'),
      t(
        'Your pickup request has been assigned to a verified partner.',
        'আপনার পিকআপ একজন যাচাইকৃত পার্টনারকে দেওয়া হয়েছে।',
      ),
    ],
    on_the_way: [
      t('Partner on the way!', 'পার্টনার পথে আছেন!'),
      t(
        'Your partner has started the trip. Traffic may cause delays.',
        'পার্টনার রওনা দিয়েছেন। যানজটে দেরি হতে পারে।',
      ),
    ],
    arrived: [
      t('Partner has arrived!', 'পার্টনার পৌঁছেছেন!'),
      t(
        'Your partner is at your door with a digital scale.',
        'ডিজিটাল স্কেল নিয়ে পার্টনার আপনার দরজায়।',
      ),
    ],
    weighing: [
      t('Check your weights', 'ওজন যাচাই করুন'),
      t(
        'Review the digital scale reading before you approve.',
        'অনুমোদনের আগে ডিজিটাল স্কেলের রিডিং দেখুন।',
      ),
    ],
    completed: [
      t('Pickup Completed!', 'পিকআপ সম্পন্ন!'),
      t(
        'Cash paid and handover confirmed.',
        'নগদ পরিশোধ ও হস্তান্তর নিশ্চিত হয়েছে।',
      ),
    ],
    cancelled: [
      t('Pickup cancelled', 'পিকআপ বাতিল হয়েছে'),
      t('Plans changed. That’s okay.', 'পরিকল্পনা বদলেছে। সমস্যা নেই।'),
    ],
    no_partner_found: [
      t('No partner available', 'পার্টনার পাওয়া যায়নি'),
      t(
        'Nobody nearby could take it right now. Schedule it for later instead.',
        'এখন কাছে কেউ নেই। পরের কোনো সময়ে নির্ধারণ করুন।',
      ),
    ],
    disputed: [
      t('Under review', 'যাচাই চলছে'),
      t(
        'An admin is reviewing this pickup. We’re here to help.',
        'অ্যাডমিন পিকআপটি দেখছেন। আমরা সাহায্যে আছি।',
      ),
    ],
  };
  const [title, subtitle] = heading[o.status] || [statusLabel(o.status), ''];
  // Four milestones, as in the design: the latest reached one is "current".
  const reached =
    o.status === 'searching_partner'
      ? 0
      : o.status === 'partner_assigned'
      ? 1
      : ['on_the_way', 'arrived', 'weighing'].includes(o.status)
      ? 2
      : o.status === 'completed'
      ? 4
      : -1;
  const milestones = [
    t('Order\nConfirmed', 'অর্ডার\nনিশ্চিত'),
    t('Accepted by\nPartner', 'পার্টনার\nগ্রহণ করেছেন'),
    ['arrived', 'weighing'].includes(o.status)
      ? t('Partner\nArrived', 'পার্টনার\nপৌঁছেছেন')
      : t('Partner\nOn the way', 'পার্টনার\nপথে'),
    t('Pickup\nCompleted', 'পিকআপ\nসম্পন্ন'),
  ];
  const statusCard: Record<string, [string, string, string]> = {
    partner_assigned: [
      'truck',
      t('Partner preparing for pickup', 'পার্টনার পিকআপের প্রস্তুতি নিচ্ছেন'),
      etaText,
    ],
    on_the_way: [
      'navigation',
      t('Partner is on the way', 'পার্টনার পথে আছেন'),
      etaText,
    ],
    arrived: [
      'pin',
      t('Partner is at your door', 'পার্টনার আপনার দরজায়'),
      t('Weighing will start shortly', 'শিগগিরই ওজন শুরু হবে'),
    ],
    weighing: [
      'scale',
      t('Weighing on a digital scale', 'ডিজিটাল স্কেলে ওজন চলছে'),
      t('Review the final weights below', 'নিচে চূড়ান্ত ওজন দেখুন'),
    ],
    searching_partner: [
      'search',
      t('Looking for a partner near you', 'আপনার কাছের পার্টনার খুঁজছি'),
      o.type === 'scheduled'
        ? t('Matched before your slot', 'নির্ধারিত সময়ের আগে নিয়োগ হবে')
        : t('Usually within a few minutes', 'সাধারণত কয়েক মিনিটের মধ্যে'),
    ],
  };
  const card = statusCard[o.status];
  const openMap = (lat: number, lng: number, label: string) =>
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    ).catch(() =>
      Alert.alert(t('Couldn’t open maps', 'ম্যাপ খোলা যায়নি'), label),
    );
  const hasPartnerPosition = !!(o.partner?.lat && o.partner?.lng) && active;
  return (
    <Screen
      header={
        <View
          style={[
            s.between,
            { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
          ]}
        >
          <IconButton
            name="back"
            label={t('Go back', 'ফিরে যান')}
            onPress={a.back}
          />
          <Txt style={[s.small, { fontWeight: '600' }]}>
            {'GD-' + o.id.slice(0, 8).toUpperCase()}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Help', 'সহায়তা')}
            onPress={() => a.go('support')}
            hitSlop={10}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="help" color={C.green} size={28} />
          </Pressable>
        </View>
      }
      footer={
        o.status === 'completed' ? (
          <Button
            title={t('See your digital invoice', 'ডিজিটাল ইনভয়েস দেখুন')}
            icon="orders"
            onPress={() => a.go('invoice', o.id)}
          />
        ) : o.status === 'no_partner_found' ? (
          <Button
            title={t('Schedule another pickup', 'অন্য পিকআপ নির্ধারণ করুন')}
            onPress={() => {
              a.setDraft(
                o.items.map(i => ({
                  itemId: i.itemId,
                  quantity: String(i.estimatedQty),
                  notes: i.notes,
                })),
              );
              a.go('schedule', undefined, 'scheduled');
            }}
          />
        ) : o.partner && active ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Partner details', 'পার্টনারের তথ্য')}
              onPress={() => setShowPartner(v => !v)}
              style={({ pressed }) => [
                styles.outlineButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Icon name="idcard" color={C.green} size={20} />
              <Text style={styles.outlineText}>
                {t('Partner Details', 'পার্টনারের তথ্য')}
              </Text>
            </Pressable>
            <Button
              title={t('Track Location', 'লোকেশন দেখুন')}
              icon="arrow"
              disabled={!hasPartnerPosition}
              style={{ flex: 1.4 }}
              onPress={() =>
                openMap(o.partner!.lat!, o.partner!.lng!, o.partner!.name)
              }
            />
          </View>
        ) : undefined
      }
    >
      <View style={[s.row, { gap: 16, alignItems: 'center' }]}>
        <View style={styles.heroRingOuter}>
          <View style={styles.heroRingInner}>
            <View style={styles.heroDot}>
              <Icon
                name={
                  o.status === 'completed'
                    ? 'check'
                    : o.status === 'weighing'
                    ? 'scale'
                    : o.status === 'searching_partner'
                    ? 'search'
                    : 'pin'
                }
                color={C.white}
                size={22}
                stroke={2.2}
              />
            </View>
          </View>
        </View>
        <View style={[s.grow, { gap: 3 }]}>
          <Text style={styles.heroTitle}>{title}</Text>
          {!!etaText &&
            (o.status === 'partner_assigned' || o.status === 'on_the_way') && (
              <Text style={styles.heroEta}>{etaText}</Text>
            )}
          <Txt style={[s.small, { lineHeight: 19 }]}>{subtitle}</Txt>
        </View>
      </View>
      {o.partner && (
        <View style={styles.partnerCard}>
          <View style={[s.row, { gap: 14 }]}>
            {o.partner.photoUrl ? (
              <Image
                source={{
                  uri: api.baseUrl + o.partner.photoUrl,
                  headers: { Authorization: 'Bearer ' + api.token },
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text
                  style={{ fontSize: 26, fontWeight: '800', color: C.green }}
                >
                  {o.partner.name?.[0] || 'P'}
                </Text>
              </View>
            )}
            <View style={[s.grow, { gap: 4 }]}>
              <Text style={[s.h3, { fontSize: 17 }]}>{o.partner.name}</Text>
              <View style={[s.row, { gap: 5 }]}>
                <Text style={{ color: '#E9A23B', fontSize: 15 }}>★</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>
                  {o.partner.rating
                    ? o.partner.rating.toFixed(1)
                    : t('New', 'নতুন')}
                </Text>
                <Txt style={{ fontSize: 13 }}>
                  {' • '}
                  {n(o.partner.completedPickups || 0)}
                  {(o.partner.completedPickups || 0) >= 10 ? '+' : ''}{' '}
                  {t('Pickups', 'পিকআপ')}
                </Txt>
              </View>
              {!!o.partner.maskedPhone && (
                <View style={[s.row, { gap: 6 }]}>
                  <Icon name="phone" color={C.green} size={14} />
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: C.green }}
                  >
                    {o.partner.maskedPhone}
                  </Text>
                </View>
              )}
            </View>
            {active && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  'Call partner through support',
                  'সহায়তার মাধ্যমে পার্টনারকে কল',
                )}
                onPress={() => a.go('support')}
                style={({ pressed }) => [
                  styles.callButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Icon name="phone" color={C.green} size={22} />
              </Pressable>
            )}
          </View>
          <View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}>
            {o.partner.kycStatus === 'approved' && (
              <View style={styles.badge}>
                <Icon name="shield" color={C.green} size={15} />
                <Text style={styles.badgeText}>
                  {t('Verified Partner', 'যাচাইকৃত পার্টনার')}
                </Text>
              </View>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t('Digital Scale Weighing', 'ডিজিটাল স্কেলে ওজন')}
              </Text>
            </View>
          </View>
        </View>
      )}
      {reached >= 0 && (
        <View style={styles.stepper}>
          {milestones.map((label, i) => {
            const done = i < reached || reached === 4,
              current = i === reached;
            return (
              <View key={i} style={styles.stepCol}>
                <View style={styles.stepTrack}>
                  <View
                    style={[
                      styles.stepLine,
                      { opacity: i === 0 ? 0 : 1 },
                      (done || current) && { backgroundColor: C.green },
                    ]}
                  />
                  <View
                    style={[
                      styles.stepDot,
                      done && {
                        backgroundColor: C.green,
                        borderColor: C.green,
                      },
                      current && {
                        backgroundColor: C.white,
                        borderColor: C.green,
                        borderWidth: 3,
                      },
                    ]}
                  >
                    {done && (
                      <Icon
                        name="check"
                        color={C.white}
                        size={16}
                        stroke={2.6}
                      />
                    )}
                    {current && <View style={styles.stepInner} />}
                  </View>
                  <View
                    style={[
                      styles.stepLine,
                      { opacity: i === milestones.length - 1 ? 0 : 1 },
                      done && i + 1 <= reached && { backgroundColor: C.green },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (done || current) && { color: C.ink, fontWeight: '700' },
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {!!card && (
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Icon name={card[0]} color={C.green} size={26} />
          </View>
          <View style={[s.grow, { gap: 3 }]}>
            <Text style={[s.h3, { fontSize: 16 }]}>{card[1]}</Text>
            {!!card[2] && <Txt style={s.small}>{card[2]}</Txt>}
          </View>
        </View>
      )}
      {showPartner && o.partner && (
        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.h3}>{t('Partner details', 'পার্টনারের তথ্য')}</Text>
            <Pressable onPress={() => setShowPartner(false)} hitSlop={10}>
              <Icon name="close" color={C.muted} size={18} />
            </Pressable>
          </View>
          {[
            [t('Name', 'নাম'), o.partner.name],
            [t('Vehicle', 'যানবাহন'), o.partner.vehicle],
            [
              t('Identity check', 'পরিচয় যাচাই'),
              o.partner.kycStatus === 'approved'
                ? t('KYC approved by Green Dhaka', 'গ্রিন ঢাকা কর্তৃক যাচাইকৃত')
                : o.partner.kycStatus,
            ],
            [
              t('Completed pickups', 'সম্পন্ন পিকআপ'),
              n(o.partner.completedPickups || 0),
            ],
            [
              t('Phone', 'ফোন'),
              (o.partner.maskedPhone || '—') +
                ' · ' +
                t('calls via support', 'কল সহায়তার মাধ্যমে'),
            ],
          ].map(([k, v]) => (
            <View key={k} style={s.between}>
              <Txt style={s.small}>{k}</Txt>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: C.ink,
                  flexShrink: 1,
                  textAlign: 'right',
                }}
              >
                {v}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.detailsCard}>
        <View style={s.between}>
          <Text style={[s.h2, { fontSize: 19 }]}>
            {t('Pickup Details', 'পিকআপের তথ্য')}
          </Text>
          {!!o.address.lat && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('View on Map', 'ম্যাপে দেখুন')}
              onPress={() =>
                openMap(o.address.lat, o.address.lng, o.address.line1)
              }
              style={({ pressed }) => [
                styles.mapPill,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Icon name="pin" color={C.green} size={16} />
              <Text style={styles.mapPillText}>
                {t('View on Map', 'ম্যাপে দেখুন')}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name="pin" color={C.green} size={20} />
          </View>
          <View style={s.grow}>
            <Text style={styles.detailMain}>{o.address.line1}</Text>
            <Txt style={s.small}>
              {[o.address.landmark, o.address.area?.name]
                .filter(Boolean)
                .join(' · ')}
            </Txt>
          </View>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Icon name="calendar" color={C.green} size={20} />
          </View>
          <View style={s.grow}>
            <Text style={styles.detailMain}>
              {t('Pickup Time', 'পিকআপের সময়')}
            </Text>
            <Txt style={s.small}>
              {o.slotStart
                ? `${date(o.slotStart, a.lang)} · ${time(o.slotStart, a.lang)}`
                : t(
                    'Instant Pickup (target 60–90 mins)',
                    'এখনই পিকআপ (লক্ষ্য ৬০–৯০ মিনিট)',
                  )}
            </Txt>
          </View>
        </View>
        {!!o.handoverOtp && (
          <>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Icon name="key" color={C.green} size={20} />
              </View>
              <View style={s.grow}>
                <Text style={styles.detailMain}>
                  {t('Pickup OTP', 'পিকআপ OTP')}
                </Text>
                <Txt style={s.small}>
                  {t(
                    'Share at the door after checking weights and receiving cash',
                    'ওজন ও নগদ বুঝে পেয়ে দরজায় দিন',
                  )}
                </Txt>
              </View>
              <View style={styles.otpBox}>
                <Text style={styles.otpText}>{o.handoverOtp}</Text>
              </View>
            </View>
          </>
        )}
      </View>
      {o.status === 'weighing' && (
        <View
          style={[s.card, { borderColor: C.green, backgroundColor: C.mint }]}
        >
          <Text style={s.h2}>
            {t('Check your final weights', 'চূড়ান্ত ওজন যাচাই করুন')}
          </Text>
          {o.items.map(i => (
            <View key={i.id} style={s.between}>
              <View>
                <Text style={[s.h3, { fontSize: 14 }]}>
                  {a.lang === 'bn' ? i.item.nameBn : i.item.name}
                </Text>
                <Txt style={s.small}>
                  {t('Estimated', 'আনুমানিক')} {i.estimatedQty} →{' '}
                  {t('Final', 'চূড়ান্ত')} {i.finalQty} {i.item.unit}
                </Txt>
              </View>
              <Text style={s.h3}>
                {money(Number(i.finalQty) * i.lockedRate)}
              </Text>
            </View>
          ))}
          {o.hasWeightDifference && (
            <View style={s.notice}>
              <Txt style={s.noticeText}>
                {t(
                  'The final quantity differs from your estimate by more than 25%. Check the digital scale before approving.',
                  'চূড়ান্ত পরিমাণ অনুমানের চেয়ে ২৫%-এর বেশি ভিন্ন। অনুমোদনের আগে ডিজিটাল স্কেল দেখুন।',
                )}
              </Txt>
            </View>
          )}
          <View style={s.divider} />
          <View style={s.between}>
            <Text style={s.h3}>
              {t('Cash you should receive', 'যত নগদ পাবেন')}
            </Text>
            <Text style={s.money}>{money(o.netPayout)}</Text>
          </View>
          {o.weightsApproved ? (
            <Pill>
              {t(
                'Weights approved · collect cash, then share OTP',
                'ওজন অনুমোদিত · নগদ বুঝে OTP দিন',
              )}
            </Pill>
          ) : (
            <Button
              title={t('These weights look right', 'ওজন সঠিক আছে')}
              icon="check"
              loading={a.busy}
              onPress={() =>
                void a.run(async () => {
                  await api.request('/orders/' + o.id + '/confirm', 'POST', {
                    weighingVersion: o.weighingVersion,
                  });
                  await load();
                })
              }
            />
          )}
          <Button
            title={t('Something doesn’t look right', 'কোনো অসঙ্গতি আছে')}
            variant="ghost"
            onPress={() => {
              setDisputing(true);
              setCancelling(false);
            }}
          />
        </View>
      )}
      <View style={s.card}>
        <Text style={s.h3}>
          {t('In your recycling bag', 'আপনার রিসাইক্লিং ব্যাগে')}
        </Text>
        {o.items.map(i => (
          <View key={i.id} style={s.between}>
            <Txt style={s.small}>
              {a.lang === 'bn' ? i.item.nameBn : i.item.name} · {i.estimatedQty}{' '}
              {i.item.unit}
            </Txt>
            <Text style={{ fontSize: 13, color: C.green, fontWeight: '700' }}>
              {money(i.lockedRate)}/{i.item.unit}
            </Text>
          </View>
        ))}
        <Txt style={{ fontSize: 10 }}>
          {t(
            'These rates were locked when you booked.',
            'বুকিংয়ের সময় এই দরগুলো লক করা হয়েছে।',
          )}
        </Txt>
      </View>
      {(!!o.photos.length ||
        !['completed', 'cancelled'].includes(o.status)) && (
        <View style={s.card}>
          <View style={s.between}>
            <Text style={s.h3}>{t('Pickup photos', 'পিকআপের ছবি')}</Text>
            <Txt style={s.small}>
              {o.photos.length} {t('photos', 'ছবি')}
            </Txt>
          </View>
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
            {o.photos.filter(p => p.uploadedBy === a.user?.id).length < 5 &&
              !['completed', 'cancelled'].includes(o.status) && (
                <IconButton
                  name="camera"
                  label={t('Add a photo', 'ছবি যোগ করুন')}
                  onPress={addPhoto}
                />
              )}
          </View>
        </View>
      )}
      {(cancelling || disputing) && (
        <View style={s.card}>
          <Text style={s.h3}>
            {disputing
              ? t('Tell us what went wrong', 'সমস্যাটি জানান')
              : t('Reason for cancellation', 'বাতিলের কারণ')}
          </Text>
          <Field
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder={t(
              'Please add a short reason…',
              'সংক্ষেপে কারণ লিখুন…',
            )}
          />
          <Txt style={s.small}>
            {disputing
              ? t(
                  'We’ll pause the pickup for an admin to review.',
                  'অ্যাডমিন যাচাইয়ের জন্য পিকআপ স্থগিত থাকবে।',
                )
              : t(
                  'Free before departure. After departure, 2 late cancellations per month are free; later ones incur ৳30.',
                  'রওনা হওয়ার আগে বিনামূল্যে। পরে মাসে ২টি বিনামূল্যে; এরপর প্রতিবার ৳৩০।',
                )}
          </Txt>
          <Button
            title={
              disputing
                ? t('Raise a dispute', 'আপত্তি জানান')
                : t('Cancel pickup', 'পিকআপ বাতিল')
            }
            variant="danger"
            disabled={reason.length < 3}
            loading={a.busy}
            onPress={() =>
              void a.run(async () => {
                await api.request(
                  '/orders/' + o.id + (disputing ? '/dispute' : '/cancel'),
                  'POST',
                  { reason },
                );
                if (!disputing) track('order_cancelled', { orderId: o.id });
                setCancelling(false);
                setDisputing(false);
                await load();
              })
            }
          />
          <Button
            title={t('Go back', 'ফিরে যান')}
            variant="ghost"
            onPress={() => {
              setCancelling(false);
              setDisputing(false);
            }}
          />
        </View>
      )}
      {!['completed', 'cancelled', 'disputed'].includes(o.status) &&
        !cancelling && (
          <Button
            title={t('Cancel this pickup', 'এই পিকআপ বাতিল')}
            variant="ghost"
            onPress={() => setCancelling(true)}
          />
        )}
      <Button
        title={t('Need a hand?', 'সহায়তা লাগবে?')}
        variant="ghost"
        icon="support"
        onPress={() => a.go('support')}
      />
    </Screen>
  );
}
export function Invoice() {
  const a = useApp(),
    { t } = a;
  const { order: o, error } = useOrder(a.route.id);
  useEffect(() => {
    if (o?.id) track('invoice_viewed', { orderId: o.id });
  }, [o?.id]);
  const [stars, setStars] = useState(5),
    [comment, setComment] = useState(''),
    [rated, setRated] = useState(false);
  if (!o)
    return (
      <Screen title={t('Digital invoice', 'ডিজিটাল ইনভয়েস')}>
        {error ? (
          <Empty
            icon="orders"
            title={t('Couldn’t load invoice', 'ইনভয়েস লোড হয়নি')}
            body={error}
          />
        ) : (
          <Loader label={t('Loading invoice…', 'ইনভয়েস আসছে…')} />
        )}
      </Screen>
    );
  if (o.status !== 'completed')
    return (
      <Screen title={t('Digital invoice', 'ডিজিটাল ইনভয়েস')}>
        <Empty
          icon="orders"
          title={t('Your receipt is on its way.', 'আপনার রসিদ তৈরি হবে।')}
          body={t(
            'The digital invoice appears after cash settlement and OTP handover.',
            'নগদ পরিশোধ ও OTP হস্তান্তরের পর ডিজিটাল ইনভয়েস পাবেন।',
          )}
        />
      </Screen>
    );
  const share = () =>
    void a.run(async () => {
      await Share.share({
        message: `GREEN DHAKA · CASH RECEIPT\nGD-${o.id}\n${date(
          o.updatedAt,
        )} ${time(o.updatedAt)}\n${o.items
          .map(
            i =>
              `${i.item.name}: ${i.finalQty} ${i.item.unit} × ${money(
                i.lockedRate,
              )} = ${money(Number(i.finalQty) * i.lockedRate)}`,
          )
          .join('\n')}\nScrap value: ${money(
          o.finalValue || 0,
        )}\nPickup fee: ${money(o.fee)}\nPickup credit: ${money(
          o.creditUsed,
        )}\nCASH RECEIVED: ${money(o.netPayout)}\nPartner: ${
          o.partner?.name
        }\nThank you for a greener Dhaka.`,
      });
    });
  const kgTotal = o.items
      .filter(i => i.item.unit === 'kg')
      .reduce((sum, i) => sum + Number(i.finalQty || 0), 0),
    pcTotal = o.items
      .filter(i => i.item.unit === 'pc')
      .reduce((sum, i) => sum + Number(i.finalQty || 0), 0);
  const isToday =
    new Date(o.updatedAt).toDateString() === new Date().toDateString();
  const Head = ({
    icon,
    glyph,
    title,
    right,
  }: {
    icon?: string;
    glyph?: string;
    title: string;
    right?: React.ReactNode;
  }) => (
    <View style={s.between}>
      <View style={[s.row, { gap: 10, flexShrink: 1 }]}>
        <View style={inv.headIcon}>
          {icon ? (
            <Icon name={icon} color={C.green} size={19} stroke={2.1} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.green }}>
              {glyph}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
  return (
    <Screen
      title={t('Digital Invoice', 'ডিজিটাল ইনভয়েস')}
      subtitle={t('Order', 'অর্ডার') + ' #GD-' + o.id.slice(0, 8).toUpperCase()}
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Share invoice', 'ইনভয়েস শেয়ার')}
          onPress={share}
          hitSlop={10}
        >
          <Icon name="share" color={C.green} size={24} stroke={2.1} />
        </Pressable>
      }
      footer={
        <View style={s.row}>
          <Pressable
            accessibilityRole="button"
            onPress={share}
            style={({ pressed }) => [
              inv.outline,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name="copy" color={C.ink} size={19} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
              {t('Share Summary', 'সারাংশ শেয়ার')}
            </Text>
          </Pressable>
          <Button
            title={t('Done', 'শেষ')}
            icon="check"
            onPress={() => a.switchTab('orders')}
            style={s.grow}
          />
        </View>
      }
    >
      <View style={inv.hero}>
        <View
          style={[
            inv.leaf,
            { left: -18, top: 18, transform: [{ rotate: '-35deg' }] },
          ]}
        >
          <Icon name="leaf" color="#3E9A72" size={70} stroke={1.6} />
        </View>
        <View
          style={[
            inv.leaf,
            { right: -16, bottom: 4, transform: [{ rotate: '120deg' }] },
          ]}
        >
          <Icon name="leaf" color="#3E9A72" size={74} stroke={1.6} />
        </View>
        <View style={inv.donePill}>
          <View style={inv.doneDot}>
            <Icon name="check" color={C.forest} size={14} stroke={3} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>
            {t('Completed', 'সম্পন্ন')}
          </Text>
        </View>
        <Text style={{ fontSize: 17, color: '#DDF1E6', fontWeight: '500' }}>
          {t('Total Payout Received', 'মোট নগদ পেয়েছেন')}
        </Text>
        <Text style={inv.amount}>{money(o.netPayout)}</Text>
        <View style={inv.timePill}>
          <Icon name="clock" color="#DDF1E6" size={15} />
          <Text style={{ fontSize: 13, color: '#EAF7F0', fontWeight: '600' }}>
            {isToday ? t('Today', 'আজ') : date(o.updatedAt, a.lang)},{' '}
            {time(o.updatedAt, a.lang)}
          </Text>
        </View>
      </View>
      <View style={inv.card}>
        <Head
          icon="scale"
          title={t('Weight Reading', 'ওজনের রিডিং')}
          right={
            <View style={inv.verified}>
              <Icon name="check" color={C.green} size={13} stroke={2.8} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.green }}>
                {o.weightsApproved
                  ? t('Seller Verified', 'বিক্রেতা যাচাইকৃত')
                  : t('Partner Verified', 'পার্টনার যাচাইকৃত')}
              </Text>
            </View>
          }
        />
        <Text style={inv.weight}>
          {kgTotal ? `${Math.round(kgTotal * 1000) / 1000} kg` : ''}
          {kgTotal && pcTotal ? ' + ' : ''}
          {pcTotal ? `${pcTotal} pc` : ''}
        </Text>
        <Txt style={{ fontSize: 13, marginTop: -6 }}>
          {t(
            'Final weight as per partner’s digital scale, approved by you',
            'পার্টনারের ডিজিটাল স্কেলের চূড়ান্ত ওজন, আপনার অনুমোদিত',
          )}
        </Txt>
        <View style={s.divider} />
        {o.items.map(i => (
          <View key={i.id} style={s.between}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>
                {a.lang === 'bn' ? i.item.nameBn : i.item.name}
              </Text>
              <Txt style={{ fontSize: 12 }}>
                {i.finalQty} {i.item.unit} × {money(i.lockedRate)}/{i.item.unit}
              </Txt>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
              {money(Number(i.finalQty) * i.lockedRate)}
            </Text>
          </View>
        ))}
      </View>
      {!!o.photos.length && (
        <View style={inv.card}>
          <Head icon="image" title={t('Pickup Photos', 'পিকআপের ছবি')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {o.photos.map(p => (
              <Image
                key={p.id}
                source={{
                  uri: api.baseUrl + p.url,
                  headers: { Authorization: 'Bearer ' + api.token },
                }}
                style={{ width: 120, height: 92, borderRadius: 12 }}
              />
            ))}
          </ScrollView>
        </View>
      )}
      <View style={inv.card}>
        <Head icon="info" title={t('Pickup Information', 'পিকআপের তথ্য')} />
        {[
          [
            'user',
            t('Scrap Partner', 'স্ক্র্যাপ পার্টনার'),
            o.partner?.name || '—',
          ],
          [
            'pin',
            t('Pickup Address', 'পিকআপ ঠিকানা'),
            `${o.address.line1}, ${o.address.area.name}`,
          ],
          [
            'calendar',
            t('Scheduled Slot', 'নির্ধারিত সময়'),
            o.slotStart
              ? `${date(o.slotStart, a.lang)} · ${time(o.slotStart, a.lang)}`
              : t('Insta-Pickup', 'এখনই পিকআপ'),
          ],
        ].map(([icon, label, value]) => (
          <View key={label} style={inv.infoRow}>
            <Icon name={icon} color="#4E5B55" size={17} />
            <Txt style={inv.infoLabel}>{label}</Txt>
            <Text style={inv.infoValue}>{value}</Text>
          </View>
        ))}
        <View style={inv.infoRow}>
          <Icon name="check" color="#4E5B55" size={17} />
          <Txt style={inv.infoLabel}>{t('Service Status', 'সেবার অবস্থা')}</Txt>
          <Text style={[inv.infoValue, { color: C.green, fontWeight: '700' }]}>
            {t('Completed & Settled ✓', 'সম্পন্ন ও পরিশোধিত ✓')}
          </Text>
        </View>
      </View>
      <View style={inv.card}>
        <Head glyph="৳" title={t('Earnings Breakdown', 'আয়ের হিসাব')} />
        <View style={inv.breakdown}>
          <View style={s.between}>
            <Txt style={{ fontSize: 14, color: '#3F4C46' }}>
              {t('Actual Scrap Value', 'প্রকৃত স্ক্র্যাপ মূল্য')}
            </Txt>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
              {money(o.finalValue || 0)}
            </Text>
          </View>
          <View style={s.between}>
            <View style={{ flexShrink: 1 }}>
              <Txt style={{ fontSize: 14, color: '#3F4C46' }}>
                {t('Doorstep Pickup Fee', 'দরজায় পিকআপ ফি')}
              </Txt>
              <Txt style={{ fontSize: 11 }}>
                {t(
                  `Free pickup when scrap value ≥ ৳${
                    a.config?.freeThreshold || 200
                  }`,
                  `স্ক্র্যাপ মূল্য ৳${
                    a.config?.freeThreshold || 200
                  } বা বেশি হলে বিনামূল্যে`,
                )}
              </Txt>
            </View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: o.fee ? C.ink : C.green,
              }}
            >
              {o.fee ? '− ' + money(o.fee) : t('FREE (৳0)', 'বিনামূল্যে (৳০)')}
            </Text>
          </View>
          {o.creditUsed > 0 && (
            <View style={s.between}>
              <Txt style={{ fontSize: 14, color: '#3F4C46' }}>
                {t('Pickup credit applied', 'পিকআপ ক্রেডিট')}
              </Txt>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.green }}>
                + {money(o.creditUsed)}
              </Text>
            </View>
          )}
        </View>
        <View style={inv.total}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
            {t('Final Cash Settlement', 'চূড়ান্ত নগদ পরিশোধ')}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>
            + {money(o.netPayout)}
          </Text>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.h3}>
          {rated
            ? t('Thanks for sharing the love.', 'মতামতের জন্য ধন্যবাদ।')
            : t('How was your pickup?', 'পিকআপ কেমন হয়েছে?')}
        </Text>
        {rated ? (
          <Pill>{t('Rating saved', 'রেটিং সেভ হয়েছে')}</Pill>
        ) : (
          <>
            <View
              style={[
                s.row,
                { justifyContent: 'center', gap: 15, paddingVertical: 10 },
              ]}
            >
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable
                  key={n}
                  accessibilityLabel={`${n} stars`}
                  onPress={() => setStars(n)}
                >
                  <Text
                    style={{
                      fontSize: 38,
                      color: n <= stars ? '#E9A23B' : '#D5DCD0',
                    }}
                  >
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field
              placeholder={t(
                'Leave a little feedback (optional)',
                'মতামত দিন (ঐচ্ছিক)',
              )}
              value={comment}
              onChangeText={setComment}
            />
            <Button
              title={t('Send feedback', 'মতামত পাঠান')}
              variant="secondary"
              loading={a.busy}
              onPress={() =>
                void a.run(async () => {
                  await api.request('/orders/' + o.id + '/rating', 'POST', {
                    stars,
                    comment,
                  });
                  track('rating_submitted', { orderId: o.id });
                  setRated(true);
                })
              }
            />
          </>
        )}
      </View>
      <View style={[s.row, { padding: 5 }]}>
        <Icon name="leaf" color={C.green} />
        <Txt style={[s.small, s.grow]}>
          {t(
            'Thank you for giving your recyclables a second life. Our city is better for it.',
            'পুনর্ব্যবহারযোগ্য জিনিসকে নতুন জীবন দেওয়ার জন্য ধন্যবাদ। আমাদের শহর আরও সুন্দর হবে।',
          )}
        </Txt>
      </View>
      <Button
        title={t('Download PDF invoice', 'PDF ইনভয়েস ডাউনলোড')}
        variant="secondary"
        icon="orders"
        onPress={() =>
          void a.run(async () => {
            const link = await api.request(
              '/orders/' + o.id + '/invoice/share',
              'POST',
            );
            await Linking.openURL(api.baseUrl + link.url);
          })
        }
      />
      <Button
        title={t('Book this again', 'আবার একই বুকিং')}
        variant="ghost"
        icon="recycle"
        onPress={() => {
          a.setAreaId(o.address.areaId);
          a.setAddressId(o.address.id);
          a.setDraft(
            o.items.map(i => ({
              itemId: i.itemId,
              quantity: String(i.estimatedQty),
              notes: i.notes,
            })),
          );
          a.go('details');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRingOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EEF6EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCEEDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.ink },
  heroEta: { fontSize: 17, fontWeight: '700', color: C.green },
  partnerCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 14,
  },
  avatar: { width: 66, height: 66, borderRadius: 33 },
  avatarFallback: {
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.mint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: C.green },
  stepper: { flexDirection: 'row', paddingHorizontal: 2 },
  stepCol: { flex: 1, alignItems: 'center', gap: 8 },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  stepLine: { flex: 1, height: 3, backgroundColor: '#D9DED6' },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D3D8D0',
    borderWidth: 0,
    borderColor: '#D3D8D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.green,
  },
  stepLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    color: C.muted,
    textAlign: 'center',
    fontWeight: '500',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#EEF6EF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCEDDF',
    padding: 16,
  },
  statusIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#DCEEDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 12,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDCC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.white,
  },
  mapPillText: { fontSize: 13, fontWeight: '700', color: C.ink },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF6EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMain: { fontSize: 15, fontWeight: '600', color: C.ink },
  detailDivider: { height: 1, backgroundColor: C.line, marginLeft: 54 },
  otpBox: {
    backgroundColor: '#E3F2E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  otpText: {
    fontSize: 24,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 3,
  },
  outlineButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  outlineText: { fontSize: 14, fontWeight: '700', color: C.green },
});
const inv = StyleSheet.create({
  hero: {
    backgroundColor: C.forest,
    borderRadius: 22,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
    overflow: 'hidden',
  },
  leaf: { position: 'absolute', opacity: 0.55 },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#5FB08B',
    backgroundColor: '#1F7253',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 4,
  },
  doneDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 52,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -1.5,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#124C37',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 15,
    gap: 12,
  },
  headIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E1F4E8',
    borderWidth: 1,
    borderColor: '#BFE3CC',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  weight: {
    fontSize: 34,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  infoLabel: { fontSize: 13, width: 104 },
  infoValue: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },
  breakdown: {
    backgroundColor: '#F2F8F4',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E1F4E8',
    borderWidth: 1,
    borderColor: '#BFE3CC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  outline: {
    flex: 1,
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#C9D3CD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
const ol = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    gap: 12,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F1F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 11,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
});
