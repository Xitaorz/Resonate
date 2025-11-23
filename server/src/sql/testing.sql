Select *
From virt_song_tag v1, virt_song_tag v2
Where v1.sid = v2.sid AND v1.tag != v2.tag;