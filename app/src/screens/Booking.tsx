import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useApp } from '../state';
import { api, date, money, time, track } from '../api';
import {
  Button,
  C,
  FeeProgress,
  Field,
  s,
  Screen,
  Txt,
} from '../components/ui';
import { Icon, MaterialArt } from '../components/Icon';
import type { Order } from '../types';
export function Materials() {
  const a = useApp(),
    { t } = a;
  const [selected, setSelected] = useState<string[]>(() =>
    a.draft
      .map(d => a.rates.find(r => r.itemId === d.itemId)?.item.categoryId || '')
      .filter(Boolean),
  );
  useEffect(() => {
    if (a.route.param && a.categories.some(c => c.id === a.route.param))
      setSelected(x => [...new Set([...x, a.route.param!])]);
  }, [a.route.param, a.categories]);
  const toggle = (id: string) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  return (
    <Screen
      title={t('Select Materials', 'উপকরণ বাছাই')}
      subtitle={t('Step 1 of 3', 'ধাপ ১ / ৩')}
      footer={
        <Button
          title={t(
            `Continue · ${selected.length} selected`,
            `এগিয়ে যান · ${selected.length}টি নির্বাচিত`,
          )}
          icon="arrow"
          disabled={!selected.length || a.offline}
          onPress={() => {
            for (const id of selected)
              if (
                !a.draft.some(
                  d =>
                    a.rates.find(r => r.itemId === d.itemId)?.item
                      .categoryId === id,
                )
              )
                track('category_selected', { area: a.areaId });
            a.setDraft(
              selected.map(id => {
                const old = a.draft.find(
                  d =>
                    a.rates.find(r => r.itemId === d.itemId)?.item
                      .categoryId === id,
                );
                return (
                  old || {
                    itemId:
                      a.rates.find(r => r.item.categoryId === id)?.itemId || '',
                    quantity: '',
                    notes: '',
                  }
                );
              }),
            );
            a.go('details', undefined, a.route.param);
          }}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: C.ink }}>
          {t('What do you want to sell?', 'কী বিক্রি করতে চান?')}
        </Text>
        <Txt>
          {t(
            'Select one or more scrap categories',
            'এক বা একাধিক স্ক্র্যাপ ক্যাটাগরি বাছুন',
          )}
        </Txt>
      </View>
      <View style={s.wrap}>
        {a.categories.map(cat => {
          const on = selected.includes(cat.id),
            rates = a.rates.filter(r => r.item.categoryId === cat.id);
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(cat.id)}
              style={[
                s.card,
                {
                  width: '48%',
                  flexGrow: 1,
                  alignItems: 'center',
                  padding: 16,
                  gap: 7,
                  borderColor: on ? C.green : C.line,
                  borderWidth: on ? 2 : 1,
                  backgroundColor: on ? C.mint : C.white,
                },
              ]}
            >
              {on && (
                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: C.green,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="check" size={16} color={C.white} stroke={2.6} />
                </View>
              )}
              <MaterialArt kind={cat.icon} size={108} />
              <Text style={s.h3}>
                {a.lang === 'bn' ? cat.nameBn : cat.name}
              </Text>
              <Txt style={{ color: C.green, fontSize: 12, fontWeight: '600' }}>
                {rates.length
                  ? (() => {
                      const low = rates.reduce((m, r) =>
                          r.price < m.price ? r : m,
                        ),
                        high = rates.reduce((m, r) =>
                          r.price > m.price ? r : m,
                        );
                      // Piece-priced items (laptops) read better as "up to".
                      return high.item.unit === 'pc'
                        ? t(
                            `Up to ${money(high.price)}/pc`,
                            `${money(high.price)}/পিস পর্যন্ত`,
                          )
                        : t(
                            `From ${money(low.price)}/${low.item.unit}`,
                            `${money(low.price)}/কেজি থেকে`,
                          );
                    })()
                  : '—'}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={[s.row, { padding: 8 }]}>
        <Icon name="shield" color={C.green} size={19} />
        <Txt style={[s.small, s.grow]}>
          {t(
            'Your rates are locked at booking. Your materials are weighed at your door.',
            'বুকিংয়ে দর লক থাকবে। আপনার দরজায় উপকরণের ওজন করা হবে।',
          )}
        </Txt>
      </View>
    </Screen>
  );
}
export function Details() {
  const a = useApp(),
    { t } = a;
  const estimate = Math.round(
    a.draft.reduce(
      (sum, d) =>
        sum +
        (a.rates.find(r => r.itemId === d.itemId)?.price || 0) *
          (Number(d.quantity) || 0),
      0,
    ),
  );
  const valid =
    a.draft.length > 0 &&
    a.draft.every(
      d =>
        Number(d.quantity) > 0 &&
        Number(d.quantity) <= 10000 &&
        a.rates.some(r => r.itemId === d.itemId),
    ) &&
    estimate >= (a.config?.minimumOrder || 100);
  const fee =
    estimate >= (a.config?.freeThreshold || 200)
      ? 0
      : a.config?.pickupFee || 40;
  const update = (index: number, patch: Partial<(typeof a.draft)[number]>) =>
    a.setDraft(d => d.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  const addPhotos = () =>
    void a.run(async () => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 5 - a.photos.length,
        quality: 0.7,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      if (result.errorCode)
        throw Error(result.errorMessage || result.errorCode);
      if (result.assets)
        a.setPhotos(p => [...p, ...result.assets!].slice(0, 5));
    });
  return (
    <Screen
      title={t('Pickup Details', 'পিকআপের বিবরণ')}
      subtitle={t('Step 2 of 3', 'ধাপ ২ / ৩')}
      footer={
        <>
          <FeeProgress value={estimate} />
          <View style={s.between}>
            <View>
              <Txt style={{ fontSize: 13 }}>
                {t('Estimated Payout', 'আনুমানিক পাওনা')}
              </Txt>
              <Text style={[s.money, { fontSize: 34 }]}>
                {money(Math.max(0, estimate - fee))}
              </Text>
            </View>
            <Button
              title={t('Continue', 'এগিয়ে যান')}
              icon="arrow"
              disabled={!valid || a.offline}
              onPress={() => {
                track('weight_entered', { area: a.areaId });
                a.go('schedule', undefined, a.route.param);
              }}
            />
          </View>
        </>
      }
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 25, fontWeight: '800', color: C.ink }}>
          {t('Item Specifications', 'আইটেমের বিবরণ')}
        </Text>
        <Txt>
          {t(
            'Select scrap item type and provide approximate quantity/weight',
            'স্ক্র্যাপের ধরন বাছুন ও আনুমানিক পরিমাণ/ওজন দিন',
          )}
        </Txt>
      </View>
      {a.draft.map((d, index) => {
        const rate = a.rates.find(r => r.itemId === d.itemId),
          cat = rate?.item.category,
          options = a.rates.filter(r => r.item.categoryId === cat?.id);
        if (!rate) return null;
        return (
          <View key={index} style={s.card}>
            <View style={s.between}>
              <View style={s.row}>
                <View
                  style={{
                    backgroundColor: '#F1F4F2',
                    borderRadius: 28,
                    width: 56,
                    height: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <MaterialArt kind={cat!.icon} size={50} />
                </View>
                <View>
                  <Text style={[s.h3, { fontSize: 18 }]}>
                    {a.lang === 'bn' ? cat!.nameBn : cat!.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.green,
                      marginTop: 3,
                      fontWeight: '600',
                    }}
                  >
                    {t('Rate', 'দর')}: {money(rate.price)}/{rate.item.unit} •{' '}
                    {t('Live', 'লাইভ')}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Remove material', 'উপকরণ সরান')}
                hitSlop={12}
                onPress={() =>
                  a.setDraft(prev => prev.filter((_, i) => i !== index))
                }
              >
                <Icon name="close" color={C.muted} size={22} />
              </Pressable>
            </View>
            <Txt style={{ fontSize: 13, color: '#4E5B55' }}>
              {t('Select specific item:', 'নির্দিষ্ট আইটেম বাছুন:')}
            </Txt>
            <View style={[s.wrap, { gap: 6 }]}>
              {options.map(r => (
                <Pressable
                  key={r.id}
                  onPress={() =>
                    update(index, { itemId: r.itemId, quantity: '' })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 12,
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                    backgroundColor:
                      d.itemId === r.itemId ? '#DDF3E5' : C.white,
                    borderWidth: 1,
                    borderColor: d.itemId === r.itemId ? '#A9DDBD' : '#D5DDD8',
                  }}
                >
                  {d.itemId === r.itemId && (
                    <Icon name="check" color={C.green} size={15} stroke={2.6} />
                  )}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: d.itemId === r.itemId ? C.green : '#4E5B55',
                    }}
                  >
                    {a.lang === 'bn' ? r.item.nameBn : r.item.name}{' '}
                    {money(r.price)}/{r.item.unit}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View
              style={[
                s.row,
                {
                  borderWidth: 1.5,
                  borderColor: d.quantity ? C.green : C.line,
                  borderRadius: 14,
                  padding: 16,
                },
              ]}
            >
              <TextInput
                accessibilityLabel={t('Estimated quantity', 'আনুমানিক পরিমাণ')}
                value={d.quantity}
                onChangeText={value => {
                  if (/^\d{0,5}(\.\d{0,3})?$/.test(value))
                    update(index, { quantity: value });
                }}
                keyboardType={
                  rate.item.unit === 'pc' ? 'number-pad' : 'decimal-pad'
                }
                placeholder="0"
                placeholderTextColor="#B0BAAE"
                style={s.quantity}
              />
              <Text style={{ fontSize: 16, color: C.muted }}>
                {rate.item.unit === 'pc' ? t('pcs', 'টি') : t('kg', 'কেজি')}
              </Text>
            </View>
            <Field
              placeholder={t(
                'Anything we should know? (optional)',
                'কিছু জানানোর আছে? (ঐচ্ছিক)',
              )}
              value={d.notes}
              onChangeText={notes => update(index, { notes })}
              maxLength={500}
            />
          </View>
        );
      })}
      <Pressable
        accessibilityRole="button"
        onPress={() => a.go('materials')}
        style={[s.row, { gap: 10, paddingVertical: 4 }]}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: C.green,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" color={C.green} size={14} stroke={2.6} />
        </View>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.green }}>
          {t('Add Another Material', 'আরও উপকরণ যোগ করুন')}
        </Text>
      </Pressable>
      <View style={s.section}>
        <View style={s.between}>
          <Text style={s.h3}>
            {t('A quick photo helps', 'ছবি দিলে সুবিধা হবে')}
          </Text>
          <Txt style={s.small}>
            {a.photos.length}/5 · {t('optional', 'ঐচ্ছিক')}
          </Txt>
        </View>
        <View style={s.wrap}>
          {a.photos.map((p, i) => (
            <Pressable
              accessibilityLabel={t('Remove photo', 'ছবি সরান')}
              key={p.uri}
              onPress={() =>
                a.setPhotos(prev => prev.filter((_, n) => n !== i))
              }
            >
              <Image
                source={{ uri: p.uri }}
                style={{ width: 75, height: 75, borderRadius: 14 }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 2,
                  top: 2,
                  backgroundColor: C.white,
                  borderRadius: 9,
                }}
              >
                <Icon name="close" size={17} />
              </View>
            </Pressable>
          ))}
          {a.photos.length < 5 && (
            <Pressable
              onPress={addPhotos}
              style={{
                width: 75,
                height: 75,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#B4C7B6',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Icon name="camera" color={C.green} />
              <Txt style={{ fontSize: 9 }}>{t('Add photo', 'ছবি দিন')}</Txt>
            </Pressable>
          )}
        </View>
      </View>
      {estimate < (a.config?.minimumOrder || 100) && (
        <Txt style={{ fontSize: 12, color: C.amber }}>
          {t(
            `The minimum pickup value is ${money(
              a.config?.minimumOrder || 100,
            )}.`,
            `সর্বনিম্ন পিকআপ মূল্য ${money(a.config?.minimumOrder || 100)}।`,
          )}
        </Txt>
      )}
    </Screen>
  );
}
export function Schedule() {
  const a = useApp(),
    { t, run } = a;
  const [type, setType] = useState(
      a.route.param === 'scheduled' ? 'scheduled' : 'instant',
    ),
    [slots, setSlots] = useState<{ start: string; end: string }[]>([]),
    [slot, setSlot] = useState(''),
    [useCredit, setUseCredit] = useState(false),
    [credit, setCredit] = useState(0);
  const estimate = Math.round(
      a.draft.reduce(
        (sum, d) =>
          sum +
          (a.rates.find(r => r.itemId === d.itemId)?.price || 0) *
            Number(d.quantity),
        0,
      ),
    ),
    fee =
      estimate >= (a.config?.freeThreshold || 200)
        ? 0
        : a.config?.pickupFee || 40;
  useEffect(() => {
    void run(async () => {
      const [data, balance] = await Promise.all([
        api.request('/slots'),
        api.request('/credit'),
      ]);
      setSlots(data);
      setSlot(data[0]?.start || '');
      setCredit(balance.balance);
    });
  }, [run]);
  const book = () =>
    void a.run(async () => {
      if (!a.user) {
        a.go('auth');
        return;
      }
      if (!a.address)
        throw Error(
          t('Add your pickup address first', 'আগে পিকআপ ঠিকানা যোগ করুন'),
        );
      const order = await api.request<Order>('/orders', 'POST', {
        addressId: a.address.id,
        type,
        ...(type === 'scheduled' ? { slotStart: slot } : {}),
        items: a.draft.map(d => ({
          itemId: d.itemId,
          quantity: Number(d.quantity),
          notes: d.notes,
        })),
        useCredit,
      });
      if (type === 'scheduled')
        track('slot_selected', { orderId: order.id, area: a.areaId });
      track('booking_confirmed', { orderId: order.id, area: a.areaId });
      let photoError = false;
      for (const photo of a.photos) {
        try {
          const data = new FormData();
          data.append('file', {
            uri: photo.uri,
            type: photo.type || 'image/jpeg',
            name: photo.fileName || 'photo.jpg',
          } as any);
          await api.request(`/orders/${order.id}/photos`, 'POST', data);
        } catch {
          photoError = true;
        }
      }
      a.setDraft([]);
      a.setPhotos([]);
      a.go('track', order.id);
      if (photoError)
        throw Error(
          t(
            'Pickup booked. Some photos could not upload; you can add them from tracking.',
            'পিকআপ বুক হয়েছে। কিছু ছবি আপলোড হয়নি; ট্র্যাকিং থেকে যোগ করুন।',
          ),
        );
    });
  const dayKeys = [...new Set(slots.map(x => x.start.slice(0, 10)))];
  const [day, setDay] = useState('');
  const selectedDay = day || dayKeys[0];
  const net = Math.max(
    0,
    estimate - fee + (useCredit ? Math.min(credit, fee) : 0),
  );
  const ORANGE = '#E8771A';
  return (
    <Screen
      title={t('Confirm Pickup Slot', 'পিকআপ সময় নিশ্চিত করুন')}
      subtitle={t('Step 3 of 3 • Slot & Address', 'ধাপ ৩ / ৩ • সময় ও ঠিকানা')}
      footer={
        <Button
          title={
            type === 'instant'
              ? t('Find Nearest Partner', 'নিকটতম পার্টনার খুঁজুন')
              : t('Confirm Scheduled Pickup', 'নির্ধারিত পিকআপ নিশ্চিত করুন')
          }
          icon="arrow"
          loading={a.busy}
          disabled={
            !a.address ||
            a.offline ||
            !a.draft.length ||
            (type === 'scheduled' && !slot)
          }
          onPress={book}
        />
      }
    >
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <View style={s.between}>
          <View style={[s.row, { gap: 12 }]}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: C.mint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="bag" color={C.green} size={22} stroke={2.2} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>
              {t('Scrap Items', 'স্ক্র্যাপ আইটেম')} ({a.draft.length})
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#E1F4E8',
              borderWidth: 1,
              borderColor: '#BFE3CC',
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>
              {t('Est. Net', 'আনুমানিক')} {money(net)}
            </Text>
          </View>
        </View>
        <View style={[s.wrap, { gap: 8 }]}>
          {a.draft.map(d => {
            const r = a.rates.find(x => x.itemId === d.itemId);
            return (
              <View
                key={d.itemId}
                style={{
                  backgroundColor: '#F1F4F2',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.line,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 13, color: '#3F4C46' }}>
                  {a.lang === 'bn' ? r?.item.nameBn : r?.item.name} •{' '}
                  {d.quantity}
                  {r?.item.unit} @ {money(r?.price || 0)}/{r?.item.unit}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={st.section}>{t('Pickup Address', 'পিকআপ ঠিকানা')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => a.go('addresses')}
          style={[s.card, s.row, { padding: 14 }]}
        >
          <View
            style={[
              s.iconCircle,
              { backgroundColor: C.mint, width: 46, height: 46 },
            ]}
          >
            <Icon name="pin" color={C.green} size={22} />
          </View>
          <View style={s.grow}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 15, fontWeight: '700', color: C.ink }}
            >
              {a.address
                ? a.address.line1
                : t('Add pickup address', 'পিকআপ ঠিকানা যোগ করুন')}
            </Text>
            <Txt numberOfLines={1} style={[s.small, { marginTop: 2 }]}>
              {a.address
                ? [a.address.landmark, a.address.area.name]
                    .filter(Boolean)
                    .join(' · ')
                : t(
                    'Choose a location in our launch areas',
                    'আমাদের চালু এলাকার একটি ঠিকানা দিন',
                  )}
            </Txt>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#E1F4E8',
              borderWidth: 1,
              borderColor: '#BFE3CC',
              borderRadius: 12,
              paddingHorizontal: 11,
              paddingVertical: 8,
            }}
          >
            <Icon name="gps" color={C.green} size={16} />
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>
              {a.address ? t('Change', 'বদলান') : t('Add', 'যোগ')}
            </Text>
          </View>
        </Pressable>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={st.section}>
          {t('Select Pickup Schedule', 'পিকআপের সময় বাছুন')}
        </Text>
        {[
          [
            'scheduled',
            'calendar',
            t('Schedule for Later', 'পরে পিকআপ'),
            t(
              'Pick date and convenient time slot',
              'তারিখ ও সুবিধামতো সময় বাছুন',
            ),
            t('RECOMMENDED', 'প্রস্তাবিত'),
          ],
          [
            'instant',
            'bolt',
            t('Insta-Pickup', 'এখনই পিকআপ'),
            t(
              'Connects live with the nearest verified partner',
              'নিকটতম যাচাইকৃত পার্টনারের সাথে যুক্ত করে',
            ),
            t('60–90 MINS', '৬০–৯০ মিনিট'),
          ],
        ].map(([value, icon, title, desc, tag]) => {
          const on = type === value,
            instant = value === 'instant',
            tone = instant ? ORANGE : C.green;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setType(value)}
              style={[
                s.card,
                s.row,
                {
                  padding: 15,
                  borderWidth: on ? 1.5 : 1,
                  borderColor: on ? tone : C.line,
                  backgroundColor: on
                    ? instant
                      ? '#FFF6EC'
                      : '#EEF8F1'
                    : C.white,
                },
              ]}
            >
              <View
                style={[
                  s.iconCircle,
                  {
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: on ? tone : '#EEF1EF',
                  },
                ]}
              >
                <Icon name={icon} color={on ? C.white : '#4E5B55'} size={22} />
              </View>
              <View style={[s.grow, { gap: 3 }]}>
                <View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '700', color: C.ink }}
                  >
                    {title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: instant ? '#FDE7C8' : '#D8F1E1',
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        letterSpacing: 0.5,
                        color: instant ? '#A3560C' : C.green,
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                </View>
                <Txt style={{ fontSize: 13, lineHeight: 18 }}>{desc}</Txt>
              </View>
              <View style={[s.radio, { borderColor: on ? tone : '#9AA59F' }]}>
                {on && <View style={[s.dot, { backgroundColor: tone }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
      {type === 'scheduled' && (
        <View style={s.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            {dayKeys.map(d => (
              <Pressable
                key={d}
                onPress={() => {
                  setDay(d);
                  setSlot(slots.find(x => x.start.startsWith(d))!.start);
                }}
                style={[
                  s.pill,
                  { backgroundColor: selectedDay === d ? C.green : C.white },
                ]}
              >
                <Text
                  style={[
                    s.pillText,
                    { color: selectedDay === d ? C.white : C.muted },
                  ]}
                >
                  {date(d + 'T06:00:00Z', a.lang)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.wrap}>
            {slots
              .filter(x => x.start.startsWith(selectedDay || '!'))
              .map(x => (
                <Pressable
                  key={x.start}
                  onPress={() => setSlot(x.start)}
                  style={[
                    s.pill,
                    {
                      borderRadius: 10,
                      backgroundColor: slot === x.start ? C.mint : C.white,
                      borderWidth: 1,
                      borderColor: slot === x.start ? C.green : C.line,
                    },
                  ]}
                >
                  <Text style={s.pillText}>
                    {time(x.start, a.lang)} – {time(x.end, a.lang)}
                  </Text>
                </Pressable>
              ))}
          </View>
          <Txt style={s.small}>
            {t(
              'All times are Bangladesh time (Asia/Dhaka).',
              'সব সময় বাংলাদেশ সময় অনুযায়ী।',
            )}
          </Txt>
        </View>
      )}
      <FeeProgress value={estimate} />
      {credit > 0 && fee > 0 && (
        <Pressable
          onPress={() => setUseCredit(v => !v)}
          style={[s.card, s.between]}
        >
          <View>
            <Text style={s.h3}>
              {t('Use pickup credit', 'পিকআপ ক্রেডিট ব্যবহার')}
            </Text>
            <Txt style={s.small}>
              {money(credit)}{' '}
              {t('available · offsets fee only', 'আছে · শুধু ফি কমাতে')}
            </Txt>
          </View>
          <View style={[s.radio, useCredit && s.radioSelected]}>
            {useCredit && <View style={s.dot} />}
          </View>
        </Pressable>
      )}
      <View
        style={[
          s.row,
          {
            alignItems: 'flex-start',
            backgroundColor: C.white,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 14,
            padding: 14,
          },
        ]}
      >
        <Icon name="info" size={20} color={C.muted} />
        <Txt style={[s.small, s.grow, { fontSize: 13, lineHeight: 19 }]}>
          {t(
            'Prices are estimated. Final payout is calculated after doorstep digital weighing, at your locked booking rates.',
            'এটি আনুমানিক হিসাব। বুকিংয়ের লক করা দরে দরজায় ডিজিটাল ওজন অনুযায়ী চূড়ান্ত মূল্য ও ফি নির্ধারিত হবে।',
          )}
        </Txt>
      </View>
    </Screen>
  );
}
const st = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '700', color: C.ink },
});
