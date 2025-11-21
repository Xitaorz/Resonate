CREATE TABLE IF NOT EXISTS weekly_fav_rank_snapshot (
  yearweek INT NOT NULL,
  rank_in_week INT NOT NULL,
  song_title VARCHAR(255) NOT NULL,
  album_title VARCHAR(255) NULL,
  fav_count INT NOT NULL,
  PRIMARY KEY (yearweek, rank_in_week)
);

DELETE FROM weekly_fav_rank_snapshot WHERE yearweek = YEARWEEK(CURDATE(), 3);

INSERT INTO weekly_fav_rank_snapshot (yearweek, rank_in_week, song_title, album_title, fav_count)
SELECT
  yearweek,
  rank_in_week,
  song_title,
  album_title,
  fav_count
FROM weekly_fav_rank
WHERE yearweek = YEARWEEK(CURDATE(), 3)
  AND rank_in_week <= 10
ORDER BY rank_in_week
ON DUPLICATE KEY UPDATE
  song_title = VALUES(song_title),
  album_title = VALUES(album_title),
  fav_count = VALUES(fav_count);
