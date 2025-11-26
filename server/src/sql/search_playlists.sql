SELECT
  plstid,
  uid,
  name,
  description,
  visibility,
  created_at
FROM playlists
WHERE name LIKE %s
  AND (visibility != 'private' OR uid = %s)
ORDER BY created_at DESC
LIMIT 50;
