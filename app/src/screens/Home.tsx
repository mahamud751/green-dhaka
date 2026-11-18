import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp } from '../state';
import { money, time } from '../api';
import { C, Button, Pill, s, Skeleton, Txt } from '../components/ui';
import { Icon, LogoMark, MaterialArt } from '../components/Icon';
export function Home() {
  const a = useApp(),
    { t, go } = a;
  const updated = a.rates[0]?.effectiveFrom;
  const book = (param?: string) =>
    go(a.user ? 'materials' : 'auth', undefined, param);
  const today =
    updated && new Date(updated).toDateString() === new Date().toDateString();
  const tiles = a.categories.slice(0, 5);
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={[s.content, { paddingTop: 10, gap: 18 }]}
      refreshControl={
        <RefreshControl
          refreshing={a.busy}
          tintColor={C.green}
          onRefresh={() => void a.run(a.refresh)}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={s.between}>
        <View style={[s.row, { gap: 6 }]}>
          <LogoMark size={36} />
          <Text style={st.brand}>Green Dhaka</Text>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Support', 'সহায়তা')}
            onPress={() => go('support')}
            style={[st.roundButton, { backgroundColor: C.mint }]}
          >
            <Icon name="support" color={C.green} size={21} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Your profile', 'আপনার প্রোফাইল')}
            onPress={() => a.switchTab('profile')}
            style={[st.roundButton, { backgroundColor: '#E6EAE8' }]}
          >
            <Icon name="user" color="#4D5B54" size={21} />
          </Pressable>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => go(a.user ? 'addresses' : 'auth')}
        style={({ pressed }) => [
          st.locationCard,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={st.locationIcon}>
          <Icon name="pin" size={20} color={C.green} />
        </View>
        <View style={s.grow}>
          <Txt style={{ fontSize: 12, lineHeight: 16 }}>
            {t('Pickup Location', 'পিকআপের ঠিকানা')}
          </Txt>
          <Text numberOfLines={1} style={st.locationText}>
            {a.address
              ? `${a.address.line1}, ${a.address.area.name}`
              : a.areas.find(x => x.id === a.areaId)?.name ||
                t('Choose your Dhaka neighbourhood', 'ঢাকার এলাকা বেছে নিন')}
          </Text>
        </View>
        <Icon name="chevron" size={20} color={C.ink} />
      </Pressable>
      {a.offline && (
        <View style={s.notice}>
          <Txt style={s.noticeText}>
            {t(
              'You’re offline. Cached rates are shown; connect to book.',
              'আপনি অফলাইনে। সংরক্ষিত দর দেখানো হচ্ছে; বুক করতে সংযোগ করুন।',
            )}
          </Txt>
          <Pressable onPress={() => void a.run(a.refresh)}>
            <Txt style={s.link}>
              {t('Try connecting again', 'আবার সংযোগ করুন')}
            </Txt>
          </Pressable>
        </View>
      )}
      <View style={st.hero}>
        <View style={st.heroCircle} />
        <View style={st.heroTag}>
          <Text style={st.heroTagText}>
            {t('DIGITAL\nSCALE', 'ডিজিটাল\nস্কেল')}
          </Text>
        </View>
        <View style={st.heroTile}>
          <Icon name="recycle" color={C.green} size={34} stroke={2.2} />
        </View>
        <View style={st.heroCash}>
          <Icon name="wallet" color={C.white} size={22} />
        </View>
        <Text style={st.heroCaption}>
          {t('CLEANER\nDHAKA', 'পরিচ্ছন্ন\nঢাকা')}
        </Text>
        <Text style={st.heroTitle}>
          {t('Sell Your\nScrap', 'স্ক্র্যাপ\nবিক্রি করুন')}
        </Text>
        <View style={[s.row, { gap: 7, marginTop: 10, marginBottom: 18 }]}>
          <Icon name="clock" color="#9FE0BE" size={18} />
          <Text style={{ color: '#9FE0BE', fontSize: 15, fontWeight: '500' }}>
            {t('Cash at your doorstep', 'দরজায় নগদ টাকা')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Book Pickup', 'পিকআপ বুক করুন')}
          onPress={() => book()}
          style={({ pressed }) => [
            st.heroButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={st.heroButtonText}>
            {t('Book Pickup', 'পিকআপ বুক করুন')}
          </Text>
          <Icon name="arrow" color={C.ink} size={20} />
        </Pressable>
      </View>
      <View style={s.between}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <Text style={st.sectionTitle}>
            {t('Live Market Prices', 'আজকের বাজারদর')}
          </Text>
          <View style={[s.row, { gap: 6 }]}>
            <View style={st.liveDot} />
            <Txt style={{ fontSize: 12 }}>
              {updated
                ? today
                  ? t(
                      `Updated today at ${time(updated)}`,
                      `আজ ${time(updated, 'bn')}-এ আপডেট`,
                    )
                  : t(
                      `Updated ${new Date(updated).toLocaleDateString(
                        'en-GB',
                      )} ${time(updated)}`,
                      `আপডেট ${time(updated, 'bn')}`,
                    )
                : t('Connect to see live prices', 'দর দেখতে সংযোগ করুন')}
            </Txt>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => a.switchTab('market')}
          style={st.seeAll}
        >
          <Icon name="market" color={C.green} size={17} stroke={2.4} />
          <Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>
            {t('See All', 'সব দেখুন')}
          </Text>
        </Pressable>
      </View>
      {a.config?.ratesAreDemo && (
        <View style={{ marginTop: -8 }}>
          <Pill tone="amber">
            {t('DEMO RATES · not market prices', 'ডেমো দর · বাজারদর নয়')}
          </Pill>
        </View>
      )}
      <View style={st.grid}>
        {tiles.map(cat => {
          const rates = a.rates.filter(r => r.item.categoryId === cat.id),
            prices = rates.map(r => r.price),
            min = Math.min(...prices),
            max = Math.max(...prices),
            unit = rates.every(r => r.item.unit === 'pc') ? 'pc' : 'kg';
          return (
            <Pressable
              key={cat.id}
              onPress={() => book(cat.id)}
              accessibilityRole="button"
              accessibilityLabel={a.lang === 'bn' ? cat.nameBn : cat.name}
              style={({ pressed }) => [st.tile, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialArt kind={cat.icon} size={74} />
              <Text style={st.tileName}>
                {a.lang === 'bn' ? cat.nameBn : cat.name}
              </Text>
              <Text style={st.tilePrice}>
                {rates.length
                  ? (min === max
                      ? money(min)
                      : `${money(min)}–${Math.round(max)}`) + ` /${unit}`
                  : '—'}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => a.switchTab('market')}
          accessibilityRole="button"
          style={({ pressed }) => [
            st.tile,
            st.moreTile,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={st.moreIcon}>
            <Icon name="grid" color={C.white} size={22} stroke={2.2} />
          </View>
          <Text style={[st.tileName, { marginTop: 10 }]}>
            {t('View More', 'আরও দেখুন')}
          </Text>
          <Txt style={{ fontSize: 11, textAlign: 'center' }}>
            {t('All Categories', 'সব ক্যাটাগরি')}
          </Txt>
        </Pressable>
      </View>
      {!a.categories.length &&
        (a.offline ? (
          <View style={s.card}>
            <Txt>
              {t(
                'We can’t reach Green Dhaka right now. Check your internet connection and try again.',
                'এখন গ্রিন ঢাকায় সংযোগ হচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
              )}
            </Txt>
            <Button
              title={t('Try again', 'আবার চেষ্টা')}
              variant="secondary"
              onPress={() => void a.run(a.refresh)}
            />
          </View>
        ) : (
          <Skeleton rows={2} height={110} />
        ))}
      <Text style={[st.sectionTitle, { fontSize: 19 }]}>
        {t('Quick Pickup Options', 'দ্রুত পিকআপ')}
      </Text>
      <View style={[s.row, { gap: 12, alignItems: 'stretch' }]}>
        {[
          [
            'bolt',
            t('Instant Pickup', 'এখনই পিকআপ'),
            t('Usually in 60–90 mins', 'সাধারণত ৬০–৯০ মিনিটে'),
            'instant',
          ],
          [
            'calendar',
            t('Schedule Pickup', 'সময় নির্ধারণ'),
            t('Choose date & time', 'তারিখ ও সময় বাছুন'),
            'scheduled',
          ],
        ].map(([icon, title, desc, type]) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            onPress={() => book(type)}
            style={({ pressed }) => [st.quick, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Icon name={icon} color={C.ink} size={24} />
            <View style={s.grow}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
                {title}
              </Text>
              <Txt style={{ fontSize: 11, lineHeight: 15 }}>{desc}</Txt>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const st = StyleSheet.create({
  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: C.green,
    letterSpacing: -0.5,
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: { fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 1 },
  hero: {
    backgroundColor: C.forest,
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
    minHeight: 215,
  },
  heroCircle: {
    position: 'absolute',
    right: -70,
    top: -10,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#1D6C4F',
  },
  heroTag: {
    position: 'absolute',
    right: 92,
    top: 42,
    backgroundColor: '#24775A',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  heroTagText: {
    color: '#E8F6EE',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroTile: {
    position: 'absolute',
    right: -6,
    top: 64,
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#E9F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-14deg' }],
  },
  heroCash: {
    position: 'absolute',
    right: 104,
    bottom: 66,
    width: 42,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2E8A66',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  heroCaption: {
    position: 'absolute',
    right: 18,
    bottom: 26,
    color: '#E8F6EE',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.8,
    maxWidth: 210,
  },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F2FAF5',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  heroButtonText: { fontSize: 16, fontWeight: '700', color: C.ink },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22B573' },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.mint,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31.4%',
    flexGrow: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  tileName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'center',
  },
  tilePrice: { fontSize: 13, fontWeight: '700', color: C.green },
  moreTile: {
    backgroundColor: '#E7F6EC',
    borderColor: '#BFE3CC',
    justifyContent: 'center',
  },
  moreIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1FA56B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
});
