module.exports = {
  apps: [{
    name: 'yt-downloader-api',
    script: './src/server.js',
    cwd: '/data/ytd/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      FRONTEND_URL: 'https://ytd.heidari.ca'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      FRONTEND_URL: 'https://ytd.heidari.ca',
      PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`
    },
    error_file: '/data/ytd/logs/api-error.log',
    out_file: '/data/ytd/logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    max_memory_restart: '500M',
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Graceful shutdown
    shutdown_with_message: true,
    // Health monitoring
    instances: 1,
    // Logging
    log_type: 'json',
    // Auto restart on failure
    exp_backoff_restart_delay: 100
  }]
}
