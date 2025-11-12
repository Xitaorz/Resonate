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
        self._conn: Optional[pymysql.connections.Connection] = None

    def import_csv(self, file_path: str, table_name: str, sample=False) -> int | None:
        df = pd.read_csv(file_path)
        if sample:
            df = df.sample(n=200, random_state=1)
        
        print(create_engine(self.connection_string))
        print(df.to_sql(table_name, create_engine(self.connection_string), if_exists='append', index=False))
    
    def import_df(self, df: pd.DataFrame, table_name: str) -> int | None:
        return df.to_sql(table_name, create_engine(self.connection_string), if_exists='append', index=False)

    def connect(self) -> None:
        host = os.getenv("MYSQL_HOST", "127.0.0.1")
        port = int(os.getenv("MYSQL_PORT", "3306"))
        user = os.getenv("MYSQL_USER", "root")
        password = os.getenv("MYSQL_PASS", "")
        database = os.getenv("MYSQL_DB", "")
        self.connection_string = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"

        # Establish connection
        self._conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            cursorclass=DictCursor,
            autocommit=True,
        )

    def _ensure_conn(self) -> pymysql.connections.Connection:
        if self._conn is None:
            raise RuntimeError("DB not connected. Call connect() first.")
        return self._conn
    
    #execute sql 
    def execute_script(self, sql_text: str) -> None:
        conn = self._ensure_conn()
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
        
        try:
            conn = self._ensure_conn()
            with conn.cursor() as cur:
                cur.execute(sql, (search_pattern, search_pattern, search_pattern))
                rows = cur.fetchall()
            return list(rows)
        except Exception as e:
            # Connection is corrupted - force close and reconnect
            print(f"DB error, forcing reconnect: {e}")
            try:
                # Close the corrupted connection
                if self._conn:
                    try:
                        self._conn.close()
                    except:
                        pass
                    self._conn = None
                
                # Create fresh connection and retry
                self.connect()
                conn = self._ensure_conn()
                with conn.cursor() as cur:
                    cur.execute(sql, (search_pattern, search_pattern, search_pattern))
                    rows = cur.fetchall()
                return list(rows)
            except Exception as retry_error:
                print(f"Retry also failed: {retry_error}")
                # Return empty list to prevent frontend crash
                return []
    
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
