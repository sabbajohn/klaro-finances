import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data')
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(dataDir, 'klaro.sqlite')

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    pin TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    spent_on TEXT NOT NULL,
    recurring INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    monthly_budget REAL NOT NULL DEFAULT 3200,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    received_on TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`)

const expenseColumns = db.prepare('PRAGMA table_info(expenses)').all()
if (!expenseColumns.some((column) => column.name === 'recurring')) {
  db.exec('ALTER TABLE expenses ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0')
}

const seedUser = db
  .prepare('INSERT OR IGNORE INTO users (name, email, pin) VALUES (?, ?, ?)')
  .run('Lara Menezes', 'demo@klaro.app', '1234')

const user = db
  .prepare('SELECT id, name, email FROM users WHERE email = ?')
  .get('demo@klaro.app')

const expenseCount = db
  .prepare('SELECT COUNT(*) AS total FROM expenses WHERE user_id = ?')
  .get(user.id)

db.prepare(`
  INSERT OR IGNORE INTO user_settings (user_id, monthly_budget)
  VALUES (?, ?)
`).run(user.id, 3200)

if (!expenseCount.total) {
  const insertExpense = db.prepare(`
    INSERT INTO expenses (user_id, title, amount, category, spent_on, recurring, notes)
    VALUES (@user_id, @title, @amount, @category, @spent_on, @recurring, @notes)
  `)

  const seedExpenses = [
    {
      user_id: user.id,
      title: 'Mercado Extra',
      amount: 87.3,
      category: 'Alimentação',
      spent_on: '2026-06-02',
      recurring: 0,
      notes: 'Compra do dia',
    },
    {
      user_id: user.id,
      title: 'Uber',
      amount: 18.9,
      category: 'Transporte',
      spent_on: '2026-06-02',
      recurring: 0,
      notes: 'Corrida curta',
    },
    {
      user_id: user.id,
      title: 'Farmácia Nissei',
      amount: 42.5,
      category: 'Saúde',
      spent_on: '2026-06-01',
      recurring: 1,
      notes: 'Medicamentos',
    },
    {
      user_id: user.id,
      title: 'iFood',
      amount: 34.5,
      category: 'Alimentação',
      spent_on: '2026-06-01',
      recurring: 0,
      notes: 'Jantar',
    },
    {
      user_id: user.id,
      title: 'Passagem Metrô',
      amount: 4.4,
      category: 'Transporte',
      spent_on: '2026-01-13',
      recurring: 1,
      notes: 'Deslocamento',
    },
    {
      user_id: user.id,
      title: 'Natura',
      amount: 89.9,
      category: 'Pessoal',
      spent_on: '2026-01-13',
      recurring: 0,
      notes: 'Compra pessoal',
    },
  ]

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertExpense.run(row)
    }
  })

  insertMany(seedExpenses)
}

const incomeCount = db
  .prepare('SELECT COUNT(*) AS total FROM incomes WHERE user_id = ?')
  .get(user.id)

if (!incomeCount.total) {
  const insertIncome = db.prepare(`
    INSERT INTO incomes (user_id, title, amount, received_on, notes)
    VALUES (@user_id, @title, @amount, @received_on, @notes)
  `)

  insertIncome.run({
    user_id: user.id,
    title: 'Salário principal',
    amount: 5400,
    received_on: '2026-06-01',
    notes: 'Entrada mensal',
  })

  insertIncome.run({
    user_id: user.id,
    title: 'Freela',
    amount: 850,
    received_on: '2026-06-02',
    notes: 'Projeto entregue',
  })
}

const goalCount = db
  .prepare('SELECT COUNT(*) AS total FROM goals WHERE user_id = ?')
  .get(user.id)

if (!goalCount.total) {
  db.prepare(`
    INSERT INTO goals (user_id, title, target_amount, current_amount, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user.id, 'Reserva de emergência', 3000, 1250, '2026-07-31', 'active')
}

export function getUserByCredentials(email, pin) {
  return db
    .prepare('SELECT id, name, email FROM users WHERE email = ? AND pin = ?')
    .get(email, pin)
}

export function getUserById(id) {
  return db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id)
}

export function listExpenses(userId) {
  return db
    .prepare(`
      SELECT id, title, amount, category, spent_on AS spentOn, recurring, notes, created_at AS createdAt
      FROM expenses
      WHERE user_id = ?
      ORDER BY spent_on DESC, id DESC
    `)
    .all(userId)
}

export function createExpense(userId, payload) {
  const result = db
    .prepare(`
      INSERT INTO expenses (user_id, title, amount, category, spent_on, recurring, notes)
      VALUES (@user_id, @title, @amount, @category, @spent_on, @recurring, @notes)
    `)
    .run({
      user_id: userId,
      title: payload.title,
      amount: payload.amount,
      category: payload.category,
      spent_on: payload.spentOn,
      recurring: payload.recurring ? 1 : 0,
      notes: payload.notes ?? '',
    })

  return db
    .prepare(`
      SELECT id, title, amount, category, spent_on AS spentOn, recurring, notes, created_at AS createdAt
      FROM expenses
      WHERE id = ?
    `)
    .get(result.lastInsertRowid)
}

export function listIncomes(userId) {
  return db
    .prepare(`
      SELECT id, title, amount, received_on AS receivedOn, notes, created_at AS createdAt
      FROM incomes
      WHERE user_id = ?
      ORDER BY received_on DESC, id DESC
    `)
    .all(userId)
}

