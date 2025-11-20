from __future__ import annotations
import pandas as pd

import os
from typing import Any, List, Dict, Optional

import pymysql
from pymysql.cursors import DictCursor
from sqlalchemy import create_engine

from dotenv import load_dotenv
load_dotenv() 

print(
    "DB env ->",
    os.getenv("MYSQL_HOST"),
    os.getenv("MYSQL_PORT"),
    os.getenv("MYSQL_USER"),
    "(password set:" , "yes" if os.getenv("MYSQL_PASS") else "no", ")",
    os.getenv("MYSQL_DB"),
)

class DB:

    def __init__(self) -> None:
        # Store connection config only (no connection stored here)
        self._config: Dict[str, Any] = {}

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
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT uid, username, email, gender, age, city, province, mbti, created_at FROM users")
            rows = cur.fetchall()
        return list(rows)
    
    #search for songs, artists, and albums
    def search(self, query: str) -> List[Dict[str, Any]]:
        search_pattern = f"%{query}%"
        sql = """
            SELECT 
                s.name AS song_name,
                a.name AS artist_name,
                a.artid AS artist_id,
                al.title AS album_name,
                al.release_date
            FROM songs s
            JOIN album_song als ON s.sid = als.sid
            JOIN albums al ON als.alid = al.alid
            JOIN album_owned_by_artist aoa ON al.alid = aoa.alid
            JOIN artists a ON aoa.artid = a.artid
            WHERE LOWER(s.name) LIKE LOWER(%s)
               OR LOWER(a.name) LIKE LOWER(%s)
               OR LOWER(al.title) LIKE LOWER(%s)
            ORDER BY s.name
            LIMIT 100
        """
        
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (search_pattern, search_pattern, search_pattern))
            rows = cur.fetchall()
        return list(rows)
    
    #get songs by artist
    def get_artist_songs(self, artist_id: str) -> List[Dict[str, Any]]:
        sql = """
            SELECT
                s.sid,                
                s.name  AS song_title, 
                a.title AS album_title,
                ar.name AS artist_name 
            FROM artists AS ar
            JOIN album_owned_by_artist AS aoa
                ON ar.artid = aoa.artid         
            JOIN albums AS a
                ON aoa.alid = a.alid            
            JOIN album_song AS als
                ON a.alid = als.alid            
            JOIN songs AS s
                ON als.sid = s.sid              
            WHERE ar.artid = %s
            ORDER BY als.track_no ASC
            LIMIT 50
        """
        
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (artist_id,))
            rows = cur.fetchall()
        return list(rows)
    
    #show all tables in the database
    def show_tables(self) -> List[Dict[str, Any]]:
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            rows = cur.fetchall()
        return list(rows)
    
    #get average ratings for all songs
    def get_rating_averages(self) -> List[Dict[str, Any]]:
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            sql = """
                SELECT
                    s.name AS song_name,
                    a.name AS artist_name,
                    ROUND(AVG(rt.rate_value), 2) AS avg_rating,
                    COUNT(rt.rid) AS rating_count
                FROM user_rates ur
                JOIN ratings rt ON ur.rid = rt.rid
                JOIN songs s ON ur.sid = s.sid
                JOIN album_song als ON s.sid = als.sid
                JOIN album_owned_by_artist aoa ON als.alid = aoa.alid
                JOIN artists a ON aoa.artid = a.artid
                GROUP BY s.sid, a.artid, s.name, a.name
                ORDER BY avg_rating DESC, rating_count DESC
            """
            cur.execute(sql)
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
