use serde::{Serialize, Deserialize};
use serde_json;

// Simplified crypto utilities without sha2 dependency
#[derive(Serialize, Deserialize)]
pub struct Transaction {
    // Aquí puedes agregar los campos de la transacción
}

pub fn calculate_hash<T: Serialize>(data: &T) -> Result<String, String> {
    // Intentamos serializar los datos a una cadena JSON
    let serialized_data = serde_json::to_string(data)
        .map_err(|e| format!("Error serializando los datos: {}", e))?;

    // Simplified hash calculation - in a real implementation you would use a proper hash function
    // For now, we'll use a simple hash based on the string length and content
    let hash_value = serialized_data.len() as u64 * 31 + serialized_data.chars().map(|c| c as u64).sum::<u64>();
    
    // Convertimos el resultado en una cadena hexadecimal y la retornamos
    Ok(format!("{:x}", hash_value))
}
