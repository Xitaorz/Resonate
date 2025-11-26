SELECT
  plstid,
  uid,
  name,
  description,
  visibility,
  created_at
FROM playlists
WHERE name LIKE %s
  AND visibility = 'public'
ORDER BY created_at DESC
LIMIT 50;
