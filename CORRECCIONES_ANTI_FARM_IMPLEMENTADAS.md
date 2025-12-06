# 🛡️ CORRECCIONES ANTI-FARM IMPLEMENTADAS

**Fecha:** 2025-12-02  
**Archivo:** `dujyo-backend/src/routes/stream_earn.rs`  
**Estado:** ✅ IMPLEMENTADO

---

## 📊 CORRECCIÓN 1: OPCIONES DE TASAS/POOL

### Resultados del Cálculo:

**Consumo actual (1,000 usuarios, 60 min/día):**
- DYO/día: 75,600 DYO
- DYO/mes: 2,268,000 DYO
- Pool actual: 1,000,000 DYO
- **Días que dura: 13.23 días** ❌

---

### Opción A: Reducir Tasas

**Recomendación: OPCIÓN A3 (Reducción 67%)**

| Opción | Listener Rate | Artist Rate | DYO/día | Días que dura | Estado |
|--------|---------------|-------------|---------|---------------|--------|
| A1: 50% | 0.15 | 0.75 | 37,800 | 26.46 días | ⚠️ Insuficiente |
| A2: 60% | 0.12 | 0.60 | 30,240 | 33.07 días | ✅ Suficiente |
| **A3: 67%** | **0.10** | **0.50** | **25,200** | **39.68 días** | ✅ **RECOMENDADO** |
| A4: 75% | 0.075 | 0.375 | 18,900 | 52.91 días | ✅ Suficiente |

**Implementación recomendada:**
```rust
const LISTENER_RATE_PER_MINUTE: f64 = 0.10; // Era 0.3
const ARTIST_RATE_PER_MINUTE: f64 = 0.50;   // Era 1.5
```

---

### Opción B: Aumentar Pool

**Recomendación: OPCIÓN B2 (Pool 3M)**

| Opción | Pool | Días que dura | Estado |
|--------|------|---------------|--------|
| B1: 2.5M | 2,500,000 DYO | 33.07 días | ✅ Suficiente |
| **B2: 3M** | **3,000,000 DYO** | **39.68 días** | ✅ **RECOMENDADO** |
| B3: 4M | 4,000,000 DYO | 52.91 días | ✅ Suficiente |
| B4: 5M | 5,000,000 DYO | 66.14 días | ✅ Suficiente |

---

## 🛡️ CORRECCIÓN 2: ANTI-FARM BÁSICO IMPLEMENTADO

### ✅ Regla 1: Cooldown entre sesiones (30 minutos mínimo)

**Función:** `check_session_cooldown()`

**Lógica:**
- Verifica el último stream del usuario en `stream_logs`
- Si pasaron menos de 30 minutos desde el último stream, rechaza la request
- Mensaje: "Please wait 30 minutes between streaming sessions to prevent farming."

**Código:**
```rust
async fn check_session_cooldown(pool: &PgPool, user_address: &str) -> Result<bool, sqlx::Error> {
    const COOLDOWN_MINUTES: i64 = 30;
    
    let last_stream: Option<chrono::DateTime<chrono::Utc>> = sqlx::query_scalar(
        r#"
        SELECT created_at 
        FROM stream_logs 
        WHERE user_address = $1 
        ORDER BY created_at DESC 
        LIMIT 1
        "#
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await?;
    
    match last_stream {
        Some(last_time) => {
            let now = Utc::now();
            let time_since_last = (now - last_time).num_minutes();
            Ok(time_since_last >= COOLDOWN_MINUTES)
        },
        None => Ok(true), // Primera sesión
    }
}
```

---

### ✅ Regla 2: Límite sesión continua (60 minutos máximo)

**Función:** `check_continuous_session_limit()`

**Lógica:**
- Verifica si el último stream fue hace menos de 5 minutos (misma sesión)
- Si es la misma sesión, suma la duración acumulada
- Si la sesión continua excede 60 minutos, rechaza la request
- Mensaje: "Continuous session limit reached (60 minutes). Please take a break before continuing."

**Código:**
```rust
async fn check_continuous_session_limit(
    pool: &PgPool, 
    user_address: &str, 
    current_duration_minutes: f64
) -> Result<bool, sqlx::Error> {
    const MAX_CONTINUOUS_SESSION_MINUTES: f64 = 60.0;
    
    let last_stream: Option<(chrono::DateTime<chrono::Utc>, i32)> = sqlx::query(
        r#"
        SELECT created_at, duration_seconds 
        FROM stream_logs 
        WHERE user_address = $1 
        ORDER BY created_at DESC 
        LIMIT 1
        "#
    )
    .bind(user_address)
    .map(|row: sqlx::postgres::PgRow| {
        (row.get(0), row.get(1))
    })
    .fetch_optional(pool)
    .await?;
    
    match last_stream {
        Some((last_time, last_duration_seconds)) => {
            let now = Utc::now();
            let time_since_last = (now - last_time).num_minutes();
            
            if time_since_last < 5 {
                let last_duration_minutes = last_duration_seconds as f64 / 60.0;
                let total_session_minutes = last_duration_minutes + current_duration_minutes;
                Ok(total_session_minutes <= MAX_CONTINUOUS_SESSION_MINUTES)
            } else {
                Ok(true) // Nueva sesión
            }
        },
        None => Ok(true),
    }
}
```

