-- Clean database: Keep only test users
-- Test users to keep:
-- admin@dujyo.admin
-- artist@dujyo.artist
-- validator@dujyo.validator
-- listener@example.com

-- Delete all users except test accounts
DELETE FROM users 
WHERE email NOT IN (
    'admin@dujyo.admin',
    'artist@dujyo.artist',
    'validator@dujyo.validator',
    'listener@example.com'
);

-- Show remaining users
SELECT email, username, wallet_address, user_type, created_at 
FROM users 
ORDER BY created_at;

