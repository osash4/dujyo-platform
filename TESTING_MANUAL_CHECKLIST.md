# 📋 CHECKLIST DETALLADO DE TESTING MANUAL - DUJYO MVP

**Fecha de creación:** 2024  
**Versión:** 1.0  
**Objetivo:** Validar completamente el MVP antes del deployment

---

## 🎯 PREPARACIÓN

### Prerrequisitos
- [ ] Backend corriendo en `http://localhost:8083`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] Redis corriendo y accesible
- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno configuradas (ver `.env.example`)

### Herramientas Necesarias
- [ ] `curl` o `httpie` para testing de API
- [ ] Navegador con DevTools abierto
- [ ] Acceso a logs del backend
- [ ] Acceso a Redis CLI para verificar keys

---

## ⛽ TESTING DE GAS FEES (20 Escenarios)

### 1. Price Fixing en USD → DYO

#### Test 1.1: Conversión básica USD → DYO
```bash
# Configurar precio DYO = $0.001 USD
curl -X POST http://localhost:8083/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test_address",
    "to": "recipient_address",
    "amount": 1000,
    "token": "DYO"
  }'
```
- [ ] Verificar que gas fee se calcula correctamente
- [ ] Verificar que fee en USD es constante ($0.001 para Transfer)
- [ ] Verificar que fee en DYO varía según precio DYO

#### Test 1.2: Diferentes precios de DYO
- [ ] Test con DYO = $0.001 USD → Fee = 1 DYO
- [ ] Test con DYO = $0.002 USD → Fee = 0.5 DYO
- [ ] Test con DYO = $0.0005 USD → Fee = 2 DYO
- [ ] Verificar que fee en USD siempre es $0.001

#### Test 1.3: Transacciones gratuitas
```bash
# StreamEarn debe ser gratis
curl -X POST http://localhost:8083/api/v1/stream-earn \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content_id": "test", "duration": 60}'
```
- [ ] Verificar que StreamEarn tiene gas fee = 0
- [ ] Verificar que ProposeBlock tiene gas fee = 0

#### Test 1.4: Todos los tipos de transacción
- [ ] Transfer: $0.001 USD
- [ ] TransferWithData: $0.002 USD
- [ ] UploadContent: $0.02 USD
- [ ] MintNFT: $0.05 USD
- [ ] DexSwap: 0.3% (min $0.01, max $10)
- [ ] Stake: $0.02 USD
- [ ] Unstake: $0.05 USD base + 1% si early
- [ ] RegisterValidator: $0.1 USD

### 2. Auto-Swap Mechanism

#### Test 2.1: Usuario con suficiente DYO
```bash
# Usuario tiene 100 DYO, necesita 0.5 DYO de gas
curl -X POST http://localhost:8083/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user_with_dyo",
    "to": "recipient",
    "amount": 50,
    "token": "DYO"
  }'
```
- [ ] Verificar que transacción se ejecuta directamente
- [ ] Verificar que NO se ejecuta auto-swap
- [ ] Verificar que gas fee se deduce de balance DYO

#### Test 2.2: Usuario sin suficiente DYO, con DYS
```bash
# Usuario tiene 0.1 DYO (insuficiente), 10 DYS (suficiente)
curl -X POST http://localhost:8083/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user_low_dyo_high_dys",
    "to": "recipient",
    "amount": 50,
    "token": "DYO"
  }'
```
- [ ] Verificar que auto-swap se ejecuta automáticamente
- [ ] Verificar que DYS se convierte a DYO
- [ ] Verificar que gas fee se paga con DYO recibido
- [ ] Verificar mensaje en respuesta indicando auto-swap

#### Test 2.3: Usuario sin suficiente DYO ni DYS
```bash
# Usuario tiene 0.1 DYO y 0.001 DYS (insuficiente)
curl -X POST http://localhost:8083/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user_no_balance",
    "to": "recipient",
    "amount": 50,
    "token": "DYO"
  }'
```
- [ ] Verificar que transacción falla con error claro
- [ ] Verificar mensaje: "Insufficient balance. Need X DYO (or Y DYS)"
- [ ] Verificar que NO se ejecuta transacción

#### Test 2.4: Cálculo de DYS necesario
- [ ] Verificar que se calcula: `dyo_needed * dyo_price_usd * 1.05`
- [ ] Verificar que buffer del 5% se aplica correctamente
- [ ] Verificar que slippage tolerance es 5%

