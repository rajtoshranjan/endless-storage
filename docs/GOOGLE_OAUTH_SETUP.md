# Google OAuth2 Setup Guide

This project requires Google OAuth2 credentials to interact with the Google Drive API. Follow these steps to generate your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the **Project Dropdown** at the top and select **New Project**.
3. Name your project (e.g., `Endless-Storage`) and click **Create**.

## 2. Enable Google Drive API

1. In the sidebar, navigate to **APIs & Services > Library**.
2. Search for **"Google Drive API"**.
3. Click the result and click **Enable**.

## 3. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen** (or **Google Auth Platform > Branding**).
2. Select **User Type: External** and click **Create**.
3. Fill in the **App Information** (App name, User support email).
4. Scroll to **Developer contact information** and add your email.
5. Click **Save and Continue**.

## 4. Add Test Users (Crucial)

While the app is in "Testing" mode, Google will block any user not explicitly added to the allowlist.

1. Navigate to the **Audience** tab (or the **Test Users** section of the consent screen).
2. Click **+ ADD USERS**.
3. Enter the Gmail address(es) you will use for testing.
4. Click **Save**.

## 5. Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** and select **OAuth client ID**.
3. Select **Application type: Web application**.
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/oauth/callback`
5. Click **Create**. A dialog will appear with your **Client ID** and **Client Secret**.

## 6. Environment Configuration

Add the following keys to the `.env` file in your project root (if it doesn't exist):

```env
GOOGLE_CLIENT_ID="your_client_id_here"
GOOGLE_CLIENT_SECRET="your_client_secret_here"
```
