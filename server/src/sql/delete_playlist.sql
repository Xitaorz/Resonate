DELETE FROM playlists
WHERE plstid = %s
  AND (%s IS NULL OR uid = %s);