#### Test 2.5: Auto-swap con diferentes precios DYO
- [ ] Test con DYO = $0.001 → DYS necesario calculado correctamente
- [ ] Test con DYO = $0.01 → DYS necesario calculado correctamente
- [ ] Verificar que conversión es precisa

### 3. User Tier Discounts

#### Test 3.1: Regular User (sin descuento)
```bash
curl -X POST http://localhost:8083/transaction \
  -H "Authorization: Bearer $REGULAR_USER_TOKEN" \
  -d '{"from": "...", "to": "...", "amount": 1000}'
```
- [ ] Verificar que fee es 100% del base

#### Test 3.2: Premium User (50% descuento)
```bash
curl -X POST http://localhost:8083/transaction \
  -H "Authorization: Bearer $PREMIUM_USER_TOKEN" \
  -d '{"from": "...", "to": "...", "amount": 1000}'
```
- [ ] Verificar que fee es 50% del base
- [ ] Verificar que descuento se aplica correctamente

#### Test 3.3: Creative Validator (50% descuento)
- [ ] Verificar que fee es 50% del base

#### Test 3.4: Community Validator (25% descuento)
- [ ] Verificar que fee es 75% del base

#### Test 3.5: Economic Validator (sin descuento)
- [ ] Verificar que fee es 100% del base

### 4. Network Congestion

#### Test 4.1: Sin congestión (0.0)
- [ ] Verificar que fee es 0.5x del base

#### Test 4.2: Congestión media (0.5)
- [ ] Verificar que fee es 1.25x del base

#### Test 4.3: Congestión máxima (1.0)
- [ ] Verificar que fee es 2.0x del base

#### Test 4.4: Ajuste dinámico
- [ ] Verificar que fee aumenta con congestión
- [ ] Verificar que fee disminuye cuando congestión baja

### 5. Edge Cases

#### Test 5.1: Precio DYO = 0
- [ ] Verificar que se retorna error claro
- [ ] Verificar que transacción NO se ejecuta

#### Test 5.2: Precio DYO negativo
- [ ] Verificar que se retorna error
- [ ] Verificar que sistema no crashea

#### Test 5.3: Early Unstake Penalty
```bash
curl -X POST http://localhost:8083/unstake \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"position_id": 1, "early": true}'
```
- [ ] Verificar que fee base es $0.05 USD
- [ ] Verificar que se agrega 1% de penalty
- [ ] Verificar que penalty se calcula sobre amount

#### Test 5.4: DexSwap con amount pequeño
- [ ] Verificar que fee mínimo es $0.01 USD

#### Test 5.5: DexSwap con amount grande
- [ ] Verificar que fee máximo es $10 USD

---

## 🚦 TESTING DE RATE LIMITING

### 1. Rate Limiting por Categoría

#### Test 1.1: Public Endpoints (60/min)
```bash
# Hacer 70 requests rápidas a /health
for i in {1..70}; do
  curl http://localhost:8083/health
done
```
- [ ] Verificar que primeras 60 requests pasan
- [ ] Verificar que requests 61-70 retornan 429
- [ ] Verificar header `X-RateLimit-Limit: 60`
- [ ] Verificar header `X-RateLimit-Remaining`

#### Test 1.2: Auth Endpoints (10/min)
```bash
# Hacer 15 requests a /api/v1/auth/login
for i in {1..15}; do
  curl -X POST http://localhost:8083/api/v1/auth/login \
    -d '{"email": "test@example.com", "password": "wrong"}'
done
```
- [ ] Verificar que primeras 10 requests pasan
- [ ] Verificar que requests 11-15 retornan 429
- [ ] Verificar que límite es más estricto que public

#### Test 1.3: Upload Endpoints (20/hour)
```bash
# Hacer 25 requests a /api/v1/upload
for i in {1..25}; do
  curl -X POST http://localhost:8083/api/v1/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test.mp3"
done
```
- [ ] Verificar que primeras 20 requests pasan
- [ ] Verificar que requests 21-25 retornan 429
- [ ] Verificar que límite es por hora (no por minuto)

#### Test 1.4: Financial Endpoints (30/min)
```bash
# Hacer 35 requests a /transaction
for i in {1..35}; do
  curl -X POST http://localhost:8083/transaction \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"from": "...", "to": "...", "amount": 100}'
done
```
- [ ] Verificar que primeras 30 requests pasan
- [ ] Verificar que requests 31-35 retornan 429

