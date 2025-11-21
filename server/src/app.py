from __future__ import annotations

import os
import time
from flask import Flask, jsonify, request, g
from flask_cors import CORS

from .db import get_db, DB
from .manage import import_data, init_db
from .tool import load_sql


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    max_retries = 30
    retry_delay = 1
    db = None
    
    for attempt in range(max_retries):
        try:
            db = get_db()
            print(f"Database connected XD!")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Database connection attempt {attempt + 1}/{max_retries} failed...")
                time.sleep(retry_delay)
            else:
                print(f"Failed to connect to database: {e}")
                raise
    
    if db is None:
        raise RuntimeError("Database connection failed")
    
    try:
        temp_conn = db.get_connection()
        try:
            with temp_conn.cursor() as cur:
                cur.execute("SHOW TABLES LIKE 'users'")
                if not cur.fetchone():
                    init_db()
                    print("Database initialization complete.")
                    import_data()
                    print("Data imported!")
            # Always ensure weekly view exists (noop if already present)
            db.execute_script(load_sql("src/sql/weekly-ranking-view.sql"))
            print("Weekly ranking view ensured.")
        finally:
            temp_conn.close()
    except Exception as e:
        print(f"Error: {e}")
    
    @app.before_request
    def before_request():
        """Get a fresh database connection for this request"""
        g.db_conn = db.get_connection()
    
    @app.teardown_appcontext
    def teardown_db(exception=None):
        """Close the database connection after each request"""
        conn = g.pop('db_conn', None)
        if conn is not None:
            try:
                conn.close()
            except:
                pass

    @app.get("/health/db")
    def health_db():
        if db.ping():
            return jsonify({"db": "ok"})
        return jsonify({"db": "down"}), 500

    @app.get("/users")
    def list_users():
        try:
            rows = db.list_users()
            return jsonify(rows)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.get("/search")
    def search():
        query = request.args.get('q', '')
        if not query:
            return jsonify({"query": "", "count": 0, "results": []})
        
        try:
            results = db.search(query)
            return jsonify({
                "query": query,
                "count": len(results),
                "results": results
            })
        except Exception as e:
            print(f"Search endpoint error: {e}")
            return jsonify({
                "query": query,
                "count": 0,
                "results": []
            })
    
    @app.get("/artist/<artist_id>/songs")
    def get_artist_songs(artist_id: str):
        try:
            songs = db.get_artist_songs(artist_id)
            return jsonify({
                "artist_id": artist_id,
                "count": len(songs),
                "songs": songs
            })
        except Exception as e:
            print(f"Artist songs endpoint error: {e}")
            return jsonify({
                "artist_id": artist_id,
                "count": 0,
                "songs": []
            })
    
    @app.get("/tables")
    def show_tables():
        try:
            tables = db.show_tables()
            return jsonify({
                "count": len(tables),
                "tables": tables
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.get("/ratings/average")
    def rating_averages():
        try:
            ratings = db.get_rating_averages()
            return jsonify({
                "count": len(ratings),
                "ratings": ratings
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.get("/weekly-ranking")
    def weekly_ranking():
        try:
            rankings = db.get_weekly_ranking()
            return jsonify({
                "count": len(rankings),
                "rankings": rankings
            })
        except Exception as e:
            print(f"Weekly ranking error: {e}")
            return jsonify({"error": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
