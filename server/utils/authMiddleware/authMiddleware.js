const authMiddleware = (req, res, next) => {
  console.log(req.isAuthenticated())
  if (!req.isAuthenticated()) {
    res.status(401).send('You are not authenticated')
  } else {
    return next()
  }
}

exports.authMiddleware = authMiddleware
