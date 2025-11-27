# CS348 Project

This project consists of a backend server and a frontend web application.

## Getting Started

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Please follow the instructions in the [server README](./server/README.md) to set up and start the backend.

The backend provides a API and handles all database operations. You can run it using Docker Compose (recommended) or a local Python environment.

### Frontend Setup

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm start
   ```

## Project Structure

- `server/` - Backend API server (Python/Flask + MySQL)
- `web/` - Frontend web application (React + TanStack Router)

## Quick Start (Full Stack)

1. **Start the backend** (in one terminal):
   ```bash
   cd server
   docker-compose up
   ```
The production database should be automatically loaded to the database when running docker-compose up.

2. **Start the frontend** (in another terminal):
   ```bash
   cd web
   pnpm install
   pnpm start
   ```

The backend API will run on `http://localhost:3000` and the frontend will run on its own port (typically `http://localhost:5173`).

# Manually Importing Production Dataset

With the database container running, change the dir to server and enter venv:
```sh
cd server
python -m venv venv
source venv/bin/activate
```

Then run manage script with init argument:
```sh
python -m src.manage init
```
Make sure when running this command, there is no table/view in the database. If there is any table you might need to drop them. 
