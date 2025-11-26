INSERT INTO users (uid, username, email, password_hash, gender, city)
VALUES
  (1, 'alice', 'alice@example.com', 'hash-alice', 'female', 'Toronto'),
  (2, 'bob',   'bob@example.com',   'hash-bob',   'male',   'Vancouver')
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  gender = VALUES(gender),
  city = VALUES(city);

INSERT INTO vip_users (uid, start_date, end_date, special_effect)
VALUES
  (1, '2024-01-01', NULL, TRUE)
ON DUPLICATE KEY UPDATE
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  special_effect = VALUES(special_effect);

INSERT INTO artists (artid, name)
VALUES
  (1, 'The Coders'),
  (2, 'Debug Duo')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO user_follows_artist (uid, artid, followed_at)
VALUES
  (1, 1, '2024-02-01 12:00:00'),
  (2, 2, '2024-02-02 12:00:00')
ON DUPLICATE KEY UPDATE
  followed_at = VALUES(followed_at);

INSERT INTO albums (alid, title, release_date)
VALUES
  (1, 'Ship It', '2023-11-01'),
  (2, 'Rubber Duck Sessions', '2024-03-15')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  release_date = VALUES(release_date);

INSERT INTO album_owned_by_artist (alid, artid)
VALUES
  (1, 1),
  (2, 2)
ON DUPLICATE KEY UPDATE
  artid = VALUES(artid);

INSERT INTO playlists (plstid, uid, name, description, visibility, created_at)
VALUES
  (1, 1, 'Coding Flow', 'Songs for deep work', 'public', '2024-04-01 09:00:00'),
  (2, 2, 'Bug Bash', 'Energetic jams', 'private', '2024-04-02 10:00:00')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  visibility = VALUES(visibility);

INSERT INTO user_follow_playlist (uid, plstid, followed_at)
VALUES
  (1, 2, '2024-04-03 08:00:00'),
  (2, 1, '2024-04-04 11:30:00')
ON DUPLICATE KEY UPDATE
  followed_at = VALUES(followed_at);

INSERT INTO ratings (rid, rate_value, comment)
VALUES
  (1, 5, 'Perfect for focus.'),
  (2, 4, 'Gets me moving.'),
  (3, 3, 'Decent background track.'),
  (4, 5, 'On repeat lately.'),
  (5, 2, 'Too slow for my taste.')
ON DUPLICATE KEY UPDATE
  rate_value = VALUES(rate_value),
  comment = VALUES(comment);
