SELECT
    s.sid,
    s.name,
    s.release_date,
    a.title AS album_title,
    ROUND(AVG(rt.rate_value), 2) AS avg_rating,
    COUNT(rt.rid) AS rating_count,
    GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') AS tags
FROM songs s
LEFT JOIN album_song als ON s.sid = als.sid
LEFT JOIN albums a ON als.alid = a.alid
LEFT JOIN user_rates ur ON ur.sid = s.sid
LEFT JOIN ratings rt ON ur.rid = rt.rid
LEFT JOIN virt_song_tag vst ON vst.sid = s.sid
LEFT JOIN tags t ON t.tid = vst.tag
WHERE s.sid = %s
GROUP BY
    s.sid,
    s.name,
    s.release_date,
    a.title
LIMIT 1;
