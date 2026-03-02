# Endless Storage

Endless Storage is a modern platform designed to simplify and enhance the way users manage and share files. With a modular backend architecture and a highly responsive frontend, it offers secure authentication, cloud storage integration (Google Drive), and robust file sharing capabilities natively from the browser.

![Endless Storage](docs/secure-share.png)

## Main Features

- **Authentication & Security**
  Secure login system via JWT with Multi-Factor Authentication (MFA) support using authenticator apps.
- **Cloud Storage Integration (New)**
  Seamless OAuth2 integration with Google Drive. Files are uploaded securely and directly to your connected Drive account using resumable, chunked uploads.

- **Advanced File Management**
  - **Direct Uploads:** Multi-file, concurrent uploads with real-time progress tracking via a Google Drive-like floating upload widget.
  - **Proxy Downloads:** Securely stream files from your cloud storage through the backend.
  - **Public Sharing:** Generate shareable, expiring public links to securely distribute files.
  - **Internal Sharing:** Share files with registered users with "download-only" or "view-only" constraints.

- **Access Control**
  Role-based permission settings to manage who can access specific drives and files (Admin, Regular, Guest).

- **Modern Architecture**
  A beautifully styled, responsive UI built with Radix UI, Tailwind CSS, and Redux Toolkit, backed by a modular Django REST framework API.

## Technology Stack

### Frontend

- **Framework:** React.js (via Vite)
- **State & Data:** Redux Toolkit, TanStack Query (React Query), Axios
- **Styling:** Tailwind CSS, Radix UI Primitives, Lucide Icons

### Backend

- **Framework:** Django & Django REST Framework (Modular App Architecture)
- **Database:** SQLite 3 (Default)
- **Integrations:** Google API Client (OAuth2, Drive v3 API)

### Development Tools

- Docker & Docker Compose
- Python 3.12+
- Node.js 18+

## Prerequisites

To run the project, you’ll need the following installed on your system:

- **Docker**: Ensure Docker and Docker Compose are set up (Highly Recommended).
- **Node.js**: Version 18+ (if running the frontend natively).
- **Python**: Version 3.12+ (if running the backend natively).

## Setup and Usage

### Using Docker (Recommended)

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/rajtoshranjan/secure-share.git
   cd secure-share
   ```

2. Configure Environment Variables:
   Copy `.env.template` to `.env.development` and populate the required keys, especially the Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) needed for the storage integration:

   ```bash
   cp .env.template .env.development
   ```

3. Run the application using Docker Compose:

   ```bash
   docker compose up --build
   ```

4. The frontend will be available at `http://localhost:3000` and the API at `http://localhost:8000`.

### Running Natively (Without Docker)

#### Frontend Setup

1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

#### Backend Setup

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## License

This project is licensed under the [MIT License](LICENSE).
