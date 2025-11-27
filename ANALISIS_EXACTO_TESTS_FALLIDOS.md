# 📋 ANÁLISIS EXACTO DE LOS 8 TESTS FALLIDOS

**Fecha:** 2024  
**Comando ejecutado:** `cargo test --lib -- --list | grep FAIL`

---

## 1. `test_upload_content_has_cultural_discount` (gas::creative_gas_engine)

**Ubicación:** `src/gas/creative_gas_engine.rs:273`

**Error:**
```
assertion failed: quote.final_price_dyo > 0.0
```

**Causa exacta:**
- El test espera que `final_price_dyo > 0.0` después de calcular gas para `TransactionType::UploadContent`
- El test asume que el precio base es $0.02 USD y con 50% descuento cultural debería ser $0.01 USD = 10 DYO
- **PROBLEMA:** El `calculate_gas` está devolviendo `final_price_dyo = 0.0`
- **RAZÓN:** Probablemente el sponsorship está activándose automáticamente para `UploadContent`, haciendo que el gas sea gratis (sponsored), o el creative weight está aplicando un descuento del 100%

**Código del test:**
```rust
let quote = engine.calculate_gas(
    TransactionType::UploadContent,
    "user123",
    &UserTier::Regular,
    0,
);
assert!(quote.final_price_dyo > 0.0);
```

---

## 2. `test_emergency_pause` (utils::access_control)

**Ubicación:** `src/utils/access_control.rs:660`

**Error:**
```
called `Result::unwrap()` on an `Err` value: "Insufficient permissions to create users"
Línea: 670
```

**Causa exacta:**
- El test intenta registrar un usuario "admin" con rol `SuperAdmin` usando "system" como creador
- `register_user` requiere que el creador tenga el permiso `Permission::UserCreate`
- **PROBLEMA:** "system" no existe como usuario y no tiene permisos, por lo que `has_permission(&created_by, &Permission::UserCreate)` devuelve `false`
- **RAZÓN:** No hay un usuario inicial con permisos para crear el primer usuario. El sistema necesita un mecanismo de bootstrap o el primer usuario debe ser creado de forma especial.

**Código del test:**
```rust
manager
    .register_user(
        "admin".to_string(),
        vec![Role::SuperAdmin],
        "system".to_string(),  // ← "system" no tiene permisos
    )
    .unwrap();  // ← Falla aquí
```

---

## 3. `test_multi_sig_transaction` (utils::access_control)

**Ubicación:** `src/utils/access_control.rs:600`

**Error:**
```
called `Result::unwrap()` on an `Err` value: "Insufficient permissions to create users"
Línea: 610
```

**Causa exacta:**
- **MISMO PROBLEMA que test_emergency_pause:** Intenta registrar "admin" con "system" como creador
- "system" no tiene permisos para crear usuarios
- El test falla en la primera llamada a `register_user` antes de poder continuar

**Código del test:**
```rust
manager
    .register_user(
        "admin".to_string(),
        vec![Role::SuperAdmin],
        "system".to_string(),  // ← Mismo problema
    )
    .unwrap();  // ← Falla aquí
```

---

## 4. `test_user_registration` (utils::access_control)

**Ubicación:** `src/utils/access_control.rs:577`

**Error:**
```
called `Result::unwrap()` on an `Err` value: "Insufficient permissions to create users"
Línea: 587
```

**Causa exacta:**
- **MISMO PROBLEMA:** Intenta registrar "admin" con "system" como creador
- "system" no tiene permisos para crear usuarios
- El test falla antes de poder probar la funcionalidad de registro de usuarios

**Código del test:**
```rust
manager
    .register_user(
        "admin".to_string(),
        vec![Role::SuperAdmin],
        "system".to_string(),  // ← Mismo problema
    )
    .unwrap();  // ← Falla aquí
```

---

## 5. `test_permission_denied_when_paused` (utils::access_control)

**Ubicación:** `src/utils/access_control.rs:684`

**Error:**
```
called `Result::unwrap()` on an `Err` value: "Insufficient permissions to create users"
Línea: 694
```

**Causa exacta:**
- **MISMO PROBLEMA:** Intenta registrar "admin" con "system" como creador
- "system" no tiene permisos para crear usuarios
- El test falla antes de poder probar la funcionalidad de pausa

**Código del test:**
```rust
manager
    .register_user(
        "admin".to_string(),
        vec![Role::SuperAdmin],
        "system".to_string(),  // ← Mismo problema
    )
    .unwrap();  // ← Falla aquí
```

---

## 6. `test_f64_to_u64` (utils::safe_math)

**Ubicación:** `src/utils/safe_math.rs:493`

**Error:**
```
assertion failed: SafeMath::f64_to_u64(u64::MAX as f64 + 1.0, "test").is_err()
Línea: 497
```

