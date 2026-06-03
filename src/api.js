async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Falha na requisicao.')
  }

  return data
}

export function restoreSession() {
  return request('/api/session')
}

export function login(payload) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout() {
  return request('/api/logout', {
    method: 'POST',
  })
}

export function createExpense(payload) {
  return request('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createIncome(payload) {
  return request('/api/incomes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createGoal(payload) {
  return request('/api/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateGoal(goalId, payload) {
  return request(`/api/goals/${goalId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updateSettings(payload) {
  return request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
