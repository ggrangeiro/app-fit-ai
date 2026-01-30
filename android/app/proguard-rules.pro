# ProGuard rules for FitAI Analyzer (Capacitor App)
# =================================================

# Preserve line numbers for debugging crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor Core - Required for WebView bridge
-keep class com.getcapacitor.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.getcapacitor.**

# Keep JavaScript interface for WebView (Capacitor uses this)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AndroidX Support Libraries
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# OkHttp (used by Capacitor HTTP plugin)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Gson (if used for JSON parsing)
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Google Play Services (if used)
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Prevent R8 from removing classes used via reflection
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Remove logging in release builds (security best practice)
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
