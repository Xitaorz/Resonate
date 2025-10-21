# CS348
The Project Repo for CS348

## Quick Start

The application **automatically initializes** the database schema and example data on first startup - no manual setup required!

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
⚠️ This takes several minutes and requires Kaggle credentials

### Test database connectivity
```bash
python -m src.manage ping
```

### Stop and remove Docker containers
```bash
# For docker-compose setup
docker-compose down

# For local MySQL setup
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

