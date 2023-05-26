import 'dotenv/config'
import express from 'express'

import handleEnsProfile from './handlers/ens-profile.js'
import handleBatchResolve from './handlers/batch-resolve.js'

const app = express()
app.use(express.json())

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Server listening on port ${port}`))

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

app.get('/:addressOrName', handleEnsProfile)
app.post('/batch', handleBatchResolve)
