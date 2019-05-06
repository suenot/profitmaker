const express = require('express')
var router = express.Router()

router.get('/some/', async function (req, res) {
  try {
    res.json('some')
  } catch (err) {}
})

module.exports = router
