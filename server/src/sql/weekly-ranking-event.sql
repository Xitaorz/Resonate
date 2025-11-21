-- Enable the MySQL event scheduler (requires EVENT privilege)
CREATE TABLE IF NOT EXISTS weekly_fav_rank_snapshot (
  yearweek INT NOT NULL,
  rank_in_week INT NOT NULL,
  song_title VARCHAR(255) NOT NULL,
  album_title VARCHAR(255) NULL,
  fav_count INT NOT NULL,
  PRIMARY KEY (yearweek, rank_in_week)
);

-- Immediate refresh for the current week
DELETE FROM weekly_fav_rank_snapshot WHERE yearweek = YEARWEEK(CURDATE(), 3);

INSERT INTO weekly_fav_rank_snapshot (yearweek, rank_in_week, song_title, album_title, fav_count)
SELECT
  YEARWEEK(ufs.favored_at, 3) AS yearweek,
  ROW_NUMBER() OVER (
    PARTITION BY YEARWEEK(ufs.favored_at, 3)
    ORDER BY COUNT(*) DESC, MIN(s.name)
  ) AS rank_in_week,
  s.name AS song_title,
  al.title AS album_title,
  COUNT(*) AS fav_count
FROM user_favorite_song ufs
JOIN songs s          ON s.sid = ufs.sid
LEFT JOIN album_song als ON als.sid = s.sid
LEFT JOIN albums al      ON al.alid = als.alid
GROUP BY yearweek, s.sid, s.name, al.title
HAVING yearweek = YEARWEEK(CURDATE(), 3)
ORDER BY fav_count DESC, song_title
LIMIT 10;

-- Weekly refresh every Monday at 00:05 UTC
DROP EVENT IF EXISTS refresh_weekly_fav_rank;
CREATE EVENT refresh_weekly_fav_rank
ON SCHEDULE EVERY 1 WEEK
STARTS (
  TIMESTAMP(CURRENT_DATE) + INTERVAL (8 - DAYOFWEEK(CURRENT_DATE)) DAY + INTERVAL 5 MINUTE
)
DO
  INSERT INTO weekly_fav_rank_snapshot (yearweek, rank_in_week, song_title, album_title, fav_count)
  SELECT
    YEARWEEK(ufs.favored_at, 3) AS yearweek,
    ROW_NUMBER() OVER (
      PARTITION BY YEARWEEK(ufs.favored_at, 3)
      ORDER BY COUNT(*) DESC, MIN(s.name)
    ) AS rank_in_week,
    s.name AS song_title,
    al.title AS album_title,
    COUNT(*) AS fav_count
  FROM user_favorite_song ufs
  JOIN songs s          ON s.sid = ufs.sid
  LEFT JOIN album_song als ON als.sid = s.sid
  LEFT JOIN albums al      ON al.alid = als.alid
  GROUP BY yearweek, s.sid, s.name, al.title
  HAVING yearweek = YEARWEEK(CURDATE(), 3)
  ORDER BY fav_count DESC, song_title
  LIMIT 10
  ON DUPLICATE KEY UPDATE
    song_title = VALUES(song_title),
    album_title = VALUES(album_title),
    fav_count = VALUES(fav_count);
