SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
FROM playlist_song
WHERE plstid = %s;
