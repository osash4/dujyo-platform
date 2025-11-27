#!/bin/bash
echo "🔍 Verificando sistema XWave para onboarding..."
echo "=============================================="

# 1. Verificar servidor backend
echo "📡 Verificando servidor backend..."
curl -s http://localhost:8083/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Servidor backend funcionando"
else
    echo "❌ Servidor backend NO responde"
    echo "   Ejecuta: cargo run --bin xwavve-backend"
fi

# 2. Verificar base de datos
echo "🗄️  Verificando base de datos..."
psql -l | grep xwave_blockchain > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Base de datos xwave_blockchain existe"
else
    echo "❌ Base de datos NO encontrada"
fi

# 3. Verificar variables de entorno
echo "🔑 Verificando variables de entorno..."
if [ -f ".env" ]; then
    echo "✅ Archivo .env existe"
    if grep -q "JWT_SECRET" .env; then
        echo "✅ JWT_SECRET configurado"
    else
        echo "❌ JWT_SECRET faltante"
    fi
else
    echo "❌ Archivo .env NO existe"
fi

# 4. Verificar test MVP
echo "�� Verificando test MVP..."
cargo run --bin test-mvp-flow > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Test MVP compila correctamente"
else
    echo "❌ Test MVP tiene errores"
fi

echo ""
echo "�� RESUMEN VERIFICACIÓN:"
echo "Si todos son ✅, el sistema está listo para artistas!"
