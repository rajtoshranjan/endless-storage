# Dropbox OAuth2 Setup Guide

This project requires Dropbox OAuth2 credentials to interact with the Dropbox API v2. Follow these steps to generate your `DROPBOX_CLIENT_ID` and `DROPBOX_CLIENT_SECRET`.

## 1. Create a Dropbox App

1. Go to the [Dropbox App Console](https://www.dropbox.com/developers/apps) and sign in.
2. Click **Create app**.
3. Configure the app:
   - **Choose an API**: Select **Scoped access**.
   - **Choose the type of access**: Select **Full Dropbox** (required to write into a named folder inside the user's Dropbox).
   - **Name your app**: Enter `Endless Storage` (or any unique name — Dropbox app names must be globally unique).
4. Click **Create app**.

## 2. Copy the Client ID and Secret

On the app settings page under the **Settings** tab:

- **App key** — this is your `DROPBOX_CLIENT_ID`.
- **App secret** — click **Show** to reveal it. This is your `DROPBOX_CLIENT_SECRET`.

## 3. Configure the Redirect URI

1. Scroll down to the **OAuth 2** section on the **Settings** tab.
2. Under **Redirect URIs** click **Add** and enter:
   - `http://localhost:3000/oauth/callback`
3. Click **Add** to save.

> For production, add your production callback URL here as well.

## 4. Configure Required Permissions

1. Click the **Permissions** tab.
2. Enable the following scopes:
   - `files.content.write` — upload and modify files
   - `files.content.read` — download files
   - `files.metadata.read` — read file/folder metadata
   - `account_info.read` — read account email (used during connect)
3. Click **Submit** to save.

> **Important**: After changing permissions you must re-generate any existing access tokens. Existing connected accounts will need to reconnect.

## 5. Enable Offline Access (Refresh Tokens)

This project uses long-lived refresh tokens. The `token_access_type=offline` parameter is automatically added to the authorization URL, so no extra configuration is needed in the app console. Just ensure your app is not set to **Development** status if you want users outside your Dropbox team to connect.

## 6. Environment Configuration

Add the following keys to your `.env` file (`OAUTH_REDIRECT_URI` is shared across all providers — set it once):

```env
OAUTH_REDIRECT_URI="http://localhost:3000/oauth/callback"
DROPBOX_CLIENT_ID="your_app_key_here"
DROPBOX_CLIENT_SECRET="your_app_secret_here"
```
