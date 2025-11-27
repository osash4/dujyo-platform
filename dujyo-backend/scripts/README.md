# Dujyo Blockchain - Deployment Scripts

Este directorio contiene todos los scripts necesarios para el deployment, testing y gestión de la blockchain Dujyo.

## 📁 Estructura de Scripts

```
scripts/
├── README.md                           # Este archivo
├── dujyo_deployment.sh                 # Script maestro de deployment
├── compile_and_test.sh                 # Compilación y testing
├── deploy_testnet.sh                   # Deployment a testnet
├── deploy_mainnet.sh                   # Deployment a mainnet
├── test_deployment.sh                  # Testing completo
├── verify_deployment.sh                # Verificación de deployment
├── manage_deployment.sh                # Gestión de servidores
├── setup_native_token_database.sql     # Configuración de base de datos
├── create_main_wallet_simple.rs        # Generación de wallet principal
├── initial_token_distribution_simple.rs # Distribución inicial de tokens
├── setup_cpv_rewards_simple.rs         # Configuración de recompensas CPV
└── setup_dujyo_blockchain.sh           # Setup completo de blockchain
```

## 🚀 Uso Rápido

### Script Maestro (Recomendado)

```bash
# Setup inicial completo
./scripts/dujyo_deployment.sh setup

# Deployment a testnet
./scripts/dujyo_deployment.sh deploy testnet

# Testing completo
./scripts/dujyo_deployment.sh test testnet

# Verificación de deployment
./scripts/dujyo_deployment.sh verify testnet

# Gestión de servidores
./scripts/dujyo_deployment.sh manage start testnet
./scripts/dujyo_deployment.sh manage status all
./scripts/dujyo_deployment.sh manage stop testnet

# Compilación y testing
./scripts/dujyo_deployment.sh compile

# Limpieza
./scripts/dujyo_deployment.sh clean
```

## 📋 Scripts Individuales

### 1. Script Maestro (`dujyo_deployment.sh`)

**Propósito**: Orquesta todo el proceso de deployment de Dujyo.

**Uso**:
```bash
./scripts/dujyo_deployment.sh <command> [environment] [options]
```

**Comandos disponibles**:
- `setup` - Setup inicial completo
- `deploy <env>` - Deployment a testnet/mainnet
- `test <env>` - Testing completo
- `verify <env>` - Verificación de deployment
- `manage <cmd>` - Gestión de servidores
- `compile` - Compilación y testing
- `clean` - Limpieza de archivos

### 2. Compilación y Testing (`compile_and_test.sh`)

**Propósito**: Compila el backend y ejecuta tests.

**Uso**:
```bash
./scripts/compile_and_test.sh
```

### 3. Deployment a Testnet (`deploy_testnet.sh`)

**Propósito**: Despliega Dujyo en testnet con configuración completa.

**Uso**:
```bash
./scripts/deploy_testnet.sh
```

**Características**:
- Configuración de base de datos de testnet
- Inicio de servidor de testnet
- Configuración de multisig wallets
- Configuración de vesting schedules
- Configuración de staking contracts
- Configuración de liquidity seed
- Verificación de deployment

### 4. Deployment a Mainnet (`deploy_mainnet.sh`)

**Propósito**: Despliega Dujyo en mainnet con configuración completa.

**Uso**:
```bash
./scripts/deploy_mainnet.sh
```

**Características**:
- Configuración de base de datos de mainnet
- Inicio de servidor de mainnet
- Configuración de multisig wallets
- Configuración de vesting schedules
- Configuración de staking contracts
- Configuración de liquidity seed
- Verificación de deployment

### 5. Testing Completo (`test_deployment.sh`)

**Propósito**: Ejecuta tests completos del deployment.

**Uso**:
```bash
./scripts/test_deployment.sh
```

**Tests incluidos**:
- Verificación de servidor
- Tests de endpoints básicos
- Tests de token nativo
- Tests de multisig
- Tests de vesting
- Tests de staking
- Tests de consensus CPV
- Tests de rendimiento
- Tests de estrés
- Tests de error handling
- Tests de base de datos

### 6. Verificación de Deployment (`verify_deployment.sh`)

**Propósito**: Verifica que el deployment esté funcionando correctamente.

**Uso**:
```bash
./scripts/verify_deployment.sh
```

**Verificaciones incluidas**:
- Estado del servidor
- Endpoints básicos
- Token nativo
- Multisig wallets
- Vesting schedules
- Staking contracts
- Consensus CPV
- Base de datos
- Funcionalidades
- Rendimiento

### 7. Gestión de Deployment (`manage_deployment.sh`)

**Propósito**: Gestiona servidores (start, stop, restart, status, logs).

**Uso**:
```bash
./scripts/manage_deployment.sh <command> [environment] [options]
```

**Comandos disponibles**:
- `start <env>` - Iniciar servidor
- `stop <env>` - Detener servidor
- `restart <env>` - Reiniciar servidor
- `status [env]` - Mostrar estado
- `logs <env>` - Mostrar logs
- `verify [env]` - Verificar deployment

