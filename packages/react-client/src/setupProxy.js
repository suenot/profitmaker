const proxy = require('http-proxy-middleware')

module.exports = function(app) {
  if (process.env.DOCKER === 'DOCKER') {
    app.use(proxy('/user-api', { target: 'http://kupi-server:8040/' }))
  } else {
    app.use(proxy('/user-api', { target: 'http://localhost:8040/' }))
  }
}
