WITH user_tag_counts AS (
    SELECT 
        vst.tag AS tag_id,
        COUNT(*) AS tag_count
    FROM playlists p
    JOIN playlist_song ps ON ps.plstid = p.plstid
    JOIN virt_song_tag vst ON vst.sid = ps.sid
    WHERE p.uid = %(uid)s
    GROUP BY vst.tag
),

top_tags AS (
    SELECT tag_id
    FROM user_tag_counts
    ORDER BY tag_count DESC
    LIMIT 5
),

candidate_songs AS (
    SELECT DISTINCT s.sid, s.name
    FROM songs s
    JOIN virt_song_tag vst ON vst.sid = s.sid
    JOIN top_tags tt ON tt.tag_id = vst.tag
    WHERE s.sid NOT IN (
        SELECT ps2.sid
        FROM playlists p2
        JOIN playlist_song ps2 ON ps2.plstid = p2.plstid
        WHERE p2.uid = %(uid)s
    )
)
SELECT 
    cs.sid,
    cs.name,
    AVG(r.rate_value)                      AS avg_rating,
    COUNT(DISTINCT vst.tag)                AS matched_tags,
    SUM(utc.tag_count)                     AS tag_match_score,
    COALESCE(AVG(r.rate_value), 0)
        * SUM(utc.tag_count)               AS recommendation_score
FROM candidate_songs cs
JOIN virt_song_tag vst   ON vst.sid = cs.sid
JOIN top_tags tt         ON tt.tag_id = vst.tag
JOIN user_tag_counts utc ON utc.tag_id = vst.tag
LEFT JOIN user_rates ur  ON ur.sid = cs.sid
LEFT JOIN ratings r      ON r.rid = ur.rid
GROUP BY cs.sid, cs.name
ORDER BY recommendation_score DESC
LIMIT %(limit)s;
