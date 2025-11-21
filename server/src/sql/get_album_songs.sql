SELECT
    s.sid,
    s.name AS song_name,
    a.artid AS artist_id,
    a.name AS artist_name,
    al.alid AS album_id,
    al.title AS album_title,
    als.track_no
FROM album_song als
JOIN songs s ON als.sid = s.sid
JOIN albums al ON als.alid = al.alid
JOIN album_owned_by_artist aoa ON al.alid = aoa.alid
JOIN artists a ON aoa.artid = a.artid
WHERE als.alid = %s
ORDER BY als.track_no IS NULL, als.track_no, s.name;
