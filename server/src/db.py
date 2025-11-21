from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import pymysql
from dotenv import load_dotenv
from pymysql.cursors import DictCursor
from sqlalchemy import create_engine

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

    def get_connection(self) -> pymysql.connections.Connection:
        if not self._config:
            raise RuntimeError("DB not initialized. Call connect() first.")
        
        return pymysql.connect(
            host=self._config['host'],
            port=self._config['port'],
            user=self._config['user'],
            password=self._config['password'],
            database=self._config['database'],
            cursorclass=DictCursor,
            autocommit=True,
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
    def search(self, query: str) -> List[Dict[str, Any]]:
        search_pattern = f"%{query}%"
        sql = self._sql("search.sql")
        
        conn = self._ensure_conn()
        with conn.cursor() as cur:
            cur.execute(sql, (search_pattern, search_pattern, search_pattern))
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

    def get_weekly_ranking(self) -> List[Dict[str, Any]]:
        sql = self._sql("show-weekly-ranking.sql")
        conn = self._ensure_conn()
        with conn.cursor() as cur:
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
