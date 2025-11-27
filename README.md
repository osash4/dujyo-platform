# Dujyo Blockchain - Creative Proof of Value (CPV)

## 🚀 **Blockchain Completamente Funcional**

Dujyo es una blockchain innovadora que implementa el consenso **Creative Proof of Value (CPV)**, combinando validación económica, creativa y comunitaria para crear un ecosistema descentralizado único.

## ✨ **Características Principales**

### 🎨 **Consenso CPV (Creative Proof of Value)**
- **Validación Económica**: Stake tradicional de tokens
- **Validación Creativa**: Contribuciones NFT, royalties, contenido verificado
- **Validación Comunitaria**: Votos, moderación, curación de contenido
- **Selección de Proposers**: Algoritmo ponderado que combina los tres aspectos

### 🪙 **Tokens Nativos**
- **DYO Token**: Token nativo de la blockchain (1B max supply)
- **DYS Stablecoin**: Stablecoin respaldada por el ecosistema (10B max supply)
- **Minting/Burning**: Funcionalidad completa de creación y destrucción de tokens
- **Transferencias**: Sistema de transferencias peer-to-peer

### 🔄 **DEX (Decentralized Exchange)**
- **Pools de Liquidez**: DYO/DYS con fórmula de producto constante (x * y = k)
- **Swaps Automáticos**: Intercambio directo entre tokens con validación de liquidez
- **Price Impact**: Cálculo real del impacto en el precio
- **Fees**: 0.3% de comisión por swap
- **Slippage Protection**: Protección contra deslizamiento de precio

### 🏦 **Sistema de Staking**
- **Staking Real**: Bloqueo de tokens DYO por 30 días
- **Recompensas**: 12% APY calculado en tiempo real
- **Posiciones**: Sistema de posiciones con IDs únicos
- **Unstaking Fee**: 1% de comisión por retiro anticipado
- **Rewards Tracking**: Seguimiento de recompensas acumuladas

## 🏗️ **Arquitectura Técnica**

### **Backend (Rust + Axum)**
```
dujyo-backend/
├── src/
│   ├── blockchain/
│   │   ├── real_blockchain.rs      # Blockchain real con nodos CPV
│   │   ├── token_contract.rs       # Contratos de tokens
│   │   ├── swap_contract.rs        # Contrato de intercambio
│   │   └── staking_contract.rs     # Contrato de staking
│   ├── consensus/
│   │   ├── cpv_consensus.rs        # Algoritmo de consenso CPV
│   │   └── cpv_node.rs            # Nodo blockchain
│   ├── server.rs                   # Servidor HTTP con endpoints reales
│   └── main.rs
```

### **Frontend (React + TypeScript)**
```
dujyo-frontend/
├── src/
│   ├── components/
│   │   ├── DEX/
│   │   │   └── DEXSwap.tsx         # Interfaz de intercambio real
│   │   ├── Staking/
│   │   │   └── StakingPanel.tsx    # Panel de staking real
│   │   └── Wallet/
│   │       └── WalletConnect.tsx   # Conexión de wallet real
│   ├── contexts/
│   │   └── BlockchainContext.tsx   # Contexto de blockchain real
│   └── hooks/
│       ├── useBalanceRefresh.ts    # Actualización de balances
│       └── useAutoBalanceRefresh.ts # Auto-refresh de balances
```

### **Blockchain Node (TypeScript)**
```
blockchain/
├── src/
│   ├── consensus/
│   │   ├── cpv_node.ts            # Nodo CPV funcional
│   │   └── cpv_consensus.ts       # Consenso CPV real
│   ├── contracts/
│   │   ├── token_contract.ts      # Contratos de tokens
│   │   ├── swap_contract.ts       # Contrato de swap
│   │   └── staking_contract.ts    # Contrato de staking
│   ├── node/
│   │   └── blockchain_node.ts     # Nodo blockchain principal
│   └── types/
│       └── index.ts               # Tipos de blockchain
```

## 🚀 **Instalación y Despliegue**

### **Prerrequisitos**
- Rust 1.70+
- Node.js 18+
- PostgreSQL 14+

### **1. Backend**
```bash
cd dujyo-backend
cargo build --release
./target/release/xwavve-backend
```

### **2. Blockchain Node**
```bash
cd blockchain
npm install
npm run dev
```

### **3. Frontend**
```bash
cd dujyo-frontend
npm install
npm start
```

## 📡 **Endpoints de la API**

### **Autenticación**
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registro de usuario

### **Blockchain**
- `GET /balance/{address}` - Obtener balance real
- `POST /mint` - Mintear tokens (solo admin)
- `POST /transaction` - Enviar transacción

