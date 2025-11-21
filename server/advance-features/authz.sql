CREATE DATABASE IF NOT EXISTS app_db;
USE app_db;

CREATE ROLE IF NOT EXISTS display_role;
CREATE ROLE IF NOT EXISTS admin_role;

GRANT SELECT ON app_db.* TO display_role;
GRANT ALL PRIVILEGES ON app_db.* TO admin_role;

CREATE USER IF NOT EXISTS 'display_user'@'%' IDENTIFIED BY 'display_pw';
CREATE USER IF NOT EXISTS 'admin_user'@'%' IDENTIFIED BY 'admin_pw';

GRANT display_role TO 'display_user'@'%';
GRANT admin_role TO 'admin_user'@'%';

SET DEFAULT ROLE display_role TO 'display_user'@'%';
SET DEFAULT ROLE admin_role TO 'admin_user'@'%';

