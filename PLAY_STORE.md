# 💨 FartSpace — getting the Android app onto Google Play

Plain English, in order. Nothing here costs anything to *build* — the only
money is Google's one-time $25 Play Console fee, paid by you, when you are
ready to publish. Apple is skipped entirely: you only use Android, and the
App Store would cost $99 a year.

## What you already have

- **The website:** https://fartspace.netlify.app/ — live, free, public.
  It is also an installable PWA now (manifest + service worker + icons),
  so anyone on Android can already "Add to Home screen" from Chrome and
  get an app-like icon. That costs $0 and needs no store at all.
- **This folder:** the native Android app, built free with Capacitor
  (open source). Same web files, same Supabase feed, wrapped in a real
  Android app shell.
  - App name: **FartSpace**
  - Package / appId: `com.shatteredlayerstudio.fartspace`
    (this is permanent — it can never change once the app is on Play)
  - Version: 1.0 (versionCode 1)
- **No iOS / Apple anything.** Not built, not needed, not paid for.

## How to build the app (free)

### Option A — Android Studio (easiest if you have a computer)

1. Install **Android Studio** (free) from
   https://developer.android.com/studio — it installs the Android SDK
   and Java for you.
2. Open this folder's `android/` subfolder in Android Studio.
3. Wait for Gradle to finish syncing (first time takes a few minutes).
4. **Test build (debug APK):** menu **Build → Build App Bundle(s) / APK(s)
   → Build APK(s)**. The APK lands in
   `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to your
   phone, tap it, install it. That is the free test version.
5. **Release build (for Play):** menu **Build → Generate Signed App
   Bundle / APK → Android App Bundle**. You need a signing key — see
   "Your signing key" below. The output is an **.aab** file. That is the
   file Google Play wants (not an APK).

### Option B — GitHub Actions (recommended: free, no Android Studio, no setting change)

This is the way that actually works right now. The build runs on
GitHub's computers, in the cloud, for free — no Android Studio, no
`other_tcp` setting, nothing installed on your phone.

**What the workflow does** (`.github/workflows/build-android.yml`,
already in this folder): on every push to `main`, or when you press
**Run workflow**, it installs Node 22, JDK 17 and the Android SDK
(API 36), runs `npm ci` + `npx cap sync android`, then builds **both**
files and uploads them as downloadables on that run:

- **`fartspace-debug.apk`** — the test version. Download it, copy it
  to your phone, tap it and install it. That is how you try the app.
- **`fartspace-release-unsigned.aab`** — the release file Google Play
  wants, but **unsigned**. Play will NOT accept this file as-is — it
  has to be signed with your release key first (see "Your signing key"
  and "Signing the AAB in GitHub Actions" below).

**Step 1 — Put this folder on GitHub (you do this bit, free):**

1. Go to https://github.com and create a free account (sign up with
   ryanh4201@gmail.com, or any email you like). No card needed.
2. Create a **new repository** — call it `fartspace-android`, leave it
   **Public** (free) or Private (also free, your choice), and do **not**
   tick "Add a README" (this folder already has one).
3. Push this folder into it. On a computer, in a terminal inside this
   folder:
   ```bash
   git init
   git add .
   git commit -m "FartSpace Android app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/fartspace-android.git
   git push -u origin main
   ```
   GitHub will ask you to sign in when you push — that is normal.
   (If you do not have a computer handy, say so and Muse can walk
   you through it another way. Do not paste any GitHub password or
   token into chat.)
4. The `.gitignore` in this folder already keeps `node_modules/`,
   build output and any keystore files out of the repo, so only the
   real project files go up.

**Step 2 — Run the build:**

1. On GitHub, open your repo → **Actions** tab → **Build FartSpace
   Android** → **Run workflow** (or just push any change to `main`
   and it runs by itself).
2. Wait a few minutes for the green tick. If it goes red, open the
   run and read the failing step — it will say which command failed.
3. At the bottom of the finished run, under **Artifacts**, download
   `fartspace-debug.apk` and `fartspace-release-unsigned.aab`.

**Step 3 — Test the APK on your phone:**

Copy `fartspace-debug.apk` to your Galaxy, tap it, allow "Install
unknown apps" for your file manager/browser if it asks, and install.
Open FartSpace — the feed should load live from Supabase, same as
the website. If it shows demo posts instead, the `config.js` in the
app is stale — re-copy it from the website folder and re-run the
workflow (see "Keeping the app up to date").

**Signing the AAB in GitHub Actions (needed before Play will take it):**

The workflow above deliberately builds an *unsigned* AAB — no
keystore is in this repo, and there never should be. When you have
made your signing keystore (see "Your signing key" below), you can
make Actions sign the release for you instead of signing it on your
own computer:

1. In your GitHub repo, go to **Settings → Secrets and variables →
   Actions → New repository secret** and add these four secrets
   (the *values* come from your keystore — never type them in chat):
   - `ANDROID_KEYSTORE_BASE64` — your `.jks` file, base64-encoded
     (`base64 -w0 fartspace-release.keystore` on a computer)
   - `ANDROID_KEYSTORE_PASSWORD` — the keystore password
   - `ANDROID_KEY_ALIAS` — the key alias (e.g. `fartspace`)
   - `ANDROID_KEY_PASSWORD` — the key password
2. Add this signing step to the workflow, just before
   "Build unsigned release AAB", and change that step to use the
   signed file:
   ```yaml
   - name: Decode signing keystore
     run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/fartspace-release.keystore
   ```
   plus a `signingConfigs` block in `android/app/build.gradle`
   (release → storeFile `fartspace-release.keystore`, with the
   passwords read from `System.getenv(...)`). Ask Muse to add this
   when you are ready — do not guess at it.
3. Re-run the workflow. The AAB it uploads is then the **signed**
   one Play Console accepts.

Until that is done, the AAB from Actions is a test of the build, not
a Play upload.

### Option C — command line (only works off this VM)

> **Heads-up — the build does NOT yet work on this Muse VM, and
> the `other_tcp` fix below is not visible in the Android Muse app**
> (K checked — that Permissions screen ends at "Spaces and scheduled
> tasks"; the setting is on the web version of Muse). **Use Option B
> (GitHub Actions) instead** — it is free, needs no setting change,
> and the workflow is already written. The rest of this section is
> kept for reference if you ever build on a normal computer.

```bash
export JAVA_HOME=~/jdk17            # JDK 17
export ANDROID_HOME=~/android-sdk   # Android SDK, API 36 + build-tools 36
export PATH=$JAVA_HOME/bin:$PATH
cd ~/workspace/fartspace-android
npx cap sync android                # copy the latest web files into the app
cd android
./gradlew assembleDebug             # free test APK
./gradlew bundleRelease             # release .aab (needs signing — see below)
```

The debug APK from `assembleDebug` is at
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Your signing key — do this once, keep it safe

Google Play needs every release signed with the **same** key, forever.
If you lose it, you cannot update the app — you would have to publish
a brand-new app under a new name.

1. In Android Studio, **Build → Generate Signed App Bundle / APK** walks
   you through creating a keystore file (`.jks`) + a key password.
   Or from a terminal:
   ```bash
   keytool -genkeypair -v -keystore fartspace-release.keystore \
     -alias fartspace -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Save the keystore file + its passwords somewhere safe and backed
   up** (password manager / USB stick). Do NOT put it in the project
   folder, do NOT email it to anyone, do NOT commit it to GitHub.
