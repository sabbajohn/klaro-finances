import { computed, reactive } from 'vue'
import * as api from '../api'

export const sessionState = reactive({
  booting: true,
  authenticating: false,
  user: null,
  expenses: [],
  incomes: [],
  goals: [],
  settings: {
    monthlyBudget: 3200,
  },
  summary: {
    expenseCount: 0,
    totalSpent: 0,
    totalIncome: 0,
    remainingBudget: 0,
    recurringExpenseCount: 0,
    latestExpenseAmount: 0,
    byCategory: [],
  },
})

export const isAuthenticated = computed(() => Boolean(sessionState.user))

function applyPayload(payload) {
  sessionState.user = payload.user
  sessionState.expenses = payload.expenses
  sessionState.incomes = payload.incomes
  sessionState.goals = payload.goals
  sessionState.settings = payload.settings
  sessionState.summary = payload.summary
}

export async function bootstrapSession() {
  if (!sessionState.booting) {
    return
  }

  try {
    const payload = await api.restoreSession()
    applyPayload(payload)
  } catch {
    sessionState.user = null
  } finally {
    sessionState.booting = false
  }
}

export async function signIn(credentials) {
  sessionState.authenticating = true

  try {
    const payload = await api.login(credentials)
    applyPayload(payload)
  } finally {
    sessionState.authenticating = false
  }
}

export async function signOut() {
  await api.logout()
  sessionState.user = null
  sessionState.expenses = []
  sessionState.incomes = []
  sessionState.goals = []
  sessionState.settings = {
    monthlyBudget: 3200,
  }
  sessionState.summary = {
    expenseCount: 0,
    totalSpent: 0,
    totalIncome: 0,
    remainingBudget: 0,
    recurringExpenseCount: 0,
    latestExpenseAmount: 0,
    byCategory: [],
  }
}

export async function addExpense(payload) {
  const response = await api.createExpense(payload)
  sessionState.expenses = response.expenses
  sessionState.incomes = response.incomes
  sessionState.goals = response.goals
  sessionState.settings = response.settings
  sessionState.summary = response.summary
  return response.expense
}

export async function deleteExpense(expenseId) {
  const response = await api.deleteExpense(expenseId)
  sessionState.expenses = response.expenses
  sessionState.incomes = response.incomes
  sessionState.goals = response.goals
  sessionState.settings = response.settings
  sessionState.summary = response.summary
  return response
}

export async function addIncome(payload) {
  const response = await api.createIncome(payload)
  sessionState.expenses = response.expenses
  sessionState.incomes = response.incomes
  sessionState.goals = response.goals
  sessionState.settings = response.settings
  sessionState.summary = response.summary
  return response.income
}

export async function addGoal(payload) {
  const response = await api.createGoal(payload)
  sessionState.expenses = response.expenses
  sessionState.incomes = response.incomes
  sessionState.goals = response.goals
  sessionState.settings = response.settings
  sessionState.summary = response.summary
  return response.goal
}

export async function updateGoalProgress(goalId, payload) {
  const response = await api.updateGoal(goalId, payload)
  sessionState.expenses = response.expenses
  sessionState.incomes = response.incomes
  sessionState.goals = response.goals
  sessionState.settings = response.settings
  sessionState.summary = response.summary
  return response.goal
}

export async function saveSettings(payload) {
  const response = await api.updateSettings(payload)
  sessionState.expenses = response.expenses
  sessionState.incomes = response.incomes
  sessionState.goals = response.goals
  sessionState.settings = response.settings
  sessionState.summary = response.summary
  return response.settings
}
