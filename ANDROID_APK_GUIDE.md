# Building an Android `.apk` / Google Play `.aab`

This project is pre-configured as an offline-capable **Progressive Web App (PWA)** and includes **`capacitor.config.ts`** so you can generate a signed `.apk` (for direct Android download) or `.aab` (for Google Play Store submission).

## Option A — Generate a Signed `.apk` / `.aab` with Capacitor + Android Studio (Recommended)

1. Download/export the project ZIP from AI Studio and extract it on your computer.
2. Install Node dependencies and build the production web bundle:
   ```bash
   npm install
   npm run build
   ```
3. Install Capacitor CLI & Android platform:
   ```bash
   npm install @capacitor/core @capacitor/android
   npm install -D @capacitor/cli
   npx cap add android
   npx cap sync android
   ```
4. Open the generated Android native project in **Android Studio**:
   ```bash
   npx cap open android
   ```
5. In Android Studio:
   - **Test/Shareable APK**: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
   - **Google Play Store**: `Build → Generate Signed Bundle / APK → Android App Bundle (.aab)`

## Option B — Zero-Code Play Store Packaging via PWABuilder / Bubblewrap

Because this project includes a full **Web App Manifest**, **Service Worker**, and **192×192 / 512×512 / maskable PNG icons**:
1. Copy your **Shared App URL** (or host `dist/` on Firebase Hosting / Cloud Run / Vercel).
2. Paste the URL into [PWABuilder.com](https://www.pwabuilder.com/) or run Google's `npx @bubblewrap/cli init --manifest https://<your-url>/manifest.webmanifest`.
3. Download the generated signed **Android APK + Google Play `.aab`** bundle directly.
