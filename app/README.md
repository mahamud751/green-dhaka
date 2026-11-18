# Green Dhaka mobile

React Native Community CLI, TypeScript, Android and iOS projects. No Expo dependency.

See [the project setup guide](../README.md) for local PostgreSQL/API startup, demo accounts and device networking.

```sh
npm ci
npm start
# second terminal
npm run android
```

The native app includes seller and partner modes selected by backend account role, English/Bangla UI, protected token storage, cached rates, booking, images, scheduling, tracking, final weights, invoice/PDF, credit/referrals, partner jobs and verification documents.

Screen source: `src/screens`. Shared UI/tokens: `src/components/ui.tsx`. Original SVG material illustrations: `src/components/Icon.tsx`. API connection and formatting: `src/api.ts`. Shared session/catalogue state: `src/state.tsx`.

Review captures are saved in `docs/screenshots` when verified. The Android debug build needs Metro. Use the root guide to configure a physical device.

```sh
npx tsc --noEmit
npm run lint -- --quiet
npm test -- --runInBand
```
