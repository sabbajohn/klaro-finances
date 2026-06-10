<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bot,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Home,
  List,
  LogOut,
  Plus,
  Shield,
  Sparkles,
  Target,
  Trash2,
  User,
  Wallet,
  X,
} from '@lucide/vue'
import {
  addExpense,
  addGoal,
  addIncome,
  deleteExpense,
  saveSettings,
  sessionState,
  signOut,
  updateGoalProgress,
} from '../state/session'

const router = useRouter()
const activeTab = ref('gastos')
const showExpenseSheet = ref(false)
const showIncomeForm = ref(false)
const showGoalForm = ref(false)
const activeSheetSelect = ref(null)
const savingExpense = ref(false)
const savingIncome = ref(false)
const savingSettings = ref(false)
const savingGoal = ref(false)
const updatingGoalId = ref(null)
const deletingExpenseId = ref(null)
const showDeleteModal = ref(false)
const pendingDeleteExpense = ref(null)
const deleteAlert = ref('')
const expenseError = ref('')
const expenseSuccess = ref('')
const incomeError = ref('')
const incomeSuccess = ref('')
const settingsError = ref('')
const settingsSuccess = ref('')
const goalError = ref('')
const goalSuccess = ref('')
const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  title: '',
  amount: '',
  category: 'Alimentação',
  recurring: false,
  spentOn: today,
  notes: '',
})

const settingsForm = reactive({
  monthlyBudget: '',
})

const incomeForm = reactive({
  title: '',
  amount: '',
  receivedOn: today,
  notes: '',
})

const goalForm = reactive({
  title: '',
  targetAmount: '',
  currentAmount: '',
  dueDate: today,
})

const goalProgressForm = reactive({})
const categoryOptions = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Pessoal',
  'Casa',
  'Lazer',
  'Outros',
]

const expenseTypeOptions = [
  { value: false, label: 'Pontual' },
  { value: true, label: 'Recorrente' },
]

const navItems = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'gastos', label: 'Gastos', icon: List },
  //{ key: 'a_pagar', label: 'A Pagar', icon: CreditCard },
  { key: 'ia', label: 'IA', icon: Bot },
  { key: 'perfil', label: 'Perfil', icon: User },
]

const debtCards = [
  { title: 'Cartão Klaro', amount: 840.9, due: '10 jun', status: 'Em aberto' },
  { title: 'Financiamento', amount: 1250, due: '15 jun', status: 'Planejado' },
  { title: 'Conta recorrente', amount: 139.9, due: '20 jun', status: 'Acompanhar' },
]

const timeSlots = ['14:32', '11:15', '09:20', '20:00', '08:15', '14:00', '16:40']

const monthlyBudget = computed(() => sessionState.settings?.monthlyBudget ?? 3200)

const progressPercent = computed(() => {
  const ratio = Math.min(sessionState.summary.totalSpent / monthlyBudget.value, 1)
  return Math.round(ratio * 100)
})

const assistantInsight = computed(() => {
  const leadCategory = sessionState.summary.byCategory[0]

  if (!leadCategory) {
    return 'Registre um gasto para receber uma leitura simples do período.'
  }

  return `${leadCategory.category} concentra ${money(leadCategory.total)} do total registrado.`
})

const profileMetrics = computed(() => {
  return [
    { label: 'orçamento alvo', value: money(monthlyBudget.value), target: 'profile-budget' },
    { label: 'entradas', value: money(sessionState.summary.totalIncome), target: 'profile-incomes' },
    { label: 'metas concluídas', value: `${sessionState.summary.completedGoalCount}/${sessionState.summary.goalCount}`, target: 'profile-goals' },
  ]
})

