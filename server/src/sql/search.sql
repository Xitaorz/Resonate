SELECT 
  s.sid AS sid,
  s.name AS song_name,
  GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') AS artist_name,
  GROUP_CONCAT(DISTINCT a.artid ORDER BY a.artid SEPARATOR ',') AS artist_ids,
  al.title AS album_name,
  al.release_date
FROM songs AS s
JOIN album_song AS als ON s.sid = als.sid
JOIN albums AS al ON als.alid = al.alid
JOIN album_owned_by_artist AS aoa ON al.alid = aoa.alid
JOIN artists AS a ON aoa.artid = a.artid
WHERE LOWER(s.name) LIKE LOWER(%s)
   OR LOWER(a.name) LIKE LOWER(%s)
   OR LOWER(al.title) LIKE LOWER(%s)
GROUP BY s.sid, s.name, al.title, al.release_date
ORDER BY s.name
LIMIT 100;
