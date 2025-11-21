SELECT
  ps.position,
  s.sid,
  s.name AS song_title,
  al.title AS album_title,
  GROUP_CONCAT(DISTINCT ar.name SEPARATOR ', ') AS artist_names
FROM playlist_song ps
LEFT JOIN songs s ON s.sid = ps.sid
LEFT JOIN album_song als ON als.sid = s.sid
LEFT JOIN albums al ON al.alid = als.alid
LEFT JOIN album_owned_by_artist aoa ON aoa.alid = al.alid
LEFT JOIN artists ar ON ar.artid = aoa.artid
WHERE ps.plstid = %s
GROUP BY ps.position, s.sid, s.name, al.title
ORDER BY ps.position;
