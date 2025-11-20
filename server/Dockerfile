FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY schema.sql example.sql large-sample-users.sql ./
COPY .env.example .env

EXPOSE 3000

CMD ["python", "-m", "src.app"]
