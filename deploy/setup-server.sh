#!/bin/bash
set -e

echo "🚀 Setting up YT Downloader server on ytd.heidari.ca..."
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update

# Install Node.js 22.x (Latest LTS)
echo "⬢ Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js installed: $NODE_VERSION"

# Install yt-dlp
echo "⬇️  Installing yt-dlp..."
sudo apt install -y yt-dlp

# Verify yt-dlp
YT_DLP_VERSION=$(yt-dlp --version)
echo "✅ yt-dlp installed: $YT_DLP_VERSION"

# Install PM2 globally
echo "⚙️  Installing PM2..."
sudo npm install -g pm2

# Install Caddy
echo "🌐 Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# Create directory structure
echo "📁 Creating directory structure..."
sudo mkdir -p /data/ytl
sudo mkdir -p /data/ytl/logs
sudo mkdir -p /data/ytl/backend/downloads
sudo chown -R $USER:$USER /data/ytl

# Setup PM2 to start on boot
echo "🔧 Configuring PM2 startup..."
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "✅ Server setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Add these GitHub Secrets to your repository:"
echo "      - SERVER_HOST (your server IP or hostname)"
echo "      - SERVER_USER (your SSH username)"
echo "      - SSH_PRIVATE_KEY (your SSH private key)"
echo ""
echo "   2. See deploy/SSH_SETUP.md for detailed SSH key instructions"
echo ""
echo "   3. Push code to GitHub (main branch) - it will auto-deploy!"
echo ""
echo "🌐 Domain will be available at: https://ytd.heidari.ca"
echo ""
echo "Useful commands:"
echo "   pm2 logs yt-downloader-api     - View API logs"
echo "   pm2 monit                      - Monitor processes"
echo "   pm2 status                     - Check status"
echo "   sudo systemctl status caddy    - Check Caddy status"
echo "   sudo caddy reload              - Reload Caddy config"
