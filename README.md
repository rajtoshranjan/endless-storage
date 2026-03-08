# Endless Storage

Endless Storage is a distributed multi-cloud storage engine that transforms multiple personal cloud accounts into a single unified, expandable storage layer.

Instead of storing files on its own servers, Endless Storage connects directly to user-owned cloud providers (starting with Google Drive), automatically splits files into chunks, distributes them across connected drives based on available capacity, and reconstructs them seamlessly on download — all via streaming.

No local persistence. No storage limits tied to a single provider. Just distributed cloud capacity powered by your own infrastructure.

[Demo Video](https://youtu.be/krg4fibUe0A)

## Main Features

- **Automatic File Sharding**
  Files are split into chunks and distributed across multiple connected cloud accounts.

- **Pooled Capacity**
  If you connect multiple drives, their available storage is combined logically.

- **Streaming Reconstruction**
  Files are reconstructed in order during download without loading the full file into memory.

- **No Local Storage**
  The backend never stores files on disk. All operations are streamed.

- **Provider-Agnostic Architecture**
  Modular connector layer allows adding new providers (OneDrive, Dropbox, etc.) in the future.

---

## Why Endless Storage?

Traditional cloud storage ties you to a single provider’s limits.

Endless Storage creates a virtual distributed filesystem on top of multiple consumer cloud accounts, enabling:

- Larger single-file uploads than any individual drive
- Logical capacity expansion
- Provider flexibility

It is effectively a distributed storage engine built on consumer cloud APIs.

---

## Prerequisites

- Docker & Docker Compose (Recommended)
- Node.js 18+ (if running frontend natively)
- Python 3.12+ (if running backend natively)

---

## Setup and Usage

### Using Docker (Recommended)

```bash
git clone https://github.com/rajtoshranjan/endless-storage.git
cd endless-storage
cp .env.template .env.development
docker compose up --build
```

Frontend: [http://localhost:3000](http://localhost:3000)
API: [http://localhost:8000](http://localhost:8000)

---

### Running Natively

#### Frontend

```bash
cd client
npm install
npm run dev
```

#### Backend

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## License

This project is licensed under the MIT License.

---
