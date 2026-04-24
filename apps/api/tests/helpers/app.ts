/**
 * Creates a test Express app with all routes mounted — identical to index.ts
 * except no app.listen() and no pino-http (to keep test output clean).
 */
import express from 'express'
import cors from 'cors'
import auth from '../../src/routes/auth'
import deploy from '../../src/routes/deploy'
import github from '../../src/routes/github'
import internal from '../../src/routes/internal'
import domains from '../../src/routes/domains'
import seeloudfn from '../../src/routes/seeloudfn'
import seeloudfnInvoke from '../../src/routes/seeloudfn-invoke'
import seeloudcron from '../../src/routes/seeloudcron'
import seeloudcronRuns from '../../src/routes/seeloudcron-runs'

const app = express()

app.use(cors({ origin: '*' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', auth)
app.use('/deploy', deploy)
app.use('/deploy/:projectId/domains', domains)
app.use('/internal', internal)
app.use('/api/seeloudfn', seeloudfn)
app.use('/api/seeloudcron/jobs', seeloudcron)
app.use('/api/seeloudcron/runs', seeloudcronRuns)
app.use('/seeloudfn', seeloudfnInvoke)
app.use('/', github)

export default app
