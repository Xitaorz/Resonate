from __future__ import annotations

import os
import time
from flask import Flask, jsonify, request, g
from .db import get_db, DB
from .manage import import_data, init_db
from flask_cors import CORS  



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

    @app.put("/users/<int:uid>")
    def update_user(uid: int):
        payload = request.get_json(silent=True) or {}

        allowed_fields = {
            "username",
            "email",
            "gender",
            "age",
            "street",
            "city",
            "province",
            "mbti",
        }

        user_fields = {k: v for k, v in payload.items() if k in allowed_fields}
        if "age" in user_fields:
            try:
                user_fields["age"] = int(user_fields["age"]) if user_fields["age"] is not None else None
            except (TypeError, ValueError):
                return jsonify({"error": "age must be an integer"}), 400

        hobbies = None
        if "hobbies" in payload:
            if not isinstance(payload["hobbies"], list):
                return jsonify({"error": "hobbies must be a list of strings"}), 400

            cleaned = []
            for hobby in payload["hobbies"]:
                if not isinstance(hobby, str):
                    return jsonify({"error": "hobbies must be a list of strings"}), 400
                trimmed = hobby.strip()
                if trimmed:
                    cleaned.append(trimmed)
            hobbies = list(dict.fromkeys(cleaned))  # deduplicate while preserving order

        if not user_fields and hobbies is None:
            return jsonify({"error": "No profile fields or hobbies to update"}), 400

        try:
            updated_user = db.update_user_profile(uid, user_fields, hobbies)
            return jsonify(updated_user)
        except ValueError as e:
            if "not found" in str(e).lower():
                return jsonify({"error": str(e)}), 404
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            print(f"User update endpoint error: {e}")
            return jsonify({"error": "Failed to update user profile"}), 500
    
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

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
