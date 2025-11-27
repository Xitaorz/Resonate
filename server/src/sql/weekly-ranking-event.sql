CREATE TABLE IF NOT EXISTS weekly_fav_rank_snapshot (
  yearweek INT NOT NULL,
  rank_in_week INT NOT NULL,
  song_title VARCHAR(255) NOT NULL,
  album_title VARCHAR(255) NULL,
  fav_count INT NOT NULL,
  PRIMARY KEY (yearweek, rank_in_week)
);

DELETE FROM weekly_fav_rank_snapshot WHERE yearweek = YEARWEEK(CURRENT_DATE - INTERVAL 1 WEEK, 3);

INSERT INTO weekly_fav_rank_snapshot (yearweek, rank_in_week, song_title, album_title, fav_count)
SELECT
  yearweek,
  rank_in_week,
  song_title,
  album_title,
  fav_count
FROM weekly_fav_rank
WHERE yearweek = YEARWEEK(CURRENT_DATE - INTERVAL 1 WEEK, 3)
ORDER BY rank_in_week
LIMIT 10
ON DUPLICATE KEY UPDATE
  song_title = VALUES(song_title),
  album_title = VALUES(album_title),
  fav_count = VALUES(fav_count);

DROP EVENT IF EXISTS refresh_last_week_fav_rank;
CREATE EVENT refresh_last_week_fav_rank
ON SCHEDULE EVERY 1 WEEK
STARTS (
  TIMESTAMP(CURRENT_DATE) + INTERVAL (8 - DAYOFWEEK(CURRENT_DATE)) DAY + INTERVAL 5 MINUTE
)
DO
  INSERT INTO weekly_fav_rank_snapshot (yearweek, rank_in_week, song_title, album_title, fav_count)
  SELECT
    yearweek,
    rank_in_week,
    song_title,
    album_title,
    fav_count
  FROM weekly_fav_rank
  WHERE yearweek = YEARWEEK(CURRENT_DATE - INTERVAL 1 WEEK, 3)
  ORDER BY rank_in_week
  LIMIT 10
  ON DUPLICATE KEY UPDATE
    song_title = VALUES(song_title),
    album_title = VALUES(album_title),
    fav_count = VALUES(fav_count);
