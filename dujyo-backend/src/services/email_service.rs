//! Email Service for Dujyo Onboarding
//! 
//! Simple email service using SendGrid API or similar email provider
//! Falls back to logging if email service is not configured

use serde_json::json;
use std::env;
use tracing::{error, info, warn};

#[derive(Debug, Clone)]
pub struct EmailService {
    api_key: Option<String>,
    from_email: String,
    api_url: String,
}

#[derive(Debug)]
pub enum EmailError {
    ConfigurationError(String),
    SendError(String),
}

impl std::fmt::Display for EmailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmailError::ConfigurationError(msg) => write!(f, "Configuration error: {}", msg),
            EmailError::SendError(msg) => write!(f, "Send error: {}", msg),
        }
    }
}

impl std::error::Error for EmailError {}

impl EmailService {
    pub fn new() -> Self {
        let api_key = env::var("SENDGRID_API_KEY").ok();
        let from_email = env::var("EMAIL_FROM")
            .unwrap_or_else(|_| "noreply@dujyo.com".to_string());
        let api_url = env::var("SENDGRID_API_URL")
            .unwrap_or_else(|_| "https://api.sendgrid.com/v3/mail/send".to_string());

        Self {
            api_key,
            from_email,
            api_url,
        }
    }

    /// Send welcome email to new artist
    pub async fn send_welcome_artist_email(
        &self,
        artist_email: &str,
        artist_name: &str,
    ) -> Result<(), EmailError> {
        let subject = format!("¡Bienvenido a Dujyo, {}!", artist_name);
        
        let html_content = format!(
            r#"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .step {{ background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px; }}
                    .step-number {{ font-weight: bold; color: #667eea; }}
                    .cta {{ background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Bienvenido a Dujyo!</h1>
                        <p>Tu plataforma de streaming descentralizada</p>
                    </div>
                    <div class="content">
                        <p>Hola <strong>{}</strong>,</p>
                        <p>¡Felicitaciones! Ahora eres un artista verificado en Dujyo. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
                        
                        <h2>Próximos pasos:</h2>
                        
                        <div class="step">
                            <span class="step-number">1.</span> <strong>Sube tu primera canción</strong><br>
                            Comparte tu música con el mundo y comienza a ganar tokens.
                        </div>
                        
                        <div class="step">
                            <span class="step-number">2.</span> <strong>Configura tus royalties</strong><br>
                            Define cómo quieres distribuir tus ganancias.
                        </div>
                        
                        <div class="step">
                            <span class="step-number">3.</span> <strong>Completa tu perfil</strong><br>
                            Agrega tu biografía, foto y enlaces sociales.
                        </div>
                        
                        <div class="step">
                            <span class="step-number">4.</span> <strong>Gana tus primeros tokens</strong><br>
                            Cada reproducción te genera tokens DYO.
                        </div>
                        
                        <p style="margin-top: 30px;">
                            <a href="https://dujyo.com/artist/dashboard" class="cta">Ir a mi Dashboard</a>
                        </p>
                        
                        <p style="margin-top: 30px; font-size: 12px; color: #666;">
                            Si tienes preguntas, contáctanos en support@dujyo.com
                        </p>
                    </div>
                </div>
            </body>
            </html>
            "#,
            artist_name
        );

        self.send_email(artist_email, &subject, &html_content).await
    }

    /// Send reminder email to artist who hasn't completed onboarding
    pub async fn send_onboarding_reminder(
        &self,
        artist_email: &str,
        artist_name: &str,
        next_step: &str,
    ) -> Result<(), EmailError> {
        let subject = format!("¡No te olvides de completar tu perfil en Dujyo!");
        
        let html_content = format!(
            r#"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .cta {{ background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Sigue adelante!</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>{}</strong>,</p>
                        <p>Notamos que comenzaste tu onboarding en Dujyo pero aún no has completado todos los pasos.</p>
                        <p><strong>Próximo paso recomendado:</strong> {}</p>
                        <p style="margin-top: 30px;">
                            <a href="https://dujyo.com/artist/dashboard" class="cta">Continuar Onboarding</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            "#,
            artist_name, next_step
        );

        self.send_email(artist_email, &subject, &html_content).await
    }

    /// Internal method to send email via SendGrid API
    async fn send_email(
        &self,
        to: &str,
        subject: &str,
        html_content: &str,
    ) -> Result<(), EmailError> {
        // If no API key is configured, just log the email (for development)
        if self.api_key.is_none() {
            warn!(
                "Email service not configured (SENDGRID_API_KEY not set). Email would be sent:",
            );
            info!("To: {}", to);
            info!("Subject: {}", subject);
            info!("Email logged instead of sent (development mode)");
            return Ok(());
        }

        let api_key = self.api_key.as_ref().unwrap();
        let client = reqwest::Client::new();

        let payload = json!({
            "personalizations": [{
                "to": [{
                    "email": to
                }]
            }],
            "from": {
                "email": self.from_email
            },
            "subject": subject,
            "content": [{
                "type": "text/html",
                "value": html_content
            }]
        });

        let response = client
            .post(&self.api_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| EmailError::SendError(format!("Failed to send request: {}", e)))?;

        if response.status().is_success() {
            info!("✅ Welcome email sent successfully to {}", to);
            Ok(())
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("❌ Failed to send email: {} - {}", status, error_text);
            Err(EmailError::SendError(format!(
                "Email API returned error: {} - {}",
                status, error_text
            )))
        }
    }
}

impl Default for EmailService {
    fn default() -> Self {
        Self::new()
    }
}

