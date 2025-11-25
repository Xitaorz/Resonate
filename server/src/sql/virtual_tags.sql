CREATE OR REPLACE VIEW virt_song_tag AS
SELECT
    s.sid,
    s.name AS song_name,
    CASE
        WHEN s.danceability >= 0.50
             AND s.energy >= 0.70
             AND s.tempo BETWEEN 110 AND 150
             AND s.loudness > -7
             AND s.`mode` = 1 THEN 1
        WHEN s.energy < 0.60
             AND s.acousticness > 0.40
             AND s.tempo BETWEEN 60 AND 110
             AND s.loudness < -8 THEN 2
        WHEN s.valence < 0.35
             AND s.energy < 0.50
             AND s.loudness < -8
             AND s.`mode` = 0 THEN 3
        WHEN s.energy >= 0.75
             AND s.danceability >= 0.55
             AND s.loudness > -6 THEN 4
        WHEN s.energy < 0.30
             AND s.speechiness < 0.20
             AND s.loudness < -12
             AND s.tempo BETWEEN 40 AND 90 THEN 5
        WHEN s.valence BETWEEN 0.40 AND 0.70
             AND s.energy BETWEEN 0.30 AND 0.60
             AND s.acousticness > 0.25
             AND s.loudness < -6 THEN 6
        ELSE ((s.sid - 1) % 6) + 1
    END AS tag
FROM songs s
WHERE (s.sid % 2) = 0;
