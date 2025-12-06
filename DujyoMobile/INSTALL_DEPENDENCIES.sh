#!/bin/bash

# Script para instalar todas las dependencias de DujyoMobile

echo "📦 Instalando dependencias de DujyoMobile..."

cd DujyoMobile

# Instalar npm dependencies
echo "📦 Instalando npm packages..."
npm install

# iOS - Pod install
if [ -d "ios" ]; then
  echo "🍎 Instalando CocoaPods para iOS..."
  cd ios
  pod install
  cd ..
fi

echo "✅ Dependencias instaladas!"
echo ""
echo "📱 Para ejecutar:"
echo "  iOS: npm run ios"
echo "  Android: npm run android"
