# Dockerfile for FastAPI backend
FROM python:3.12-slim AS base
WORKDIR /app

# Install build dependencies (if any) and runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Use gunicorn with uvicorn workers for production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
