# CS348 Project Requirements

## C1. README File
A README file describing how to create and load your sample database, how to run your working database-driven application, and what features it currently supports.

Please see `server/README.md`

---

## C2. SQL Code for Schema
Files containing the SQL code used for creating tables, constraints, stored procedures, and triggers (if any).

See `server/schema.sql`

---

## C3. Test Sample SQL Files
A file test-sample.sql (or other corresponding files) containing the SQL statements you wrote for Task 5, and a file test-sample.out showing the results of running test-sample.sql over your sample database (not the full dataset).

The 4 features are in the `server/test-samples` folder in separate files.

---

## C5. Working Database-Driven Application
Code implementing a simple but working database-driven application on your chosen platform (1-2 simple features/functionalities can be run), which can serve as a starting point for completing your project.

Our current app supports the search feature. Please run the backend and frontend to access it.

### Feature 1: Song Search by Keyword
This feature allows users to search for songs by entering part or all of a song title, artist name, or album name. Users type a keyword into a search bar and click "Search." The application queries the database and displays matching songs with their title, artist, album, duration, and popularity. If no matches are found, a message such as "No songs found" is shown.
