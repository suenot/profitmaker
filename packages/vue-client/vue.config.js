var target = process.env.DOCKER === 'DOCKER' ? 'http://kupi-server:8040/' : 'http://localhost:8040/'
console.log(process.env.DOCKER)
module.exports = {
  devServer: {
    proxy: {
      '^/user-api': {
        target: target,
        ws: true,
        changeOrigin: true
      },
      '^/api': {
        target: 'http://localhost:8051/',
        ws: true,
        changeOrigin: true
      },
    }
  },
  pluginOptions: {
    electronBuilder: {
      nodeModulesPath: ['./node_modules', '../../node_modules/', '../express-server/node_modules/']
    }
  }
}
