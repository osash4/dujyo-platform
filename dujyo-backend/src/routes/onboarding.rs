//! Onboarding Routes
//! 
//! Extended onboarding functionality including next steps recommendations
//! and reminder system

use axum::{
    extract::{State, Extension},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use crate::server::AppState;
use crate::auth::Claims;
use crate::services::email_service::EmailService;
use tracing::{error, info};

/// Response for next steps endpoint
#[derive(Serialize)]
pub struct NextStepsResponse {
    pub success: bool,
    pub current_step: String,
    pub next_step: String,
    pub next_step_description: String,
    pub completed_steps: Vec<String>,
    pub remaining_steps: Vec<String>,
    pub progress_percentage: i32,
}

/// Request for sending reminder
#[derive(Deserialize)]
pub struct SendReminderRequest {
    pub user_id: String,
    pub next_step: String,
}

/// Response for reminder
#[derive(Serialize)]
pub struct ReminderResponse {
    pub success: bool,
    pub message: String,
}

/// GET /api/v1/onboarding/next-steps
/// Get recommended next steps based on user's current progress
/// Requires: JWT authentication
pub async fn get_next_steps_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<NextStepsResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Get user type
    let user_type: Option<String> = sqlx::query_scalar(
        "SELECT user_type FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        error!("❌ Database error getting user_type: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let user_type = user_type.unwrap_or_else(|| "listener".to_string());

    // Get onboarding progress from tracking table
    let completed_steps: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT step_name FROM onboarding_tracking WHERE user_id = $1 AND completed = true ORDER BY step"
    )
    .bind(user_address)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // Define all possible steps based on user type
    let all_steps = if user_type == "artist" {
        vec![
            "welcome".to_string(),
            "become_artist_complete".to_string(),
            "first_upload".to_string(),
            "royalties_configured".to_string(),
            "profile_complete".to_string(),
            "first_earnings".to_string(),
        ]
    } else {
        vec![
            "welcome".to_string(),
            "wallet_connected".to_string(),
            "first_stream".to_string(),
        ]
    };

    // Determine current step and next step
    let current_step = completed_steps.last()
        .cloned()
        .unwrap_or_else(|| "welcome".to_string());
    
    let remaining_steps: Vec<String> = all_steps
        .iter()
        .filter(|step| !completed_steps.contains(step))
        .cloned()
        .collect();

    let next_step = remaining_steps.first()
        .cloned()
        .unwrap_or_else(|| "complete".to_string());

    let next_step_description = match next_step.as_str() {
        "become_artist_complete" => "¡Felicidades! Ya eres un artista. Ahora puedes subir tu primera canción.".to_string(),
        "first_upload" => "Sube tu primera canción para comenzar a ganar tokens con cada reproducción.".to_string(),
        "royalties_configured" => "Configura cómo quieres distribuir tus royalties entre colaboradores.".to_string(),
        "profile_complete" => "Completa tu perfil agregando biografía, foto y enlaces sociales.".to_string(),
        "first_earnings" => "¡Gana tus primeros tokens! Cada reproducción genera tokens DYO.".to_string(),
        "wallet_connected" => "Conecta tu wallet para comenzar a ganar tokens.".to_string(),
        "first_stream" => "Reproduce tu primera canción y comienza a ganar tokens.".to_string(),
        "complete" => "¡Felicidades! Has completado todos los pasos del onboarding.".to_string(),
        _ => "Continúa con el siguiente paso del onboarding.".to_string(),
    };

    let progress_percentage = if all_steps.is_empty() {
        100
    } else {
        (completed_steps.len() * 100 / all_steps.len()) as i32
    };

    Ok(Json(NextStepsResponse {
        success: true,
        current_step,
        next_step,
        next_step_description,
        completed_steps,
        remaining_steps,
        progress_percentage,
    }))
}

/// POST /api/v1/onboarding/send-reminder
/// Send reminder email to artist who hasn't completed onboarding
/// Requires: JWT authentication
pub async fn send_reminder_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<SendReminderRequest>,
) -> Result<Json<ReminderResponse>, StatusCode> {
    let pool = &state.storage.pool;
    let user_address = &claims.sub;

    // Verify user is requesting reminder for themselves
    if request.user_id != *user_address {
        return Ok(Json(ReminderResponse {
            success: false,
            message: "Unauthorized: Can only send reminder for your own account".to_string(),
        }));
    }

    // Get user email and name
    let (user_email, user_name): (Option<String>, Option<String>) = sqlx::query_as(
        "SELECT email, username FROM users WHERE wallet_address = $1"
    )
    .bind(user_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        error!("❌ Database error getting user info: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .map(|row: (Option<String>, Option<String>)| row)
    .unwrap_or((None, None));

    if let Some(email) = user_email {
        let artist_name = user_name.unwrap_or_else(|| "Artista".to_string());
        let email_service = EmailService::new();
        
        // Send reminder email
        match email_service.send_onboarding_reminder(&email, &artist_name, &request.next_step).await {
            Ok(_) => {
                info!("✅ Reminder email sent to {}", email);
                Ok(Json(ReminderResponse {
                    success: true,
                    message: "Reminder email sent successfully".to_string(),
                }))
            }
            Err(e) => {
                error!("❌ Failed to send reminder email: {}", e);
                Ok(Json(ReminderResponse {
                    success: false,
                    message: format!("Failed to send reminder email: {}", e),
                }))
            }
        }
    } else {
        Ok(Json(ReminderResponse {
            success: false,
            message: "User email not found".to_string(),
        }))
    }
}

/// Onboarding routes
pub fn onboarding_routes() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/next-steps", axum::routing::get(get_next_steps_handler))
        .route("/send-reminder", axum::routing::post(send_reminder_handler))
}

