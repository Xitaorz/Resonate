SELECT 
    u.uid,
    u.username,
    COUNT(DISTINCT pl.plstid) AS num_playlists,
    COUNT(DISTINCT ufs.sid)   AS num_favorites
FROM users u
LEFT JOIN playlists pl       ON u.uid = pl.uid
LEFT JOIN user_favorite_song ufs ON u.uid = ufs.uid
GROUP BY u.uid, u.username;