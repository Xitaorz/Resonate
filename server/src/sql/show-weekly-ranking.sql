SELECT *
FROM weekly_fav_rank
WHERE yearweek = YEARWEEK(CURDATE(), 3)
  AND rank_in_week <= 10
ORDER BY fav_count DESC, rank_in_week;
