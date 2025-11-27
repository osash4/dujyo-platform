# 🚀 INSTRUCCIONES PARA INICIAR EL SERVIDOR

## 📍 DÓNDE ESTÁS Y QUÉ HACER

### Si estás en el directorio raíz (`/Volumes/DobleDHD/xwave`):

```bash
# Opción 1: Usar el script
./scripts/start_server.sh

# Opción 2: Manualmente
cd dujyo-backend
cargo run --bin xwavve-backend
```

### Si estás en `dujyo-backend`:

```bash
# Opción 1: Volver al raíz y usar script
cd ..
./scripts/start_server.sh

# Opción 2: Ejecutar directamente (ya estás en el directorio correcto)
cargo run --bin xwavve-backend
```

---

## ✅ COMANDOS CORRECTOS

### Desde cualquier ubicación:

```bash
# Si estás en /Volumes/DobleDHD/xwave
cd dujyo-backend && cargo run --bin xwavve-backend

# Si ya estás en dujyo-backend
cargo run --bin xwavve-backend
```

---

## 🔍 VERIFICAR DÓNDE ESTÁS

```bash
# Ver directorio actual
pwd

# Si estás en /Volumes/DobleDHD/xwave/dujyo-backend
# Entonces ejecuta directamente:
cargo run --bin xwavve-backend

# Si estás en /Volumes/DobleDHD/xwave
# Entonces ejecuta:
cd dujyo-backend && cargo run --bin xwavve-backend
```

---

## 📝 RESUMEN

**Desde `dujyo-backend/`:**
```bash
cargo run --bin xwavve-backend
```

**Desde raíz del proyecto:**
```bash
cd dujyo-backend && cargo run --bin xwavve-backend
```

**O usar el script (desde raíz):**
```bash
./scripts/start_server.sh
```

