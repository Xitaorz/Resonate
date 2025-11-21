INSERT INTO user_favorite_song (uid, sid)
VALUES (%s, %s)
ON DUPLICATE KEY UPDATE favored_at = CURRENT_TIMESTAMP;
