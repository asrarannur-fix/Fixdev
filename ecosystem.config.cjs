module.exports = {
  apps: [{
    name: 'fixdev-erp',
    script: 'dist/server.cjs',
    cwd: '/home/ubuntu/barufix',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_restarts: 20,
    min_uptime: '30s',
    restart_delay: 3000,
    exp_backoff_restart_delay: 2000,
    max_memory_restart: '500M',
    error_file: '/home/ubuntu/barufix/logs/err.log',
    out_file: '/home/ubuntu/barufix/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};