---

### ✅ Regla 3: Límite contenido único (10 min por contenido por día)

**Función:** `check_content_daily_limit()` y `update_content_daily_limit()`

**Lógica:**
- Usa la tabla `content_stream_limits` (ya existe en DB)
- Verifica minutos acumulados para un contenido específico hoy
- Si excede 10 minutos, rechaza la request
- Mensaje: "Daily limit reached for this content (10 minutes per content per day). Try exploring other tracks!"

**Código:**
```rust
async fn check_content_daily_limit(
    pool: &PgPool,
    user_address: &str,
    content_id: &str,
    duration_minutes: f64,
) -> Result<bool, sqlx::Error> {
    const MAX_MINUTES_PER_CONTENT_PER_DAY: f64 = 10.0;
    let today = Utc::now().date_naive();
    
    let current_minutes: Option<f64> = sqlx::query_scalar(
        r#"
        SELECT (total_duration_seconds::float8 / 60.0) 
        FROM content_stream_limits 
        WHERE user_address = $1 AND content_id = $2 AND date = $3
        "#
    )
    .bind(user_address)
    .bind(content_id)
    .bind(today)
    .fetch_optional(pool)
    .await?;
    
    let current_minutes = current_minutes.unwrap_or(0.0);
    Ok((current_minutes + duration_minutes) <= MAX_MINUTES_PER_CONTENT_PER_DAY)
}
```

---

## 📍 UBICACIÓN EN CÓDIGO

Las validaciones se ejecutan en `stream_earn_listener_handler()` **ANTES** de:
1. Verificar pool
2. Verificar límite diario
3. Calcular tokens
4. Actualizar balances

**Orden de validaciones:**
1. ✅ Auto-escucha (artista escuchándose)
2. ✅ **Cooldown entre sesiones (30 min)**
3. ✅ **Límite sesión continua (60 min)**
4. ✅ **Límite contenido único (10 min/contenido/día)**
5. ✅ Verificar pool mensual
6. ✅ Verificar límite diario total
7. ✅ Procesar stream

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba 1: Cooldown
```bash
# Request 1: OK
curl -X POST /api/v1/stream-earn/listener -d '{"duration_seconds": 60, ...}'

# Request 2 (inmediata): DEBE FALLAR
curl -X POST /api/v1/stream-earn/listener -d '{"duration_seconds": 60, ...}'
# Esperado: "Please wait 30 minutes between streaming sessions..."
```

### Prueba 2: Sesión continua
```bash
# Request 1: 30 min - OK
curl -X POST /api/v1/stream-earn/listener -d '{"duration_seconds": 1800, ...}'

# Request 2 (inmediata): 35 min - DEBE FALLAR (30 + 35 = 65 > 60)
curl -X POST /api/v1/stream-earn/listener -d '{"duration_seconds": 2100, ...}'
# Esperado: "Continuous session limit reached..."
```

### Prueba 3: Contenido único
```bash
# Request 1-10: 1 min cada una - OK (total: 10 min)
for i in {1..10}; do
  curl -X POST /api/v1/stream-earn/listener -d '{"duration_seconds": 60, "content_id": "test1", ...}'
done

# Request 11: DEBE FALLAR (10 + 1 = 11 > 10)
curl -X POST /api/v1/stream-earn/listener -d '{"duration_seconds": 60, "content_id": "test1", ...}'
# Esperado: "Daily limit reached for this content..."
```

---

## ✅ CHECKLIST

- [x] Regla 1: Cooldown 30 min implementada
- [x] Regla 2: Límite sesión continua 60 min implementada
- [x] Regla 3: Límite contenido único 10 min implementada
- [x] Funciones helper creadas
- [x] Validaciones integradas en handler
- [x] Mensajes de error claros
- [x] Actualización de `content_stream_limits` implementada
- [ ] Pruebas funcionales (pendiente)

---

## 🎯 PRÓXIMOS PASOS

1. **Compilar y probar** las validaciones anti-farm
2. **Decidir Corrección 1:** ¿Reducir tasas (A3) o aumentar pool (B2)?
3. **Implementar Corrección 3:** Sistema de escala dinámico (opcional)
4. **Crear dashboard** de monitoreo (FASE 2)

---

**Implementación completada:** 2025-12-02  
**Archivos modificados:** `dujyo-backend/src/routes/stream_earn.rs`

