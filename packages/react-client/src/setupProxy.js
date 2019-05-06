const proxy = require('http-proxy-middleware')

module.exports = function(app) {
  app.use(proxy('/user-api', { target: 'http://localhost:8040/' }))
}
