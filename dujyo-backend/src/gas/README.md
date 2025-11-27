# Creative Gas Model - Sistema de Gas Fees para DUJYO

## 📋 Descripción

El **Creative Gas Model** es un sistema avanzado de gas fees que combina:
- **Price Fixing en USD**: Precios fijos y predecibles
- **Auto-Swap**: Conversión automática DYS → DYO si es necesario
- **Creative Weight**: Descuentos para contenido cultural
- **Gas Sponsorship**: Onboarding sin fricción para nuevos usuarios

## 🏗️ Arquitectura

```
src/gas/
├── mod.rs                      # Exporta todos los módulos
├── creative_gas_engine.rs      # Núcleo del sistema
├── auto_swap_handler.rs        # Mecanismo de auto-swap
├── creative_weight.rs          # Sistema de descuentos
├── sponsorship_pool.rs         # Pool de sponsorships
└── fee_distribution.rs         # Distribución de fees
```

## 🚀 Uso Básico

### 1. Inicializar el Engine

```rust
use crate::gas::creative_gas_engine::{CreativeGasEngine, TransactionType, UserTier};

let mut gas_engine = CreativeGasEngine::new();

// Actualizar precio de DYO desde DEX (ejemplo: $0.001 USD por DYO)
gas_engine.update_dyo_price(0.001);
```

### 2. Calcular Gas para una Transacción

```rust
let quote = gas_engine.calculate_gas(
    TransactionType::UploadContent,
    "user123",
    &UserTier::Regular,
    0, // transacciones en la última hora
);

println!("Gas requerido: {} DYO", quote.final_price_dyo);
println!("Descuento aplicado: {}%", quote.discount_percentage);
```

### 3. Ejecutar Transacción con Auto-Swap

```rust
use crate::gas::auto_swap_handler::*;

let tx = Transaction {
    id: "tx_123".to_string(),
    transaction_type: TransactionType::UploadContent,
    user_id: "user123".to_string(),
    amount: None,
    metadata: None,
};

let result = handle_transaction_with_auto_swap(
    tx,
    "user123",
    &UserTier::Regular,
    5.0,  // user_dyo_balance
    100.0, // user_dys_balance
    0,    // transaction_count_last_hour
    &mut gas_engine,
    None, // swap_callback (opcional)
).await?;

if result.auto_swapped {
    println!("Auto-swap ejecutado: {} DYS → {} DYO", 
        result.swap_amount_dys.unwrap(), 
        result.gas_paid_dyo
    );
}
```

## 💰 Precios Base (USD)

| Transacción | Precio USD | Notas |
|------------|-----------|-------|
| StreamEarn | $0.00 | GRATIS |
| UploadContent | $0.02 | 50% descuento cultural |
| MintNFT | $0.05 | 50% descuento cultural |
| SimpleTransfer | $0.001 | Precio normal |
| DexSwap | $0.03 | Precio normal |
| StakingDeposit | $0.02 | Precio normal |
| ProposeBlock | $0.00 | GRATIS para validators |

## 🎨 Creative Weight System

El sistema aplica descuentos automáticos basados en el tipo de contenido:

- **Contenido Cultural** (música, arte, NFTs): **50% descuento**
- **Transacciones Normales**: Precio estándar
- **Actividad Abusiva** (bulk uploads, bots): **500% aumento**

### Ejemplo

```rust
// Upload de contenido cultural
let quote = gas_engine.calculate_gas(
    TransactionType::UploadContent,
    "artist123",
    &UserTier::Regular,
    0,
);
// Base: $0.02 USD → Con descuento cultural: $0.01 USD
```

## 🎁 Gas Sponsorship

Ciertas transacciones son patrocinadas (gratis) para nuevos usuarios:

- ✅ Primer NFT de un artista
- ✅ Primer Stream-to-Earn
- ✅ Primer Upload de contenido
- ✅ Auto-claim de recompensas

### Pool Inicial
- **Balance**: $10,000 USD
- **Límite por usuario**: $50 USD
- **Límite diario**: $1,000 USD

## 📊 Fee Distribution

Los fees recaudados se distribuyen automáticamente:

