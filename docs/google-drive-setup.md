# Google Drive Setup — obtaining the credentials

How to create the Google Cloud OAuth client and get the values for the env vars
used by the "Move to cloud → Google Drive" feature (`GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_GOOGLE_REDIRECT_URI`).

See **[cloud-upload-design.md](./cloud-upload-design.md)** for the overall design, and
**[dropbox-setup.md](./dropbox-setup.md)** for the equivalent Dropbox setup — the two
providers share the same PKCE-popup + backend-relay flow and the same
`/oauth/callback` redirect route.

---

## 1. Project & API

1. Go to the **Google Cloud Console**: https://console.cloud.google.com/
2. Select (or create) the **Tubekeep** project. This can be the **same project** as the
   Google sign-in client (0XC-18) — one project, multiple OAuth clients is fine.
3. **APIs & Services → Library** → search **Google Drive API** → **Enable**.

## 2. OAuth consent screen

Under **APIs & Services → OAuth consent screen**:

1. **User type:** *External* (unless everyone is in a Google Workspace org).
2. Fill in app name (`Tubekeep`), support email, and developer contact.
3. **Scopes:** add exactly **`.../auth/drive.file`**
   (`https://www.googleapis.com/auth/drive.file`).
   - This is the **app-created-files-only** scope: Tubekeep can read/write only the files it
     creates, never the user's existing Drive. It is a **non-sensitive** scope, so it
     **avoids Google's sensitive-scope verification review**.
   - Do **not** add `drive`, `drive.readonly`, or any broader scope — those trigger the
     security-assessment review and widen the blast radius.
4. **Test users:** while the app is in *Testing*, add the Google accounts allowed to
   connect (see §6).

## 3. Create the OAuth client ID

Under **APIs & Services → Credentials → Create credentials → OAuth client ID**:

1. **Application type:** *Web application*.
2. **Name:** e.g. `Tubekeep Drive (web)`.
3. **Authorized JavaScript origins** — scheme + host only, **no path, no trailing slash**:

   ```
   https://tubekeep.app
   https://ytd.heidari.ca
   http://localhost:5173
   ```

4. **Authorized redirect URIs** — full URL including the `/oauth/callback` path
   (exact match; must be `https` except for `localhost`):

   ```
   https://tubekeep.app/oauth/callback
   https://ytd.heidari.ca/oauth/callback
   http://localhost:5173/oauth/callback
   ```

   - `localhost:5173` is the Vite dev server. In single-server/production mode the frontend
     is served from the backend on the same origin, so the domain URIs cover prod.
   - If you ever serve the app from `www.tubekeep.app`, add `https://www.tubekeep.app`
     (origin) **and** `https://www.tubekeep.app/oauth/callback` (redirect) too — Google
     matches exactly and does not treat `www` as equivalent.
   - Register only the hosts the app is actually reachable at; drop the ones you won't use.

5. **Create.** Copy the **Client ID** and **Client secret**.

## 4. Get the key and secret

- **Client ID** → `GOOGLE_CLIENT_ID` (backend) **and** `VITE_GOOGLE_CLIENT_ID` (frontend).
  The client ID is public; it's safe in the browser.
- **Client secret** → `GOOGLE_CLIENT_SECRET` (**backend only**, never ship to the browser).
  The PKCE popup completes the code/refresh exchange through the stateless backend relay
  (`/api/cloud/oauth/token`), so the secret stays on the server.

## 5. Redirect URI must match exactly

Whatever you register in §3 as the prod redirect URI must match `GOOGLE_REDIRECT_URI`
(backend) / `VITE_GOOGLE_REDIRECT_URI` (frontend) **exactly** — scheme, host, port, path.
Google rejects any mismatch with `redirect_uri_mismatch`.

## 6. Testing vs Production

- The consent screen starts in **Testing**: only the accounts listed under **Test users**
  can connect, and refresh tokens may expire after 7 days. Fine for building/testing.
- To let arbitrary visitors connect, **Publish app** on the consent screen. Because we only
  request the non-sensitive `drive.file` scope, publishing does **not** require Google's
  sensitive/restricted-scope verification — it goes live without the security review.

---

## Where each value goes

| Console value | Env var | Side | Secret? |
|---|---|---|---|
| Client ID     | `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` | backend + frontend | No |
| Client secret | `GOOGLE_CLIENT_SECRET` | backend only | **Yes** |
| Redirect URI  | `GOOGLE_REDIRECT_URI` + `VITE_GOOGLE_REDIRECT_URI` | backend + frontend | No |

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