#### Test 1.5: API Endpoints (100/min)
```bash
# Hacer 110 requests a /api/v1/content
for i in {1..110}; do
  curl http://localhost:8083/api/v1/content
done
```
- [ ] Verificar que primeras 100 requests pasan
- [ ] Verificar que requests 101-110 retornan 429

### 2. Fallback a Memoria

#### Test 2.1: Redis disponible
```bash
# Verificar que Redis está corriendo
redis-cli PING
```
- [ ] Verificar que rate limiting usa Redis
- [ ] Verificar en logs que se usa Redis

#### Test 2.2: Redis no disponible
```bash
# Detener Redis
redis-cli SHUTDOWN

# Hacer requests
for i in {1..10}; do
  curl http://localhost:8083/health
done
```
- [ ] Verificar que sistema sigue funcionando
- [ ] Verificar en logs que se usa fallback a memoria
- [ ] Verificar que rate limiting sigue funcionando

#### Test 2.3: Redis se recupera
```bash
# Reiniciar Redis
redis-server

# Hacer requests
for i in {1..10}; do
  curl http://localhost:8083/health
done
```
- [ ] Verificar que sistema vuelve a usar Redis
- [ ] Verificar en logs que se detecta Redis disponible

### 3. Headers de Rate Limit

#### Test 3.1: Headers presentes
```bash
curl -v http://localhost:8083/api/v1/content
```
- [ ] Verificar header `X-RateLimit-Limit`
- [ ] Verificar header `X-RateLimit-Remaining`
- [ ] Verificar que headers son correctos

#### Test 3.2: Headers cuando se excede límite
```bash
# Exceder límite
for i in {1..65}; do
  curl -v http://localhost:8083/health
done
```
- [ ] Verificar que `X-RateLimit-Remaining` es 0
- [ ] Verificar que respuesta incluye `retry_after`

### 4. Identificación IP vs Usuario

#### Test 4.1: Rate limiting por IP
```bash
# Requests sin autenticación
for i in {1..65}; do
  curl http://localhost:8083/health
done
```
- [ ] Verificar que rate limiting es por IP
- [ ] Verificar que diferentes IPs tienen límites separados

#### Test 4.2: Rate limiting por Usuario JWT
```bash
# Requests con autenticación
for i in {1..65}; do
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:8083/api/v1/content
done
```
- [ ] Verificar que rate limiting es por usuario
- [ ] Verificar que diferentes usuarios tienen límites separados

#### Test 4.3: IP + Usuario combinado
- [ ] Verificar que key de rate limit incluye ambos
- [ ] Verificar formato: `category:user_id:ip`

---

## 🔴 TESTING DE REDIS

### 1. Conexión y Health Check

#### Test 1.1: Conexión exitosa
```bash
# Verificar conexión
redis-cli -h localhost -p 6379 PING
```
- [ ] Verificar que Redis responde PONG
- [ ] Verificar en logs del backend que conexión es exitosa

#### Test 1.2: Health check endpoint
```bash
curl http://localhost:8083/health
```
- [ ] Verificar que respuesta incluye estado de Redis
- [ ] Verificar que estado es "healthy" cuando Redis está disponible

#### Test 1.3: Health check cuando Redis está down
```bash
# Detener Redis
redis-cli SHUTDOWN

# Verificar health check
curl http://localhost:8083/health
```
- [ ] Verificar que respuesta indica Redis no disponible
- [ ] Verificar que sistema sigue funcionando (fallback)

### 2. Connection Pool

#### Test 2.1: Pool funciona correctamente
```bash
# Hacer muchas requests concurrentes
for i in {1..50}; do
  curl http://localhost:8083/health &
done
wait
```
- [ ] Verificar que todas las requests se completan
- [ ] Verificar en logs que pool maneja conexiones correctamente

#### Test 2.2: Pool bajo carga
```bash
# Stress test
ab -n 1000 -c 50 http://localhost:8083/health
```
- [ ] Verificar que pool no se agota
- [ ] Verificar que requests se completan exitosamente

### 3. Reconexión Automática

