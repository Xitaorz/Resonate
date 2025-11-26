CREATE TRIGGER create_default_playlist
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO playlists (uid, name, description, visibility)
  VALUES (NEW.uid, 'list1', NULL, 'private');
END