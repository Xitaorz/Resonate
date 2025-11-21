INSERT INTO vip_users (uid, start_date, end_date, special_effect)
VALUES (%s, CURDATE(), DATE('3000-01-01'), %s)
ON DUPLICATE KEY UPDATE
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  special_effect = VALUES(special_effect);
