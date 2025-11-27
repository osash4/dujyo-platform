-- Migration: Follows, Comments, Reviews, and Social Features
-- Description: Create tables for user follows, content comments/reviews, and social interactions
-- Date: 2024-12

-- ============================================================================
-- USER FOLLOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_follows (
    follow_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    follower_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    following_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id),
    CONSTRAINT user_follows_no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT user_follows_follower_fkey FOREIGN KEY (follower_id) REFERENCES users(wallet_address) ON DELETE CASCADE,
    CONSTRAINT user_follows_following_fkey FOREIGN KEY (following_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- ============================================================================
-- CONTENT COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_comments (
    comment_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content_id VARCHAR(255) NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    parent_comment_id VARCHAR(255) REFERENCES content_comments(comment_id) ON DELETE CASCADE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_edited BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT content_comments_content_id_fkey FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
    CONSTRAINT content_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_comments_content_id ON content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_user_id ON content_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent_id ON content_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_created_at ON content_comments(created_at DESC);

-- ============================================================================
-- CONTENT REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_reviews (
    review_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content_id VARCHAR(255) NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_edited BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT content_reviews_unique UNIQUE (content_id, user_id),
    CONSTRAINT content_reviews_content_id_fkey FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
    CONSTRAINT content_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_reviews_content_id ON content_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_content_reviews_user_id ON content_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_content_reviews_rating ON content_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_content_reviews_created_at ON content_reviews(created_at DESC);

-- ============================================================================
-- COMMENT LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_likes (
    like_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    comment_id VARCHAR(255) NOT NULL REFERENCES content_comments(comment_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT comment_likes_unique UNIQUE (comment_id, user_id),
    CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES content_comments(comment_id) ON DELETE CASCADE,
    CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- ============================================================================
-- REVIEW HELPFUL VOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_helpful_votes (
    vote_id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    review_id VARCHAR(255) NOT NULL REFERENCES content_reviews(review_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT review_helpful_votes_unique UNIQUE (review_id, user_id),
    CONSTRAINT review_helpful_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES content_reviews(review_id) ON DELETE CASCADE,
    CONSTRAINT review_helpful_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATE COUNTS
-- ============================================================================

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE content_comments 
        SET likes_count = likes_count + 1 
        WHERE comment_id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE content_comments 
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE comment_id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment likes
DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_count();

-- Function to update review helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE content_reviews 
            SET helpful_count = helpful_count + 1 
            WHERE review_id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE content_reviews 
            SET helpful_count = GREATEST(helpful_count - 1, 0)
            WHERE review_id = OLD.review_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_helpful != NEW.is_helpful THEN
            IF NEW.is_helpful THEN
                UPDATE content_reviews 
                SET helpful_count = helpful_count + 1 
                WHERE review_id = NEW.review_id;
            ELSE
                UPDATE content_reviews 
                SET helpful_count = GREATEST(helpful_count - 1, 0)
                WHERE review_id = NEW.review_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for review helpful votes
DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON review_helpful_votes;
CREATE TRIGGER trigger_update_review_helpful_count
    AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpful_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.is_edited = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for content_comments updated_at
DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON content_comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON content_comments
    FOR EACH ROW
    WHEN (OLD.comment_text IS DISTINCT FROM NEW.comment_text)
    EXECUTE FUNCTION update_comments_updated_at();

-- Trigger for content_reviews updated_at
DROP TRIGGER IF EXISTS trigger_update_reviews_updated_at ON content_reviews;
CREATE TRIGGER trigger_update_reviews_updated_at
    BEFORE UPDATE ON content_reviews
    FOR EACH ROW
    WHEN (OLD.review_text IS DISTINCT FROM NEW.review_text OR OLD.rating IS DISTINCT FROM NEW.rating)
    EXECUTE FUNCTION update_comments_updated_at();

-- Comments
COMMENT ON TABLE user_follows IS 'Tracks user follow relationships (follower -> following)';
COMMENT ON TABLE content_comments IS 'User comments on content (supports nested replies)';
COMMENT ON TABLE content_reviews IS 'User reviews/ratings (1-5 stars) for content';
COMMENT ON TABLE comment_likes IS 'Likes on comments';
COMMENT ON TABLE review_helpful_votes IS 'Helpful votes on reviews';

