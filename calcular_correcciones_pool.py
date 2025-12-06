#!/usr/bin/env python3
"""
CÁLCULO DE CORRECCIONES PARA POOL S2E
Opción A: Reducir tasas
Opción B: Aumentar pool
"""

# Configuración actual
LISTENER_RATE_CURRENT = 0.3
ARTIST_RATE_CURRENT = 1.5
POOL_CURRENT = 1_000_000
DAILY_LIMIT_LISTENER = 90
DAILY_LIMIT_ARTIST = 120
DAYS_TARGET = 30  # Queremos que dure 30+ días

# Escenario: 1,000 usuarios
LISTENERS = 700
ARTISTS = 300
AVG_MINUTES = 60

print("=" * 80)
print("CÁLCULO DE CORRECCIONES PARA POOL S2E")
print("=" * 80)
print()

# Calcular consumo actual
print("📊 CONSUMO ACTUAL (1,000 usuarios, 60 min/día):")
listener_dyo_per_day = LISTENERS * AVG_MINUTES * LISTENER_RATE_CURRENT
artist_dyo_per_day = LISTENERS * AVG_MINUTES * ARTIST_RATE_CURRENT
total_dyo_per_day = listener_dyo_per_day + artist_dyo_per_day
total_dyo_per_month = total_dyo_per_day * 30

print(f"   - DYO/día: {total_dyo_per_day:,.2f} DYO")
print(f"   - DYO/mes: {total_dyo_per_month:,.2f} DYO")
print(f"   - Pool actual: {POOL_CURRENT:,} DYO")
print(f"   - Días que dura: {POOL_CURRENT / total_dyo_per_day:.2f} días")
print()

# ============================================================================
# OPCIÓN A: REDUCIR TASAS
# ============================================================================

print("=" * 80)
print("OPCIÓN A: REDUCIR TASAS")
print("=" * 80)
print()

# Calcular tasas necesarias para que pool dure 30+ días
target_dyo_per_day = POOL_CURRENT / DAYS_TARGET
print(f"🎯 Objetivo: {target_dyo_per_day:,.2f} DYO/día para que pool dure {DAYS_TARGET} días")
print()

# Fórmula: total_dyo_per_day = listeners * minutes * listener_rate + listeners * minutes * artist_rate
# Simplificando: total = listeners * minutes * (listener_rate + artist_rate)
# target = listeners * minutes * (new_listener_rate + new_artist_rate)
# new_total_rate = target / (listeners * minutes)

total_listening_minutes = LISTENERS * AVG_MINUTES
target_total_rate = target_dyo_per_day / total_listening_minutes

print(f"📐 Cálculo:")
print(f"   - Minutos totales/día: {total_listening_minutes:,} min")
print(f"   - Tasa total necesaria: {target_total_rate:.4f} DYO/min")
print(f"   - Tasa actual total: {LISTENER_RATE_CURRENT + ARTIST_RATE_CURRENT:.2f} DYO/min")
print(f"   - Reducción necesaria: {(1 - target_total_rate / (LISTENER_RATE_CURRENT + ARTIST_RATE_CURRENT)) * 100:.1f}%")
print()

# Proponer opciones manteniendo proporción 1:5 (artist:listener)
# artist_rate / listener_rate = 5
# listener_rate + artist_rate = target_total_rate
# listener_rate + 5*listener_rate = target_total_rate
# 6*listener_rate = target_total_rate
# listener_rate = target_total_rate / 6

proposed_listener_rate = target_total_rate / 6
proposed_artist_rate = proposed_listener_rate * 5

print(f"💡 PROPUESTA 1: Mantener proporción 5:1 (artist:listener)")
print(f"   - Listener rate: {proposed_listener_rate:.3f} DYO/min")
print(f"   - Artist rate: {proposed_artist_rate:.3f} DYO/min")
print(f"   - Total rate: {proposed_listener_rate + proposed_artist_rate:.3f} DYO/min")
print()

# Verificar
new_listener_dyo = LISTENERS * AVG_MINUTES * proposed_listener_rate
new_artist_dyo = LISTENERS * AVG_MINUTES * proposed_artist_rate
new_total_dyo = new_listener_dyo + new_artist_dyo
new_days = POOL_CURRENT / new_total_dyo

print(f"✅ Verificación:")
print(f"   - DYO/día: {new_total_dyo:,.2f} DYO")
print(f"   - DYO/mes: {new_total_dyo * 30:,.2f} DYO")
print(f"   - Días que dura: {new_days:.2f} días")
print()

