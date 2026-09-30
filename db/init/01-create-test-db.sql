-- Runs automatically the first time MySQL initializes an empty data volume.
-- Creates the test database and grants the app user access to it.
-- The main database and user are already created by MySQL's entrypoint using
-- MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD from .env.

CREATE DATABASE IF NOT EXISTS pantrychef_test;

GRANT ALL PRIVILEGES ON pantrychef_test.* TO 'pantrychef'@'%';

FLUSH PRIVILEGES;