### **DEX**
- `POST /swap` - Ejecutar swap real
- `GET /quote` - Obtener cotización de swap
- `POST /liquidity/add` - Agregar liquidez
- `POST /liquidity/remove` - Remover liquidez

### **Staking**
- `POST /stake` - Hacer stake real
- `POST /unstake` - Retirar stake
- `GET /staking/positions` - Obtener posiciones de staking

## 🔧 **Configuración**

### **Variables de Entorno**
```bash
# Backend
DATABASE_URL=postgresql://user:password@localhost/dujyo
JWT_SECRET=your-secret-key
RPC_PORT=8083
WS_PORT=8084

# Blockchain Node
RPC_PORT=8080
WS_PORT=8081
NODE_ID=validator-1
STAKE_AMOUNT=1000000
```

## 🧪 **Testing**

### **Backend Tests**
```bash
cd dujyo-backend
cargo test
```

### **Frontend Tests**
```bash
cd dujyo-frontend
npm test
```

### **Blockchain Tests**
```bash
cd blockchain
npm test
```

## 📊 **Métricas y Monitoreo**

### **Estadísticas de Red**
- Total de bloques minados
- Transacciones procesadas
- Validadores activos
- Liquidez total en pools
- Tokens en staking

### **Métricas CPV**
- Score creativo promedio
- Score comunitario promedio
- Score económico promedio
- Distribución de proposers

## 🔒 **Seguridad**

### **Validaciones Implementadas**
- Validación de firmas de transacciones
- Verificación de balances antes de transacciones
- Protección contra double-spending
- Validación de liquidez en swaps
- Verificación de lock periods en staking

### **Auditoría**
- Código limpio y documentado
- Sin dependencias obsoletas
- Manejo de errores robusto
- Logs detallados para debugging

## 🌟 **Características Únicas**

### **1. Consenso CPV**
- Primer consenso que combina validación económica, creativa y comunitaria
- Incentiva la creación de contenido de valor
- Promueve la participación comunitaria activa

### **2. DEX Integrado**
- Intercambio nativo entre DYO y USDYO
- Liquidez automática y gestión de pools
- Price impact calculation en tiempo real

### **3. Staking Inteligente**
- Recompensas calculadas en tiempo real
- Sistema de posiciones con tracking completo
- Integración con el consenso CPV

## 📈 **Roadmap**

### **Fase 1: Core (✅ Completado)**
- [x] Consenso CPV funcional
- [x] Tokens nativos DYO y USDYO
- [x] DEX con pools de liquidez
- [x] Sistema de staking real
- [x] Frontend conectado al backend real

### **Fase 2: Expansión (🔄 En desarrollo)**
- [ ] Integración con wallets externas
- [ ] API pública para desarrolladores
- [ ] SDK para aplicaciones descentralizadas
- [ ] Bridge con otras blockchains

### **Fase 3: Ecosistema (📋 Planificado)**
- [ ] Marketplace de NFTs
- [ ] Sistema de gobernanza DAO
- [ ] Aplicaciones descentralizadas
- [ ] Integración con DeFi protocols

## 🤝 **Contribución**

### **Cómo Contribuir**
1. Fork del repositorio
2. Crear branch para feature (`git checkout -b feature/amazing-feature`)
3. Commit de cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

### **Estándares de Código**
- Rust: `cargo fmt` y `cargo clippy`
- TypeScript: ESLint y Prettier
- Commits: Conventional Commits
- Tests: Cobertura mínima del 80%

## 📄 **Licencia**

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 **Soporte**

### **Documentación**
- [Wiki del Proyecto](https://github.com/dujyo/blockchain/wiki)
- [API Documentation](https://docs.dujyo.io)
- [Guías de Desarrollo](https://docs.dujyo.io/development)

### **Comunidad**
- [Discord](https://discord.gg/dujyo)
- [Telegram](https://t.me/dujyo_official)
- [Twitter](https://twitter.com/dujyo_io)

### **Reportar Issues**
- [GitHub Issues](https://github.com/dujyo/blockchain/issues)
- [Bug Reports](https://github.com/dujyo/blockchain/issues/new?template=bug_report.md)
- [Feature Requests](https://github.com/dujyo/blockchain/issues/new?template=feature_request.md)

---

## 🎯 **Estado del Proyecto: PRODUCCIÓN READY**

✅ **Blockchain completamente funcional**  
✅ **Consenso CPV operativo**  
✅ **DEX con swaps reales**  
✅ **Sistema de staking funcional**  
✅ **Frontend conectado al backend real**  
✅ **Sin mocks ni placeholders**  
✅ **Listo para auditoría**  

**Dujyo está listo para ser desplegado en mainnet y enviado a auditoría de seguridad.**