- **40%** → Validators (recompensas)
- **30%** → Treasury (desarrollo)
- **20%** → Liquidity Providers (incentivos DEX)
- **10%** → Burn (deflación)

### Bonus para Validators Creativos
- **+5%** adicional del share de treasury

## 🔄 Auto-Swap Mechanism

Si un usuario no tiene suficiente DYO pero tiene DYS, el sistema ejecuta un swap automático:

```rust
// Usuario tiene:
// - DYO: 5.0
// - DYS: 100.0
// - Gas requerido: 10.0 DYO

// El sistema automáticamente:
// 1. Detecta que no tiene suficiente DYO
// 2. Calcula cuánto DYS necesita (10.0 * 0.001 = 0.01 DYS)
// 3. Ejecuta swap DYS → DYO
// 4. Paga el gas con el DYO obtenido
```

## 🔌 Integración con Handlers

### Ejemplo: Handler de Upload

```rust
use crate::gas::*;

pub async fn upload_content_handler(
    user_id: &str,
    content_data: ContentData,
    gas_engine: &mut CreativeGasEngine,
) -> Result<UploadResponse, Error> {
    // 1. Calcular gas
    let quote = gas_engine.calculate_gas(
        TransactionType::UploadContent,
        user_id,
        &get_user_tier(user_id).await?,
        get_transaction_count_last_hour(user_id).await?,
    );
    
    // 2. Verificar si necesita auto-swap
    let (can_execute, needs_swap) = can_execute_transaction(
        quote.final_price_dyo,
        get_user_dyo_balance(user_id).await?,
        get_user_dys_balance(user_id).await?,
    );
    
    if !can_execute {
        return Err(Error::InsufficientBalance);
    }
    
    // 3. Ejecutar transacción con auto-swap si es necesario
    let tx = Transaction {
        id: generate_tx_id(),
        transaction_type: TransactionType::UploadContent,
        user_id: user_id.to_string(),
        amount: None,
        metadata: Some(serde_json::to_value(content_data)?),
    };
    
    let result = handle_transaction_with_auto_swap(
        tx,
        user_id,
        &get_user_tier(user_id).await?,
        get_user_dyo_balance(user_id).await?,
        get_user_dys_balance(user_id).await?,
        get_transaction_count_last_hour(user_id).await?,
        gas_engine,
        Some(Box::new(|dys_amount| {
            // Callback para ejecutar swap real en DEX
            execute_dex_swap("DYS", "DYO", dys_amount)
        })),
    ).await?;
    
    // 4. Procesar upload
    process_content_upload(content_data).await?;
    
    Ok(UploadResponse {
        success: true,
        gas_paid: result.gas_paid_dyo,
        auto_swapped: result.auto_swapped,
    })
}
```

## 🧪 Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_stream_earn_is_free() {
        let mut engine = CreativeGasEngine::new();
        let quote = engine.calculate_gas(
            TransactionType::StreamEarn,
            "user123",
            &UserTier::Regular,
            0,
        );
        assert_eq!(quote.final_price_dyo, 0.0);
    }
    
    #[test]
    fn test_cultural_content_discount() {
        let mut engine = CreativeGasEngine::new();
        let quote = engine.calculate_gas(
            TransactionType::UploadContent,
            "artist123",
            &UserTier::Regular,
            0,
        );
        // Base: $0.02 USD, con 50% descuento = $0.01 USD
        // Con precio DYO de $0.001 USD = 10 DYO
        assert!(quote.final_price_dyo > 0.0);
    }
}
```

## 📝 Notas Importantes

1. **Precio de DYO**: Debe actualizarse periódicamente desde el DEX para reflejar el precio real
2. **Rate Limiting**: El sistema detecta actividad abusiva automáticamente
3. **Sponsorship Pool**: Puede recargarse con `sponsorship_rules.top_up_pool(amount)`
4. **Compatibilidad**: El sistema es compatible con el código existente en `src/blockchain/gas_fees.rs`

## 🔮 Próximos Pasos

- [ ] Integrar con handlers de transacciones reales
- [ ] Conectar con DEX para swaps reales
- [ ] Implementar rate limiting por usuario en base de datos
- [ ] Dashboard de monitoreo del sponsorship pool
- [ ] Métricas y analytics de gas fees


