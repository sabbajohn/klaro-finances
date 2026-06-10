import express from 'express'
import session from 'express-session'
import FileStoreFactory from 'session-file-store'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createIncome,
  createExpense,
  createGoal,
  deleteExpense,
  getSummary,
  getUserSettings,
  getUserByCredentials,
  getUserById,
  listExpenses,
  listGoals,
  listIncomes,
  updateGoal,
  updateUserSettings,
} from './db.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(rootDir, 'data')
const sessionDir = path.join(dataDir, 'sessions')
const PORT = Number(process.env.PORT || 54018)
const SESSION_SECRET = process.env.SESSION_SECRET || 'klaro-mobile-prototype'
const IS_PROD = process.env.NODE_ENV === 'production'
const FileStore = FileStoreFactory(session)

fs.mkdirSync(sessionDir, { recursive: true })

if (IS_PROD) {
  app.set('trust proxy', 1)
}

app.use(express.json())
app.use(
  session({
    secret: SESSION_SECRET,
    proxy: true,
    resave: false,
    saveUninitialized: false,
    store: new FileStore({
      path: sessionDir,
      retries: 0,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD ? 'auto' : false,
      maxAge: 1000 * 60 * 60 * 12,
    },
  }),
)

function ensureAuth(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Sessao expirada.' })
    return
  }

  next()
}

function serializeUser(userId) {
  const user = getUserById(userId)
  const expenses = listExpenses(userId)
  const incomes = listIncomes(userId)
  const goals = listGoals(userId)
  const settings = getUserSettings(userId)
  const summary = getSummary(userId)

  return { user, expenses, incomes, goals, settings, summary }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/session', (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ message: 'Nao autenticado.' })
    return
  }

  res.json(serializeUser(req.session.userId))
})

app.post('/api/login', (req, res) => {
  const email = `${req.body.email ?? ''}`.trim().toLowerCase()
  const pin = `${req.body.pin ?? ''}`.trim()

  if (!email || !pin) {
    res.status(400).json({ message: 'Preencha email e PIN.' })
    return
  }

  const user = getUserByCredentials(email, pin)

  if (!user) {
    res.status(401).json({ message: 'Credenciais invalidas.' })
    return
  }

  req.session.userId = user.id
  res.json(serializeUser(user.id))
})

app.post('/api/logout', ensureAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true })
  })
})

app.get('/api/expenses', ensureAuth, (req, res) => {
  res.json({
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    settings: getUserSettings(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

app.post('/api/expenses', ensureAuth, (req, res) => {
  const title = `${req.body.title ?? ''}`.trim()
  const category = `${req.body.category ?? ''}`.trim()
  const spentOn = `${req.body.spentOn ?? ''}`.trim()
  const notes = `${req.body.notes ?? ''}`.trim()
  const amount = Number(req.body.amount)
  const recurring = Boolean(req.body.recurring)

  if (!title || !category || !spentOn || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ message: 'Dados da despesa incompletos.' })
    return
  }

  const expense = createExpense(req.session.userId, {
    title,
    category,
    spentOn,
    notes,
    recurring,
    amount: Number(amount.toFixed(2)),
  })

  res.status(201).json({
    expense,
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    settings: getUserSettings(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

app.delete('/api/expenses/:expenseId', ensureAuth, (req, res) => {
  const expenseId = Number(req.params.expenseId)

  if (!Number.isInteger(expenseId) || expenseId <= 0) {
    res.status(400).json({ message: 'Despesa inválida.' })
    return
  }

  const deleted = deleteExpense(req.session.userId, expenseId)

  if (!deleted) {
    res.status(404).json({ message: 'Despesa não encontrada.' })
    return
  }

  res.json({
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    settings: getUserSettings(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

app.post('/api/incomes', ensureAuth, (req, res) => {
  const title = `${req.body.title ?? ''}`.trim()
  const receivedOn = `${req.body.receivedOn ?? ''}`.trim()
  const notes = `${req.body.notes ?? ''}`.trim()
  const amount = Number(req.body.amount)

  if (!title || !receivedOn || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ message: 'Dados da entrada incompletos.' })
    return
  }

  const income = createIncome(req.session.userId, {
    title,
    receivedOn,
    notes,
    amount: Number(amount.toFixed(2)),
  })

  res.status(201).json({
    income,
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    settings: getUserSettings(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

app.post('/api/goals', ensureAuth, (req, res) => {
  const title = `${req.body.title ?? ''}`.trim()
  const dueDate = `${req.body.dueDate ?? ''}`.trim()
  const targetAmount = Number(req.body.targetAmount)
  const currentAmount = Number(req.body.currentAmount ?? 0)

  if (!title || !dueDate || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    res.status(400).json({ message: 'Dados da meta incompletos.' })
    return
  }

  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    res.status(400).json({ message: 'Valor atual da meta inválido.' })
    return
  }

  const goal = createGoal(req.session.userId, {
    title,
    dueDate,
    targetAmount: Number(targetAmount.toFixed(2)),
    currentAmount: Number(currentAmount.toFixed(2)),
  })

  res.status(201).json({
    goal,
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    settings: getUserSettings(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

app.put('/api/goals/:goalId', ensureAuth, (req, res) => {
  const goalId = Number(req.params.goalId)
  const currentAmount = Number(req.body.currentAmount)

  if (!Number.isInteger(goalId) || goalId <= 0) {
    res.status(400).json({ message: 'Meta inválida.' })
    return
  }

  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    res.status(400).json({ message: 'Progresso da meta inválido.' })
    return
  }

  const goal = updateGoal(req.session.userId, goalId, {
    currentAmount: Number(currentAmount.toFixed(2)),
  })

  if (!goal) {
    res.status(404).json({ message: 'Meta não encontrada.' })
    return
  }

  res.json({
    goal,
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    settings: getUserSettings(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

app.put('/api/settings', ensureAuth, (req, res) => {
  const monthlyBudget = Number(req.body.monthlyBudget)

  if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    res.status(400).json({ message: 'Orçamento mensal inválido.' })
    return
  }

  const settings = updateUserSettings(req.session.userId, {
    monthlyBudget: Number(monthlyBudget.toFixed(2)),
  })

  res.json({
    settings,
    expenses: listExpenses(req.session.userId),
    incomes: listIncomes(req.session.userId),
    goals: listGoals(req.session.userId),
    summary: getSummary(req.session.userId),
  })
})

if (IS_PROD) {
  app.use(express.static(distDir))

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Klaro em http://0.0.0.0:${PORT}`)
})
