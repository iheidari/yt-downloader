// Shared helpers for cloud providers (Dropbox, Google Drive, ...): the
// classified error type, the OAuth token-endpoint POST, the transient-failure
// retry wrapper, and the refresh-token shell every provider's exchange/upload
// path builds on.

// A CloudError carries a machine-readable `code` so the route/UI can react
// (e.g. quota → offer "download instead", auth → prompt reconnect). `status`
// (when set) is the originating HTTP status, used to decide retry-ability.
class CloudError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// POST a token-endpoint request (authorization_code or refresh_token grant)
// and throw a classified CloudError with the provider's opaque error slug on
// failure. `errorLabel` names the provider in the thrown message (e.g. "Dropbox").
async function postToken(endpoint, params, errorLabel) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Never log the code/verifier/token; only the opaque provider error slug.
    const slug = body.error_description || body.error || `HTTP ${res.status}`;
    throw new CloudError('oauth', `${errorLabel} token exchange failed: ${slug}`);
  }
  return body;
}

// refresh-token → fresh access token. Neither provider rotates the refresh
// token, and both post the same four fields to their own token endpoint.
async function refresh({ endpoint, refreshToken, clientId, clientSecret, errorLabel }) {
  const body = await postToken(
    endpoint,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    },
    errorLabel,
  );
  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in || null,
  };
}

// Retry a request on transient (5xx / network) failures only; auth and quota
// errors are terminal and must surface immediately. A cancelled upload is
// terminal too — surfaced as a classified CloudError rather than retrying the
// raw fetch AbortError (a DOMException with no `.status`, which would
// otherwise look transient).
async function withRetry(fn, { signal }) {
  const MAX = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    if (signal?.aborted) throw new CloudError('aborted', 'Upload cancelled');
    try {
      return await fn();
    } catch (err) {
      if (signal?.aborted || err?.name === 'AbortError' || err?.code === 'aborted') {
        throw err instanceof CloudError ? err : new CloudError('aborted', 'Upload cancelled');
      }
      const status = err?.status;
      const transient = !status || status >= 500; // no status → network throw
      lastErr = err;
      if (!transient || attempt === MAX) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
  }
  throw lastErr;
}

module.exports = { CloudError, postToken, refresh, withRetry };
