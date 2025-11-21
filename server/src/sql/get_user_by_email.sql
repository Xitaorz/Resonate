SELECT uid, username, email, password_hash, created_at, updated_at
FROM users
WHERE email = %s
