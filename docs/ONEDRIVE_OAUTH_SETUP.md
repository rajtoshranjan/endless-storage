# OneDrive OAuth2 Setup Guide

This project requires Microsoft OAuth2 credentials to interact with the OneDrive API via Microsoft Graph. Follow these steps to generate your `ONEDRIVE_CLIENT_ID` and `ONEDRIVE_CLIENT_SECRET`.

## 1. Register an Application in Microsoft Entra

1. Go to the [Microsoft Entra admin center](https://entra.microsoft.com/) and sign in with your Microsoft account.
2. In the left sidebar navigate to **Applications > App registrations**.
3. Click **+ New registration**.
4. Fill in the details:
   - **Name**: `Endless Storage` (or any name you prefer)
   - **Supported account types**: Select **Accounts in any organizational directory and personal Microsoft accounts** (the third option — this covers both work/school and personal OneDrive accounts).
   - **Redirect URI**: Select **Web** and enter `http://localhost:3000/oauth/callback`
5. Click **Register**.

## 2. Copy the Client ID

On the app overview page you will see:

- **Application (client) ID** — this is your `ONEDRIVE_CLIENT_ID`.

## 3. Create a Client Secret

1. In the left sidebar click **Certificates & secrets**.
2. Under **Client secrets** click **+ New client secret**.
3. Enter a description (e.g. `dev`) and choose an expiry.
4. Click **Add**.
5. Copy the **Value** immediately — it will be hidden after you leave this page. This is your `ONEDRIVE_CLIENT_SECRET`.

## 4. Configure API Permissions

1. In the left sidebar click **API permissions**.
2. Click **+ Add a permission** and select **Microsoft Graph**.
3. Choose **Delegated permissions** and add the following:
   - `Files.ReadWrite`
   - `offline_access`
   - `User.Read`
4. Click **Add permissions**.
5. If you are an admin on the tenant, click **Grant admin consent** to avoid consent prompts during testing (optional).

## 5. Verify the Redirect URI

1. In the left sidebar click **Authentication**.
2. Confirm `http://localhost:3000/oauth/callback` appears under **Web > Redirect URIs**.
3. For production, add your production callback URL here as well.

## 6. Environment Configuration

Add the following keys to your `.env` file (`OAUTH_REDIRECT_URI` is shared across all providers — set it once):

```env
OAUTH_REDIRECT_URI="http://localhost:3000/oauth/callback"
ONEDRIVE_CLIENT_ID="your_application_client_id_here"
ONEDRIVE_CLIENT_SECRET="your_client_secret_value_here"
```
