#!/usr/bin/env python3
"""
AUDITORÍA ECONÓMICA S2E - DUJYO
Simulaciones de sustentabilidad y detección de anomalías
"""

# ============================================================================
# CONFIGURACIÓN ACTUAL
# ============================================================================

LISTENER_RATE = 0.3  # DYO por minuto
ARTIST_RATE = 1.5    # DYO por minuto
DAILY_LIMIT_LISTENER = 90  # minutos
DAILY_LIMIT_ARTIST = 120   # minutos
POOL_MONTHLY = 1_000_000   # DYO
DAYS_PER_MONTH = 30

# ============================================================================
# SIMULACIÓN 1: FARMING EXTREMO
# ============================================================================

print("=" * 80)
print("SIMULACIÓN 1: FARMING EXTREMO (1,000 bots 24/7)")
print("=" * 80)
print()

# Escenario: 1,000 bots farmeando al máximo
NUM_BOTS = 1000
MINUTES_PER_DAY = 1440  # 24 horas

# IMPORTANTE: Con límites diarios activos, cada bot solo puede farmear 90 min/día
# NO puede farmear 24/7 porque hay límite diario de 90 minutos

print("⚠️  NOTA: Con límites diarios activos (90 min/bot), los bots NO pueden farmear 24/7")
print()

# Escenario A: Con límites diarios (REALISTA)
dyo_per_bot_per_day_with_limit = LISTENER_RATE * DAILY_LIMIT_LISTENER  # 0.3 * 90 = 27 DYO/día
total_dyo_per_day_with_limit = NUM_BOTS * dyo_per_bot_per_day_with_limit

print(f"📊 CON LÍMITES DIARIOS ACTIVOS (90 min/bot):")
print(f"   - Bots: {NUM_BOTS:,}")
print(f"   - Límite diario por bot: {DAILY_LIMIT_LISTENER} minutos")
print(f"   - DYO por bot/día: {dyo_per_bot_per_day_with_limit:.2f} DYO")
print(f"   - Total DYO/día: {total_dyo_per_day_with_limit:,.2f} DYO")
print()

# Días para agotar pool
days_to_exhaust = POOL_MONTHLY / total_dyo_per_day_with_limit
print(f"⏱️  Tiempo para agotar pool:")
print(f"   - Días: {days_to_exhaust:.2f} días")
print(f"   - Horas: {days_to_exhaust * 24:.2f} horas")
print()

# Consumo en 30 días
consumption_30_days = total_dyo_per_day_with_limit * 30
pool_remaining_30_days = max(0, POOL_MONTHLY - consumption_30_days)
pool_percentage_30_days = (consumption_30_days / POOL_MONTHLY) * 100

print(f"📅 Consumo en 30 días:")
print(f"   - DYO consumido: {consumption_30_days:,.2f} DYO")
print(f"   - % del pool: {pool_percentage_30_days:.2f}%")
print(f"   - Pool restante: {pool_remaining_30_days:,.2f} DYO")
print()

# Escenario B: SIN límites (hipotético - para comparación)
print(f"📊 SIN LÍMITES DIARIOS (hipotético - NO es el caso actual):")
dyo_per_bot_per_day_no_limit = LISTENER_RATE * MINUTES_PER_DAY  # 0.3 * 1440 = 432 DYO/día
total_dyo_per_day_no_limit = NUM_BOTS * dyo_per_bot_per_day_no_limit
days_to_exhaust_no_limit = POOL_MONTHLY / total_dyo_per_day_no_limit
print(f"   - DYO por bot/día: {dyo_per_bot_per_day_no_limit:.2f} DYO")
print(f"   - Total DYO/día: {total_dyo_per_day_no_limit:,.2f} DYO")
print(f"   - Días para agotar: {days_to_exhaust_no_limit:.2f} días")
print(f"   - ⚠️  Esto NO es posible con límites activos")
print()

# ============================================================================
# SIMULACIÓN 2: SUSTENTABILIDAD REAL
# ============================================================================

