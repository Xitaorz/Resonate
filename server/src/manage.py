from __future__ import annotations

import ast
import sys
from pathlib import Path
from typing import List

import pandas as pd
import kagglehub
from kagglehub import KaggleDatasetAdapter

from .db import get_db, DB
from .tool import load_sql

DATASET_FILE_NAME = "tracks_features.csv"


PRODUCTION_DATA_SIZE = 100_000

#Execute sql files to initialize table contents!!!!
def init_db() -> None:
    db: DB = get_db()

    schema_sql = load_sql("schema.sql")
    tags_sql = load_sql("src/sql/tags.sql")
    example_sql = load_sql("example.sql")
    large_sample = load_sql("large-sample-users.sql")
    weekly_view = load_sql("src/sql/weekly-ranking-view.sql")
    weekly_refresh = load_sql("src/sql/weekly-ranking-refresh.sql")
    weekly_event = load_sql("src/sql/weekly-ranking-event.sql")
    virtual_tags = load_sql("src/sql/virtual_tags.sql")

    db.execute_script(schema_sql)
    db.execute_script(tags_sql)       # Ensure tag rows exist before seeding song_tag
    db.execute_script(example_sql)
    db.execute_script(large_sample)
    db.execute_script(weekly_view)
    db.execute_script(weekly_refresh)
    db.execute_script(virtual_tags)
    
    try:
        db.execute_script(weekly_event)
    except Exception as event_err:
        print(f"Skipping weekly event creation (permission?): {event_err}")

    print("Database initialized and exampleed.")

def import_data() -> None: 
    # https://github.com/Kaggle/kagglehub/blob/main/README.md#kaggledatasetadapterpandas
    df = kagglehub.dataset_load(
        KaggleDatasetAdapter.PANDAS,
        "rodolfofigueroa/spotify-12m-songs",
        "tracks_features.csv",
    )
    db: DB = get_db()

    df = df.sample(n=PRODUCTION_DATA_SIZE, random_state=1)
    df = df[df["name"].notnull()]
    df = df[df["album"].notnull()]
    print(df["release_date"].head())

    df['release_date'] = pd.to_datetime(df['release_date'], format='%Y-%m-%d', errors="coerce")
    numeric_feature_cols = [
        "danceability",
        "energy",
        "valence",
        "tempo",
        "loudness",
        "mode",
        "acousticness",
        "speechiness",
    ]
    for col in numeric_feature_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    songs_df = df[["id", "name", "release_date"] + numeric_feature_cols]
    songs_df = songs_df.drop_duplicates(subset=["id"])
    songs_df.rename(columns={"id": "sid"}, inplace=True)

    
    df['artists'] = df['artists'].apply(lambda x: ast.literal_eval(x))
    df['artist_ids'] = df['artist_ids'].apply(lambda x: ast.literal_eval(x))
    artists_df = df.explode(["artists", "artist_ids"])[["artists", "artist_ids"]].drop_duplicates(subset=["artist_ids"])
    artists_df.rename(columns={"artist_ids": "artid", "artists": "name"}, inplace=True)
    artists_df = artists_df[["artid", "name"]]
    
    
    

    print("Importing songs...")
    db.import_df(songs_df, "songs")
    print("Importing artists...")
    db.import_df(artists_df, "artists")
    print("Importing albums...")
    albums_df = df[["album_id", "album", "release_date"]].drop_duplicates(subset=["album_id"])
    albums_df = albums_df.rename(columns={"album_id": "alid", "album": "title"}).drop_duplicates(subset=["alid"])
    db.import_df(albums_df, "albums")

    print("Importing album_song...")
    albums_songs_df = df[["album_id", "id", "disc_number", "track_number"]].drop_duplicates(subset=["album_id", "id"])
    albums_songs_df = albums_songs_df.rename(columns={"album_id": "alid", "id": "sid", "disc_number": "disc_no", "track_number": "track_no"})
    db.import_df(albums_songs_df, "album_song")

    print("Importing album_owned_by_artist...")
    album_owned_by_artist_df = df.explode(["artists", "artist_ids"])[["album_id", "artist_ids"]].drop_duplicates(subset=["album_id", "artist_ids"])
    album_owned_by_artist_df = album_owned_by_artist_df.rename(columns={"album_id": "alid", "artist_ids": "artid"})
    db.import_df(album_owned_by_artist_df, "album_owned_by_artist")

    print("Data imported to DB.")



def download_data() -> None:
    path = kagglehub.dataset_download("rodolfofigueroa/spotify-12m-songs")
    print(f"Data downloaded to {path}")

def execute_sql_file(path: str) -> int:
    sql_path = Path(path)
    if not sql_path.exists():
        print(f"SQL file not found: {sql_path}")
        return 2
    sql_text = sql_path.read_text(encoding="utf-8")
    db: DB = get_db()
    db.execute_script(sql_text)
    print(f"Executed SQL from {sql_path}")
    return 0

#test connection
def ping() -> int:
    db: DB = get_db()
    if db.ping():
        print("DB OK")
        return 0
    print("DB DOWN")
    return 1

#list all rows in the users table
def list_users() -> int:
    try:
        db: DB = get_db()
        result = db.list_users()
        if result:
            for row in result:
                print(row)
            return 0
        else:
            print("No rows found.")
            return 1
    except Exception as e:
        print("Error:", e)
        return 1

def main(argv: List[str]) -> int:
    cmd = argv[1].lower()
    if cmd == "init":
        init_db()
        import_data()
        return 0
    if cmd == "ping":
        return ping()
    if cmd == "list":
        return list_users()
    if cmd == "download":
        download_data()
        return 0

    print(f"Unknown command: {cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