# Opciones más conservadoras
print("📊 OTRAS OPCIONES:")
print()

options = [
    {"name": "Opción A1: Reducción 50%", "listener": 0.15, "artist": 0.75},
    {"name": "Opción A2: Reducción 60%", "listener": 0.12, "artist": 0.60},
    {"name": "Opción A3: Reducción 67%", "listener": 0.10, "artist": 0.50},
    {"name": "Opción A4: Reducción 75%", "listener": 0.075, "artist": 0.375},
]

for opt in options:
    lr = opt["listener"]
    ar = opt["artist"]
    dyod = LISTENERS * AVG_MINUTES * (lr + ar)
    days = POOL_CURRENT / dyod
    print(f"   {opt['name']}:")
    print(f"      - Listener: {lr:.3f} DYO/min, Artist: {ar:.3f} DYO/min")
    print(f"      - DYO/día: {dyod:,.2f} DYO")
    print(f"      - Días que dura: {days:.2f} días")
    if days >= 30:
        print(f"      - ✅ SUFICIENTE para 30+ días")
    else:
        print(f"      - ⚠️  Insuficiente para 30+ días")
    print()

# ============================================================================
# OPCIÓN B: AUMENTAR POOL
# ============================================================================

print("=" * 80)
print("OPCIÓN B: AUMENTAR POOL")
print("=" * 80)
print()

# Mantener tasas actuales
print(f"📊 Manteniendo tasas actuales ({LISTENER_RATE_CURRENT}/{ARTIST_RATE_CURRENT} DYO/min):")
print(f"   - Consumo/día: {total_dyo_per_day:,.2f} DYO")
print(f"   - Consumo/mes: {total_dyo_per_month:,.2f} DYO")
print()

# Calcular pool necesario para 30+ días
pool_needed_30_days = total_dyo_per_day * DAYS_TARGET
pool_needed_45_days = total_dyo_per_day * 45
pool_needed_60_days = total_dyo_per_day * 60

print(f"💡 POOL NECESARIO:")
print(f"   - Para 30 días: {pool_needed_30_days:,.0f} DYO ({pool_needed_30_days/1_000_000:.2f}M)")
print(f"   - Para 45 días: {pool_needed_45_days:,.0f} DYO ({pool_needed_45_days/1_000_000:.2f}M)")
print(f"   - Para 60 días: {pool_needed_60_days:,.0f} DYO ({pool_needed_60_days/1_000_000:.2f}M)")
print()

# Opciones de pool
print("📊 OPCIONES DE POOL:")
print()

pool_options = [
    {"name": "Opción B1: Pool 2.5M", "pool": 2_500_000},
    {"name": "Opción B2: Pool 3M", "pool": 3_000_000},
    {"name": "Opción B3: Pool 4M", "pool": 4_000_000},
    {"name": "Opción B4: Pool 5M", "pool": 5_000_000},
]

for opt in pool_options:
    pool = opt["pool"]
    days = pool / total_dyo_per_day
    print(f"   {opt['name']}:")
    print(f"      - Pool: {pool:,} DYO ({pool/1_000_000:.1f}M)")
    print(f"      - Días que dura: {days:.2f} días")
    if days >= 30:
        print(f"      - ✅ SUFICIENTE para 30+ días")
    else:
        print(f"      - ⚠️  Insuficiente para 30+ días")
    print()

# ============================================================================
# RECOMENDACIÓN
# ============================================================================

print("=" * 80)
print("RECOMENDACIÓN")
print("=" * 80)
print()

print("🎯 RECOMENDACIÓN: OPCIÓN A3 (Reducir tasas 67%)")
print()
print("   ✅ Ventajas:")
print("      - No requiere aumentar pool")
print("      - Mantiene proporción 5:1 (artist:listener)")
print("      - Pool dura 39 días con 1,000 usuarios")
print("      - Tasas aún atractivas: 0.10/0.50 DYO/min")
print()
print("   📊 Implementación:")
print("      - Listener rate: 0.10 DYO/min (era 0.3)")
print("      - Artist rate: 0.50 DYO/min (era 1.5)")
print("      - Reducción: 67%")
print()

print("🔄 ALTERNATIVA: OPCIÓN B2 (Pool 3M)")
print()
print("   ✅ Ventajas:")
print("      - Mantiene tasas actuales (más atractivas)")
print("      - Pool dura 40 días con 1,000 usuarios")
print()
print("   ⚠️  Desventajas:")
print("      - Requiere aumentar pool mensual")
print("      - Mayor riesgo si hay farming")
print()

print("=" * 80)

