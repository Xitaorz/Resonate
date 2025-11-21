SELECT
  plstid,
  uid,
  name,
  description,
  visibility,
  created_at
FROM playlists
WHERE uid = %s
ORDER BY created_at DESC;
