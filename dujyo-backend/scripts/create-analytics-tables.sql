-- Analytics Tables for User Testing and Feedback Loop
-- Run this script to create all analytics tracking tables

-- ============================================
-- USER SESSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    page_views INTEGER DEFAULT 0,
    events INTEGER DEFAULT 0,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    referrer TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at DESC);

-- ============================================
-- ANALYTICS EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    page VARCHAR(500),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    properties JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page ON analytics_events(page);

-- ============================================
-- ONBOARDING TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS onboarding_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    step INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT false,
    time_spent_seconds INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    abandonment_point VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tracking_user_id ON onboarding_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tracking_session_id ON onboarding_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tracking_step ON onboarding_tracking(step);
CREATE INDEX IF NOT EXISTS idx_onboarding_tracking_completed ON onboarding_tracking(completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_tracking_timestamp ON onboarding_tracking(timestamp DESC);

-- ============================================
-- FEATURE USAGE
-- ============================================

CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_name ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_action ON feature_usage(action);
CREATE INDEX IF NOT EXISTS idx_feature_usage_timestamp ON feature_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature ON feature_usage(user_id, feature_name);

-- ============================================
-- ABANDONMENT POINTS
-- ============================================

CREATE TABLE IF NOT EXISTS abandonment_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    page VARCHAR(500) NOT NULL,
    reason TEXT,
    time_spent_seconds INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abandonment_points_user_id ON abandonment_points(user_id);
CREATE INDEX IF NOT EXISTS idx_abandonment_points_session_id ON abandonment_points(session_id);
CREATE INDEX IF NOT EXISTS idx_abandonment_points_page ON abandonment_points(page);
CREATE INDEX IF NOT EXISTS idx_abandonment_points_timestamp ON abandonment_points(timestamp DESC);

-- ============================================
-- FRUSTRATION POINTS
-- ============================================

CREATE TABLE IF NOT EXISTS frustration_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    page VARCHAR(500) NOT NULL,
    element VARCHAR(255),
    action VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frustration_points_user_id ON frustration_points(user_id);
CREATE INDEX IF NOT EXISTS idx_frustration_points_session_id ON frustration_points(session_id);
CREATE INDEX IF NOT EXISTS idx_frustration_points_page ON frustration_points(page);
CREATE INDEX IF NOT EXISTS idx_frustration_points_timestamp ON frustration_points(timestamp DESC);

-- ============================================
-- FEEDBACK
-- ============================================

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER,
    context VARCHAR(255),
    page VARCHAR(500),
    screenshot TEXT,
    recording BOOLEAN DEFAULT false,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session_id ON feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp DESC);

-- ============================================
-- STATISTICS UPDATE
-- ============================================

ANALYZE user_sessions;
ANALYZE analytics_events;
ANALYZE onboarding_tracking;
ANALYZE feature_usage;
ANALYZE abandonment_points;
ANALYZE frustration_points;
ANALYZE feedback;