**Causa exacta:**
- El test espera que `f64_to_u64(u64::MAX as f64 + 1.0, "test")` devuelva un error
- **PROBLEMA:** `u64::MAX as f64 + 1.0` no es mayor que `u64::MAX as f64` debido a la precisión limitada de `f64`
- `f64` tiene ~15-17 dígitos decimales de precisión, pero `u64::MAX` es 18,446,744,073,709,551,615 (20 dígitos)
- Cuando se convierte `u64::MAX` a `f64`, se pierde precisión, y sumar 1.0 no cambia el valor porque está fuera del rango de precisión
- **RAZÓN:** La comparación `value > u64::MAX as f64` en la línea 294 de `safe_math.rs` no detecta el overflow porque `u64::MAX as f64 + 1.0 == u64::MAX as f64` (debido a precisión de punto flotante)

**Código del test:**
```rust
assert!(SafeMath::f64_to_u64(u64::MAX as f64 + 1.0, "test").is_err());
```

**Código de la función:**
```rust
if value > u64::MAX as f64 {  // ← Esta comparación falla
    return Err(SafeMathError::Overflow);
}
```

---

## 7. `test_commit_reveal` (utils::vrf)

**Ubicación:** `src/utils/vrf.rs:349`

**Error:**
```
called `Result::unwrap()` on an `Err` value: "Commitment not found"
Línea: 364
```

**Causa exacta:**
- El test hace commit de datos, luego reveal con datos correctos (éxito), y luego intenta reveal con datos incorrectos
- **PROBLEMA:** Cuando el reveal con datos correctos es exitoso, el código elimina el commitment del store (línea 267: `self.commitment_store.remove(&commitment_id)`)
- Cuando el test intenta hacer reveal con datos incorrectos, el commitment ya no existe en el store
- **RAZÓN:** El test asume que el commitment sigue existiendo después del primer reveal exitoso, pero la implementación lo elimina

**Código del test:**
```rust
let is_valid = vrf_manager.reveal(commitment_id.clone(), data).unwrap();  // ← Éxito, elimina commitment
assert!(is_valid);

let wrong_data = b"wrong data";
let is_valid = vrf_manager.reveal(commitment_id, wrong_data).unwrap();  // ← Falla: commitment no existe
```

**Código de la función:**
```rust
if is_valid {
    self.commitment_store.remove(&commitment_id);  // ← Elimina el commitment
    // ...
}
```

---

## 8. `test_vrf_prove_and_verify` (utils::vrf)

**Ubicación:** `src/utils/vrf.rs:318`

**Error:**
```
assertion failed: vrf_manager.verify(&vrf_result)
Línea: 323
```

**Causa exacta:**
- El test hace `prove` para generar un `VRFResult` y luego intenta `verify` ese resultado
- **PROBLEMA:** La función `verify` está fallando en alguna de sus verificaciones
- **RAZÓN PROBABLE:** La función `verify` reconstruye el input usando `vrf_result.proof.alpha`, `timestamp`, y `public_key`, pero puede haber un desajuste en cómo se construye el input original vs cómo se reconstruye en `verify`
- O el `signing_key` usado en `verify` no coincide con el usado en `prove`

**Código del test:**
```rust
let vrf_result = vrf_manager.prove(input);
assert!(vrf_manager.verify(&vrf_result));  // ← Falla aquí
```

**Código de verify:**
```rust
// Reconstruye input
let mut input = vrf_result.proof.alpha.clone();
input.extend_from_slice(&vrf_result.timestamp.to_be_bytes());
input.extend_from_slice(&vrf_result.proof.public_key);

// Verifica gamma
let mut hasher = Sha256::new();
hasher.update(&input);
hasher.update(&self.signing_key.to_bytes());  // ← Puede no coincidir con el usado en prove
```

---

## RESUMEN

| Test | Módulo | Causa Raíz | Tipo |
|------|--------|------------|------|
| 1. `test_upload_content_has_cultural_discount` | `gas::creative_gas_engine` | Sponsorship o creative weight está haciendo el gas gratis | Lógica de negocio |
| 2-5. Tests de `access_control` (4 tests) | `utils::access_control` | "system" no tiene permisos para crear usuarios (problema de bootstrap) | Diseño del sistema |
| 6. `test_f64_to_u64` | `utils::safe_math` | Precisión de `f64` no detecta overflow de `u64::MAX + 1` | Limitación de precisión |
| 7. `test_commit_reveal` | `utils::vrf` | Commitment se elimina después del reveal exitoso | Comportamiento del test vs implementación |
| 8. `test_vrf_prove_and_verify` | `utils::vrf` | Verificación de VRF falla (posible desajuste en construcción de input) | Bug en lógica de verificación |

---

**Última actualización:** 2024