export function createIncome(userId, payload) {
  const result = db
    .prepare(`
      INSERT INTO incomes (user_id, title, amount, received_on, notes)
      VALUES (@user_id, @title, @amount, @received_on, @notes)
    `)
    .run({
      user_id: userId,
      title: payload.title,
      amount: payload.amount,
      received_on: payload.receivedOn,
      notes: payload.notes ?? '',
    })

  return db
    .prepare(`
      SELECT id, title, amount, received_on AS receivedOn, notes, created_at AS createdAt
      FROM incomes
      WHERE id = ?
    `)
    .get(result.lastInsertRowid)
}

export function listGoals(userId) {
  return db
    .prepare(`
      SELECT
        id,
        title,
        target_amount AS targetAmount,
        current_amount AS currentAmount,
        due_date AS dueDate,
        status,
        created_at AS createdAt
      FROM goals
      WHERE user_id = ?
      ORDER BY
        CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
        due_date ASC,
        id DESC
    `)
    .all(userId)
}

export function createGoal(userId, payload) {
  const status = payload.currentAmount >= payload.targetAmount ? 'completed' : 'active'

  const result = db
    .prepare(`
      INSERT INTO goals (user_id, title, target_amount, current_amount, due_date, status)
      VALUES (@user_id, @title, @target_amount, @current_amount, @due_date, @status)
    `)
    .run({
      user_id: userId,
      title: payload.title,
      target_amount: payload.targetAmount,
      current_amount: payload.currentAmount,
      due_date: payload.dueDate,
      status,
    })

  return db
    .prepare(`
      SELECT
        id,
        title,
        target_amount AS targetAmount,
        current_amount AS currentAmount,
        due_date AS dueDate,
        status,
        created_at AS createdAt
      FROM goals
      WHERE id = ?
    `)
    .get(result.lastInsertRowid)
}

export function updateGoal(userId, goalId, payload) {
  const goal = db
    .prepare(`
      SELECT id, title, target_amount AS targetAmount, current_amount AS currentAmount, due_date AS dueDate
      FROM goals
      WHERE id = ? AND user_id = ?
    `)
    .get(goalId, userId)

  if (!goal) {
    return null
  }

  const nextCurrentAmount = payload.currentAmount
  const status = nextCurrentAmount >= goal.targetAmount ? 'completed' : 'active'

  db.prepare(`
    UPDATE goals
    SET current_amount = @current_amount, status = @status
    WHERE id = @id AND user_id = @user_id
  `).run({
    id: goalId,
    user_id: userId,
    current_amount: nextCurrentAmount,
    status,
  })

  return db
    .prepare(`
      SELECT
        id,
        title,
        target_amount AS targetAmount,
        current_amount AS currentAmount,
        due_date AS dueDate,
        status,
        created_at AS createdAt
      FROM goals
      WHERE id = ?
    `)
    .get(goalId)
}

export function getUserSettings(userId) {
  return db
    .prepare(`
      SELECT monthly_budget AS monthlyBudget
      FROM user_settings
      WHERE user_id = ?
    `)
    .get(userId)
}

export function updateUserSettings(userId, payload) {
  db.prepare(`
    INSERT INTO user_settings (user_id, monthly_budget)
    VALUES (@user_id, @monthly_budget)
    ON CONFLICT(user_id) DO UPDATE SET monthly_budget = excluded.monthly_budget
  `).run({
    user_id: userId,
    monthly_budget: payload.monthlyBudget,
  })

  return getUserSettings(userId)
}

export function getSummary(userId) {
  const settings = getUserSettings(userId)
  const totals = db
    .prepare(`
      SELECT
        COUNT(*) AS expenseCount,
        ROUND(COALESCE(SUM(amount), 0), 2) AS totalSpent,
        SUM(CASE WHEN recurring = 1 THEN 1 ELSE 0 END) AS recurringExpenseCount
      FROM expenses
      WHERE user_id = ?
    `)
    .get(userId)

  const incomes = db
    .prepare(`
      SELECT ROUND(COALESCE(SUM(amount), 0), 2) AS totalIncome
      FROM incomes
      WHERE user_id = ?
    `)
    .get(userId)

  const byCategory = db
    .prepare(`
      SELECT
        category,
        ROUND(SUM(amount), 2) AS total
      FROM expenses
      WHERE user_id = ?
      GROUP BY category
      ORDER BY total DESC
      LIMIT 4
    `)
    .all(userId)

  const latest = db
    .prepare(`
      SELECT ROUND(amount, 2) AS amount
      FROM expenses
      WHERE user_id = ?
      ORDER BY spent_on DESC, id DESC
      LIMIT 1
    `)
    .get(userId)

  const goalStats = db
    .prepare(`
      SELECT
        COUNT(*) AS goalCount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedGoalCount
      FROM goals
      WHERE user_id = ?
    `)
    .get(userId)

  return {
    expenseCount: totals.expenseCount,
    totalSpent: totals.totalSpent,
    totalIncome: incomes.totalIncome,
    remainingBudget: Number((settings.monthlyBudget - totals.totalSpent).toFixed(2)),
    recurringExpenseCount: totals.recurringExpenseCount,
    goalCount: goalStats.goalCount,
    completedGoalCount: goalStats.completedGoalCount,
    latestExpenseAmount: latest?.amount ?? 0,
    byCategory,
  }
}
