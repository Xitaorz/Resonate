SELECT
  ufs.sid,
  s.name AS song_title,
  COALESCE(MIN(al.title), 'Unknown') AS album_title,
  GROUP_CONCAT(DISTINCT ar.name SEPARATOR ', ') AS artist_names,
  ufs.favored_at
FROM user_favorite_song ufs
LEFT JOIN songs s ON s.sid = ufs.sid
LEFT JOIN album_song als ON als.sid = s.sid
LEFT JOIN albums al ON al.alid = als.alid
LEFT JOIN album_owned_by_artist aoa ON aoa.alid = al.alid
LEFT JOIN artists ar ON ar.artid = aoa.artid
WHERE ufs.uid = %s
GROUP BY ufs.sid, s.name, ufs.favored_at
ORDER BY ufs.favored_at DESC;
