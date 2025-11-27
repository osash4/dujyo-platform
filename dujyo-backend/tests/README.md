# 🧪 GUÍA DE TESTS - DUJYO BACKEND

**Versión:** 1.0  
**Objetivo:** Documentar cómo ejecutar todos los tests del sistema

---

## 📋 PREREQUISITOS

### Servicios Requeridos
- [ ] PostgreSQL corriendo (puerto 5432)
- [ ] Redis corriendo (puerto 6379)
- [ ] Base de datos de test creada: `dujyo_test`

### Variables de Entorno
```bash
export TEST_DATABASE_URL="postgresql://dujyo_test:dujyo_test_password@localhost:5432/dujyo_test"
export TEST_REDIS_URL="redis://127.0.0.1:6379"
export TEST_BACKEND_URL="http://localhost:8083"
```

---

## 🚀 EJECUTAR TESTS

### Todos los Tests

```bash
cd dujyo-backend
cargo test
```

### Tests Específicos

#### Gas Fees Tests
```bash
cargo test --test gas_fees_test
```

#### Rate Limiting Tests
```bash
# Requiere Redis corriendo
cargo test --test rate_limiting_test -- --ignored
```

#### Endpoints Tests
```bash
# Requiere servidor corriendo
cargo test --test endpoints_test -- --ignored
```

#### E2E Tests
```bash
# Requiere servidor y servicios corriendo
cargo test --test e2e_test -- --ignored
```

### Tests con Output

```bash
# Ver output de tests
cargo test -- --nocapture

# Ver output de tests específicos
cargo test --test gas_fees_test -- --nocapture
```

### Tests en Modo Release

```bash
cargo test --release
```

---

## 📝 ESTRUCTURA DE TESTS

```
tests/
├── gas_fees_test.rs          # Tests de gas fees (price fixing, auto-swap)
├── rate_limiting_test.rs     # Tests de rate limiting (Redis, fallback)
├── endpoints_test.rs          # Tests de endpoints críticos
├── e2e_test.rs               # Tests end-to-end (flujos completos)
└── integration_tests.rs      # Tests de integración existentes
```

---

## 🔧 SETUP DE TESTING

### 1. Crear Base de Datos de Test

```bash
createdb dujyo_test
```

### 2. Ejecutar Migraciones

```bash
export DATABASE_URL="postgresql://dujyo_test:dujyo_test_password@localhost:5432/dujyo_test"
cd dujyo-backend
cargo run --bin migrate-database
```

### 3. Setup Redis

```bash
# Verificar Redis está corriendo
redis-cli ping

# O usar script de setup
./scripts/setup_redis.sh
```

---

## 🧪 TIPOS DE TESTS

### Unit Tests
- Tests de funciones individuales
- No requieren servicios externos
- Ejecutan rápido

```bash
cargo test --lib
```

### Integration Tests
- Tests de módulos completos
- Pueden requerir servicios (marcados con `#[ignore]`)
- Ejecutan en `tests/`

```bash
cargo test --test integration_tests
```

### E2E Tests
- Tests de flujos completos
- Requieren servidor corriendo
- Marcados con `#[ignore]`

```bash
# Iniciar servidor primero
cargo run --release

# En otra terminal
cargo test --test e2e_test -- --ignored
```

---

## 🐛 TROUBLESHOOTING

### Tests fallan por conexión a base de datos

```bash
# Verificar PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar base de datos existe
psql -l | grep dujyo_test
```

### Tests fallan por conexión a Redis

```bash
# Verificar Redis está corriendo
redis-cli ping

# O iniciar Redis
redis-server
```

### Tests con `#[ignore]` no se ejecutan

```bash
# Ejecutar tests ignorados
cargo test -- --ignored

# Ejecutar todos los tests (incluyendo ignorados)
cargo test -- --include-ignored
```

### Tests muy lentos

```bash
# Ejecutar tests en paralelo (default)
cargo test --test-threads=4

# O ejecutar tests secuencialmente
cargo test --test-threads=1
```

---

## 📊 COVERAGE

### Ver Coverage (requiere cargo-tarpaulin)

```bash
# Instalar cargo-tarpaulin
cargo install cargo-tarpaulin

# Ejecutar coverage
cargo tarpaulin --out Html
```

---

## ✅ CHECKLIST

Antes de hacer commit:
- [ ] Todos los tests pasan: `cargo test`
- [ ] Tests de gas fees pasan
- [ ] Tests de rate limiting pasan (con Redis)
- [ ] No hay warnings de compilación
- [ ] Código formateado: `cargo fmt`
- [ ] Linter pasa: `cargo clippy`

---

## 🔗 RECURSOS

- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tokio Testing](https://docs.rs/tokio-test/)
- [Testing Best Practices](https://rust-lang.github.io/api-guidelines/documentation.html#c-test)

---

**Última actualización:** 2024

