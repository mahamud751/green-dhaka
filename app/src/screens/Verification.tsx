import React, { useState } from 'react';
import { Image, View, Text } from 'react-native';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { useApp } from '../state';
import { api } from '../api';
import { Button, C, Screen, s, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
export function Verification() {
  const a = useApp(),
    { t } = a;
  const [nid, setNid] = useState<Asset | null>(null),
    [portrait, setPortrait] = useState<Asset | null>(null);
  const pick = (kind: string) =>
    void a.run(async () => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      if (result.errorCode)
        throw Error(result.errorMessage || result.errorCode);
      const p = result.assets?.[0];
      if (p) (kind === 'nid' ? setNid : setPortrait)(p);
    });
  return (
    <Screen
      title={t(
        'A face your neighbours can trust.',
        'প্রতিবেশীদের আস্থার পরিচয়।',
      )}
      footer={
        <Button
          title={t('Submit verification photos', 'যাচাইয়ের ছবি জমা দিন')}
          disabled={!nid || !portrait}
          loading={a.busy}
          onPress={() =>
            void a.run(async () => {
              for (const [kind, p] of [
                ['nid', nid],
                ['portrait', portrait],
              ] as const) {
                const data = new FormData();
                data.append('file', {
                  uri: p!.uri,
                  type: p!.type || 'image/jpeg',
                  name: p!.fileName || kind + '.jpg',
                } as any);
                await api.request(
                  '/partner/verification/' + kind,
                  'POST',
                  data,
                );
              }
              await a.refreshUser();
              a.switchTab('partner');
            })
          }
        />
      }
    >
      <View style={[s.card, { backgroundColor: C.mint }]}>
        <Icon name="shield" size={30} color={C.green} />
        <Text style={s.h2}>
          {t('Private by design.', 'গোপনীয়তা আমাদের অগ্রাধিকার।')}
        </Text>
        <Txt>
          {t(
            'Your NID is visible only to you and authorized administrators. Your portrait is shared with customers who book a pickup with you. Updating documents requires a fresh approval.',
            'আপনার NID শুধু আপনি ও অনুমোদিত অ্যাডমিন দেখতে পাবেন। ছবি আপনার পিকআপের গ্রাহক দেখবেন। নথি বদলালে নতুন অনুমোদন লাগবে।',
          )}
        </Txt>
      </View>
      {[
        ['nid', t('NID document', 'জাতীয় পরিচয়পত্র'), nid],
        ['portrait', t('Your profile photo', 'আপনার প্রোফাইল ছবি'), portrait],
      ].map(([kind, title, photo]) => (
        <View key={String(kind)} style={s.card}>
          <Text style={s.h3}>{String(title)}</Text>
          {photo && typeof photo === 'object' && (
            <Image
              source={{ uri: photo.uri }}
              style={{ width: '100%', height: 180, borderRadius: 12 }}
            />
          )}
          <Button
            title={
              photo
                ? t('Choose another photo', 'অন্য ছবি বাছাই')
                : t('Choose photo', 'ছবি বাছাই')
            }
            variant="secondary"
            icon="camera"
            onPress={() => pick(String(kind))}
          />
        </View>
      ))}
    </Screen>
  );
}
