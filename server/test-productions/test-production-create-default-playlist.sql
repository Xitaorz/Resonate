CREATE TRIGGER create_default_playlist
AFTER INSERT ON users
REFERENCING NEW AS newUser
FOR EACH ROW
BEGIN
    INSERT INTO playlists (uid, name, description, visibility)
    VALUES (newUser.uid, 'list1', NULL, 'private');
END;
