-- SELECT 
--   s.sid AS sid,
--   s.name AS song_name,
--   a.name AS artist_name,
--   a.artid AS artist_id,
--   al.title AS album_name,
--   al.release_date
-- FROM songs AS s
-- JOIN album_song AS als ON s.sid = als.sid
-- JOIN albums AS al ON als.alid = al.alid
-- JOIN album_owned_by_artist AS aoa ON al.alid = aoa.alid
-- JOIN artists AS a ON aoa.artid = a.artid
-- WHERE LOWER(s.name) LIKE LOWER(%s)
--    OR LOWER(a.name) LIKE LOWER(%s)
--    OR LOWER(al.title) LIKE LOWER(%s)
-- ORDER BY s.name
-- LIMIT 100;

SELECT DISTINCT
    s.sid          AS `sid`,
    s.name         AS song_name,
    a.name         AS artist_name,
    a.artid        AS artist_id,
    al.title       AS album_name,
    al.release_date
FROM songs AS s
JOIN album_song AS als
    ON s.sid = als.sid
JOIN albums AS al
    ON als.alid = al.alid
JOIN album_owned_by_artist AS aoa
    ON al.alid = aoa.alid
JOIN artists AS a
    ON aoa.artid = a.artid

-- use your virtual table instead of song_tag
LEFT JOIN virt_song_tag AS vst
    ON s.sid = vst.sid
LEFT JOIN tags AS t
    ON vst.tag = t.tid

WHERE
      LOWER(s.name)    LIKE LOWER(%s)
   OR LOWER(a.name)    LIKE LOWER(%s)
   OR LOWER(al.title)  LIKE LOWER(%s)
   OR LOWER(t.name)    LIKE LOWER(%s)
ORDER BY s.name
LIMIT 100;