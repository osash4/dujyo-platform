use serde::{Serialize, Deserialize};
use regex::Regex;
use mime::Mime;
use std::collections::HashMap;
use tokio::io::AsyncReadExt;
use std::fs::File;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentMetadata {
    pub title: String,
    pub creator: String,
    pub price: f64,
    pub content_type: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseTerms {
    pub license_type: String,
    pub duration: u64,
    pub commercial_use: bool,
    pub transferable: bool,
    pub restrictions: Vec<String>,
}

#[derive(Debug)]
pub enum ContentType {
    Video,
    Music,
    Game,
}

// Use a simple HashMap instead of phf for Vec values
use std::collections::HashMap as StdHashMap;

lazy_static::lazy_static! {
    pub static ref ALLOWED_MIME_TYPES: StdHashMap<&'static str, Vec<&'static str>> = {
        let mut map = StdHashMap::new();
        map.insert("video", vec!["video/mp4", "video/webm"]);
        map.insert("music", vec!["audio/mp3", "audio/wav", "audio/ogg"]);
        map.insert("game", vec!["application/zip", "application/x-zip-compressed"]);
        map
};
}

lazy_static::lazy_static! {
    pub static ref MAX_FILE_SIZES: StdHashMap<&'static str, usize> = {
        let mut map = StdHashMap::new();
        map.insert("video", 500 * 1024 * 1024); // 500MB
        map.insert("music", 50 * 1024 * 1024);  // 50MB
        map.insert("game", 1024 * 1024 * 1024); // 1GB
        map
};
}

#[derive(Debug)]
pub struct FileData {
    pub size: usize,
    pub buffer: Vec<u8>,
}

impl ContentMetadata {
    pub fn validate(&self) -> Result<(), String> {
        if self.title.is_empty() || self.title.len() > 100 {
            return Err("Title is required and cannot exceed 100 characters".into());
        }

        if self.creator.is_empty() {
            return Err("Creator is required".into());
        }

        if self.price < 0.0 {
            return Err("Price must be non-negative".into());
        }

        let allowed_types = vec!["video", "music", "game"];
        if !allowed_types.contains(&self.content_type.as_str()) {
            return Err("Invalid content type".into());
        }

        if let Some(desc) = &self.description {
            if desc.len() > 1000 {
                return Err("Description is too long".into());
            }
        }

        if let Some(tags) = &self.tags {
            if tags.len() > 10 {
                return Err("Too many tags, max 10 allowed".into());
            }
        }

        Ok(())
    }
}

impl LicenseTerms {
    pub fn validate(&self) -> Result<(), String> {
        let allowed_types = vec!["exclusive", "non-exclusive", "limited"];
        if !allowed_types.contains(&self.license_type.as_str()) {
            return Err("Invalid license type".into());
        }

        if self.duration < 1 {
            return Err("Duration must be at least 1 day".into());
        }

        Ok(())
    }
}

pub async fn validate_file(file: FileData, content_type: &str) -> Result<bool, String> {
    // Check file size
    if let Some(max_size) = MAX_FILE_SIZES.get(content_type) {
        if file.size > *max_size {
        return Err(format!("File size exceeds maximum allowed for {}", content_type));
        }
    } else {
        return Err(format!("Unknown content type: {}", content_type));
    }

    // Check file type
    let mime_type = get_mime_type(&file.buffer).await;
    if let Some(allowed_types) = ALLOWED_MIME_TYPES.get(content_type) {
        if !allowed_types.contains(&mime_type.as_str()) {
        return Err(format!("Invalid file type for {}", content_type));
        }
    } else {
        return Err(format!("Unknown content type: {}", content_type));
    }

    Ok(true)
}

async fn get_mime_type(buffer: &[u8]) -> String {
    // Simple MIME type detection based on file signatures
    if buffer.len() >= 4 {
        // Check for common file signatures
        if buffer.starts_with(b"\x89PNG") {
            return "image/png".to_string();
        } else if buffer.starts_with(b"GIF8") {
            return "image/gif".to_string();
        } else if buffer.starts_with(b"\xFF\xD8\xFF") {
            return "image/jpeg".to_string();
        } else if buffer.starts_with(b"RIFF") && buffer.len() > 8 && &buffer[8..12] == b"WEBP" {
            return "image/webp".to_string();
        } else if buffer.starts_with(b"\x1A\x45\xDF\xA3") {
            return "video/webm".to_string();
        } else if buffer.starts_with(b"\x00\x00\x00") && buffer.len() > 4 && &buffer[4..8] == b"ftyp" {
            return "video/mp4".to_string();
        } else if buffer.starts_with(b"ID3") || buffer.starts_with(b"\xFF\xFB") || buffer.starts_with(b"\xFF\xF3") {
            return "audio/mpeg".to_string();
        } else if buffer.starts_with(b"RIFF") && buffer.len() > 8 && &buffer[8..12] == b"WAVE" {
            return "audio/wav".to_string();
        } else if buffer.starts_with(b"OggS") {
            return "audio/ogg".to_string();
        } else if buffer.starts_with(b"PK\x03\x04") {
            return "application/zip".to_string();
        }
    }
    "application/octet-stream".to_string()
}

pub fn validate_address(address: Option<String>) -> bool {
    match address {
        Some(addr) => addr.len() == 130,
        None => true,
    }
}

pub fn validate_peer(peer_id: &str) -> bool {
    peer_id.len() == 64
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Proposal {
    pub proposal_type: String,
    pub data: HashMap<String, String>,
}

pub fn validate_proposal(proposal: Proposal) -> Result<(), String> {
    let allowed_types = vec!["PARAMETER_CHANGE", "UPGRADE", "EMERGENCY"];
    if !allowed_types.contains(&proposal.proposal_type.as_str()) {
        return Err("Invalid proposal type".into());
    }
    Ok(())
}

pub fn validate_transaction(transaction_hash: String, chain: Vec<HashMap<String, String>>) -> Result<bool, String> {
    // Check for replay attacks
    for block in chain.iter() {
        if let Some(_) = block.get(&transaction_hash) {
            return Err("Transaction replay detected".into());
        }
    }

    Ok(true)
}

#[tokio::main]
async fn main() {
    // Ejemplo de uso
    let metadata = ContentMetadata {
        title: "New Video".to_string(),
        creator: "Artist".to_string(),
        price: 0.99,
        content_type: "video".to_string(),
        description: Some("A great video".to_string()),
        tags: Some(vec!["entertainment".to_string()]),
    };

    match metadata.validate() {
        Ok(_) => println!("Metadata is valid"),
        Err(e) => println!("Error validating metadata: {}", e),
    }

    let file = FileData {
        size: 450 * 1024 * 1024,
        buffer: vec![], // Este debería ser el contenido binario del archivo
    };

    match validate_file(file, "video").await {
        Ok(_) => println!("File is valid"),
        Err(e) => println!("Error validating file: {}", e),
    }
}