function navigateToProfileSection(targetId) {
  if (activeTab.value !== 'perfil') {
    activeTab.value = 'perfil'
    nextTick(() => {
      const section = document.getElementById(targetId)
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return
  }

  const section = document.getElementById(targetId)
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const profileSections = computed(() => [
  {
    title: 'Preferencias',
    rows: [
      { icon: Bell, label: 'Lembretes e alertas', detail: 'Resumo diario as 18h' },
      { icon: Target, label: 'Meta mensal', detail: `${money(monthlyBudget.value)} em acompanhamento` },
    ],
  },
  {
    title: 'Conta e privacidade',
    rows: [
      { icon: Shield, label: 'Sessao protegida', detail: 'PIN e cookie ativo neste dispositivo' },
      { icon: User, label: 'Dados pessoais', detail: 'Nome e email sincronizados' },
    ],
  },
])

const groupedExpenses = computed(() => {
  const groups = new Map()

  sessionState.expenses.forEach((expense, index) => {
    const label = groupLabel(expense.spentOn)
    const rows = groups.get(label) ?? []

    rows.push({
      ...expense,
      time: timeSlots[index % timeSlots.length],
    })
    groups.set(label, rows)
  })

  return Array.from(groups.entries()).map(([label, rows]) => ({ label, rows }))
})

const primaryGoal = computed(() => sessionState.goals.find((goal) => goal.status === 'active') ?? sessionState.goals[0] ?? null)

async function submitExpense() {
  expenseError.value = ''
  expenseSuccess.value = ''
  savingExpense.value = true

  try {
    await addExpense({
      title: form.title,
      amount: Number(form.amount),
      category: form.category,
      recurring: form.recurring,
      spentOn: form.spentOn,
      notes: form.notes,
    })

    form.title = ''
    form.amount = ''
    form.category = 'Alimentação'
    form.recurring = false
    form.spentOn = today
    form.notes = ''
    expenseSuccess.value = 'Despesa cadastrada.'
    showExpenseSheet.value = false
    activeTab.value = 'gastos'
  } catch (error) {
    expenseError.value = error.message
  } finally {
    savingExpense.value = false
  }
}

async function removeExpense(expenseId) {
  expenseError.value = ''
  expenseSuccess.value = ''
  deletingExpenseId.value = expenseId

  try {
    await deleteExpense(expenseId)
    expenseSuccess.value = 'Despesa excluída.'
    return true
  } catch (error) {
    expenseError.value = error.message
    return false
  } finally {
    deletingExpenseId.value = null
  }
}

function openDeleteModal(expense) {
  pendingDeleteExpense.value = expense
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  pendingDeleteExpense.value = null
}

async function confirmDeleteExpense() {
  if (!pendingDeleteExpense.value) {
    return
  }

  console.log('Confirmando exclusão da despesa', pendingDeleteExpense.value.id)
  showDeleteModal.value = false

  const deleted = await removeExpense(pendingDeleteExpense.value.id)
  pendingDeleteExpense.value = null

  if (deleted) {
    window.alert('Despesa excluída.')
    deleteAlert.value = 'Despesa excluída.'
    setTimeout(() => {
      deleteAlert.value = ''
    }, 3200)
  }
}

async function submitSettings() {
  settingsError.value = ''
  settingsSuccess.value = ''
  savingSettings.value = true

  try {
    await saveSettings({
      monthlyBudget: Number(settingsForm.monthlyBudget),
    })

    settingsSuccess.value = 'Orçamento mensal atualizado.'
  } catch (error) {
    settingsError.value = error.message
  } finally {
    savingSettings.value = false
  }
}

async function submitIncome() {
  incomeError.value = ''
  incomeSuccess.value = ''
  savingIncome.value = true

  try {
    await addIncome({
      title: incomeForm.title,
      amount: Number(incomeForm.amount),
      receivedOn: incomeForm.receivedOn,
      notes: incomeForm.notes,
    })

    incomeForm.title = ''
    incomeForm.amount = ''
    incomeForm.receivedOn = today
    incomeForm.notes = ''
    incomeSuccess.value = 'Entrada cadastrada.'
    showIncomeForm.value = false
  } catch (error) {
    incomeError.value = error.message
  } finally {
    savingIncome.value = false
  }
}

async function submitGoal() {
  goalError.value = ''
  goalSuccess.value = ''
  savingGoal.value = true

  try {
    await addGoal({
      title: goalForm.title,
      targetAmount: Number(goalForm.targetAmount),
      currentAmount: Number(goalForm.currentAmount || 0),
      dueDate: goalForm.dueDate,
    })

    goalForm.title = ''
    goalForm.targetAmount = ''
    goalForm.currentAmount = ''
    goalForm.dueDate = today
    goalSuccess.value = 'Meta cadastrada.'
    showGoalForm.value = false
  } catch (error) {
    goalError.value = error.message
  } finally {
    savingGoal.value = false
  }
}

async function saveGoalCurrentAmount(goal) {
  const raw = goalProgressForm[goal.id]
  updatingGoalId.value = goal.id

  try {
    await updateGoalProgress(goal.id, {
      currentAmount: Number(raw),
    })
  } finally {
    updatingGoalId.value = null
  }
}

function openIncomeForm() {
  incomeError.value = ''
  incomeSuccess.value = ''
  showIncomeForm.value = true
}

function closeIncomeForm() {
  showIncomeForm.value = false
}

function openGoalForm() {
  goalError.value = ''
  goalSuccess.value = ''
  showGoalForm.value = true
}

function closeGoalForm() {
  showGoalForm.value = false
}

async function handleLogout() {
  await signOut()
  router.push('/login')
}

function openExpenseSheet() {
  expenseError.value = ''
  expenseSuccess.value = ''
  showExpenseSheet.value = true
}

function closeExpenseSheet() {
  activeSheetSelect.value = null
  showExpenseSheet.value = false
}

function toggleSheetSelect(name) {
  activeSheetSelect.value = activeSheetSelect.value === name ? null : name
}

function selectExpenseType(value) {
  form.recurring = value
  activeSheetSelect.value = null
}

function selectCategory(category) {
  form.category = category
  activeSheetSelect.value = null
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function goalPercent(goal) {
  if (!goal?.targetAmount) {
    return 0
  }

  return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
}

function groupLabel(value) {
  const date = new Date(`${value}T12:00:00`)
  const current = new Date(`${today}T12:00:00`)
  const yesterday = new Date(current)
  yesterday.setDate(current.getDate() - 1)

  if (value === today) {
    return 'HOJE'
  }

  if (value === yesterday.toISOString().slice(0, 10)) {
    return 'ONTEM'
  }

  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase()

  return `${day} ${month}`
}

watch(
  monthlyBudget,
  (value) => {
    settingsForm.monthlyBudget = String(value)
  },
  { immediate: true },
)

watch(
  () => sessionState.goals,
  (goals) => {
    if (!Array.isArray(goals)) {
      Object.keys(goalProgressForm).forEach((key) => {
        delete goalProgressForm[key]
      })
      return
    }

    goals.forEach((goal) => {
      goalProgressForm[goal.id] = String(goal.currentAmount)
    })
  },
  { immediate: true, deep: true },
)

function handleDocumentClick(event) {
  if (!event.target.closest('.custom-select')) {
    activeSheetSelect.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <main class="mobile-page mobile-app">
    <div class="app-shell">
        <div class="screen-scroll">
          <section v-if="activeTab === 'home'" class="view-shell home-view">
            <header class="view-header">
              <p class="view-kicker">klaro</p>
              <h1>Home</h1>
              <button class="round-icon" type="button" @click="handleLogout" aria-label="Sair">
                <LogOut :size="20" />
              </button>
            </header>

            <article class="balance-panel">
              <div>
                <span>saldo disponível</span>
                <strong>{{ money(Math.max(sessionState.summary.totalIncome - sessionState.summary.totalSpent, 0)) }}</strong>
              </div>
              <div class="mini-ring">{{ progressPercent }}%</div>
            </article>

            <div class="summary-grid">
              <article>
                <span>gastos</span>
                <strong>{{ money(sessionState.summary.totalSpent) }}</strong>
              </article>
              <article>
                <span>lançamentos</span>
                <strong>{{ sessionState.summary.expenseCount }}</strong>
              </article>
            </div>

            <article class="soft-card">
              <p class="view-kicker">planejamento</p>
              <h2>Meta do mês</h2>
              <template v-if="primaryGoal">
                <p class="goal-highlight-title">{{ primaryGoal.title }}</p>
                <p>
                  {{ money(primaryGoal.currentAmount) }} de {{ money(primaryGoal.targetAmount) }}
                  até {{ primaryGoal.dueDate }}.
                </p>
                <div class="goal-progress">
                  <div class="goal-progress-bar" :style="{ width: `${goalPercent(primaryGoal)}%` }"></div>
                </div>
              </template>
              <p v-else>Seu orçamento de {{ money(monthlyBudget) }} está em acompanhamento.</p>
            </article>
          </section>

          <section v-else-if="activeTab === 'gastos'" class="view-shell expenses-view">
            <header class="view-header">
              <div>
                <p class="view-kicker">controle financeiro</p>
                <h1>Gastos</h1>
              </div>
              <div class="header-total">
                <span>mês</span>
                <strong>{{ money(sessionState.summary.totalSpent) }}</strong>
              </div>
            </header>

            <div v-if="deleteAlert" class="delete-alert" role="alert">
              {{ deleteAlert }}
            </div>

            <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
              <div class="delete-modal">
                <div class="delete-modal-head">
                  <Trash2 :size="24" :stroke-width="2" />
                  <div>
                    <h3>Confirmar exclusão</h3>
                    <p>Você tem certeza de que deseja excluir esta despesa?</p>
                  </div>
                </div>

                <div class="delete-modal-actions">
                  <button class="secondary-button" type="button" @click="closeDeleteModal">
                    Cancelar
                  </button>
                  <button class="primary-button" type="button" @click="confirmDeleteExpense">
                    Sim, excluir
                  </button>
                </div>
              </div>
            </div>

            <div class="expense-groups">
              <section v-for="group in groupedExpenses" :key="group.label" class="expense-group">
                <h2>{{ group.label }}</h2>

                <article v-for="expense in group.rows" :key="expense.id" class="expense-card">
                  <div class="expense-check">
                    <span></span>
                  </div>

                  <div class="expense-main">
                    <strong>{{ expense.title }}</strong>
                    <span>
                      {{ expense.category }}
                      <template v-if="expense.recurring"> · recorrente</template>
                    </span>
                  </div>

                  <div class="expense-side">
                    <strong>-{{ money(expense.amount) }}</strong>
                    <span>{{ expense.time }}</span>
                    <button
                      class="expense-delete-button"
                      type="button"
                      @click.stop="openDeleteModal(expense)"
                      :disabled="deletingExpenseId === expense.id"
                      aria-label="Excluir despesa"
                    >
                      <Trash2 :size="18" :stroke-width="2" />
                    </button>
                  </div>
                </article>
              </section>
            </div>
          </section>

          <section v-else-if="activeTab === 'dividas'" class="view-shell">
            <!---<header class="view-header">
              <p class="view-kicker">compromissos</p>
              <h1>Dívidas</h1>
            </header>

            <article v-for="debt in debtCards" :key="debt.title" class="soft-card debt-card">
              <div>
                <span>{{ debt.status }}</span>
                <h2>{{ debt.title }}</h2>
                <p>Vencimento em {{ debt.due }}</p>
              </div>
              <strong>{{ money(debt.amount) }}</strong>
            </article>-->
          </section>

          <section v-else-if="activeTab === 'ia'" class="view-shell">
            <header class="view-header">
              <p class="view-kicker">assistente</p>
              <h1>IA</h1>
            </header>

            <article class="assistant-card">
              <Sparkles :size="26" />
              <h2>Leitura do mês</h2>
              <p>{{ assistantInsight }}</p>
            </article>

            <article class="soft-card">
              <h2>Próximo passo</h2>
              <p>Revise a categoria principal antes de fechar o mês.</p>
            </article>
          </section>

          <section v-else class="view-shell">
            <header class="view-header">
              <p class="view-kicker">conta</p>
              <h1>Perfil</h1>
            </header>

            <article class="profile-hero">
              <div class="profile-hero-top">
                <div class="profile-avatar">{{ sessionState.user?.name?.slice(0, 1) }}</div>
                <div class="profile-copy">
                  <p class="view-kicker">perfil demo</p>
                  <h2>{{ sessionState.user?.name }}</h2>
                  <p>{{ sessionState.user?.email }}</p>
                </div>
              </div>
              <div class="status-chip">Conta conectada</div>
            </article>

            <section class="profile-metrics">
              <button
                v-for="metric in profileMetrics"
                :key="metric.label"
                class="profile-metric-card"
                type="button"
                @click="navigateToProfileSection(metric.target)"
              >
                <div class="profile-metric-copy">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                </div>
                <ChevronRight :size="18" :stroke-width="2" />
              </button>
            </section>

            <section id="profile-goals" class="soft-card profile-section-card">
              <div class="profile-section-head">
                <h2>Metas</h2>
                <button
                  v-if="!showGoalForm"
                  class="inline-action"
                  type="button"
                  @click="openGoalForm"
                >
                  Nova meta
                </button>
              </div>

              <form v-if="showGoalForm" class="profile-form" @submit.prevent="submitGoal">
                <label class="field field-compact">
                  <span>Título</span>
                  <input v-model="goalForm.title" type="text" placeholder="Reserva de emergência" />
                </label>

                <div class="field-grid">
                  <label class="field field-compact">
                    <span>Meta</span>
                    <input v-model="goalForm.targetAmount" type="number" min="0" step="0.01" placeholder="3000" />
                  </label>

                  <label class="field field-compact">
                    <span>Atual</span>
                    <input v-model="goalForm.currentAmount" type="number" min="0" step="0.01" placeholder="0" />
                  </label>
                </div>

                <label class="field field-compact">
                  <span>Prazo</span>
                  <input v-model="goalForm.dueDate" type="date" />
                </label>

                <p v-if="goalError" class="feedback feedback-danger">{{ goalError }}</p>
                <p v-if="goalSuccess" class="feedback feedback-success">{{ goalSuccess }}</p>

                <div class="form-actions">
                  <button class="secondary-button compact-button" type="button" @click="closeGoalForm">
                    Cancelar
                  </button>
                  <button class="primary-button compact-button" :disabled="savingGoal">
                    {{ savingGoal ? 'Salvando...' : 'Salvar meta' }}
                  </button>
                </div>
              </form>

              <div class="goal-list">
                <article v-for="goal in sessionState.goals" :key="goal.id" class="goal-card">
                  <div class="goal-card-head">
                    <div>
                      <strong>{{ goal.title }}</strong>
                      <span>{{ goal.status === 'completed' ? 'Concluída' : `Prazo ${goal.dueDate}` }}</span>
                    </div>
                    <div class="goal-card-amounts">
                      <strong>{{ money(goal.currentAmount) }}</strong>
                      <small>de {{ money(goal.targetAmount) }}</small>
                    </div>
                  </div>

                  <div class="goal-progress">
                    <div class="goal-progress-bar" :style="{ width: `${goalPercent(goal)}%` }"></div>
                  </div>

                  <form class="goal-update-form" @submit.prevent="saveGoalCurrentAmount(goal)">
                    <label class="field field-compact">
                      <span>Avanço atual</span>
                      <input
                        v-model="goalProgressForm[goal.id]"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </label>

                    <button class="secondary-button goal-save-button" :disabled="updatingGoalId === goal.id">
                      {{ updatingGoalId === goal.id ? 'Salvando...' : 'Atualizar avanço' }}
                    </button>
                  </form>
                </article>
              </div>
            </section>

            <section id="profile-budget" class="soft-card profile-section-card">
              <div class="profile-section-head">
                <h2>Orçamento mensal</h2>
              </div>

              <form class="profile-form" @submit.prevent="submitSettings">
                <label class="field field-compact">
                  <span>Valor alvo do mês</span>
                  <input
                    v-model="settingsForm.monthlyBudget"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="3200"
                  />
                </label>

                <p v-if="settingsError" class="feedback feedback-danger">{{ settingsError }}</p>
                <p v-if="settingsSuccess" class="feedback feedback-success">{{ settingsSuccess }}</p>

                <button class="primary-button compact-button" :disabled="savingSettings">
                  {{ savingSettings ? 'Salvando...' : 'Salvar orçamento' }}
                </button>
              </form>
            </section>

            <section id="profile-incomes" class="soft-card profile-section-card">
              <div class="profile-section-head">
                <h2>Entradas</h2>
                <button
                  v-if="!showIncomeForm"
                  class="inline-action"
                  type="button"
                  @click="openIncomeForm"
                >
                  Adicionar entrada
                </button>
              </div>

              <form v-if="showIncomeForm" class="profile-form" @submit.prevent="submitIncome">
                <label class="field field-compact">
                  <span>Fonte</span>
                  <input v-model="incomeForm.title" type="text" placeholder="Salário principal" />
                </label>

                <div class="field-grid">
                  <label class="field field-compact">
                    <span>Valor</span>
                    <input v-model="incomeForm.amount" type="number" step="0.01" min="0" placeholder="5400" />
                  </label>

                  <label class="field field-compact">
                    <span>Data</span>
                    <input v-model="incomeForm.receivedOn" type="date" />
                  </label>
                </div>

                <label class="field field-compact">
                  <span>Observação</span>
                  <textarea v-model="incomeForm.notes" rows="2" placeholder="Detalhe opcional"></textarea>
                </label>

                <p v-if="incomeError" class="feedback feedback-danger">{{ incomeError }}</p>
                <p v-if="incomeSuccess" class="feedback feedback-success">{{ incomeSuccess }}</p>

                <div class="form-actions">
                  <button class="secondary-button compact-button" type="button" @click="closeIncomeForm">
                    Cancelar
                  </button>
                  <button class="primary-button compact-button" :disabled="savingIncome">
                    {{ savingIncome ? 'Salvando...' : 'Salvar entrada' }}
                  </button>
                </div>
              </form>

              <div class="income-list">
                <article v-for="income in sessionState.incomes" :key="income.id" class="income-card">
                  <div>
                    <strong>{{ income.title }}</strong>
                    <span>{{ income.receivedOn }}</span>
                  </div>
                  <strong>{{ money(income.amount) }}</strong>
                </article>
              </div>
            </section>

            <section
              v-for="section in profileSections"
              :key="section.title"
              class="soft-card profile-section-card"
            >
              <div class="profile-section-head">
                <h2>{{ section.title }}</h2>
              </div>

              <div class="profile-action-list">
                <button
                  v-for="row in section.rows"
                  :key="row.label"
                  class="profile-action-row"
                  type="button"
                >
                  <div class="profile-action-icon">
                    <component :is="row.icon" :size="18" :stroke-width="2" />
                  </div>
                  <div class="profile-action-copy">
                    <strong>{{ row.label }}</strong>
                    <span>{{ row.detail }}</span>
                  </div>
                  <ChevronRight :size="18" :stroke-width="2" />
                </button>
              </div>
            </section>

            <button class="full-button" type="button" @click="handleLogout">Sair</button>
          </section>
        </div>

        <button
          v-if="activeTab === 'gastos'"
          class="expense-fab"
          type="button"
          aria-label="Cadastrar despesa"
          @click="openExpenseSheet"
        >
          <Plus :size="38" :stroke-width="1.8" />
        </button>

        <footer class="bottom-nav">
          <button
            v-for="item in navItems"
            :key="item.key"
            class="bottom-item"
            :class="{ active: activeTab === item.key }"
            type="button"
            @click="activeTab = item.key"
          >
            <component :is="item.icon" :size="27" :stroke-width="1.8" />
            <small>{{ item.label }}</small>
          </button>
        </footer>

        <div v-if="showExpenseSheet" class="sheet-overlay" @click.self="closeExpenseSheet">
          <section class="expense-sheet" aria-label="Cadastrar despesa">
            <header class="sheet-head">
              <div>
                <p class="view-kicker">novo gasto</p>
                <h2>Cadastrar despesa</h2>
              </div>
              <button class="round-icon" type="button" aria-label="Fechar" @click="closeExpenseSheet">
                <X :size="20" />
              </button>
            </header>

            <form class="expense-form" @submit.prevent="submitExpense">
              <label class="field">
                <span>Título</span>
                <input v-model="form.title" type="text" placeholder="Mercado Extra" />
              </label>

              <div class="field-grid">
                <label class="field">
                  <span>Valor</span>
                  <input v-model="form.amount" type="number" step="0.01" placeholder="87,30" />
                </label>

                <label class="field">
                  <span>Data</span>
                  <input v-model="form.spentOn" type="date" />
                </label>
              </div>

              <label class="field custom-select">
                <span>Tipo</span>
                <button
                  class="custom-select-trigger"
                  :class="{ open: activeSheetSelect === 'type' }"
                  type="button"
                  aria-haspopup="listbox"
                  :aria-expanded="activeSheetSelect === 'type'"
                  @click.stop="toggleSheetSelect('type')"
                >
                  <span>{{ form.recurring ? 'Recorrente' : 'Pontual' }}</span>
                  <ChevronDown :size="20" :stroke-width="2" />
                </button>

                <div v-if="activeSheetSelect === 'type'" class="custom-select-menu" role="listbox">
                  <button
                    v-for="type in expenseTypeOptions"
                    :key="String(type.value)"
                    class="custom-select-option"
                    :class="{ selected: form.recurring === type.value }"
                    type="button"
                    @click.stop="selectExpenseType(type.value)"
                  >
                    <Check v-if="form.recurring === type.value" :size="18" :stroke-width="3" />
                    <span v-else class="custom-select-spacer"></span>
                    <span>{{ type.label }}</span>
                  </button>
                </div>
              </label>

              <label class="field custom-select">
                <span>Categoria</span>
                <button
                  class="custom-select-trigger"
                  :class="{ open: activeSheetSelect === 'category' }"
                  type="button"
                  aria-haspopup="listbox"
                  :aria-expanded="activeSheetSelect === 'category'"
                  @click.stop="toggleSheetSelect('category')"
                >
                  <span>{{ form.category }}</span>
                  <ChevronDown :size="20" :stroke-width="2" />
                </button>

                <div v-if="activeSheetSelect === 'category'" class="custom-select-menu" role="listbox">
                  <button
                    v-for="category in categoryOptions"
                    :key="category"
                    class="custom-select-option"
                    :class="{ selected: form.category === category }"
                    type="button"
                    @click.stop="selectCategory(category)"
                  >
                    <Check v-if="form.category === category" :size="18" :stroke-width="3" />
                    <span v-else class="custom-select-spacer"></span>
                    <span>{{ category }}</span>
                  </button>
                </div>
              </label>

              <label class="field">
                <span>Observação</span>
                <textarea v-model="form.notes" rows="3" placeholder="Detalhe opcional"></textarea>
              </label>

              <p v-if="expenseError" class="feedback feedback-danger">{{ expenseError }}</p>
              <p v-if="expenseSuccess" class="feedback feedback-success">{{ expenseSuccess }}</p>

              <button class="primary-button" :disabled="savingExpense">
                <Wallet :size="18" />
                {{ savingExpense ? 'Salvando...' : 'Salvar gasto' }}
              </button>
            </form>
          </section>
        </div>
    </div>
  </main>
</template>
