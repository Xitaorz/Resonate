# CS348
The Project Repo for CS348

> For assignment requirements, please see [`milestone.md`](./milestone.md)

## Quick Start

---

## Option 1: Docker Compose (Recommended)

**Prerequisites:** Docker Desktop installed

**Steps:**
1. Clone the repo and navigate to the project root
2. Run:
   ```bash
   docker-compose up
   ```

The app will:
- Start a MySQL database
- Wait for the database to be healthy
- Initialize tables and load example data automatically
- Start the web server on port 3000

**Access the app:**

simple check:
- Health check: http://localhost:3000/health/db → `{"db":"ok"}`
- Show tables: http://localhost:3000/tables → List all database tables
- List users: http://localhost:3000/users → JSON array of users

features: 
- **Search**: http://localhost:3000/search?q=debug → Search songs, artists, and albums
- **Ratings**: http://localhost:3000/ratings/average → Average ratings for all songs

---

## Option 2: Local Python Environment

**Prerequisites:** Python 3.11+, Docker Desktop (for MySQL)

### 1. Set up Python environment
```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (MacOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Start MySQL database
```bash
docker run --name m0-mysql -d -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=app_db \
  -e MYSQL_USER=app_user \
  -e MYSQL_PASSWORD=123 \
  mysql:8
```

### 3. Configure environment
```bash
# Copy environment template
copy .env.example .env   # Windows
cp .env.example .env     # MacOS/Linux
```

### 4. Start the application
```bash
python -m src.app
```

On first startup, the app will automatically:
- Create all database tables (from `schema.sql`)
- Load example data (from `example.sql`)
- Start the web server on port 3000

**Access the app:**
- Health check: http://localhost:3000/health/db
- Show tables: http://localhost:3000/tables
- List users: http://localhost:3000/users
- Search: http://localhost:3000/search?q=compile
- **Ratings**: http://localhost:3000/ratings/average

---

## Optional: Advanced Operations

### Import full Kaggle dataset (5000 songs)
```bash
python -m src.manage init
```
This takes several minutes and requires Kaggle credentials

### Test database connectivity
```bash
python -m src.manage ping
```

### Stop and remove Docker containers
```bash
docker-compose down
docker stop m0-mysql
docker rm m0-mysql
```

---

## 📚 API Endpoints 

### `GET /health/db`
Check database connectivity status.

**Response:**
```json
{"db": "ok"}
```

### `GET /tables`
Show all tables in the database.

**Response:**
```json
{
  "count": 18,
  "tables": [
    {"Tables_in_app_db": "users"},
    {"Tables_in_app_db": "songs"},
    ...
  ]
}
```

### `GET /users`
List all registered users.

**Response:** Array of user objects with profile information.

### `GET /search?q=<query>`
Search across songs, artists, and albums (case-insensitive).

**Parameters:**
- `q` (required): Search query string

**Examples:**
- `/search?q=debug` - Find songs/albums by "Debug Duo"
- `/search?q=compile` - Find "Compile My Heart" song
- `/search?q=rubber` - Find songs in "Rubber Duck Sessions" album

**Response:**
```json
{
  "query": "debug",
  "count": 2,
  "results": [
    {
      "song_name": "Infinite Loop",
      "artist_name": "Debug Duo",
      "album_name": "Rubber Duck Sessions",
      "release_date": "Fri, 15 Mar 2024 00:00:00 GMT"
    }
  ]
}
```

### `GET /ratings/average`
Get average ratings for all songs with rating counts.  
Implements query from `test-sample-rating-avg.sql`

**Response:**
```json
{
  "count": 3,
  "ratings": [
    {
      "song_name": "Infinite Loop",
      "artist_name": "Debug Duo",
      "avg_rating": "4.50",
      "rating_count": 2
    },
    {
      "song_name": "Compile My Heart",
      "artist_name": "The Coders",
      "avg_rating": "3.50",
      "rating_count": 2
    }
  ]
}
```
#### Features description:

Feature 1 

Song search by keyword: This feature allows users to search for songs by entering part or all of a song title, artist name, or album name. Users type a keyword into a search bar and click “Search.” The application queries the database and displays matching songs with their title, artist, album, duration, and popularity. If no matches are found, a message such as “No songs found” is shown.

Feature 2

Rating of song average of all users: This feature allows users to rate songs on a 0.5 to 5-star scale and view each song’s overall average rating. Users can submit or update their rating for any song, and the system automatically recalculates the song’s average score. The application displays the average rating next to each song’s title, artist, and album to help users identify popular or highly rated tracks.

Feature 3 

List songs of an artist: The user clicks on an artist’s name from the search results or discover page. This feature is used by regular users of the application who want to explore songs by a specific artist. After the artist is selected, the backend retrieves all albums owned by that artist from the database, and then lists all songs contained in those albums. The songs are displayed in a list format showing each song’s title, album name, and release date. The user can scroll through the list and click on any song to open its detailed view with ratings, tags, and comments.

Feature 4 

Display User data: This feature allows users to view a summary of their personal information and activity statistics on the profile page. When a user opens their profile, the backend aggregates and displays data such as the total number of playlists they have created, the total number of songs they have marked as favorites, and whether they hold VIP status. This feature is designed for our application users, helping them quickly understand their engagement level and account tier.


