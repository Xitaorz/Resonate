CREATE OR REPLACE VIEW virt_song_tag AS
    SELECT sid, name AS song_name, 1 AS tag
    FROM songs
    WHERE danceability >= 0.60
      AND energy >= 0.70
      AND valence >= 0.50
      AND tempo BETWEEN 110 AND 150
      AND loudness > -7
      AND `mode` = 1

UNION ALL
    SELECT sid, name, 2
    FROM songs
    WHERE energy < 0.50
      AND acousticness > 0.40
      AND tempo BETWEEN 60 AND 110
      AND loudness < -8

UNION ALL
    SELECT sid, name, 3
    FROM songs
    WHERE valence < 0.35
      AND energy < 0.50
      AND tempo < 110
      AND loudness < -8
      AND `mode` = 0

UNION ALL
    SELECT sid, name, 4
    FROM songs
    WHERE energy >= 0.75
      AND danceability >= 0.55
      AND tempo BETWEEN 120 AND 180
      AND loudness > -6

UNION ALL
    SELECT sid, name, 5
    FROM songs
    WHERE energy < 0.30
      AND speechiness < 0.20
      AND acousticness > 0.60
      AND loudness < -12
      AND tempo BETWEEN 40 AND 90

UNION ALL
    SELECT sid, name, 6
    FROM songs
    WHERE valence BETWEEN 0.40 AND 0.70
      AND energy BETWEEN 0.30 AND 0.60
      AND acousticness > 0.25
      AND tempo BETWEEN 60 AND 100
      AND loudness < -6;




      
