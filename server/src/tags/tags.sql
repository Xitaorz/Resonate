CREATE TABLE IF NOT EXISTS phys_song_tag (
  `sid`      VARCHAR(64)  NOT NULL,
  tag        VARCHAR(32)  NOT NULL,
  PRIMARY KEY (`sid`, tag),
  KEY idx_tag (tag)
);

INSERT INTO phys_song_tag (`sid`, tag)
SELECT `sid`, tag
FROM virt_song_tag;