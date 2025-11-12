CREATE TABLE IF NOT EXISTS users (
  uid           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(64)  NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  gender    ENUM('male','female','nonbinary','other') NULL,
  age       SMALLINT UNSIGNED NULL,
  street    VARCHAR(255) NULL,
  city      VARCHAR(128) NULL,
  province  VARCHAR(128) NULL,
  mbti      ENUM('INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTP','ISFP','ESTP','ESFP','ISTJ','ISFJ','ESTJ','ESFJ') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS user_hobbies (
  uid   BIGINT UNSIGNED NOT NULL,
  hobby VARCHAR(255) NOT NULL,
  PRIMARY KEY (uid, hobby),
  FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS vip_users (
  uid            BIGINT UNSIGNED PRIMARY KEY,
  start_date     DATE NOT NULL,
  end_date       DATE NULL,
  special_effect BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_vip_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);




CREATE TABLE IF NOT EXISTS artists (
  artid      VARCHAR(35) PRIMARY KEY,
  name       VARCHAR(255) NOT NULL
);




--users follow artists

CREATE TABLE IF NOT EXISTS user_follows_artist (
  uid         BIGINT UNSIGNED NOT NULL,
  artid       VARCHAR(35) NOT NULL,
  followed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid, artid),
  CONSTRAINT fk_ufa_user   FOREIGN KEY (uid)   REFERENCES users(uid)     ON DELETE CASCADE,
  CONSTRAINT fk_ufa_artist FOREIGN KEY (artid) REFERENCES artists(artid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS albums (
  alid         VARCHAR(35) PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  release_date DATE NULL
);

-- Album ownership (album is owned by one artist)
CREATE TABLE IF NOT EXISTS album_owned_by_artist (
  alid VARCHAR(35) NOT NULL,
  artid VARCHAR(35) NOT NULL,
  PRIMARY KEY (alid, artid),
  CONSTRAINT fk_aoba_album  FOREIGN KEY (alid)  REFERENCES albums(alid)   ON DELETE CASCADE,
  CONSTRAINT fk_aoba_artist FOREIGN KEY (artid) REFERENCES artists(artid) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS songs (
  sid           VARCHAR(35) NOT NULL PRIMARY KEY,
  name          TEXT NOT NULL,
  release_date DATE NULL
);

-- Song in album
CREATE TABLE IF NOT EXISTS album_song (
  alid     VARCHAR(35) NOT NULL,
  sid      VARCHAR(35) NOT NULL,
  disc_no  SMALLINT UNSIGNED NULL,
  track_no SMALLINT UNSIGNED NULL,
  PRIMARY KEY (alid, sid),
  INDEX idx_album_song_sid (sid),
  CONSTRAINT fk_as_album FOREIGN KEY (alid) REFERENCES albums(alid) ON DELETE CASCADE,
  CONSTRAINT fk_as_song  FOREIGN KEY (sid)  REFERENCES songs(sid)  ON DELETE CASCADE
);

-- tags and song–tag mapping
CREATE TABLE IF NOT EXISTS tags (
  tid  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS song_tag (
  sid VARCHAR(35) NOT NULL,
  tid BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (sid, tid),
  INDEX idx_song_tag_tag (tid),
  CONSTRAINT fk_st_song FOREIGN KEY (sid) REFERENCES songs(sid) ON DELETE CASCADE,
  CONSTRAINT fk_st_tag  FOREIGN KEY (tid) REFERENCES tags(tid) ON DELETE CASCADE
);

-- tags for each album via its songs
CREATE OR REPLACE VIEW album_tag_view AS
SELECT DISTINCT asg.alid, st.tid
FROM album_song AS asg
JOIN song_tag  AS st ON st.sid = asg.sid;

CREATE TABLE IF NOT EXISTS playlists (
  plstid      BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  uid         BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  visibility  ENUM('public','private','unlisted') NOT NULL DEFAULT 'public',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pl_owner FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- Playlist contains songs (its ordered)
CREATE TABLE IF NOT EXISTS playlist_song (
  plstid   BIGINT UNSIGNED NOT NULL,
  sid      VARCHAR(35) NOT NULL,
  position INT UNSIGNED NOT NULL, -- 1-based order in playlist
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plstid, sid),
  UNIQUE KEY uk_playlist_position (plstid, position),
  CONSTRAINT fk_ps_playlist FOREIGN KEY (plstid) REFERENCES playlists(plstid) ON DELETE CASCADE,
  CONSTRAINT fk_ps_song     FOREIGN KEY (sid)     REFERENCES songs(sid)     ON DELETE CASCADE
);

-- Users can favorite songs
CREATE TABLE IF NOT EXISTS user_favorite_song (
  uid       BIGINT UNSIGNED NOT NULL,
  sid       VARCHAR(35) NOT NULL,
  favored_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid, sid),
  CONSTRAINT fk_ufs_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  CONSTRAINT fk_ufs_song FOREIGN KEY (sid) REFERENCES songs(sid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ratings (
  rid        BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  rate_value TINYINT NOT NULL CHECK (rate_value BETWEEN 1 AND 5),
  comment    TEXT NULL
  
);

CREATE TABLE IF NOT EXISTS user_rates(
  rid        BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  uid        BIGINT UNSIGNED NOT NULL,
  sid        VARCHAR(35) NOT NULL,
  rated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- we only allow one rating per user per song
  UNIQUE KEY uk_user_song_rating (uid, sid, rid),
  CONSTRAINT fk_sr_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  CONSTRAINT fk_sr_song FOREIGN KEY (sid) REFERENCES songs(sid) ON DELETE CASCADE,
  CONSTRAINT fk_sr_rating FOREIGN KEY (rid) REFERENCES ratings(rid) ON DELETE CASCADE
);

-- users can follow playlists
CREATE TABLE IF NOT EXISTS user_follow_playlist (
  uid       BIGINT UNSIGNED NOT NULL,
  plstid    BIGINT UNSIGNED NOT NULL,
  followed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid, plstid),
  CONSTRAINT fk_ufp_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
  CONSTRAINT fk_ufp_playlist FOREIGN KEY (plstid) REFERENCES playlists(plstid) ON DELETE CASCADE
);
