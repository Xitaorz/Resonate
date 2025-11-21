SELECT
  plstid,
  uid,
  name,
  description,
  visibility,
  created_at
FROM playlists
WHERE plstid = %s;
