from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import pymysql
from dotenv import load_dotenv
from pymysql.cursors import DictCursor
from sqlalchemy import create_engine
from werkzeug.security import generate_password_hash, check_password_hash

from .tool import load_sql

load_dotenv()

print(
    "DB env ->",
    os.getenv("MYSQL_HOST"),
    os.getenv("MYSQL_PORT"),
    os.getenv("MYSQL_USER"),
    "(password set:" , "yes" if os.getenv("MYSQL_PASS") else "no", ")",
    os.getenv("MYSQL_DB"),
)

SQL_DIR = Path(__file__).resolve().parent / "sql"

class DB:

    def __init__(self) -> None:
        # Store connection config only (no connection stored here)
        self._config: Dict[str, Any] = {}
    
    def _sql(self, filename: str) -> str:
        return load_sql(SQL_DIR / filename)

    def import_csv(self, file_path: str, table_name: str, sample=False) -> int | None:
        df = pd.read_csv(file_path)
        if sample:
            df = df.sample(n=200, random_state=1)
        
        print(create_engine(self.connection_string))
        print(df.to_sql(table_name, create_engine(self.connection_string), if_exists='append', index=False))
    
    def import_df(self, df: pd.DataFrame, table_name: str) -> int | None:
        return df.to_sql(table_name, create_engine(self.connection_string), if_exists='append', index=False)

    def connect(self) -> None:
        """Initialize connection config (called once at startup)"""
        self._config = {
            'host': os.getenv("MYSQL_HOST", "127.0.0.1"),
            'port': int(os.getenv("MYSQL_PORT", "3306")),
            'user': os.getenv("MYSQL_USER", "root"),
            'password': os.getenv("MYSQL_PASS", ""),
            'database': os.getenv("MYSQL_DB", ""),
        }
        self.connection_string = f"mysql+pymysql://{self._config['user']}:{self._config['password']}@{self._config['host']}:{self._config['port']}/{self._config['database']}"

    def get_connection(self, autocommit: bool = True) -> pymysql.connections.Connection:
        if not self._config:
            raise RuntimeError("DB not initialized. Call connect() first.")
        
        return pymysql.connect(
            host=self._config['host'],
            port=self._config['port'],
            user=self._config['user'],
            password=self._config['password'],
            database=self._config['database'],
            cursorclass=DictCursor,
            autocommit=autocommit,
        )
    
    def get_song_by_id(self, song_id: str) -> Optional[Dict[str, Any]]:
        sql = self._sql("get_song_by_id.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (song_id,))
            row = cur.fetchone()
        return row

    def _ensure_conn(self) -> pymysql.connections.Connection:
        # If running inside Flask app context, reuse g.db_conn.
        # Otherwise return a fresh connection (caller must close it).
        try:
            from flask import has_app_context, g
        except Exception:
            # Flask not available for some reason: return a fresh connection
            return self.get_connection()

        if has_app_context():
            if not hasattr(g, 'db_conn') or g.db_conn is None:
                g.db_conn = self.get_connection()
            return g.db_conn
        # No app context -> caller expects a standalone connection
        return self.get_connection()

    #execute sql 
    def execute_script(self, sql_text: str) -> None:
        # Ensure we close the connection if we created a temporary one
        from flask import has_app_context
        conn = self._ensure_conn()
        close_after = not has_app_context()
        try:
            lines = []
            for line in sql_text.split('\n'):
                if '--' in line:
                    line = line.split('--')[0]
                if line.strip():
                    lines.append(line)
            cleaned_sql = '\n'.join(lines)

            statements = [s.strip() for s in cleaned_sql.split(";") if s.strip()]
            with conn.cursor() as cur:
                for stmt in statements:
                    cur.execute(stmt)
        finally:
            if close_after:
                try:
                    conn.close()
                except Exception:
                    pass
    
    #list all users
    def list_users(self) -> List[Dict[str, Any]]:
        sql = self._sql("list_users.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return list(rows)
    
    #search for songs, artists, and albums
    def search(self, query: str) -> List[Dict[str, Any]]:
        search_pattern = f"%{query}%"
        sql = self._sql("search.sql")
        
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (search_pattern, search_pattern, search_pattern, search_pattern))
            rows = cur.fetchall()
        return list(rows)
    
    def get_album_songs(self, album_id: str) -> List[Dict[str, Any]]:
        sql = self._sql("get_album_songs.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (album_id,))
            rows = cur.fetchall()
        return list(rows)

    #get songs by artist
    def get_artist_songs(self, artist_id: str) -> List[Dict[str, Any]]:
        sql = self._sql("artist_songs.sql")
        
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (artist_id,))
            rows = cur.fetchall()
        return list(rows)
    
    #show all tables in the database
    def show_tables(self) -> List[Dict[str, Any]]:
        sql = self._sql("show_tables.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return list(rows)
    
    #get average ratings for all songs
    def get_rating_averages(self) -> List[Dict[str, Any]]:
        sql = self._sql("rating_averages.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return list(rows)

    def get_recommendations(self, uid: int, limit: int = 10) -> List[Dict[str, Any]]:
        sql = self._sql("recommendations.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            params = {"uid": uid, "limit": limit}
            cur.execute(sql, params)
            rows = cur.fetchall()
        return list(rows)

    def rate_song(
        self,
        uid: int,
        sid: str,
        rate_value: int,
        comment: Optional[str] = None,
    ) -> Dict[str, Any]:
        if rate_value < 1 or rate_value > 5:
            raise ValueError("rate_value must be between 1 and 5")

        conn = self.get_connection(autocommit=False)
        try:
            with conn.cursor() as cur:
                # Check if the user already rated this song
                cur.execute(
                    "SELECT rid FROM user_rates WHERE uid = %s AND sid = %s LIMIT 1",
                    (uid, sid),
                )
                existing = cur.fetchone()

                if existing:
                    rid = existing["rid"]
                    cur.execute(
                        "UPDATE ratings SET rate_value = %s, comment = %s WHERE rid = %s",
                        (rate_value, comment, rid),
                    )
                else:
                    cur.execute(
                        "INSERT INTO ratings (rate_value, comment) VALUES (%s, %s)",
                        (rate_value, comment),
                    )
                    rid = cur.lastrowid
                    cur.execute(
                        "INSERT INTO user_rates (rid, uid, sid) VALUES (%s, %s, %s)",
                        (rid, uid, sid),
                    )

            conn.commit()
            return {
                "rid": rid,
                "uid": uid,
                "sid": sid,
                "rate_value": rate_value,
                "comment": comment,
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def get_user_song_rating(self, uid: int, sid: str) -> Optional[Dict[str, Any]]:
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ur.rid, ur.uid, ur.sid, r.rate_value, r.comment, ur.rated_at
                FROM user_rates ur
                JOIN ratings r ON ur.rid = r.rid
                WHERE ur.uid = %s AND ur.sid = %s
                LIMIT 1
                """,
                (uid, sid),
            )
            row = cur.fetchone()
        return row

    def get_weekly_ranking(self) -> List[Dict[str, Any]]:
        # Refresh snapshot to avoid missing-table issues if event didn't run
        try:
            self.execute_script(self._sql("weekly-ranking-refresh.sql"))
        except Exception as e:
            print(f"Weekly snapshot refresh failed: {e}")
        sql = self._sql("show-weekly-ranking.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
        return list(rows)

    def create_playlist(self, uid: int, name: str, description: Optional[str], visibility: str) -> int:
        sql = self._sql("create_playlist.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (uid, name, description, visibility))
            return int(cur.lastrowid)

    def _next_playlist_position(self, plstid: int) -> int:
        sql = self._sql("playlist_next_position.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (plstid,))
            row = cur.fetchone()
            return int(row["next_pos"] if row and row.get("next_pos") is not None else 1)

    def add_song_to_playlist(self, plstid: int, sid: str, position: Optional[int] = None) -> None:
        # Avoid duplicates so we can return a clean error to the caller
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM playlist_song WHERE plstid = %s AND sid = %s LIMIT 1",
                (plstid, sid),
            )
            if cur.fetchone():
                raise ValueError("Song already exists in playlist")

            if position is None:
                position = self._next_playlist_position(plstid)

            sql = self._sql("add_playlist_song.sql")
            cur.execute(sql, (plstid, sid, position))

    def list_playlists(self, uid: int) -> List[Dict[str, Any]]:
        sql = self._sql("list_playlists.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (uid,))
            rows = cur.fetchall()
        return list(rows)

    def get_playlist(self, plstid: int) -> Optional[Dict[str, Any]]:
        sql = self._sql("get_playlist.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (plstid,))
            row = cur.fetchone()
        return row

    def delete_playlist(self, plstid: int, uid: Optional[int] = None) -> bool:
        """Delete a playlist (and cascaded songs). If uid provided, enforce ownership."""
        sql = self._sql("delete_playlist.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (plstid, uid, uid))
            return cur.rowcount > 0

    def list_playlist_songs(self, plstid: int) -> List[Dict[str, Any]]:
        sql = self._sql("list_playlist_songs.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (plstid,))
            rows = cur.fetchall()
        return list(rows)

    def favorite_song(self, uid: int, sid: str) -> None:
        sql = self._sql("favorite_song.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (uid, sid))

    def unfavorite_song(self, uid: int, sid: str) -> bool:
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_favorite_song WHERE uid = %s AND sid = %s", (uid, sid))
            return cur.rowcount > 0

    def is_song_favorite(self, uid: int, sid: str) -> bool:
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM user_favorite_song WHERE uid = %s AND sid = %s LIMIT 1", (uid, sid))
            return cur.fetchone() is not None

    def list_favorites(self, uid: int) -> List[Dict[str, Any]]:
        sql = self._sql("list_favorites.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (uid,))
            rows = cur.fetchall()
        return list(rows)
    
    def get_user_profile(self, uid: int) -> Optional[Dict[str, Any]]:
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT uid, username, email, gender, age, street, city, province, mbti, created_at, updated_at
                FROM users
                WHERE uid = %s
                """,
                (uid,)
            )
            user_row = cur.fetchone()
            if not user_row:
                return None

            cur.execute(
                "SELECT hobby FROM user_hobbies WHERE uid = %s ORDER BY hobby ASC",
                (uid,)
            )
            hobbies = [row["hobby"] for row in cur.fetchall()]
            user_row["hobbies"] = hobbies
            vip_row = self.get_vip_status(uid)
            user_row["isvip"] = 1 if vip_row else 0
            return user_row

    def get_vip_status(self, uid: int) -> Optional[Dict[str, Any]]:
        sql = self._sql("get_vip_status.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (uid,))
            row = cur.fetchone()
        return row

    def update_user_profile(
        self,
        uid: int,
        user_fields: Dict[str, Any],
        hobbies: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        conn = self._ensure_conn()
        try:
            original_autocommit = conn.get_autocommit()
        except Exception:
            original_autocommit = True

        try:
            from flask import has_app_context
            close_after = not has_app_context()
        except Exception:
            close_after = True

        try:
            conn.autocommit(False)
            with conn.cursor() as cur:
                cur.execute("SELECT uid FROM users WHERE uid = %s FOR UPDATE", (uid,))
                if cur.fetchone() is None:
                    raise ValueError("User not found")

                if user_fields:
                    set_clause = ", ".join(f"{col} = %s" for col in user_fields.keys())
                    values = list(user_fields.values()) + [uid]
                    cur.execute(f"UPDATE users SET {set_clause} WHERE uid = %s", values)

                if hobbies is not None:
                    cur.execute("DELETE FROM user_hobbies WHERE uid = %s", (uid,))
                    if hobbies:
                        hobby_rows = [(uid, hobby) for hobby in hobbies]
                        cur.executemany(
                            "INSERT INTO user_hobbies (uid, hobby) VALUES (%s, %s)",
                            hobby_rows
                        )

            conn.commit()
        except Exception as exc:
            try:
                conn.rollback()
            except Exception:
                pass
            raise exc
        finally:
            try:
                conn.autocommit(original_autocommit)
            except Exception:
                pass
            if close_after:
                try:
                    conn.close()
                except Exception:
                    pass

        updated = self.get_user_profile(uid)
        if updated is None:
            raise ValueError("User not found")
        return updated

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        sql = self._sql("get_user_by_email.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (email,))
            row = cur.fetchone()
        return row

    def upsert_vip_user(self, uid: int, special_effect: bool = True) -> Dict[str, Any]:
        conn = self._ensure_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT uid FROM users WHERE uid = %s", (uid,))
                if cur.fetchone() is None:
                    raise ValueError("User not found")

                # Detect available columns to avoid referencing missing fields
                cur.execute("SHOW COLUMNS FROM vip_users")
                vip_columns = {row["Field"] for row in cur.fetchall()}

                insert_cols = ["uid"]
                insert_vals = [uid]
                update_clauses = []

                if "start_date" in vip_columns:
                    insert_cols.append("start_date")
                    insert_vals.append("3000-01-01")
                    update_clauses.append("start_date = VALUES(start_date)")
                if "end_date" in vip_columns:
                    insert_cols.append("end_date")
                    insert_vals.append("3000-01-01")
                    update_clauses.append("end_date = VALUES(end_date)")
                if "special_effect" in vip_columns:
                    insert_cols.append("special_effect")
                    insert_vals.append(1 if special_effect else 0)
                    update_clauses.append("special_effect = VALUES(special_effect)")

                placeholders = ", ".join(["%s"] * len(insert_cols))
                columns_clause = ", ".join(insert_cols)
                update_clause = ", ".join(update_clauses) if update_clauses else "uid = uid"

                dynamic_sql = f"""
                INSERT INTO vip_users ({columns_clause})
                VALUES ({placeholders})
                ON DUPLICATE KEY UPDATE {update_clause}
                """
                cur.execute(dynamic_sql, insert_vals)
        except pymysql.err.IntegrityError as exc:
            raise ValueError("Could not promote user to VIP") from exc

        vip_row = self.get_vip_status(uid)
        if vip_row is None:
            raise ValueError("Failed to fetch VIP status after update")
        return vip_row


    def create_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        if not username or not email or not password:
            raise ValueError("username, email, and password are required")

        password_hash = generate_password_hash(password)
        insert_sql = self._sql("insert_user.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            try:
                cur.execute(insert_sql, (username, email, password_hash))
            except pymysql.err.IntegrityError as exc:
                raise ValueError("User with this email already exists") from exc

            new_uid = cur.lastrowid

        new_user = self.get_user_profile(new_uid)
        if new_user is None:
            raise ValueError("Failed to create user")
        return new_user

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        user_row = self.get_user_by_email(email)
        if not user_row:
            return None
        stored_hash = user_row.get("password_hash")
        if not stored_hash or not password:
            return None
        if not check_password_hash(stored_hash, password):
            return None
        user_row.pop("password_hash", None)
        return user_row


    def ping(self) -> bool:
        try:
            conn = self._ensure_conn()
            conn.ping(reconnect=True)
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                _ = cur.fetchone()
            return True
        except Exception as e:
            print("PING ERROR:", repr(e))
            return False

def get_db() -> DB:
    db = DB()
    db.connect()
    return db
