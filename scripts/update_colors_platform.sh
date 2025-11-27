#!/bin/bash

# Script para actualizar todos los colores antiguos a la nueva paleta Dujyo
# Colores antiguos → Nuevos colores
# #00F6FF (cyan) → #00F5FF (tech-glow) o #F59E0B (dorado) según contexto
# #FF2E92 (magenta) → #EA580C (cobre) o #F59E0B (dorado)
# #39FF14 (verde neón) → #F59E0B (dorado) o #EA580C (cobre)
# from-cyan → from-amber
# to-cyan → to-orange
# text-cyan → text-amber
# border-cyan → border-amber
# bg-cyan → bg-amber
# from-pink → from-orange
# to-pink → to-orange
# from-purple → from-amber (en la mayoría de casos)

FRONTEND_DIR="/Volumes/DobleDHD/xwave/dujyo-frontend/src"

echo "🎨 Actualizando paleta de colores en toda la plataforma..."

# Buscar y reemplazar en todos los archivos .tsx y .ts
find "$FRONTEND_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -not -path "*/node_modules/*" | while read file; do
  echo "Procesando: $file"
  
  # Reemplazos de colores hex
  sed -i '' 's/#00F6FF/#00F5FF/g' "$file"  # Cyan → Tech Glow
  sed -i '' 's/#FF2E92/#F59E0B/g' "$file"  # Magenta → Dorado
  sed -i '' 's/#39FF14/#EA580C/g' "$file"  # Verde neón → Cobre
  
  # Reemplazos de clases Tailwind - cyan
  sed -i '' 's/from-cyan-500/from-amber-500/g' "$file"
  sed -i '' 's/from-cyan-400/from-amber-400/g' "$file"
  sed -i '' 's/to-cyan-500/to-orange-500/g' "$file"
  sed -i '' 's/to-cyan-400/to-orange-400/g' "$file"
  sed -i '' 's/text-cyan-400/text-amber-400/g' "$file"
  sed -i '' 's/text-cyan-300/text-amber-300/g' "$file"
  sed -i '' 's/text-cyan-500/text-amber-500/g' "$file"
  sed -i '' 's/border-cyan-400/border-amber-400/g' "$file"
  sed -i '' 's/border-cyan-500/border-amber-500/g' "$file"
  sed -i '' 's/border-cyan-300/border-amber-300/g' "$file"
  sed -i '' 's/bg-cyan-400/bg-amber-400/g' "$file"
  sed -i '' 's/bg-cyan-500/bg-amber-500/g' "$file"
  sed -i '' 's/bg-cyan-900/bg-amber-900/g' "$file"
  sed -i '' 's/ring-cyan-400/ring-amber-400/g' "$file"
  sed -i '' 's/ring-cyan-500/ring-amber-500/g' "$file"
  sed -i '' 's/focus:border-cyan-500/focus:border-amber-500/g' "$file"
  sed -i '' 's/focus:ring-cyan-500/focus:ring-amber-500/g' "$file"
  sed -i '' 's/hover:border-cyan-400/hover:border-amber-400/g' "$file"
  sed -i '' 's/shadow-cyan-500/shadow-amber-500/g' "$file"
  
  # Reemplazos de clases Tailwind - pink/magenta
  sed -i '' 's/from-pink-500/from-orange-500/g' "$file"
  sed -i '' 's/from-pink-400/from-orange-400/g' "$file"
  sed -i '' 's/to-pink-500/to-orange-500/g' "$file"
  sed -i '' 's/to-pink-600/to-orange-600/g' "$file"
  sed -i '' 's/text-pink-400/text-orange-400/g' "$file"
  
  # Reemplazos de clases Tailwind - purple (solo en gradientes, mantener purple en algunos casos específicos)
  sed -i '' 's/from-purple-500\/20/from-amber-500\/20/g' "$file"
  sed -i '' 's/from-purple-400/from-amber-400/g' "$file"
  sed -i '' 's/from-purple-500/from-amber-500/g' "$file"
  sed -i '' 's/to-purple-600/to-orange-600/g' "$file"
  sed -i '' 's/border-purple-400/border-amber-400/g' "$file"
  sed -i '' 's/focus:border-purple-400/focus:border-amber-400/g' "$file"
  sed -i '' 's/focus:ring-purple-400/focus:ring-amber-400/g' "$file"
  sed -i '' 's/hover:border-purple-400/hover:border-amber-400/g' "$file"
  sed -i '' 's/shadow-purple-500/shadow-amber-500/g' "$file"
  
  # Reemplazos de rgba con colores antiguos
  sed -i '' 's/rgba(0, 246, 255,/rgba(0, 245, 255,/g' "$file"
  sed -i '' 's/rgba(255, 46, 146,/rgba(245, 158, 11,/g' "$file"
  
  # Reemplazos de blue en gradientes (cuando está con cyan)
  sed -i '' 's/to-blue-600/to-orange-600/g' "$file"
  sed -i '' 's/to-blue-500/to-orange-500/g' "$file"
  sed -i '' 's/from-blue-600/from-orange-600/g' "$file"
  sed -i '' 's/from-blue-500/from-orange-500/g' "$file"
done

echo "✅ Actualización de colores completada!"

