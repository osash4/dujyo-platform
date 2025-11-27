# 🚀 INSTRUCCIONES PARA EJECUTAR TESTS - DUJYO MVP

## ⚠️ ESTADO ACTUAL

Los tests han sido creados pero requieren:
1. **Dependencias faltantes** en `Cargo.toml` (regex, mime, phf, async_recursive)
2. **Redis instalado y corriendo**
3. **Base de datos de test configurada**

---

## 📋 PASOS PARA EJECUTAR TESTS

### 1. Instalar Dependencias Faltantes

```bash
cd dujyo-backend

# Agregar dependencias faltantes
cargo add regex
cargo add mime
cargo add phf --features=macros
cargo add async_recursive
```

### 2. Instalar y Configurar Redis

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Linux:
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Docker:
```bash
docker run -d -p 6379:6379 --name redis-test redis:7-alpine
```

### 3. Configurar Base de Datos de Test

```bash
# Crear base de datos de test
createdb dujyo_test

# O usar el script
./scripts/setup_redis.sh
```

### 4. Configurar Variables de Entorno

```bash
export TEST_DATABASE_URL="postgresql://dujyo_test:dujyo_test_password@localhost:5432/dujyo_test"
export TEST_REDIS_URL="redis://127.0.0.1:6379"
export TEST_BACKEND_URL="http://localhost:8083"
```

### 5. Ejecutar Tests

#### Tests Unitarios (no requieren servicios):
```bash
cargo test --lib
```

#### Tests de Gas Fees:
```bash
# Primero arreglar imports en tests/gas_fees_test.rs
# Luego ejecutar:
cargo test --test gas_fees_test
```

#### Tests de Rate Limiting (requieren Redis):
```bash
cargo test --test rate_limiting_test -- --ignored
```

#### Tests de Endpoints (requieren servidor corriendo):
```bash
# En una terminal, iniciar servidor:
cargo run --release

# En otra terminal:
cargo test --test endpoints_test -- --ignored
```

#### Tests E2E (requieren servidor y servicios):
```bash
cargo test --test e2e_test -- --ignored
```

#### Todos los Tests:
```bash
cargo test
```

---

## 🔧 ARREGLOS NECESARIOS

### 1. Arreglar Imports en Tests

Los tests necesitan importar correctamente desde `lib.rs`. Opciones:

**Opción A:** Usar `#[path]` en tests:
```rust
#[path = "../src/blockchain/gas_fees.rs"]
mod gas_fees;
```

**Opción B:** Exportar módulos en `lib.rs`:
```rust
pub mod blockchain {
    pub mod gas_fees;
    // ... otros módulos
}
```

### 2. Agregar Dependencias a Cargo.toml

```toml
[dependencies]
regex = "1.10"
mime = "0.3"
phf = { version = "0.11", features = ["macros"] }
async-recursive = "0.4"
```

---

## ✅ CHECKLIST DE EJECUCIÓN

- [ ] Dependencias agregadas a `Cargo.toml`
- [ ] Redis instalado y corriendo
- [ ] Base de datos de test creada
- [ ] Variables de entorno configuradas
- [ ] Imports en tests arreglados
- [ ] Tests compilan sin errores
- [ ] Tests unitarios pasan
- [ ] Tests de integración pasan (con servicios)

---

## 🐛 TROUBLESHOOTING

### Error: "unresolved import"
- Verificar que módulos están exportados en `lib.rs`
- Verificar que dependencias están en `Cargo.toml`

### Error: "Redis connection failed"
- Verificar Redis está corriendo: `redis-cli ping`
- Verificar URL en variables de entorno

### Error: "Database connection failed"
- Verificar PostgreSQL está corriendo
- Verificar base de datos existe: `psql -l | grep dujyo_test`

### Tests muy lentos
- Ejecutar con `--test-threads=1` para debugging
- Verificar que servicios están respondiendo rápido

---

## 📊 RESULTADOS ESPERADOS

### Tests Unitarios
- ✅ ~15 tests de gas fees
- ✅ Todos pasan sin servicios externos

### Tests de Integración
- ✅ ~10 tests de rate limiting
- ✅ Requieren Redis corriendo
- ✅ Verifican fallback a memoria

### Tests E2E
- ✅ ~10 tests de flujos completos
- ✅ Requieren servidor y servicios
- ✅ Verifican integración completa

---

## 🎯 PRÓXIMOS PASOS

1. **Arreglar dependencias** en `Cargo.toml`
2. **Arreglar imports** en tests
3. **Instalar Redis** si no está instalado
4. **Ejecutar tests** uno por uno
5. **Documentar resultados** de cada test

---

**Última actualización:** 2024



