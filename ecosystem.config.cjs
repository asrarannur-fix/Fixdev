module.exports = {
  apps: [{
    name: 'fixdev-erp',
    script: 'dist/server.cjs',
    cwd: '/var/www/fixdev',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      DEV_PORT: 3001,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      ALLOW_DEV_API_TOKENS: 'false',
    },
    max_restarts: 20,
    min_uptime: '30s',
    restart_delay: 3000,
    exp_backoff_restart_delay: 2000,
    max_memory_restart: '500M',
    error_file: '/var/www/fixdev/logs/err.log',
    out_file: '/var/www/fixdev/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};
