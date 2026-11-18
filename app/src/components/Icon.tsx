import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Ellipse,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'm15 18-6-6 6-6',
  chevron: 'm9 6 6 6-6 6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  leaf: 'M20 3C7 2 2 8 5 16c8 5 15-1 15-13ZM4 21l11-11',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  market: 'M5 20v-7m7 7V4m7 16V9',
  orders: 'M8 3H5v18l3-2 4 2 4-2 3 2V3h-3M9 3h6v4H9ZM8 11h8m-8 4h5',
  wallet: 'M20 7H5a2 2 0 0 1 0-4h13v4M4 7v13h17V7m0 4h-6v5h6',
  user: 'M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  calendar: 'M3 6h18v15H3ZM7 3v6m10-6v6M3 11h18m-14 4h3m4 0h3',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-7Z',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6ZM8 12l3 3 5-6',
  truck:
    'M1 4h13v13H1Zm13 5h4l4 5v3h-8M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0m12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  phone: 'M7 2H3c-3 10 9 22 19 19v-4l-5-3-3 3-7-7 3-3Z',
  support:
    'M4 14v-3a8 8 0 1 1 16 0v6c0 3-3 4-6 4M4 10H2v7h4v-7Zm16 0h2v7h-4v-7Z',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
  share:
    'm8 11 8-5M8 13l8 5M7 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0m15-9a3 3 0 1 1-6 0 3 3 0 0 1 6 0m0 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  camera: 'M3 7h5l2-3h4l2 3h5v14H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  scale: 'M3 20h18M12 3v17M3 6h18M6 6l-4 8h8Zm12 0-4 8h8Z',
  globe:
    'M2 12h20M12 2c-7 5-7 15 0 20 7-5 7-15 0-20ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  logout: 'M9 3H3v18h6m4-15 6 6-6 6m-6-6h14',
  gift: 'M3 8h18v5H3Zm2 5v8h14v-8M12 8v13M12 8C2 7 7-3 12 8c10-1 5-11 0 0',
  navigation: 'm21 3-7 18-3-8-8-3Z',
  recycle: 'm8 4 4-3 4 3m-4-3v7m8 2 3 5-3 4m3-4h-7M8 21H3l-2-5m2 5 4-6',
  grid: 'M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z',
  bag: 'M5 8h14l-1 13H6ZM9 8V6a3 3 0 0 1 6 0v2',
  copy: 'M9 9h11v11H9ZM5 15H4V4h11v1',
  gps: 'M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  image:
    'M3 5h18v14H3ZM3 16l5-5 4 4 3-3 6 6M16 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0',
  userplus:
    'M15 21a6 6 0 0 0-12 0M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M19 8v6m-3-3h6',
  key: 'M11 12 21 2m-4 4 3 3m-6 0 2 2M12 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  idcard:
    'M3 5h18v14H3ZM14 10h4m-4 4h4M10 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0M5 16c1-2 5-2 6 0',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3-5 1-3-5 2-4-1-4Z',
};
export function Icon({
  name,
  size = 22,
  color = '#123E31',
  stroke = 1.8,
}: {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[name] || paths.leaf}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function MaterialArt({
  kind,
  size = 96,
}: {
  kind: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 110">
      <Defs>
        <LinearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF9EA" />
          <Stop offset="1" stopColor="#D5C29D" />
        </LinearGradient>
        <LinearGradient id="bottle" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#BEECE8" />
          <Stop offset="1" stopColor="#62B6AD" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="60" cy="96" rx="43" ry="7" fill="#193F2E" opacity=".08" />
      {kind === 'paper' ? (
        <G>
          <Path d="m12 55 48-17 45 14-48 23Z" fill="#C5A577" />
          <Path d="m12 55 45 20v20L12 75Z" fill="#D9C49D" />
          <Path d="m57 75 48-23v21L57 95Z" fill="#BA9669" />
          <Path d="m16 47 47-18 38 15-46 22Z" fill="url(#paper)" />
          <Path d="m16 47 39 19v15L16 63Z" fill="#F8F3E7" />
          <Path d="m55 66 46-22v16L55 81Z" fill="#D9D5C8" />
          <Path d="m23 37 41-16 34 13-42 21Z" fill="#FFFDF4" />
          <Path d="m23 37 33 18v9L23 46Z" fill="#F5EADA" />
          <Path d="m56 55 42-21v9L56 64Z" fill="#D4C7AF" />
          <Path
            d="m34 34 31 14m-7-19 25 9M22 58l29 13m-28-8 28 13m-28-7 28 13"
            stroke="#B4AA96"
            strokeWidth="2"
          />
          <Path
            d="m51 26 19 11-1 52M34 47l24-9 31 11"
            stroke="#8B785A"
            strokeWidth="3"
            fill="none"
          />
        </G>
      ) : kind === 'plastic' ? (
        <G>
          <Path d="M23 37h17v13l9 13v27q-17 11-34 0V63l8-13Z" fill="#8CC8E6" />
          <Rect x="22" y="30" width="19" height="10" rx="3" fill="#3B78A4" />
          <Path
            d="M26 42v12l-7 12v20"
            fill="none"
            stroke="#E5F7FF"
            strokeWidth="4"
          />
          <Rect x="16" y="70" width="31" height="12" fill="#BDE2F0" />
          <Path
            d="M62 19h13v16l9 12v44q-15 12-31 0V47l9-12Z"
            fill="url(#bottle)"
          />
          <Rect x="61" y="12" width="15" height="10" rx="2" fill="#23856D" />
          <Rect x="54" y="57" width="29" height="22" rx="2" fill="#E8F7E8" />
          <Path
            d="M66 28v12l-8 12v32"
            fill="none"
            stroke="#DCF7EE"
            strokeWidth="3"
          />
          <Path d="M89 52h16v10l7 10v21q-15 7-28 0V72l5-10Z" fill="#F2C95C" />
          <Rect x="89" y="46" width="17" height="8" rx="2" fill="#E58E37" />
          <Rect x="86" y="76" width="24" height="11" fill="#FFF3C7" />
        </G>
      ) : kind === 'metal' ? (
        <G>
          <Path d="m14 77 29-12 48 12-28 17Z" fill="#8B9698" />
          <Path d="m14 77 49 17v8L14 87Z" fill="#616E72" />
          <Path d="m63 94 28-17v9l-28 16" fill="#3F5156" />
          <Path d="m34 24 17-6 4 54-18 7Z" fill="#9BA8A6" />
          <Path d="m34 24 7 3 4 49-8 3Z" fill="#CAD1CC" />
          <Path d="m63 44 31-9 5 9-31 10Z" fill="#C69C74" />
          <Path d="m68 54 31-10v14L68 68Z" fill="#9C7658" />
          <Path d="m9 63 60-29 6 10-60 29Z" fill="#65777D" />
          <Ellipse cx="72" cy="39" rx="6" ry="8" fill="#47595C" />
          <Ellipse cx="72" cy="39" rx="3" ry="4" fill="#B8C7C3" />
          <Path
            d="M82 62q-25-12-27 9t26 17"
            fill="none"
            stroke="#B58C63"
            strokeWidth="8"
          />
          <Path d="m31 88 42-12m-3 15 24-8" stroke="#D5DDD7" strokeWidth="4" />
        </G>
      ) : kind === 'electronics' ? (
        <G>
          <Rect x="19" y="24" width="65" height="47" rx="5" fill="#5B6F70" />
          <Rect x="24" y="29" width="55" height="35" rx="2" fill="#213F43" />
          <Path d="m29 33 44 27H29Z" fill="#406165" />
          <Path d="M46 71h12v12h14v5H33v-5h13Z" fill="#718783" />
          <Path d="m12 90 62-1 11 12H6Z" fill="#A1B3AA" />
          <Path d="M78 45h27v48H78Z" fill="#78938C" />
          <Rect x="83" y="50" width="17" height="4" fill="#294B43" />
          <Rect x="83" y="58" width="17" height="4" fill="#294B43" />
          <Circle cx="92" cy="80" r="4" fill="#B1D8B7" />
          <Path d="m33 96 36-1" stroke="#5A776C" strokeWidth="3" />
        </G>
      ) : kind === 'glass' ? (
        <G>
          <Path d="M29 21h10v24l8 12v33q-12 10-25 0V57l7-12Z" fill="#6C8F4B" />
          <Path
            d="M32 29v20l-6 12v23"
            fill="none"
            stroke="#C0D3A0"
            strokeWidth="3"
          />
          <Rect x="28" y="16" width="12" height="7" rx="2" fill="#3A5A2C" />
          <Path d="M60 10h11v34l9 13v34q-15 11-29 0V57l9-13Z" fill="#A1C2A8" />
          <Path
            d="M63 20v27l-7 15v24"
            fill="none"
            stroke="#E8F7E8"
            strokeWidth="4"
          />
          <Rect x="59" y="7" width="13" height="8" rx="2" fill="#597B63" />
          <Path d="m86 61 22-3-5 31q-7 10-15 0Z" fill="#C8DBD0" />
          <Path
            d="m89 66 13-2-3 21"
            stroke="#F6FFF7"
            strokeWidth="3"
            fill="none"
          />
        </G>
      ) : (
        <G>
          <Ellipse cx="58" cy="69" rx="35" ry="30" fill="#334544" />
          <Ellipse cx="58" cy="61" rx="35" ry="25" fill="#4A5E5A" />
          <Ellipse cx="58" cy="61" rx="19" ry="13" fill="#253D38" />
          <Ellipse cx="58" cy="58" rx="14" ry="8" fill="#9FB9AA" />
          <Path
            d="M26 67v12m10-5v13m12-10v15m12-15v16m12-17v14m10-19v12"
            stroke="#1D3430"
            strokeWidth="3"
          />
          <Path d="m69 84 34-7 9 12-32 13Z" fill="#6A7F75" />
        </G>
      )}
    </Svg>
  );
}
export function HeroArt() {
  return (
    <Svg width={165} height={180} viewBox="0 0 165 180">
      <Circle cx="97" cy="95" r="67" fill="#23664E" />
      <Circle cx="118" cy="70" r="43" fill="#2C775B" />
      <Path d="m42 76 67-12 10 80-66 9Z" fill="#D8F1A5" />
      <Path d="m42 76 13 17 10 67-12-7Z" fill="#A7D67B" />
      <Path
        d="M64 78c-7-39 36-45 36-7"
        fill="none"
        stroke="#E7F6C5"
        strokeWidth="5"
      />
      <G transform="translate(70 97) rotate(-8)">
        <Path
          d="m9 3 6-8 7 8m-7-8 1 16m18 1 8 10-7 7m7-7H25M8 35H-4l-5-11m5 11 9-15"
          stroke="#27754D"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Path d="M130 47c-2-21 7-30 22-31-2 18-9 28-22 31Z" fill="#A6D995" />
      <Path d="m128 49 17-26" stroke="#D4EDBB" strokeWidth="2" />
      <Circle cx="33" cy="47" r="5" fill="#B9E19A" />
      <Circle cx="141" cy="138" r="4" fill="#B9E19A" />
      <Path d="m21 116 3 6 7 1-5 5 1 7-6-4-6 3 1-7-5-5 7-1Z" fill="#80BB79" />
    </Svg>
  );
}

/** Brand mark: white map pin with a leaf on a green rounded square. */
export function LogoMark({
  size = 64,
  rounded = true,
}: {
  size?: number;
  rounded?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="gdLogoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#23B375" />
          <Stop offset="1" stopColor="#0E6A47" />
        </LinearGradient>
        <LinearGradient id="gdLogoLeaf" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#14875A" />
          <Stop offset="1" stopColor="#2DBE7E" />
        </LinearGradient>
      </Defs>
      <Rect
        width={1024}
        height={1024}
        rx={rounded ? 232 : 0}
        fill="url(#gdLogoBg)"
      />
      <Ellipse
        cx={512}
        cy={846}
        rx={118}
        ry={26}
        fill="#0A4D33"
        opacity={0.35}
      />
      <Path
        d="M512 838 C430 742 272 610 272 438 A240 240 0 1 1 752 438 C752 610 594 742 512 838 Z"
        fill="#FFFFFF"
      />
      <Path
        d="M384 556 C356 398 452 292 652 296 C668 474 574 564 384 556 Z"
        fill="url(#gdLogoLeaf)"
      />
      <Path
        d="M408 534 Q486 470 612 336"
        stroke="#FFFFFF"
        strokeWidth={18}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
