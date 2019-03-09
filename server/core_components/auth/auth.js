// PASSPORT
// const cookieSession = require('cookie-session')
// const passport = require('passport')
// const LocalStrategy = require('passport-local').Strategy
// const publicRoot = '../react-client/public/'
// app.use(express.static(publicRoot))

const auth = function(app) {
  try {
    global.USERS = require('../../../private/auth.json')
  } catch(err) {
    global.USERS = []
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
  app.use(cookieSession({
    name: 'mysession',
    keys: ['authrandomkey'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }))
  app.use(passport.initialize())
  app.use(passport.session())
  // try {
  //   global.USERS = require('../private/auth.json')
  // } catch(err) {
  //   global.USERS = []
  // }
}

exports.auth = auth
