SELECT
  yearweek,
  rank_in_week,
  song_title,
  album_title,
  fav_count
FROM weekly_fav_rank_snapshot
WHERE yearweek = YEARWEEK(CURDATE(), 3)
ORDER BY rank_in_week;
