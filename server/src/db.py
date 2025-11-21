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
    # def search(self, query: str) -> List[Dict[str, Any]]:
    #     search_pattern = f"%{query}%"
    #     sql = self._sql("search.sql")
        
    #     conn = self._ensure_conn()
    #     with conn.cursor() as cur:
    #         cur.execute(sql, (search_pattern, search_pattern, search_pattern))
    #         rows = cur.fetchall()
    #     return list(rows)

    def search(self, query: str) -> List[Dict[str, Any]]:
        search_pattern = f"%{query}%"
        sql = self._sql("search.sql")

        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (
                search_pattern,  # s.name
                search_pattern,  # a.name
                search_pattern,  # al.title
                search_pattern,  # t.name (tag)
            ))
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

    def get_weekly_ranking(self) -> List[Dict[str, Any]]:
        # Refresh snapshot to avoid missing-table issues if event didn’t run
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
        if position is None:
            position = self._next_playlist_position(plstid)
        sql = self._sql("add_playlist_song.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
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

    def list_playlist_songs(self, plstid: int) -> List[Dict[str, Any]]:
        sql = self._sql("list_playlist_songs.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (plstid,))
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
            return user_row

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
