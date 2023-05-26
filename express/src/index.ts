import 'dotenv/config'
import express from 'express'

import { getEnsProfile } from './handlers/ens-profile.js'
import { batchResolve } from './handlers/batch-resolve.js'

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

app.get('/:addressOrName', getEnsProfile)
app.post('/batch', batchResolve)
