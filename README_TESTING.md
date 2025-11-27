# 🧪 Guía de Testing - Dujyo MVP

## 🚀 Inicio Rápido

### Opción 1: Iniciar Servidor y Ejecutar Test (Automático)

```bash
./scripts/start_server_and_test.sh
```

Este script:
1. Verifica PostgreSQL
2. Configura variables de entorno
3. Compila el proyecto
4. Inicia el servidor
5. Espera a que esté listo
6. Ejecuta el test MVP
7. Detiene el servidor automáticamente

---

### Opción 2: Iniciar Servidor Manualmente

**Terminal 1 - Servidor:**
```bash
./scripts/start_server.sh
```

O manualmente:
```bash
cd dujyo-backend
export JWT_SECRET="dujyo_mvp_test_secret_key_2024_minimum_32_chars"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dujyo"
cargo run --release
```

**Terminal 2 - Test:**
```bash
cd dujyo-backend
cargo run --bin test-mvp-flow
```

---

## 📋 Requisitos Previos

### 1. PostgreSQL Corriendo

```bash
# Verificar si está corriendo
pg_isready -h localhost -p 5432

# Si no está corriendo, iniciarlo:
# macOS (Homebrew)
brew services start postgresql@14

# Linux (systemd)
sudo systemctl start postgresql

# Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14
```

### 2. Base de Datos Creada

```bash
# Crear base de datos
createdb dujyo

# O con psql
psql -U postgres -c "CREATE DATABASE dujyo;"
```

### 3. Variables de Entorno

```bash
# JWT Secret (mínimo 32 caracteres)
export JWT_SECRET="dujyo_mvp_test_secret_key_2024_minimum_32_chars"

# Database URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dujyo"
```

O crear archivo `.env` en `dujyo-backend/`:
```
JWT_SECRET=dujyo_mvp_test_secret_key_2024_minimum_32_chars
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dujyo
```

---

## 🧪 Ejecutar Tests

### Test MVP Flow Completo

```bash
cd dujyo-backend
cargo run --bin test-mvp-flow
```

### Test Manual con cURL

Ver `TESTING_MVP.md` para comandos detallados.

---

## 🐛 Troubleshooting

### Error: "Connection refused"

**Causa:** El servidor no está corriendo

**Solución:**
```bash
# Iniciar servidor
./scripts/start_server.sh
```

---

### Error: "PostgreSQL connection failed"

**Causa:** PostgreSQL no está corriendo o DATABASE_URL incorrecta

**Solución:**
```bash
# Verificar PostgreSQL
pg_isready -h localhost -p 5432

# Verificar DATABASE_URL
echo $DATABASE_URL

# Iniciar PostgreSQL si no está corriendo
brew services start postgresql@14
```

---

### Error: "JWT_SECRET must be at least 32 characters"

**Causa:** JWT_SECRET muy corto o no configurado

**Solución:**
```bash
export JWT_SECRET="dujyo_mvp_test_secret_key_2024_minimum_32_chars"
```

---

### Error: "Database does not exist"

**Causa:** Base de datos no creada

**Solución:**
```bash
createdb dujyo
# O
psql -U postgres -c "CREATE DATABASE dujyo;"
```

---

## 📊 Verificar Estado

### Verificar Servidor

```bash
curl http://localhost:8083/health
```

**Respuesta esperada:**
```json
{"status":"ok"}
```

### Verificar Base de Datos

```bash
psql -U postgres -d dujyo -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d dujyo -c "SELECT COUNT(*) FROM content;"
```

### Verificar Logs

```bash
# Ver logs del servidor
tail -f server.log

# O si el servidor está corriendo en foreground
# Los logs aparecen en la consola
```

---

## 📝 Notas

- El servidor corre en `http://localhost:8083` por defecto
- Los logs se guardan en `server.log` cuando se ejecuta en background
- El test MVP tarda aproximadamente 15-20 segundos
- Asegúrate de tener suficiente espacio en disco para archivos de prueba

---

**Última actualización:** Noviembre 2024

