import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../state';
import { money, time, track } from '../api';
import { C, Empty, s, Screen, Txt } from '../components/ui';
import { Icon, MaterialArt } from '../components/Icon';
export function Market() {
  const a = useApp(),
    { t } = a;
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  useEffect(() => track('rates_viewed', { area: a.areaId }), [a.areaId]);
  const rates = a.rates.filter(
    r =>
      (filter === 'all' || r.item.categoryId === filter) &&
      (r.item.name + ' ' + r.item.nameBn)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const groups = (
    filter === 'all' ? a.categories : a.categories.filter(c => c.id === filter)
  )
    .map(c => ({
      cat: c,
      items: rates.filter(r => r.item.categoryId === c.id),
    }))
    .filter(g => g.items.length);
  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        onPress={() => a.go(a.user ? 'materials' : 'auth')}
        style={({ pressed }) => [mk.cta, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>
          {t('Schedule Pickup', 'পিকআপ নির্ধারণ')}
        </Text>
        <Icon name="plus" color={C.white} size={20} stroke={2.4} />
      </Pressable>
      <View style={mk.search}>
        <Icon name="search" color="#6F7D76" size={22} />
        <TextInput
          accessibilityLabel={t('Search for items', 'আইটেম খুঁজুন')}
          placeholder={t('Search for items', 'আইটেম খুঁজুন')}
          placeholderTextColor="#8C9892"
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: 0 }}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {[
          { id: 'all', name: t('ALL', 'সব'), nameBn: 'সব' },
          ...a.categories,
        ].map(c => {
          const on = filter === c.id;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(c.id)}
              style={[mk.chip, on && mk.chipOn]}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: on ? '800' : '600',
                  color: on ? '#0E3B28' : '#56635D',
                }}
              >
                {a.lang === 'bn' ? c.nameBn : c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Icon name="pin" color={C.green} size={16} />
        {a.areas.map(area => (
          <Pressable
            key={area.id}
            onPress={() => a.setAreaId(area.id)}
            style={[
              mk.area,
              a.areaId === area.id && {
                backgroundColor: C.mint,
                borderColor: '#BFE3CC',
              },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: a.areaId === area.id ? C.green : C.muted,
              }}
            >
              {a.lang === 'bn' ? area.nameBn : area.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {a.config?.ratesAreDemo && (
        <View style={s.notice}>
          <Txt style={s.noticeText}>
            {t(
              'Demo prices for testing. Launch rates come from a Dhaka market survey.',
              'পরীক্ষার ডেমো দর। চালুর দর আসবে ঢাকা বাজার যাচাই থেকে।',
            )}
          </Txt>
        </View>
      )}
      {groups.map(({ cat, items }) => (
        <View key={cat.id} style={{ gap: 10 }}>
          <Text style={mk.groupTitle}>
            {(a.lang === 'bn' ? cat.nameBn : cat.name).toUpperCase()}
          </Text>
          {items.map(r => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              onPress={() => {
                a.setDraft(d =>
                  d.some(i => i.itemId === r.itemId)
                    ? d
                    : [...d, { itemId: r.itemId, quantity: '', notes: '' }],
                );
                a.go(a.user ? 'details' : 'auth');
              }}
              style={({ pressed }) => [mk.row, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialArt kind={r.item.category.icon} size={62} />
              <View style={[s.grow, { gap: 4 }]}>
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: '#2E3A35' }}
                >
                  {a.lang === 'bn' ? r.item.nameBn : r.item.name}
                </Text>
                <Text style={mk.price}>
                  {money(r.price)}/
                  {r.item.unit === 'pc' ? t('Unit', 'পিস') : t('kg', 'কেজি')}
                </Text>
              </View>
              <Txt style={{ fontSize: 11, alignSelf: 'flex-start' }}>
                {t('Updated', 'আপডেট')} {time(r.effectiveFrom, a.lang)}
              </Txt>
            </Pressable>
          ))}
        </View>
      ))}
      {!rates.length && (
        <Empty
          icon="search"
          title={t('Nothing here yet', 'এখনও কিছু নেই')}
          body={t(
            'Try another search, area, or category.',
            'অন্য উপকরণ, এলাকা বা বিভাগ দেখুন।',
          )}
        />
      )}
      <Txt style={{ fontSize: 11, textAlign: 'center' }}>
        {t(
          'Rates are locked when you confirm your booking.',
          'বুকিং নিশ্চিত করার সময় দর লক করা হয়।',
        )}
      </Txt>
    </Screen>
  );
}
const mk = StyleSheet.create({
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1B2420',
    borderRadius: 16,
    minHeight: 54,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 16,
    minHeight: 54,
  },
  chip: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D5DDD8',
    backgroundColor: C.white,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipOn: {
    backgroundColor: '#6FD49B',
    borderColor: '#2FA866',
    borderWidth: 1.5,
  },
  area: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#6F7D76',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDF1EE',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  price: { fontSize: 18, fontWeight: '800', color: C.green },
});