## 🗄️ Scripts de Base de Datos

### Setup de Base de Datos (`setup_native_token_database.sql`)

**Propósito**: Crea las tablas necesarias para el token nativo, multisig, vesting y staking.

**Uso**:
```bash
psql -d dujyo_blockchain -f scripts/setup_native_token_database.sql
```

## 🔧 Scripts de Configuración

### 1. Generación de Wallet Principal (`create_main_wallet_simple.rs`)

**Propósito**: Genera el wallet principal de Dujyo.

**Uso**:
```bash
cargo run --bin create_main_wallet_simple
```

### 2. Distribución Inicial de Tokens (`initial_token_distribution_simple.rs`)

**Propósito**: Define la distribución inicial de tokens DYO.

**Uso**:
```bash
cargo run --bin initial_token_distribution_simple
```

### 3. Configuración de Recompensas CPV (`setup_cpv_rewards_simple.rs`)

**Propósito**: Configura las recompensas del consensus CPV.

**Uso**:
```bash
cargo run --bin setup_cpv_rewards_simple
```

### 4. Setup Completo de Blockchain (`setup_dujyo_blockchain.sh`)

**Propósito**: Ejecuta el setup completo de la blockchain Dujyo.

**Uso**:
```bash
./scripts/setup_dujyo_blockchain.sh
```

## 📊 Configuración de Entornos

### Testnet
- **Host**: localhost
- **Port**: 8083
- **Database**: dujyo_testnet
- **URL**: http://localhost:8083

### Mainnet
- **Host**: localhost
- **Port**: 8083
- **Database**: dujyo_mainnet
- **URL**: http://localhost:8083

## 🔍 Verificación de Deployment

### Endpoints Principales

```bash
# Health check
curl http://localhost:8083/health

# Token stats
curl http://localhost:8083/token/stats

# Multisig stats
curl http://localhost:8083/multisig/stats

# Vesting stats
curl http://localhost:8083/vesting/stats

# Staking stats
curl http://localhost:8083/staking/stats

# Consensus stats
curl http://localhost:8083/consensus/stats
```

### Logs

```bash
# Ver logs del servidor
tail -f logs/testnet_server.log
tail -f logs/mainnet_server.log

# Ver logs de deployment
tail -f logs/testnet_deployment_*.log
tail -f logs/mainnet_deployment_*.log

# Ver logs de testing
tail -f logs/testing_*.log
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Servidor no responde**:
   ```bash
   # Verificar si está corriendo
   ./scripts/manage_deployment.sh status all
   
   # Reiniciar servidor
   ./scripts/manage_deployment.sh restart testnet
   ```

2. **Error de base de datos**:
   ```bash
   # Verificar conexión
   psql -c "SELECT 1;"
   
   # Recrear base de datos
   psql -c "DROP DATABASE IF EXISTS dujyo_testnet;"
   psql -c "CREATE DATABASE dujyo_testnet;"
   ```

3. **Error de compilación**:
   ```bash
   # Limpiar y recompilar
   ./scripts/dujyo_deployment.sh clean
   ./scripts/dujyo_deployment.sh compile
   ```

4. **Error de permisos**:
   ```bash
   # Hacer scripts ejecutables
   chmod +x scripts/*.sh
   ```

### Logs de Error

Los logs se guardan en el directorio `logs/`:
- `testnet_server.log` - Logs del servidor de testnet
- `mainnet_server.log` - Logs del servidor de mainnet
- `testnet_deployment_*.log` - Logs de deployment de testnet
- `mainnet_deployment_*.log` - Logs de deployment de mainnet
- `testing_*.log` - Logs de testing
- `verification_*.log` - Logs de verificación

## 📈 Monitoreo

### Métricas de Rendimiento

```bash
# Verificar tiempo de respuesta
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8083/health

# Verificar uso de memoria
ps aux | grep xwavve-backend

# Verificar uso de CPU
top -p $(pgrep xwavve-backend)
```

### Estado del Sistema

```bash
# Estado general
./scripts/manage_deployment.sh status all

# Verificación completa
./scripts/verify_deployment.sh

# Testing completo
./scripts/test_deployment.sh
```

## 🔒 Seguridad

### Configuración de Seguridad

1. **Variables de entorno**:
   - Usar archivos `.env` para configuración sensible
   - No commitear archivos `.env` al repositorio

2. **Base de datos**:
   - Usar usuarios con permisos limitados
   - Configurar SSL para conexiones remotas

3. **Servidor**:
   - Usar HTTPS en producción
   - Configurar firewall
   - Monitorear logs de acceso

## 📚 Documentación Adicional

- [Tokenomics](docs/TOKENOMICS.md)
- [Audit Checklist](docs/AUDIT_CHECKLIST.md)
- [Deployment Summary](DEPLOYMENT_SUMMARY.md)

## 🤝 Soporte

Para problemas o preguntas:
1. Revisar logs de error
2. Verificar configuración
3. Ejecutar scripts de verificación
4. Consultar documentación
5. Contactar al equipo de desarrollo
