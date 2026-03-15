import cors from 'cors'
import express from 'express'
import { authRouter } from './auth/routes.js'
import { bookRouter } from './book/routes.js'
import { chatRouter } from './chat/routes.js'
import { parseRouter } from './parse/routes.js'

const app = express()
const PORT = Number(process.env.PORT) || 3002

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/books', bookRouter)
app.use('/api/books', chatRouter)
app.use('/api/parse', parseRouter)

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}...`)
    server.close()
    app.listen(PORT + 1, () => {
      console.log(`Server running on http://localhost:${PORT + 1}`)
    })
  }
})
