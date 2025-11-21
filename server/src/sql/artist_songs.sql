SELECT
  s.sid,
  s.name AS song_title,
  a.title AS album_title,
  ar.name AS artist_name
FROM artists AS ar
JOIN album_owned_by_artist AS aoa
  ON ar.artid = aoa.artid
JOIN albums AS a
  ON aoa.alid = a.alid
JOIN album_song AS als
  ON a.alid = als.alid
JOIN songs AS s
  ON als.sid = s.sid
WHERE ar.artid = %s
ORDER BY als.track_no ASC
LIMIT 50;
