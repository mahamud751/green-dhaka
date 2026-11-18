import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state';
import { Icon } from './Icon';
export const C = {
  green: '#14875A',
  forest: '#155E43',
  mint: '#E5F4EB',
  lime: '#D7EFAC',
  bg: '#F4F7F5',
  ink: '#16261F',
  muted: '#6F7D76',
  line: '#E2E9E5',
  white: '#FFFFFF',
  amber: '#A46E20',
  red: '#BB4F44',
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 22, paddingBottom: 32, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grow: { flex: 1 },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: C.ink,
  },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: C.ink },
  h3: { fontSize: 16, fontWeight: '700', color: C.ink },
  body: { fontSize: 14, lineHeight: 21, color: C.muted },
  small: { fontSize: 12, lineHeight: 18, color: C.muted },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: C.muted,
  },
  card: {
    backgroundColor: C.white,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: C.line },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.white,
    color: C.ink,
    fontSize: 15,
    minHeight: 50,
  },
  money: { fontSize: 30, fontWeight: '800', letterSpacing: -1, color: C.green },
  pill: {
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: C.mint,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: C.green },
  notice: { backgroundColor: '#FFF5E3', borderRadius: 14, padding: 14, gap: 5 },
  noticeText: { fontSize: 12, lineHeight: 18, color: C.amber },
  link: { fontSize: 13, fontWeight: '700', color: C.green },
  section: { gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 44, gap: 14 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.mint,
  },
  hero: {
    borderRadius: 24,
    backgroundColor: C.forest,
    overflow: 'hidden',
    padding: 22,
  },
  footer: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
    padding: 18,
    gap: 12,
  },
  step: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: C.green },
  quantity: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    color: C.ink,
    padding: 0,
  },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderColor: C.line,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: C.green },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.green },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 10 },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 3,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  shadow: {
    shadowColor: '#223D2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },
});
export function Txt({
  children,
  style,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text {...props} style={[s.body, style]}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 54,
          borderRadius: 15,
          paddingHorizontal: 19,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor:
            variant === 'primary'
              ? C.green
              : variant === 'secondary'
              ? C.mint
              : variant === 'danger'
              ? '#FCECE9'
              : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? C.white : C.green} />
      ) : (
        <>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color:
                variant === 'primary'
                  ? C.white
                  : variant === 'danger'
                  ? C.red
                  : C.green,
            }}
          >
            {title}
          </Text>
          {icon && (
            <Icon
              name={icon}
              size={19}
              color={variant === 'primary' ? C.white : C.green}
            />
          )}
        </>
      )}
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
  color = C.ink,
}: {
  name: string;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={[
        s.iconCircle,
        { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
      ]}
    >
      <Icon name={name} color={color} size={20} />
    </Pressable>
  );
}
export function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { back, t } = useApp();
  return (
    <View
      style={[
        s.row,
        {
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: C.bg,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Go back', 'ফিরে যান')}
        onPress={back}
        hitSlop={10}
        style={{
          width: 44,
          height: 44,
          justifyContent: 'center',
          paddingLeft: 6,
        }}
      >
        <Icon name="back" color={C.ink} size={26} stroke={2.2} />
      </Pressable>
      <View style={[s.grow, { alignItems: 'center' }]}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 19, fontWeight: '700', color: C.ink }}
        >
          {title}
        </Text>
        {subtitle && (
          <Txt numberOfLines={1} style={[s.small, { marginTop: 1 }]}>
            {subtitle}
          </Txt>
        )}
      </View>
      <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
/** Centered title used by top-level tab screens (no back button). */
export function PageTitle({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 10,
        backgroundColor: C.bg,
      }}
    >
      <View style={{ width: 44 }} />
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 19,
          fontWeight: '700',
          color: C.ink,
        }}
      >
        {title}
      </Text>
      <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  footer,
  header,
  right,
  scroll = true,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  /** Custom header row, used instead of the standard title header. */
  header?: React.ReactNode;
  /** Optional action at the right of the standard header. */
  right?: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <View style={s.page}>
      {header}
      {!header && title && (
        <Header title={title} subtitle={subtitle} right={right} />
      )}
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
      {footer && <View style={s.footer}>{footer}</View>}
    </View>
  );
}
export function Field({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 7 }}>
      {label && (
        <Txt style={[s.small, { fontWeight: '600', color: C.ink }]}>
          {label}
        </Txt>
      )}
      <TextInput
        placeholderTextColor="#9CA89D"
        {...props}
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Pill({
  children,
  tone = 'green',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'amber' | 'neutral';
}) {
  return (
    <View
      style={[
        s.pill,
        {
          alignSelf: 'flex-start',
          backgroundColor:
            tone === 'amber'
              ? '#FFF3D9'
              : tone === 'neutral'
              ? '#EFF1EC'
              : C.mint,
        },
      ]}
    >
      <Text
        style={[
          s.pillText,
          {
            color:
              tone === 'amber'
                ? C.amber
                : tone === 'neutral'
                ? C.muted
                : C.green,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}
/** Centered loading state for a whole page or section. */
export function Loader({ label }: { label?: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Loading'}
      style={{ alignItems: 'center', paddingVertical: 56, gap: 14 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: C.mint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={C.green} />
      </View>
      {!!label && <Txt style={{ fontSize: 14 }}>{label}</Txt>}
    </View>
  );
}
/** Pulsing placeholder cards shown while a list loads. */
export function Skeleton({
  rows = 3,
  height = 92,
}: {
  rows?: number;
  height?: number;
}) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View accessibilityLabel="Loading" style={{ gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            opacity: pulse,
            height,
            borderRadius: 18,
            backgroundColor: C.white,
            borderWidth: 1,
            borderColor: C.line,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#E8EDEA',
            }}
          />
          <View style={{ flex: 1, gap: 9 }}>
            <View
              style={{
                height: 13,
                width: '62%',
                borderRadius: 7,
                backgroundColor: '#E8EDEA',
              }}
            />
            <View
              style={{
                height: 11,
                width: '40%',
                borderRadius: 6,
                backgroundColor: '#EEF2EF',
              }}
            />
          </View>
          <View
            style={{
              height: 18,
              width: 52,
              borderRadius: 8,
              backgroundColor: '#E8EDEA',
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
}
export function Empty({
  icon = 'leaf',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={[s.iconCircle, { width: 72, height: 72, borderRadius: 36 }]}>
        <Icon name={icon} size={32} />
      </View>
      <Text style={[s.h2, { textAlign: 'center' }]}>{title}</Text>
      <Txt style={{ textAlign: 'center', maxWidth: 280 }}>{body}</Txt>
      {action}
    </View>
  );
}
export function FeeProgress({ value }: { value: number }) {
  const { config, t } = useApp();
  const threshold = config?.freeThreshold || 200,
    fee = config?.pickupFee || 40;
  const free = value >= threshold;
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 10,
        backgroundColor: free ? '#E8F6EC' : C.white,
        borderColor: free ? '#B7E0C5' : C.line,
      }}
    >
      <View style={s.between}>
        <View style={[s.row, { gap: 8, flexShrink: 1 }]}>
          {free ? (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: C.green,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={15} color={C.white} stroke={2.6} />
            </View>
          ) : (
            <Icon name="truck" size={19} color={C.muted} />
          )}
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: free ? C.green : C.ink,
            }}
          >
            {free
              ? t('Free Pickup Unlocked!', 'বিনামূল্যে পিকআপ আনলক!')
              : t('Pickup Fee Waiver', 'পিকআপ ফি মওকুফ')}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: C.ink,
            fontVariant: ['tabular-nums'],
          }}
        >
          ৳{Math.min(value, threshold)} / ৳{threshold}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: '#DCE5DF',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 8,
            width: `${Math.min(100, (value / threshold) * 100)}%`,
            backgroundColor: free ? C.forest : '#1FA56B',
            borderRadius: 4,
          }}
        />
      </View>
      <Txt style={{ fontSize: 13, lineHeight: 18, color: '#4E5B55' }}>
        {free
          ? t(
              `🎉 Your estimate is ৳${value}, so the ৳${fee} pickup fee is waived. Final fee follows weighing.`,
              `🎉 আনুমানিক মূল্য ৳${value}, তাই ৳${fee} পিকআপ ফি মওকুফ। চূড়ান্ত ফি ওজনের পরে।`,
            )
          : t(
              `Add ৳${
                threshold - value
              } more scrap to waive the ৳${fee} pickup fee!`,
              `আর ৳${
                threshold - value
              } মূল্যের স্ক্র্যাপ যোগ করলে ৳${fee} পিকআপ ফি মওকুফ!`,
            )}
      </Txt>
    </View>
  );
}
export function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <Text style={s.h2}>{title}</Text>
      {action && (
        <Pressable onPress={onPress} accessibilityRole="button">
          <Text style={s.link}>{action} ↗</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Tabs() {
  const { tab, switchTab, t, user } = useApp(),
    insets = useSafeAreaInsets();
  const list =
    user?.role === 'PARTNER'
      ? [
          ['partner', 'navigation', t('Jobs', 'কাজ')],
          ['partnerOrders', 'orders', t('Pickups', 'পিকআপ')],
          ['earnings', 'wallet', t('Earnings', 'আয়')],
          ['profile', 'user', t('Profile', 'প্রোফাইল')],
        ]
      : [
          ['home', 'home', t('Home', 'হোম')],
          ['market', 'market', t('Market', 'বাজার')],
          ['orders', 'orders', t('Orders', 'অর্ডার')],
          ['credit', 'wallet', t('Wallet', 'ওয়ালেট')],
        ];
  return (
    <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {list.map(([name, icon, label]) => (
        <Pressable
          key={name}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === name }}
          accessibilityLabel={label}
          style={s.tab}
          onPress={() => switchTab(name)}
        >
          <View
            style={{
              backgroundColor: tab === name ? C.mint : 'transparent',
              width: 60,
              height: 32,
              borderRadius: 16,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={icon}
              color={tab === name ? C.green : '#93A095'}
              size={21}
            />
          </View>
          <Text
            style={[s.tabLabel, { color: tab === name ? C.green : C.muted }]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
