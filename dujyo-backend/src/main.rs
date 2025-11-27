mod blockchain;
mod handlers;
pub mod services;
mod models;
pub mod utils {
    pub mod safe_math;
    pub mod arithmetic;
    pub mod access_control;
    pub mod vrf;
    pub mod crypto;
}
mod server;
mod storage;
mod auth;
mod dex;
mod routes; // ✅ ONBOARDING EXTENSION: Add routes module
mod redis; // ✅ MVP-CRITICAL: Redis module for rate limiting and caching
mod security; // ✅ MVP-CRITICAL: Security module for rate limiting
mod middleware; // ✅ MVP-CRITICAL: Middleware including Redis rate limiting

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Dujyo Backend - Starting HTTP Blockchain Server");
    
    // Start the Axum HTTP server
    server::start_server().await?;
    
    Ok(())
}