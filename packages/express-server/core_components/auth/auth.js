var fs = require('fs')
const uuidv1 = require('uuid/v1')
// PASSPORT
// const cookieSession = require('cookie-session')
// const passport = require('passport')
// const LocalStrategy = require('passport-local').Strategy
// const publicRoot = '../react-client/public/'
// app.use(express.static(publicRoot))

const auth = function(app) {
  // GET PRIVATE CONFIGS
  var privateAuth = {users: [], session: undefined}

  try {
    global.USERS = JSON.parse(fs.readFileSync('../../private/auth.json', 'utf8')).users
  } catch(err) {
    global.USERS = []
  }
  var serverSession
  try {
    serverSession = JSON.parse(fs.readFileSync('../../private/auth.json', 'utf8')).session
  } catch(err) {
    serverSession = undefined
  }
  // END GET PRIVATE CONFIGS

  if (serverSession === undefined) {
    serverSession = {
      "name": uuidv1(),
      "keys": [uuidv1()],
      "maxAge": 86400000
    }
  }

  const cookieSession = require('cookie-session')
  const passport = require('passport')
  const LocalStrategy = require('passport-local').Strategy
  passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    (username, password, done) => {
      let user = global.USERS.find((user) => {
        return user.email === username && user.password === password
      })
      if (user) {
        done(null, user)
      } else {
        done(null, false, {message: 'Incorrect username or password'})
      }
    }
  ))
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })
  passport.deserializeUser((id, done) => {
    let user = global.USERS.find((user) => {
      return user.id === id
    })
    done(null, user)
  })
  app.use(cookieSession(serverSession))
  app.use(passport.initialize())
  app.use(passport.session())
  // try {
  //   global.USERS = require('../../private/auth.json')
  // } catch(err) {
  //   global.USERS = []
  // }
}

exports.auth = auth
