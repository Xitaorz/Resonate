CREATE OR REPLACE VIEW weekly_fav_rank AS
WITH weekly AS (
  SELECT
    YEARWEEK(ufs.favored_at, 3) AS yearweek,
    s.sid,
    s.name AS song_title,
    al.title AS album_title,
    COUNT(*) AS fav_count
  FROM user_favorite_song ufs
  JOIN songs s          ON s.sid = ufs.sid
  LEFT JOIN album_song als ON als.sid = s.sid
  LEFT JOIN albums al      ON al.alid = als.alid
  GROUP BY yearweek, s.sid, s.name, al.title
)
SELECT
  yearweek,
  song_title,
  album_title,
  fav_count,
  ROW_NUMBER() OVER (PARTITION BY yearweek ORDER BY fav_count DESC, song_title) AS rank_in_week
FROM weekly;