#### Test 3.1: Redis se desconecta temporalmente
```bash
# Detener Redis
redis-cli SHUTDOWN

# Esperar 5 segundos
sleep 5

# Reiniciar Redis
redis-server

# Hacer requests
curl http://localhost:8083/health
```
- [ ] Verificar que sistema detecta reconexión
- [ ] Verificar que rate limiting vuelve a usar Redis
- [ ] Verificar en logs que se detecta reconexión

#### Test 3.2: Múltiples desconexiones
- [ ] Detener y reiniciar Redis varias veces
- [ ] Verificar que sistema se recupera cada vez
- [ ] Verificar que no hay memory leaks

### 4. Performance

#### Test 4.1: Latencia de Redis
```bash
# Medir latencia
redis-cli --latency
```
- [ ] Verificar que latencia es < 1ms (local)
- [ ] Verificar que no hay timeouts

#### Test 4.2: Throughput
```bash
# Test de throughput
redis-benchmark -n 100000 -t get,set
```
- [ ] Verificar que throughput es adecuado
- [ ] Verificar que no hay bottlenecks

---

## 🔗 TESTING DE INTEGRACIÓN FRONTEND-BACKEND

### 1. Flujo Completo de Usuario

#### Test 1.1: Registro → Login → Transacción
- [ ] Registrar nuevo usuario en frontend
- [ ] Login exitoso
- [ ] Realizar transacción desde frontend
- [ ] Verificar que gas fee se calcula y muestra correctamente
- [ ] Verificar que transacción se completa

#### Test 1.2: Upload de Contenido
- [ ] Login como artista
- [ ] Subir archivo de audio
- [ ] Verificar que gas fee se calcula ($0.02 USD)
- [ ] Verificar que contenido se sube exitosamente
- [ ] Verificar que rate limiting funciona (20/hour)

#### Test 1.3: Stream-to-Earn
- [ ] Login como usuario
- [ ] Reproducir contenido
- [ ] Verificar que StreamEarn es gratis (gas fee = 0)
- [ ] Verificar que usuario gana tokens
- [ ] Verificar que transacción se registra

### 2. Auto-Swap en Frontend

#### Test 2.1: Usuario con suficiente DYO
- [ ] Intentar transacción desde frontend
- [ ] Verificar que UI muestra gas fee en DYO
- [ ] Verificar que NO se muestra opción de auto-swap
- [ ] Verificar que transacción se ejecuta directamente

#### Test 2.2: Usuario sin suficiente DYO, con DYS
- [ ] Intentar transacción desde frontend
- [ ] Verificar que UI muestra mensaje de auto-swap
- [ ] Verificar que usuario puede aprobar auto-swap
- [ ] Verificar que swap se ejecuta automáticamente
- [ ] Verificar que transacción se completa

#### Test 2.3: Usuario sin suficiente balance
- [ ] Intentar transacción desde frontend
- [ ] Verificar que UI muestra error claro
- [ ] Verificar que se muestra balance actual y requerido
- [ ] Verificar que transacción NO se ejecuta

### 3. Rate Limiting en Frontend

#### Test 3.1: Rate limit excedido
- [ ] Hacer muchas requests rápidas desde frontend
- [ ] Verificar que UI muestra mensaje de rate limit
- [ ] Verificar que se muestra `retry_after`
- [ ] Verificar que requests se bloquean correctamente

#### Test 3.2: Diferentes categorías
- [ ] Exceder límite de auth (10/min)
- [ ] Exceder límite de upload (20/hour)
- [ ] Verificar que mensajes son apropiados para cada categoría

---

## ✅ CHECKLIST FINAL

### Pre-Deployment
- [ ] Todos los tests de gas fees pasan
- [ ] Todos los tests de rate limiting pasan
- [ ] Todos los tests de Redis pasan
- [ ] Todos los tests de integración pasan
- [ ] Logs revisados sin errores críticos
- [ ] Performance aceptable (< 200ms response time)
- [ ] No hay memory leaks
- [ ] Health checks funcionan correctamente

### Documentación
- [ ] Tests documentados
- [ ] Resultados de tests guardados
- [ ] Issues encontrados documentados
- [ ] Soluciones aplicadas documentadas

---

## 📝 NOTAS

- Ejecutar tests en orden
- Documentar cualquier issue encontrado
- Tomar screenshots de errores
- Guardar logs de sesiones de testing
- Verificar que todos los edge cases están cubiertos

---

**Última actualización:** 2024  
**Próxima revisión:** Después de cada cambio significativo

