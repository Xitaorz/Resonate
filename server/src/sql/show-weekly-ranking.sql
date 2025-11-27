SELECT
  yearweek,
  rank_in_week,
  song_title,
  album_title,
  fav_count
FROM weekly_fav_rank_snapshot
WHERE yearweek = YEARWEEK(CURDATE() - INTERVAL 1 WEEK, 3)
ORDER BY rank_in_week;
