module.exports = {
  apps: [
    {
      name: 'opo-backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
    },
  ],
};
