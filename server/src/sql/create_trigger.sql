CREATE TRIGGER create_default_playlist
AFTER INSERT ON users
FOR EACH ROW
INSERT INTO playlists (uid, name, description, visibility)
VALUES (NEW.uid, 'Default Playlist', NULL, 'private');