print("=" * 80)
print("SIMULACIÓN 2: ANÁLISIS DE SUSTENTABILIDAD REAL")
print("=" * 80)
print()

scenarios = [
    {
        "name": "A) PESIMISTA",
        "total_users": 10000,
        "listener_ratio": 0.7,
        "artist_ratio": 0.3,
        "avg_minutes_per_day": 60,
    },
    {
        "name": "B) REALISTA",
        "total_users": 1000,
        "listener_ratio": 0.7,
        "artist_ratio": 0.3,
        "avg_minutes_per_day": 60,
    },
    {
        "name": "C) OPTIMISTA",
        "total_users": 100,
        "listener_ratio": 0.7,
        "artist_ratio": 0.3,
        "avg_minutes_per_day": 90,
    },
]

for scenario in scenarios:
    print(f"{scenario['name']}: {scenario['total_users']:,} usuarios")
    print("-" * 80)
    
    listeners = int(scenario['total_users'] * scenario['listener_ratio'])
    artists = int(scenario['total_users'] * scenario['artist_ratio'])
    avg_min = scenario['avg_minutes_per_day']
    
    # Aplicar límites diarios
    actual_minutes_listeners = min(avg_min, DAILY_LIMIT_LISTENER)
    actual_minutes_artists = min(avg_min, DAILY_LIMIT_ARTIST)
    
    # Calcular DYO por día
    # Listeners: ganan 0.3 DYO/min cuando escuchan
    # Artists: ganan 1.5 DYO/min cuando FANS escuchan su contenido
    # Para simplificar: asumimos que cada minuto de listener genera:
    # - 0.3 DYO para el listener
    # - 1.5 DYO para el artista del contenido
    
    # DYO de listeners
    listener_dyo_per_day = listeners * actual_minutes_listeners * LISTENER_RATE
    
    # DYO de artistas (cuando listeners escuchan su contenido)
    # Asumimos distribución uniforme: cada artista recibe streams proporcionales
    # Simplificación: cada minuto de listener genera 1.5 DYO para algún artista
    artist_dyo_per_day = listeners * actual_minutes_listeners * ARTIST_RATE
    
    total_dyo_per_day = listener_dyo_per_day + artist_dyo_per_day
    total_dyo_per_month = total_dyo_per_day * DAYS_PER_MONTH
    
    pool_percentage = (total_dyo_per_month / POOL_MONTHLY) * 100
    months_sustainable = POOL_MONTHLY / total_dyo_per_month if total_dyo_per_month > 0 else float('inf')
    
    print(f"   Usuarios: {listeners:,} listeners + {artists:,} artists")
    print(f"   Minutos promedio/día: {avg_min} min (limitado a {actual_minutes_listeners}/{actual_minutes_artists} min)")
    print(f"   DYO/día (listeners): {listener_dyo_per_day:,.2f} DYO")
    print(f"   DYO/día (artistas): {artist_dyo_per_day:,.2f} DYO")
    print(f"   Total DYO/día: {total_dyo_per_day:,.2f} DYO")
    print(f"   Total DYO/mes: {total_dyo_per_month:,.2f} DYO")
    print(f"   % del pool mensual: {pool_percentage:.2f}%")
    
    if pool_percentage <= 100:
        print(f"   ✅ Pool suficiente: {months_sustainable:.2f} meses")
        if months_sustainable >= 12:
            print(f"   ✅✅ EXCELENTE: Pool dura más de 1 año")
        elif months_sustainable >= 6:
            print(f"   ✅ BUENO: Pool dura más de 6 meses")
        else:
            print(f"   ⚠️  ATENCIÓN: Pool se agota en menos de 6 meses")
    else:
        print(f"   ❌ Pool INSUFICIENTE: se agota en {months_sustainable:.2f} meses")
    
    print()

# ============================================================================
# SIMULACIÓN 3: DETECCIÓN DE ANOMALÍAS
# ============================================================================

