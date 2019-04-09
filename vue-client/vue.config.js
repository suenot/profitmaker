module.exports = {
  devServer: {
    proxy: {
      '^/user-api': {
        target: 'http://localhost:8040/',
        ws: true,
        changeOrigin: true
      },
      '^/api': {
        target: 'http://localhost:8051/',
        ws: true,
        changeOrigin: true
      },
    }
  }
}
