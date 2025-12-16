# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# --- Firebase ---
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# --- Google Mobile Ads ---
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }
-keep public class com.google.android.gms.ads.MobileAds {
   public *;
}

# --- React Native Screens (React Navigation) ---
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# --- React Native SVG ---
-keep public class com.horcrux.svg.** { *; }

# --- React Native Safe Area Context ---
-keep class com.th3rdwave.safeareacontext.** { *; }

# --- Async Storage ---
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# --- Appwrite (إذا موجودة) ---
-keep class io.appwrite.** { *; }