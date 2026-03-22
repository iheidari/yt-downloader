# SSH Key Setup for GitHub Actions Deployment

This guide walks you through setting up SSH key authentication so GitHub Actions can deploy to your server automatically.

---

## 🔑 Step 1: Generate SSH Key Pair (on your local machine)

If you don't already have an SSH key for GitHub Actions, generate one:

```bash
# Generate a new SSH key (don't use your personal key for security)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions-deploy

# When prompted for a passphrase, just press Enter (no passphrase for CI/CD)
```

This creates two files:
- `~/.ssh/github-actions-deploy` - **Private key** (keep secret!)
- `~/.ssh/github-actions-deploy.pub` - **Public key** (goes on server)

---

## 🖥️ Step 2: Add Public Key to Your Server

Copy the public key to your server's authorized_keys:

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/github-actions-deploy.pub user@your-server-ip

# Or manually:
cat ~/.ssh/github-actions-deploy.pub | ssh user@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

---

## 🔐 Step 3: Add Private Key to GitHub Secrets

1. Go to your GitHub repository: `https://github.com/iheidari/yt-downloader`

2. Navigate to: **Settings → Secrets and variables → Actions**

3. Click **New repository secret**

4. Add these three secrets:

### Secret 1: SSH_PRIVATE_KEY
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: Copy the entire content of `~/.ssh/github-actions-deploy` including:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```

### Secret 2: SERVER_HOST
- **Name**: `SERVER_HOST`
- **Value**: Your server's IP address or hostname (e.g., `192.168.1.100` or `your-server.com`)

### Secret 3: SERVER_USER
- **Name**: `SERVER_USER`
- **Value**: Your SSH username (e.g., `root`, `ubuntu`, `deploy`)

---

## 🧪 Step 4: Test SSH Connection

From your local machine:

```bash
# Test the connection
ssh -i ~/.ssh/github-actions-deploy user@your-server-ip

# Should log in without password prompt
```

---

## 🚀 Step 5: Deploy!

Once secrets are set, simply push to main:

```bash
git push origin main
```

GitHub Actions will automatically deploy to your server!

---

## 🔒 Security Best Practices

1. **Use a dedicated key** - Don't use your personal SSH key for CI/CD
2. **Limit key permissions** - The GitHub Actions key should only deploy, not have full server access
3. **Restrict to specific commands** (optional advanced):
   ```bash
   # On server, edit ~/.ssh/authorized_keys to restrict this key:
   command="/data/ytl/deploy/deploy-hook.sh",no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAA... github-actions-deploy
   ```

4. **Rotate keys periodically** - Generate new keys every 6-12 months

---

## 🐛 Troubleshooting

### "Permission denied (publickey)"
```bash
# Check SSH key is added
ssh-add -l

# If not listed, add it
ssh-add ~/.ssh/github-actions-deploy

# Verify key permissions (should be 600)
chmod 600 ~/.ssh/github-actions-deploy
chmod 644 ~/.ssh/github-actions-deploy.pub
```

### GitHub Actions fails with SSH error
1. Verify secrets are correctly entered in GitHub (no extra spaces)
2. Ensure the private key includes `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`
3. Test the key manually: `ssh -i ~/.ssh/github-actions-deploy user@server`

### "Host key verification failed"
The server's host key changed. Update known_hosts on GitHub Actions runner (handled automatically by the workflow using `appleboy/ssh-action` which ignores host key checking for CI/CD).

---

## ✅ Quick Checklist

- [ ] Generated SSH key pair: `ssh-keygen -t ed25519 -C "github-actions-deploy"`
- [ ] Copied public key to server: `ssh-copy-id -i ...`
- [ ] Added `SSH_PRIVATE_KEY` to GitHub Secrets
- [ ] Added `SERVER_HOST` to GitHub Secrets  
- [ ] Added `SERVER_USER` to GitHub Secrets
- [ ] Tested SSH connection manually
- [ ] Pushed to main branch to trigger deployment

---

## 📞 Support

If deployment fails, check:
1. GitHub Actions logs: Go to your repo → Actions tab → Click failed run
2. Server logs: `ssh user@server "pm2 logs"`
3. Caddy status: `ssh user@server "sudo systemctl status caddy"`
