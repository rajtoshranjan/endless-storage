# Build stage
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

EXPOSE 8000

# Add entrypoint script
ADD docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod a+x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

# Use uvicorn to run the ASGI application
CMD ["uvicorn", "endless_storage.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "3"]
