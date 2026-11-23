# Publishing Restaurant Empire on Google Play (private testing)

This guide takes the game from this repo to **Google Play internal testing**: the app is on Google Play,
but only people you invite can see and install it. Nothing becomes public.

Everything that can be prepared in the repo is already done:

| Ready in the repo | Where |
|---|---|
| Capacitor config (app id `com.restaurantempire.chef`, name "Restaurant Empire") | `capacitor.config.ts` |
| App icon + adaptive icon layers + splash screen sources | `assets/` |
| Play Store icon (512 × 512, 32-bit PNG) | `store-assets/play-store-icon-512.png` |
| Feature graphic (1024 × 500) | `store-assets/feature-graphic-1024x500.png` |
| Privacy policy page | `public/privacy.html` → **https://nebiyev678.github.io/Restaurant-Game/privacy.html** (live after this is merged) |
| Shortcut scripts | `npm run android:sync`, `npm run android:open`, `npm run android:assets` |

You do the steps below on your own computer, because they need Android Studio and your private signing key.

---

## 0. What you need

- **Node.js 22 or newer** (required by Capacitor 8): `node -v`
- **Android Studio** (latest), with the Android SDK it installs by default
- **Git**, and a clone of this repo: `git clone https://github.com/nebiyev678/Restaurant-Game.git`
- A **Google Play Console** developer account: https://play.google.com/console (one-time fee + identity check)
- An Android phone with the Google account you'll test with

---

## 1. Create the Android project (one time)

```bash
cd Restaurant-Game
npm install
npm install @capacitor/core@^8 @capacitor/android@^8
npm install -D @capacitor/cli@^8 @capacitor/assets
npm run build
npx cap add android
```

This creates the `android/` folder. Commit it (`git add android package.json package-lock.json` or `bun.lock`)
so future builds are reproducible.

> Capacitor 8 handles Android 15+ "edge-to-edge" automatically (status bar / navigation bar insets), so the HUD
> stays clear of notches and the gesture bar without extra plugins.

### 1a. Allow vibration
Open `android/app/src/main/AndroidManifest.xml` and add this line next to the existing
`android.permission.INTERNET` line:

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

Without it, the game's vibration feedback silently does nothing on Android.

### 1b. Check the target Android version
Google Play requires new apps and updates to **target Android 16 (API level 36)**.
Open `android/variables.gradle` and make sure these say 36 (Capacitor 8 normally does this already):

```gradle
compileSdkVersion = 36
targetSdkVersion = 36
```

### 1c. App icons and splash screen
```bash
npm run android:assets
```
This turns the images in `assets/` into every Android icon size, the adaptive icon and the Android 12+ splash.

---

## 2. Every time you build a new version

```bash
git pull                 # get the latest merged changes
npm install
npm run android:sync     # builds the game and copies it into the Android project
npm run android:open     # opens Android Studio
```

**Bump the version before each upload.** In `android/app/build.gradle`:

```gradle
versionCode 2        // must go up by at least 1 for EVERY upload (1, 2, 3, ...)
versionName "1.1"    // what players see
```

Quick test on your own phone (USB debugging on): press **Run ▶** in Android Studio.

---

## 3. Build the signed app bundle (.aab)

In Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle → Next**.

- First time: **Create new…** key store. Save it **outside** the repo (e.g. `~/keys/restaurant-empire-upload.jks`).
- Fill in the passwords and the key alias, choose **release**, then **Create**.
- The file appears at `android/app/release/app-release.aab`.

> 🔐 **Back up the key store file and both passwords** somewhere safe (password manager + a second copy).
> Never commit them to GitHub. Google Play uses *Play App Signing*: Google keeps the final signing key and this
> file is your **upload key**. If you lose it, you have to ask Google support to reset it.

---

## 4. Create the app in Play Console (one time)

1. **Create app**: name *Restaurant Empire* · language · **Game** · **Free** · accept the declarations.
2. Go through the **Set up your app** checklist on the dashboard. Suggested answers, **check each one is still
   true for your build** before submitting:

| Section | Suggested answer |
|---|---|
| Privacy policy | `https://nebiyev678.github.io/Restaurant-Game/privacy.html` |
| App access | All functionality available without special access (no login) |
| Ads | **No**, the app does not contain ads |
| Content rating | Fill in the questionnaire honestly: cartoon cooking/management game, no violence, no gambling, no user-generated content or chat, no purchases |
| Target audience | Pick the age groups you want. Choosing ages **under 13** adds Google's *Families* policy requirements; **13+** keeps setup simpler. |
| News app | No |
| Data safety | **No data collected** and **no data shared**. The game keeps progress only on the device (local storage) and has no accounts, ads or analytics. Fonts are fetched from Google Fonts. |
| Government app / financial features / health | No |

3. **Store listing** (Grow → Store presence → Main store listing):
   - App icon: `store-assets/play-store-icon-512.png`
   - Feature graphic: `store-assets/feature-graphic-1024x500.png`
   - Phone screenshots: at least 2, taken on your phone (power + volume-down) while playing
   - Short description (max 80 chars), e.g. *Cook, serve and grow your cozy restaurant into a city-wide empire.*
   - Full description: what the game is, main features (cooking, combo orders, staff, city, cars, houses)

These are needed even for testing tracks, but the listing is **not visible to the public** while you only use
internal or closed testing.

---

## 5. Release to internal testing (private)

1. **Test and release → Testing → Internal testing → Create new release.**
2. Upload `app-release.aab`, add release notes (e.g. "First test build"), **Save → Review release → Start rollout**.
3. **Testers** tab → **Create email list** → add your testers' Google account emails (up to 100) → Save.
4. Copy the **opt-in link** ("Join on the web") and send it to your testers.
5. Each tester opens the link on their Android phone → **Accept invitation** → **Download it on Google Play**.

Internal testing has no review queue: new versions usually reach testers within minutes. For each update,
repeat **step 2 → 3 → 5.1–5.2** with a higher `versionCode`.

---

## 6. Later: going public (optional)

For **personal** developer accounts created after 13 November 2023, Google requires a **closed test with at least
12 testers opted in for 14 days in a row** before you can apply for production (public) access.
Internal testing does **not** count toward this. When you're ready:

1. **Testing → Closed testing → Create track**, upload the same build, add 15–20 testers (a buffer for drop-outs).
2. Keep them opted in for 14+ continuous days.
3. Apply for production access from the dashboard and answer the questions about your test.

Organization accounts (with a D-U-N-S number) are exempt from this rule.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npx cap sync` complains about versions | Make sure `@capacitor/core`, `@capacitor/android` and `@capacitor/cli` are all `8.x` |
| Gradle build fails after changes | `cd android && ./gradlew clean`, then build again in Android Studio |
| "Version code 1 has already been used" | Increase `versionCode` in `android/app/build.gradle` |
| "Your app must target API level 36" | Set `targetSdkVersion = 36` in `android/variables.gradle` (step 1b) |
| No vibration on Android | Add the VIBRATE permission (step 1a) and check vibration is On in game Settings |
| Testers can't find the app | They must open the opt-in link **while signed in** with the exact email you added, and accept first |
