SELECT
    uid,
    1 AS is_active,
    special_effect
FROM vip_users
WHERE uid = %s;
