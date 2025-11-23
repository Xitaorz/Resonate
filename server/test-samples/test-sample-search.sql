SELECT 
    s.name AS song_name,
    a.name AS artist_name,
    al.title AS album_name,
    GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') AS tags
FROM songs s
JOIN album_song als ON s.sid = als.sid
JOIN albums al ON als.alid = al.alid
JOIN album_owned_by_artist aoa ON al.alid = aoa.alid
JOIN artists a ON aoa.artid = a.artid
LEFT JOIN virt_song_tag vst ON s.sid = vst.sid
LEFT JOIN tags t ON vst.tag = t.tid
WHERE LOWER(s.name) LIKE LOWER('%Lady%')
   OR LOWER(a.name) LIKE LOWER('%Lady%')
   OR LOWER(al.title) LIKE LOWER('%Lady%')
GROUP BY s.name, a.name, al.title
LIMIT 100;
