# 🔧 CONFIGURACIÓN NATIVA - DÍA 2

## 📱 iOS Configuration

### **1. Info.plist:**

Copiar `ios/DujyoMobile/Info.plist.example` a `ios/DujyoMobile/Info.plist` y agregar:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>remote-notification</string>
</array>

<key>NSAppleMusicUsageDescription</key>
<string>Dujyo needs access to play music in the background</string>
```

### **2. Podfile:**

Asegurarse de que `ios/Podfile` tenga:

```ruby
platform :ios, '13.0'

target 'DujyoMobile' do
  use_react_native!(:path => config[:reactNativePath])
  
  # TrackPlayer
  pod 'react-native-track-player', :path => '../node_modules/react-native-track-player'
  
  # Firebase
  pod 'Firebase/Core'
  pod 'Firebase/Messaging'
end
```

### **3. Ejecutar:**

```bash
cd ios
pod install
cd ..
```

---

## 🤖 Android Configuration

### **1. AndroidManifest.xml:**

En `android/app/src/main/AndroidManifest.xml`, agregar:

```xml
<!-- Permisos -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Service -->
<service
    android:name=".PlaybackService"
    android:exported="false"
    android:foregroundServiceType="mediaPlayback">
    <intent-filter>
        <action android:name="android.intent.action.MEDIA_BUTTON" />
    </intent-filter>
</service>
```

### **2. build.gradle:**

En `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        minSdkVersion 23
        targetSdkVersion 33
    }
}
```

### **3. google-services.json:**

Agregar `google-services.json` de Firebase a `android/app/`

---

## 🚀 Testing

### **1. Verificar compilación:**

```bash
# iOS
npm run ios

# Android
npm run android
```

### **2. Probar background playback:**

1. Reproducir track
2. Poner app en background
3. Verificar que audio continúa
4. Verificar controles en notificación

### **3. Probar S2E:**

1. Reproducir track
2. Esperar 10 segundos
3. Verificar que se envía tick al backend
4. Verificar stats en S2EScreen

---

## ⚠️ TROUBLESHOOTING

### **iOS:**
- Si falla pod install: `cd ios && pod deintegrate && pod install`
- Si no reproduce audio: Verificar Info.plist tiene `UIBackgroundModes`

### **Android:**
- Si falla build: Verificar `minSdkVersion >= 23`
- Si no reproduce en background: Verificar `PlaybackService` en AndroidManifest

### **TrackPlayer:**
- Si no funciona: Verificar que `setupPlayer()` se llama en `App.tsx`
- Si no hay controles: Verificar `updateOptions()` tiene todas las capabilities

