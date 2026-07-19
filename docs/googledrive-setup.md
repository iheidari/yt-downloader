# Google Drive Setup — obtaining the credentials

How to create the Google Cloud OAuth client and get the values for the env vars
used by the "Move to cloud → Google Drive" feature (`GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_GOOGLE_REDIRECT_URI`).

See **[cloud-upload-design.md](./cloud-upload-design.md)** for the overall design
and **[dropbox-setup.md](./dropbox-setup.md)** for the sibling Dropbox provider.

---

## 1. Create a Google Cloud project

1. Go to the **Google Cloud Console**: https://console.cloud.google.com/
2. Create a new project (e.g. `Tubekeep`) or reuse an existing one. This may be
   the **same project** as the "Sign in with Google" client if you have one —
   OAuth clients are per-project, credentials are per-client.

## 2. Enable the Drive API

1. **APIs & Services → Library**.
2. Search for **Google Drive API** and click **Enable**.

## 3. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. **User type: External** (so any Google user can connect), then **Create**.
3. Fill in the app name, support email, and developer contact. Logo/homepage are
   optional while in testing.
4. **Scopes:** add exactly **`.../auth/drive.file`**
   (`https://www.googleapis.com/auth/drive.file`).
   - This is the **non-sensitive** Drive scope: Tubekeep can only see and manage
     files **it created**. It deliberately avoids the broad `drive` scope, which
     is *restricted* and would trigger Google's CASA security assessment.
5. Save. While the app is in **Testing**, add the Google accounts that may
   connect under **Test users** (up to 100). To open it to everyone, **Publish
   app** — a `drive.file`-only app needs no verification review.

## 4. Create the OAuth client credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. **Application type: Web application.**
3. **Authorized JavaScript origins** — add the app origins:
   - Production: `https://<your-host>`
   - Local dev: `http://localhost:5173`
4. **Authorized redirect URIs** — add **exact-match** URLs:
   - Production: `https://<your-host>/oauth/callback`
   - Local dev: `http://localhost:5173/oauth/callback`

   These must match `GOOGLE_REDIRECT_URI` / `VITE_GOOGLE_REDIRECT_URI` exactly
   (scheme, host, port, path). Google rejects mismatches.
5. **Create.** The dialog shows the **Client ID** and **Client secret**.

> We use **PKCE** from the browser popup plus a stateless backend relay for the
> code/refresh exchange, so the client secret stays on the server.

## 5. Refresh tokens

- The connect flow requests `access_type=offline` and `prompt=consent`, so the
  browser receives a **refresh token** to mint new short-lived access tokens.
- Access tokens last ~1 hour; the refresh token is long-lived and held only in
  the visitor's browser `sessionStorage` (nothing is persisted server-side).

---

## Where each value goes

| Console value | Env var | Side | Secret? |
|---|---|---|---|
| Client ID | `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` | backend + frontend | No |
| Client secret | `GOOGLE_CLIENT_SECRET` | backend only | **Yes** |
| Redirect URI | `GOOGLE_REDIRECT_URI` + `VITE_GOOGLE_REDIRECT_URI` | backend + frontend | No |

```
# backend/.env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://<your-host>/oauth/callback
# Optional — destination folder name in the user's My Drive (default "Tubekeep").
GOOGLE_DRIVE_FOLDER=Tubekeep

# frontend/.env (only to OVERRIDE the values the backend already publishes)
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_REDIRECT_URI=https://<your-host>/oauth/callback
```

Never commit `.env` or the client secret. The secret must exist only on the backend.
Uploaded files land in a dedicated **Tubekeep** folder in the user's My Drive; the
`drive.file` scope means Tubekeep can never see the rest of their Drive.
