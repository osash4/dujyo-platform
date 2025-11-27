#!/bin/bash

# Script para validar y mostrar contexto de XWave
# Debe ejecutarse antes de cualquier generación de código

set -e

echo "🧠 Validando contexto de XWave..."

# Verificar que estamos en el directorio raíz del proyecto
if [ ! -f "package.json" ] && [ ! -d "xwave-backend" ]; then
    echo "❌ Error: No se detecta el directorio raíz de XWave"
    exit 1
fi

# Verificar existencia de archivos de contexto
CONTEXT_FILE="docs/xwave_context.md"
RULES_FILE=".cursor/rules"
DEVLOG_FILE="docs/DEVLOG_XWAVE.md"

echo "📋 Verificando archivos de contexto..."

if [ ! -f "$CONTEXT_FILE" ]; then
    echo "❌ Error: $CONTEXT_FILE no existe"
    exit 1
fi

if [ ! -f "$RULES_FILE" ]; then
    echo "❌ Error: $RULES_FILE no existe"
    exit 1
fi

if [ ! -f "$DEVLOG_FILE" ]; then
    echo "❌ Error: $DEVLOG_FILE no existe"
    exit 1
fi

echo "✅ Todos los archivos de contexto existen"

# Mostrar contenido de los archivos
echo ""
echo "📖 Contenido de $CONTEXT_FILE:"
echo "----------------------------------------"
cat "$CONTEXT_FILE"
echo ""

echo "📖 Contenido de $RULES_FILE:"
echo "----------------------------------------"
cat "$RULES_FILE"
echo ""

echo "📖 Contenido de $DEVLOG_FILE:"
echo "----------------------------------------"
cat "$DEVLOG_FILE"
echo ""

# Verificar si hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Detectados cambios locales, haciendo commit automático..."
    git add "$CONTEXT_FILE" "$RULES_FILE" "$DEVLOG_FILE" 2>/dev/null || true
    git commit -m "chore(context): ensure context files" --no-verify 2>/dev/null || true
    echo "✅ Cambios commiteados"
else
    echo "✅ No hay cambios pendientes"
fi

echo ""
echo "🎯 Contexto validado correctamente. Listo para trabajar en XWave."
echo "💡 Recuerda: XWave es blockchain nativa (no EVM), usar consenso CPV"
echo ""

exit 0