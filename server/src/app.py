from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

import jwt
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify, request, g
from flask_cors import CORS

from .db import get_db, DB
from .manage import import_data, init_db
from .tool import load_sql

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_TTL_MINUTES = int(os.getenv("JWT_TTL_MINUTES", "60"))

def _make_access_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.get("uid")),
        "email": user.get("email"),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_TTL_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


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
            db.execute_script(load_sql("src/sql/weekly-ranking-view.sql"))
            db.execute_script(load_sql("src/sql/weekly-ranking-refresh.sql"))
            print("Weekly ranking snapshot refreshed.")
            try:
                db.execute_script(load_sql("src/sql/weekly-ranking-event.sql"))
                print("Weekly ranking event ensured.")
            except Exception as event_err:
                print(f"Weekly ranking event setup skipped (permission?): {event_err}")
        finally:
            temp_conn.close()
    except Exception as e:
        print(f"Error: {e}")

    def refresh_weekly_view():
        try:
            db.execute_script(load_sql("src/sql/weekly-ranking-refresh.sql"))
            print("Weekly ranking snapshot refreshed.")
        except Exception as e:
            print(f"Weekly view refresh failed: {e}")

    scheduler = BackgroundScheduler(timezone="UTC", daemon=True)
    scheduler.add_job(refresh_weekly_view, "cron", day_of_week="mon", hour=0, minute=5)
    scheduler.start()
    
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

    @app.post("/auth/signup")
    def signup():
        payload = request.get_json(silent=True) or {}
        username = (payload.get("username") or "").strip()
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""

        if not username or not email or not password:
            return jsonify({"error": "username, email, and password are required"}), 400

        try:
            user = db.create_user(username=username, email=email, password=password)
            token = _make_access_token(user)
            return jsonify({"user": user, "token": token}), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:
            print(f"Signup error: {exc}")
            return jsonify({"error": "Failed to create user"}), 500

    @app.post("/auth/login")
    def login():
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""

        if not email or not password:
            return jsonify({"error": "email and password are required"}), 400

        try:
            user = db.authenticate_user(email=email, password=password)
            if not user:
                return jsonify({"error": "Invalid email or password"}), 401
            token = _make_access_token(user)
            return jsonify({"user": user, "token": token})
        except Exception as exc:
            print(f"Login error: {exc}")
            return jsonify({"error": "Failed to login"}), 500

    @app.get("/users")
    def list_users():
        try:
            rows = db.list_users()
            return jsonify(rows)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        
    @app.get("/songs/<song_id>")
    def get_song(song_id: str):
        uid = _get_uid_from_request()
        try:
            song = db.get_song_by_id(song_id)
            if not song:
                return jsonify({"error": "Song not found"}), 404
            if uid is not None:
                song["is_favorite"] = db.is_song_favorite(uid, song_id)
            return jsonify(song)
        except Exception as e:
            print(f"Get song error: {e}")
            return jsonify({"error": "Failed to fetch song"}), 500

    @app.get("/users/<int:uid>")
    def get_user(uid: int):
        try:
            user = db.get_user_profile(uid)
            if not user:
                return jsonify({"error": "User not found"}), 404
            return jsonify(user)
        except Exception as e:
            print(f"Get user endpoint error: {e}")
            return jsonify({"error": "Failed to fetch user profile"}), 500

    @app.post("/users/<int:uid>/vip")
    def make_user_vip(uid: int):
        try:
            db.upsert_vip_user(uid, special_effect=True)
            return jsonify({"isvip": 1}), 201
        except ValueError as e:
            if "not found" in str(e).lower():
                return jsonify({"error": str(e)}), 404
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            print(f"VIP promotion error: {e}")
            return jsonify({"error": "Failed to promote user to VIP"}), 500

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
            hobbies = list(dict.fromkeys(cleaned))

        if not user_fields and hobbies is None:
            return jsonify({"error": "No profile fields or hobbies to update"}), 400

        try:
            updated_user = db.update_user_profile(uid, user_fields, hobbies)
            vip_row = db.get_vip_status(uid)
            updated_user["isvip"] = 1 if vip_row else 0
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
        query = request.args.get("q", "").strip()
        if not query:
            return jsonify({"query": "", "count": 0, "page": 1, "page_size": 0, "results": []})

        try:
            page = max(int(request.args.get("page", 1)), 1)
            page_size = min(max(int(request.args.get("page_size", 20)), 1), 100)
        except ValueError:
            return jsonify({"error": "page and page_size must be integers"}), 400

        try:
            total = db.search_count(query)
            offset = (page - 1) * page_size
            results = db.search(query, limit=page_size, offset=offset)
            return jsonify(
                {
                    "query": query,
                    "count": len(results),
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "has_next": (page * page_size) < total,
                    "results": results,
                }
            )
        except Exception as e:
            print(f"Search endpoint error: {e}")
            return jsonify({"error": "Failed to search"}), 500

    @app.get("/albums/<album_id>/songs")
    def get_album_songs(album_id: str):
        try:
            songs = db.get_album_songs(album_id)
            return jsonify({
                "album_id": album_id,
                "count": len(songs),
                "songs": songs
            })
        except Exception as e:
            print(f"Album songs endpoint error: {e}")
            return jsonify({"error": "Failed to fetch album songs"}), 500
    
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

    @app.get("/recommendations/<int:uid>")
    def recommendations(uid: int):
        try:
            recs = db.get_recommendations(uid, 10)
            return jsonify({
                "uid": uid,
                "count": len(recs),
                "recommendations": recs
            })
        except Exception as e:
            print(f"Recommendations endpoint error: {e}")
            return jsonify({"error": "Failed to fetch recommendations"}), 500

    @app.get("/songs/<sid>/rating")
    def get_song_rating(sid: str):
        uid_param = request.args.get("uid")
        header_uid = request.headers.get("X-User-Id")
        uid_val = header_uid or uid_param
        try:
            uid = int(uid_val) if uid_val is not None else None
        except (TypeError, ValueError):
            return jsonify({"error": "uid is required and must be an integer"}), 400

        if uid is None:
            return jsonify({"error": "uid is required"}), 400

        try:
            rating = db.get_user_song_rating(uid, sid)
            if not rating:
                return jsonify({"rating": None})
            return jsonify({"rating": rating})
        except Exception as e:
            print(f"Get song rating error: {e}")
            return jsonify({"error": "Failed to fetch rating"}), 500

    @app.post("/songs/<sid>/rate")
    def rate_song(sid: str):
        payload = request.get_json(silent=True) or {}
        try:
            uid = int(payload.get("uid"))
        except (TypeError, ValueError):
            return jsonify({"error": "uid is required and must be an integer"}), 400

        try:
            rate_value = int(payload.get("rate_value"))
        except (TypeError, ValueError):
            return jsonify({"error": "rate_value is required and must be an integer"}), 400

        comment = payload.get("comment")
        if comment is not None and not isinstance(comment, str):
            return jsonify({"error": "comment must be a string"}), 400

        try:
            rating_row = db.rate_song(uid=uid, sid=sid, rate_value=rate_value, comment=comment)
            return jsonify(rating_row), 201
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            print(f"Rate song error: {e}")
            return jsonify({"error": "Failed to rate song"}), 500

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

    def _get_uid_from_request(payload: dict | None = None) -> int | None:
        header_uid = request.headers.get("X-User-Id")
        if header_uid and header_uid.isdigit():
            return int(header_uid)
        if payload and "uid" in payload and str(payload["uid"]).isdigit():
            return int(payload["uid"])
        return None

    @app.post("/playlists")
    def create_playlist():
        payload = request.get_json(silent=True) or {}
        uid = _get_uid_from_request(payload)
        name = payload.get("name")
        description = payload.get("description")
        visibility = payload.get("visibility", "public")

        if not uid:
            return jsonify({"error": "uid required"}), 401
        if not name:
            return jsonify({"error": "name is required"}), 400
        if visibility not in ("public", "private"):
            return jsonify({"error": "visibility must be one of public, private"}), 400

        try:
            if db.playlist_name_exists(int(uid), str(name)):
                return jsonify({"error": "You already have a playlist with this name. Please choose a different name."}), 400
            
            plstid = db.create_playlist(int(uid), str(name), description, visibility)
            return jsonify({"playlist_id": plstid}), 201
        except Exception as e:
            print(f"Create playlist error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.post("/playlists/<int:plstid>/songs")
    def add_playlist_song(plstid: int):
        payload = request.get_json(silent=True) or {}
        sid = payload.get("sid")
        position = payload.get("position")
        uid = _get_uid_from_request(payload)

        if not sid:
            return jsonify({"error": "sid is required"}), 400
        playlist = db.get_playlist(plstid)
        if not playlist:
            return jsonify({"error": "playlist not found"}), 404
        if uid is not None and int(playlist.get("uid", -1)) != uid:
            return jsonify({"error": "forbidden"}), 403
        try:
            db.add_song_to_playlist(plstid, str(sid), int(position) if position is not None else None)
            return jsonify({"playlist_id": plstid, "sid": sid, "position": position}), 201
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            print(f"Add song to playlist error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/users/<int:uid>/playlists")
    def list_user_playlists(uid: int):
        auth_uid = _get_uid_from_request()
        if auth_uid is not None and auth_uid != uid:
            return jsonify({"error": "forbidden"}), 403
        try:
            playlists = db.list_playlists(uid)
            return jsonify({"count": len(playlists), "playlists": playlists})
        except Exception as e:
            print(f"List playlists error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/playlists/<int:plstid>")
    def get_playlist(plstid: int):
        playlist = db.get_playlist(plstid)
        if not playlist:
            return jsonify({"error": "playlist not found"}), 404
        auth_uid = _get_uid_from_request()
        playlist_visibility = playlist.get("visibility")
        playlist_owner_uid = int(playlist.get("uid", -1))
        if playlist_visibility != "public" and (auth_uid is None or auth_uid != playlist_owner_uid):
            return jsonify({"error": "forbidden"}), 403
        try:
            songs = db.list_playlist_songs(plstid)
            return jsonify({"playlist": playlist, "songs": songs})
        except Exception as e:
            print(f"Get playlist error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.delete("/playlists/<int:plstid>")
    def delete_playlist(plstid: int):
        playlist = db.get_playlist(plstid)
        if not playlist:
            return jsonify({"error": "playlist not found"}), 404

        auth_uid = _get_uid_from_request()
        if auth_uid is None:
            return jsonify({"error": "uid required"}), 401
        if auth_uid != int(playlist.get("uid", -1)):
            return jsonify({"error": "forbidden"}), 403

        try:
            deleted = db.delete_playlist(plstid, auth_uid)
            if not deleted:
                return jsonify({"error": "playlist not found"}), 404
            return jsonify({"playlist_id": plstid, "deleted": True}), 200
        except Exception as e:
            print(f"Delete playlist error: {e}")
            return jsonify({"error": "Failed to delete playlist"}), 500

    @app.post("/playlists/<int:plstid>/follow")
    def follow_playlist(plstid: int):
        uid = _get_uid_from_request()
        if uid is None:
            return jsonify({"error": "uid required"}), 401
        playlist = db.get_playlist(plstid)
        if not playlist:
            return jsonify({"error": "playlist not found"}), 404
        if playlist.get("visibility") != "public":
            return jsonify({"error": "can only follow public playlists"}), 403
        try:
            db.follow_playlist(uid, plstid)
            return jsonify({"uid": uid, "plstid": plstid, "following": True}), 201
        except Exception as e:
            print(f"Follow playlist error: {e}")
            return jsonify({"error": "Failed to follow playlist"}), 500

    @app.delete("/playlists/<int:plstid>/follow")
    def unfollow_playlist(plstid: int):
        uid = _get_uid_from_request()
        if uid is None:
            return jsonify({"error": "uid required"}), 401
        playlist = db.get_playlist(plstid)
        if not playlist:
            return jsonify({"error": "playlist not found"}), 404
        try:
            removed = db.unfollow_playlist(uid, plstid)
            if not removed:
                return jsonify({"error": "follow not found"}), 404
            return jsonify({"uid": uid, "plstid": plstid, "following": False}), 200
        except Exception as e:
            print(f"Unfollow playlist error: {e}")
            return jsonify({"error": "Failed to unfollow playlist"}), 500

    @app.get("/users/<int:uid>/followed-playlists")
    def list_followed_playlists(uid: int):
        auth_uid = _get_uid_from_request()
        if auth_uid is not None and auth_uid != uid:
            return jsonify({"error": "forbidden"}), 403
        try:
            playlists = db.list_followed_playlists(uid)
            return jsonify({"count": len(playlists), "playlists": playlists})
        except Exception as e:
            print(f"List followed playlists error: {e}")
            return jsonify({"error": "Failed to load followed playlists"}), 500

    @app.post("/favorites")
    def favorite_song():
        payload = request.get_json(silent=True) or {}
        uid = _get_uid_from_request(payload)
        sid = payload.get("sid")
        if not uid:
            return jsonify({"error": "uid required"}), 401
        if not sid:
            return jsonify({"error": "sid is required"}), 400
        try:
            db.favorite_song(int(uid), str(sid))
            return jsonify({"uid": uid, "sid": sid}), 201
        except Exception as e:
            print(f"Favorite song error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.delete("/favorites")
    def unfavorite_song():
        payload = request.get_json(silent=True) or {}
        uid = _get_uid_from_request(payload)
        sid = payload.get("sid")
        if not uid:
            return jsonify({"error": "uid required"}), 401
        if not sid:
            return jsonify({"error": "sid is required"}), 400
        try:
            deleted = db.unfavorite_song(int(uid), str(sid))
            if not deleted:
                return jsonify({"error": "favorite not found"}), 404
            return jsonify({"uid": uid, "sid": sid, "favorited": False}), 200
        except Exception as e:
            print(f"Unfavorite song error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/users/<int:uid>/favorites")
    def list_favorites(uid: int):
        auth_uid = _get_uid_from_request()
        if auth_uid is not None and auth_uid != uid:
            return jsonify({"error": "forbidden"}), 403
        try:
            favorites = db.list_favorites(uid)
            return jsonify({"count": len(favorites), "favorites": favorites})
        except Exception as e:
            print(f"List favorites error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/playlists/search")
    def search_playlists():
        q = request.args.get("q", "").strip()
        if not q:
            return jsonify({"count": 0, "playlists": []})
        uid = _get_uid_from_request()
        try:
            playlists = db.search_playlists(q, uid)
            return jsonify({"count": len(playlists), "playlists": playlists})
        except Exception as e:
            print(f"Search playlists error: {e}")
            return jsonify({"error": "Failed to search playlists"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port)