3. If you use Play App Signing (Google's recommended default), Google
   keeps a copy of the *upload* key for you, but you still need your
   own keystore to sign the upload.

## Google Play — the $25 and the closed test

### 1) Play Console account — $25, one time, paid by you

1. Go to https://play.google.com/console and sign in with your Google
   account (ryanh4201@gmail.com).
2. Create a developer account. Google charges a **one-time $25
   registration fee** (card payment). There is no yearly renewal for
   Google Play — that $99-a-year figure is Apple's, and you are not
   using Apple.
3. Fill in your developer details (name, email, etc.). Google verifies
   your identity — have your details straight, the $25 is not refunded
   if identity verification fails.

### 2) Closed test — 12 testers, 14 days (new personal accounts)

Google requires **new personal developer accounts** to run a closed
test before they can publish to production:

- At least **12 testers** opted in, continuously, for **14 days**.
- You add their email addresses in Play Console → Testing → Closed
  testing, and they install the app from a private test link.
- So: line up 12 people (friends, family, anyone with Android) *before*
  you expect the app to go live. The 14 days start once they are in.
- After the test, you apply for production access in Play Console.
  Google reviews the application — this costs nothing extra, just time.

### 3) Store listing — what you need to prepare

- **App name:** FartSpace
- **Short description** (80 chars max) and **full description** — say
  what it is in plain words: a joke social feed for farts, posts are
  moderated before they go live.
- **App icon:** 512×512 PNG — use `fartspace-public/icons/icon-512.png`
  (the fart-cloud icon, already made for this).
- **Feature graphic:** 1024×500 PNG — a wide banner for the store page.
  (Not made yet — a simple brown/gold banner with "FartSpace" on it
  will do.)
- **Screenshots:** at least 2 phone screenshots of the app running
  (take them on your own phone from the debug APK — feed, sound board,
  share form).
- **Category:** Entertainment (or Social).
- **Privacy policy:** Google Play **requires** one, and a link to it.
  The app collects nicknames + fart stories, stores them in Supabase,
  and the moderator login is yours only. A simple privacy policy page
  hosted on the website (e.g. `fartspace.netlify.app/privacy.html`)
  is enough to start — this still needs to be written.
- **Content rating questionnaire** in Play Console — answer honestly
  (crude humour, user-generated content, moderated). It is a form, not
  a payment.
- **Data safety form** in Play Console — declare what the app collects
  (nicknames, post text, reactions — no emails, no real names, no
  location, no ads). Also a form, not a payment.
- **Target audience / ads:** the app has no ads and is not aimed at
  children. Say so in the listing forms.

### 4) Publish

1. Upload the signed release **.aab** in Play Console → Production.
2. Fill in the listing, privacy policy link, content rating, data
   safety, and the closed-test result.
3. Submit for review. Google reviews it; a simple wrapped web app can
   be rejected if it looks like *just* a website with nothing extra —
   FartSpace has real native-app behaviour (installable, offline shell,
   sound board, live feed), but if Google pushes back, the PWA website
   at fartspace.netlify.app keeps working either way and costs nothing.

## What is still yours to do (Muse cannot do these)

- [ ] Create a free **GitHub account + repo** and push this folder
      (Option B above), then run the Actions workflow and download
      the APK/AAB.
- [ ] Install the **debug APK** on your phone and check the feed loads.
- [ ] Pay the **$25 one-time** Play Console fee and create the account.
- [ ] Create + **back up** your signing keystore (see above), and
      add it to GitHub Secrets if you want Actions to sign the AAB.
- [ ] Find **12 testers** for the 14-day closed test.
- [ ] Take **2+ phone screenshots** + make a **1024×500 feature graphic**.
- [ ] Write the **privacy policy** page (and the Data Safety answers).
- [ ] Fill in the **store listing** (descriptions, category, rating).
- [ ] Upload the signed **.aab** and submit for review.

**Honest warning:** Google may reject an app that looks like *just*
a repackaged website. FartSpace has real app behaviour (installable,
offline shell, sound board, live moderated feed), which helps, but a
rejection is possible — if it happens, the PWA website at
fartspace.netlify.app keeps working either way and costs nothing,
and the app can be resubmitted with more native features added.

## Keeping the app up to date

When the website changes, the app needs the same files. Easiest way:
copy the new site files into `www/` (or run `./sync-web.sh` on the
Muse VM), commit + push to GitHub — the Actions workflow then builds
a fresh APK + AAB automatically.

```bash
# 1. Edit the site in ~/workspace/fartspace-public/ (or re-deploy the ZIP to Netlify)
# 2. Copy the new files into the app and rebuild:
cd ~/workspace/fartspace-android
cp ~/workspace/fartspace-public/index.html ~/workspace/fartspace-public/app.js \
   ~/workspace/fartspace-public/config.js ~/workspace/fartspace-public/admin.html \
   ~/workspace/fartspace-public/manifest.webmanifest ~/workspace/fartspace-public/sw.js www/
cp -r ~/workspace/fartspace-public/icons www/
npx cap sync android
# 3. Push to GitHub — Actions builds the new APK + AAB for you:
git add . && git commit -m "Update web files" && git push
# (Or, on a normal computer: cd android && ./gradlew bundleRelease)

Bump `versionCode` (+1) and `versionName` (e.g. 1.0 → 1.1) in
`android/app/build.gradle` for every new release, or Play will refuse it.

## Costs — the whole picture

| Thing | Cost |
|---|---|
| Building the app (Capacitor, Android Studio, GitHub Actions) | $0 |
| PWA website (Netlify + Supabase free tiers) | $0 |
| Google Play Console developer account | **$25 once** |
| Apple / App Store | **skipped — $0, not used** |
| Closed test (12 testers, 14 days) | $0, just time |
| Signing key | $0, just keep it safe |

## Troubleshooting

- **Gradle says "SDK location not found":** set `ANDROID_HOME` to your
  SDK folder, or create `android/local.properties` with one line:
  `sdk.dir=/path/to/your/Android/Sdk`
- **"Java version" errors:** Capacitor 8 needs **JDK 17** (not 8, not 21).
- **Feed shows demo posts in the app:** `config.js` in `www/` is stale —
  re-copy it from `fartspace-public/` and run `npx cap sync android`.
- **App shows a blank screen:** the Supabase project may be paused
  (free tier pauses after a week idle) — wake it in the Supabase
  dashboard. The site has the same behaviour.