print("=" * 80)
print("SIMULACIÓN 3: DETECCIÓN DE ANOMALÍAS")
print("=" * 80)
print()

# Métricas normales vs anómalas
print("📊 MÉTRICAS NORMALES (usuario promedio):")
normal_user = {
    "daily_minutes": 60,
    "sessions_per_day": 3,
    "avg_session_duration": 20,
    "time_between_sessions": 4,  # horas
    "dyo_per_day": 60 * LISTENER_RATE,  # 18 DYO
}
print(f"   - Minutos/día: {normal_user['daily_minutes']} min")
print(f"   - Sesiones/día: {normal_user['sessions_per_day']}")
print(f"   - Duración promedio sesión: {normal_user['avg_session_duration']} min")
print(f"   - Tiempo entre sesiones: {normal_user['time_between_sessions']} horas")
print(f"   - DYO/día: {normal_user['dyo_per_day']:.2f} DYO")
print()

print("🚨 MÉTRICAS ANÓMALAS (farming/bots):")
anomalous_user = {
    "daily_minutes": DAILY_LIMIT_LISTENER,  # 90 min (máximo)
    "sessions_per_day": 1,  # Una sesión larga
    "avg_session_duration": DAILY_LIMIT_LISTENER,  # 90 min continuos
    "time_between_sessions": 0,  # Sin pausas
    "dyo_per_day": DAILY_LIMIT_LISTENER * LISTENER_RATE,  # 27 DYO
}
print(f"   - Minutos/día: {anomalous_user['daily_minutes']} min (máximo)")
print(f"   - Sesiones/día: {anomalous_user['sessions_per_day']} (sesión única)")
print(f"   - Duración promedio sesión: {anomalous_user['avg_session_duration']} min (continuo)")
print(f"   - Tiempo entre sesiones: {anomalous_user['time_between_sessions']} horas (sin pausas)")
print(f"   - DYO/día: {anomalous_user['dyo_per_day']:.2f} DYO")
print()

# Detección de ataque Sybil (100 cuentas)
print("🔍 DETECCIÓN DE ATAQUE SYBIL (100 cuentas):")
sybil_accounts = 100
sybil_dyo_per_day = sybil_accounts * DAILY_LIMIT_LISTENER * LISTENER_RATE
sybil_dyo_per_month = sybil_dyo_per_day * DAYS_PER_MONTH

print(f"   - Cuentas: {sybil_accounts}")
print(f"   - DYO/día: {sybil_dyo_per_day:,.2f} DYO")
print(f"   - DYO/mes: {sybil_dyo_per_month:,.2f} DYO")
print(f"   - % del pool mensual: {(sybil_dyo_per_month / POOL_MONTHLY) * 100:.2f}%")
print()

# ¿Se detectaría con sistema actual?
print("❓ ¿SE DETECTARÍA CON SISTEMA ACTUAL?")
print()
print("   ✅ SÍ se detectaría (parcialmente):")
print("      - Límite diario: 90 min/bot → máximo 27 DYO/bot/día")
print("      - Pool decrementa: 100 bots = 2,700 DYO/día")
print("      - En 30 días: 81,000 DYO (8.1% del pool)")
print()
print("   ⚠️  NO se detectaría automáticamente:")
print("      - Múltiples cuentas desde misma IP")
print("      - Sesiones continuas sin pausas")
print("      - Patrones de uso idénticos")
print("      - Mismo device fingerprint")
print()

