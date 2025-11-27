# 📋 Actualización de Variables de Entorno y Base de Datos

## ✅ Cambios Realizados

### 1. **Archivos .env**

#### `env.example` - Actualizado ✅
- `DATABASE_URL`: `postgresql://xwave:xwave_password@localhost:5432/xwave` → `postgresql://dujyo:dujyo_password@localhost:5432/dujyo`
- `POSTGRES_DB`: `xwave` → `dujyo`
- `POSTGRES_USER`: `xwave` → `dujyo`
- `POSTGRES_PASSWORD`: `xwave_password` → `dujyo_password`
- `EMAIL_FROM`: `noreply@xwave.com` → `noreply@dujyo.com`
- Comentarios actualizados a "Dujyo Blockchain Environment Configuration"

#### Script de Actualización Creado ✅
- **Archivo**: `scripts/update_env_files.sh`
- **Función**: Actualiza automáticamente todos los archivos .env
- **Backup**: Crea backups automáticos antes de modificar

### 2. **Base de Datos**

#### Migración SQL Creada ✅
- **Archivo**: `scripts/migrate_database_to_dujyo.sql`
- **Función**: Actualiza esquema de base de datos existente

#### Cambios en Migraciones ✅

**004_token_balances.sql** - Actualizado:
- `usdyo_balance` → `dys_balance`
- Índices actualizados: `idx_token_balances_usdyo` → `idx_token_balances_dys`
- Comentarios actualizados

**013_rename_token_columns.sql** - Nuevo:
- Migración para renombrar columnas existentes
- Maneja tanto `usdyo_balance` como `usxwv_balance`
- Actualiza índices y comentarios

#### Tablas Actualizadas:
- ✅ `token_balances`: Columnas renombradas
- ✅ `native_tokens`: Datos actualizados (si existe)
- ✅ Índices: Actualizados y optimizados
- ✅ Comentarios: Documentación actualizada

### 3. **Archivos de Configuración**

#### `xwave_token_config.txt` - Actualizado ✅
- `XWAVE_TOKEN_CONFIG` → `DUJYO_TOKEN_CONFIG`
- `XWave Token` → `Dujyo Token`
- `XWV` → `DYO` (en todas las distribuciones)

#### `xwave_cpv_config.txt` - Actualizado ✅
- `XWAVE_CPV_CONFIG` → `DUJYO_CPV_CONFIG`
- Todas las referencias `XWV` → `DYO`

#### `xwave_main_wallet.txt` - Actualizado ✅
- `XWAVE_MAIN_WALLET` → `DUJYO_MAIN_WALLET`

## 🚀 Cómo Aplicar los Cambios

### Opción 1: Script Automático (Recomendado)

```bash
# Actualizar archivos .env
./scripts/update_env_files.sh
```

Este script:
- ✅ Crea backups automáticos
- ✅ Actualiza todos los archivos .env
- ✅ Muestra resumen de cambios

### Opción 2: Manual

#### Para archivos .env:
1. Abre cada archivo `.env`
2. Busca y reemplaza:
   - `xwave` → `dujyo`
   - `XWave` → `Dujyo`
   - `xwave_password` → `dujyo_password`
   - `noreply@xwave.com` → `noreply@dujyo.com`

#### Para base de datos:
```bash
# Hacer backup primero
pg_dump -U dujyo dujyo > backup_before_migration.sql

# Ejecutar migración
psql -U dujyo -d dujyo -f scripts/migrate_database_to_dujyo.sql
```

## ⚠️ IMPORTANTE

### Antes de Ejecutar:

1. **Backup de Base de Datos**:
   ```bash
   pg_dump -U dujyo dujyo > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Backup de Archivos .env**:
   - El script `update_env_files.sh` crea backups automáticos
   - O hazlo manualmente antes de ejecutar

3. **Verificar Variables**:
   - Revisa que las nuevas variables de entorno sean correctas
   - Algunos valores pueden necesitar ajuste manual

### Después de Ejecutar:

1. **Verificar Conexión a BD**:
   ```bash
   psql -U dujyo -d dujyo -c "SELECT 1;"
   ```

2. **Verificar Columnas**:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'token_balances';
   ```

3. **Reiniciar Servicios**:
   - Backend
   - Frontend
   - Blockchain node

## 📋 Checklist de Verificación

- [ ] Backup de base de datos creado
- [ ] Archivos .env actualizados (o script ejecutado)
- [ ] Migración de base de datos ejecutada
- [ ] Verificación de columnas en `token_balances`
- [ ] Verificación de datos en `native_tokens`
- [ ] Servicios reiniciados
- [ ] Tests ejecutados
- [ ] Verificación de endpoints funcionando

## 🔍 Archivos Modificados

### Variables de Entorno:
- ✅ `env.example`
- ⚠️ `.env` (usar script)
- ⚠️ `.env.beta` (usar script)
- ⚠️ `dujyo-backend/.env` (usar script)
- ⚠️ `dujyo-backend/.env.testnet` (usar script)
- ⚠️ `dujyo-frontend/.env` (usar script)

### Base de Datos:
- ✅ `dujyo-backend/migrations/004_token_balances.sql`
- ✅ `dujyo-backend/migrations/013_rename_token_columns.sql` (nuevo)
- ✅ `scripts/migrate_database_to_dujyo.sql` (nuevo)

### Configuración:
- ✅ `dujyo-backend/scripts/xwave_token_config.txt`
- ✅ `dujyo-backend/scripts/xwave_cpv_config.txt`
- ✅ `dujyo-backend/scripts/xwave_main_wallet.txt`

---

**Fecha**: 2024-12-19
**Estado**: ✅ Completado - Listo para aplicar

