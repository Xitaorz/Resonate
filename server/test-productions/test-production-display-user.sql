SELECT 
    u.uid,
    u.username,
    COUNT(DISTINCT pl.plstid) AS num_playlists,
    COUNT(DISTINCT ufs.sid)   AS num_favorites,
    CASE WHEN vu.uid IS NOT NULL THEN 'VIP' ELSE 'Regular' END AS vip_status
FROM users u
LEFT JOIN playlists pl       ON u.uid = pl.uid
LEFT JOIN user_favorite_song ufs ON u.uid = ufs.uid
LEFT JOIN vip_users vu       ON u.uid = vu.uid
GROUP BY u.uid, u.username, vu.uid;