# Métricas que alertarían
print("⚠️  MÉTRICAS QUE ALERTARÍAN PRIMERO:")
print()
print("   1. Límite diario alcanzado consistentemente:")
print(f"      - Usuario normal: {normal_user['daily_minutes']} min/día ({normal_user['daily_minutes']/DAILY_LIMIT_LISTENER*100:.1f}% del límite)")
print(f"      - Usuario anómalo: {anomalous_user['daily_minutes']} min/día (100% del límite)")
print(f"      - 🚨 ALERTA: Si >80% usuarios alcanzan límite diario")
print()
print("   2. Sesiones continuas sin pausas:")
print(f"      - Usuario normal: {normal_user['sessions_per_day']} sesiones, {normal_user['time_between_sessions']}h entre sesiones")
print(f"      - Usuario anómalo: {anomalous_user['sessions_per_day']} sesión, 0h entre sesiones")
print(f"      - 🚨 ALERTA: Si sesión >60 min sin pausas")
print()
print("   3. Múltiples cuentas desde misma IP/device:")
print(f"      - 🚨 ALERTA: Si >5 cuentas desde misma IP alcanzan límite diario")
print()
print("   4. Emisión diaria excede proyección:")
realistic_daily = 1000 * 60 * (LISTENER_RATE + ARTIST_RATE)
print(f"      - Proyección realista: ~{realistic_daily:,.0f} DYO/día")
print(f"      - 🚨 ALERTA: Si emisión >150% de proyección")
print()
print("   5. Pool decrementa demasiado rápido:")
print(f"      - Pool mensual: {POOL_MONTHLY:,} DYO")
print(f"      - Emisión esperada/día: {POOL_MONTHLY/30:,.0f} DYO")
print(f"      - 🚨 ALERTA: Si pool <20% restante antes de día 20 del mes")
print()

# ============================================================================
# RECOMENDACIONES
# ============================================================================

print("=" * 80)
print("RECOMENDACIONES ESPECÍFICAS")
print("=" * 80)
print()

print("1. 🛡️  ANTI-FARM BÁSICO (implementar URGENTE):")
print("   - Cooldown entre sesiones: mínimo 30 minutos")
print("   - Límite de sesión continua: máximo 60 minutos")
print("   - Detección de misma IP: máximo 3 cuentas activas simultáneas")
print("   - Rate limiting por IP: máximo 10 requests/minuto")
print()

print("2. 📊 MONITOREO EN TIEMPO REAL:")
print(f"   - Alertar si emisión diaria >{POOL_MONTHLY/30:,.0f} DYO (1M/mes / 30 días)")
print("   - Alertar si >50% usuarios alcanzan límite diario")
print("   - Alertar si pool <20% restante")
print("   - Dashboard con métricas en tiempo real")
print()

print("3. 🔄 AJUSTES DE POOL:")
print("   - Considerar pool dinámico basado en usuarios activos")
print("   - Reducir pool si emisión excede proyección")
print("   - Implementar 'soft cap' cuando pool <10%")
print()

print("4. ⚠️  LÍMITES ADICIONALES:")
print("   - Límite semanal: máximo 500 minutos/semana")
print("   - Límite de contenido único: máximo 10 min/contenido/día")
print("   - Verificación de progreso real: mínimo 30% del contenido escuchado")
print()

print("=" * 80)
print("CONCLUSIÓN")
print("=" * 80)
print()

print("✅ SISTEMA ACTUAL:")
print(f"   - Pool mensual: {POOL_MONTHLY:,} DYO")
print(f"   - Tasas conservadoras: {LISTENER_RATE}/{ARTIST_RATE} DYO/min")
print(f"   - Límites diarios: {DAILY_LIMIT_LISTENER}/{DAILY_LIMIT_ARTIST} min")
print()

print("⚠️  RIESGOS DETECTADOS:")
farming_days = POOL_MONTHLY / (1000 * DAILY_LIMIT_LISTENER * LISTENER_RATE)
print(f"   - Farming extremo (1000 bots) agotaría pool en ~{farming_days:.1f} días")
print("   - Sin detección de anomalías básica")
print("   - No hay cooldowns ni límites de sesión")
print()

print("🎯 PRIORIDADES:")
print("   1. Implementar anti-farm básico (cooldowns, límites de sesión)")
print("   2. Dashboard de monitoreo con alertas")
print("   3. Detección de anomalías (misma IP, sesiones continuas)")
print("   4. Límites adicionales (semanal, por contenido)")
print()

print("=" * 80)
