# Android builds

**Publishing on Google Play (including private testing):** follow [`PLAY_STORE_GUIDE.md`](PLAY_STORE_GUIDE.md).

## Quick test APK (sideload, no Play Store)

After completing step 1 of the Play Store guide (Capacitor 8 + `android/` project):

```bash
npm run android:sync
npm run android:open
```

In Android Studio: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. The debug APK appears under
`android/app/build/outputs/apk/debug/` and can be installed on a phone with "Install unknown apps" allowed.

## Web / PWA

Every merge to `main` deploys the game to https://nebiyev678.github.io/Restaurant-Game/ (GitHub Pages).
On Android Chrome: **⋮ → Add to Home screen** to install it like an app.
