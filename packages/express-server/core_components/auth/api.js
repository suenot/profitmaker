const express = require('express')
const passport = require('passport')
const router = express.Router()
const {authMiddleware} = require('../../utils/authMiddleware/authMiddleware.js')

router.get('/accounts', authMiddleware, function (req, res) {
  try {
    res.json(global.ACCOUNTS)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post("/login", (req, res, next) => {
  console.log('login')
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.log(err)
      return next(err)
    }
    if (!user) {
      console.log("Cannot log in")
      return res.status(400).send([user, "Cannot log in", info])
    }
    req.login(user, (err) => {
      console.log("Logged in")
      res.send("Logged in")
    })
  })(req, res, next)
})

router.get('/logout', authMiddleware, function(req, res){
  req.logout()
  console.log("logged out")
  return res.send()
})

router.get("/user", authMiddleware, (req, res) => {
  let user = global.USERS.find((user) => {
    return user.id === req.session.passport.user
  })
  user = {
    id: user.id,
    name: user.name,
    email: user.email
  }
  res.send(user)
})


module.exports = router
