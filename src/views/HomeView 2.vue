<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addExpense, sessionState, signOut } from '../state/session'

const router = useRouter()
const activeTab = ref('home')
const savingExpense = ref(false)
const expenseError = ref('')
const expenseSuccess = ref('')
const today = new Date().toISOString().slice(0, 10)

const form = reactive({
  title: '',
  amount: '',
  category: 'Casa',
  spentOn: today,
  notes: '',
})

const monthlyBudget = 3200

const progressPercent = computed(() => {
  const ratio = Math.min(sessionState.summary.totalSpent / monthlyBudget, 1)
  return Math.round(ratio * 100)
})

const categories = ['Casa', 'Transporte', 'Saude', 'Lazer', 'Trabalho', 'Outros']

const topExpenses = computed(() => sessionState.expenses.slice(0, 6))
const assistantInsight = computed(() => {
  const leadCategory = sessionState.summary.byCategory[0]

  if (!leadCategory) {
    return 'Assim que voce registrar gastos, eu monto insights de categoria e tendencia.'
  }

  return `${leadCategory.category} concentra ${money(leadCategory.total)} do total registrado ate agora.`
})

async function submitExpense() {
  expenseError.value = ''
  expenseSuccess.value = ''
  savingExpense.value = true

  try {
    await addExpense({
      title: form.title,
      amount: Number(form.amount),
      category: form.category,
      spentOn: form.spentOn,
      notes: form.notes,
    })

    form.title = ''
    form.amount = ''
    form.category = 'Casa'
    form.spentOn = today
    form.notes = ''
    expenseSuccess.value = 'Despesa salva no prototipo.'
    activeTab.value = 'despesas'
  } catch (error) {
    expenseError.value = error.message
  } finally {
    savingExpense.value = false
  }
}

async function handleLogout() {
  await signOut()
  router.push('/login')
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function date(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`))
}
</script>

<template>
  <main class="mobile-page mobile-app">
    <section class="phone-shell">
      <header class="app-topbar">
        <div>
          <p class="eyebrow">ola, {{ sessionState.user?.name?.split(' ')[0] }}</p>
          <h1>Seus gastos, claros.</h1>
        </div>
        <button class="icon-button" @click="handleLogout" aria-label="Sair">
          ↗
        </button>
      </header>

      <section class="hero-balance">
        <div class="hero-copy">
          <span class="status-chip muted">prototipo mobile</span>
          <p class="eyebrow">saldo consolidado</p>
          <strong>{{ money(Math.max(5400 - sessionState.summary.totalSpent, 0)) }}</strong>
          <p>
            {{ sessionState.summary.expenseCount }} despesas registradas e
            {{ money(sessionState.summary.latestExpenseAmount) }} no ultimo lancamento.
          </p>
        </div>
        <div class="progress-card">
          <div
            class="progress-ring"
            :style="{
              background: `radial-gradient(circle, #242428 53%, transparent 54%), conic-gradient(var(--accent) ${progressPercent * 3.6}deg, rgba(255, 255, 255, 0.12) 0deg)`,
            }"
          >
            <div class="progress-value">{{ progressPercent }}%</div>
          </div>
          <small>do orcamento mensal usado</small>
        </div>
      </section>

      <nav class="quick-tabs">
        <button
          v-for="item in [
            { key: 'home', label: 'Home' },
            { key: 'gastos', label: 'Gastos' },
            { key: 'assistente', label: 'Assistente IA' },
            { key: 'perfil', label: 'Perfil' },
          ]"
          :key="item.key"
          class="tab-chip"
          :class="{ active: activeTab === item.key }"
          @click="activeTab = item.key"
        >
          {{ item.label }}
        </button>
      </nav>

      <section v-if="activeTab === 'home'" class="stack-section">
        <article class="panel-card dark">
          <div class="panel-head">
            <div>
              <p class="eyebrow">gastos por categoria</p>
              <h2>Panorama rapido</h2>
            </div>
            <span class="status-chip">SQLite</span>
          </div>

          <div class="category-list">
            <div
              v-for="item in sessionState.summary.byCategory"
              :key="item.category"
              class="category-row"
            >
              <div>
                <strong>{{ item.category }}</strong>
                <small>acumulado</small>
              </div>
              <span>{{ money(item.total) }}</span>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <div>
              <p class="eyebrow">ultimos registros</p>
              <h2>Movimento recente</h2>
            </div>
          </div>

          <div class="expense-list">
            <div v-for="expense in topExpenses" :key="expense.id" class="expense-item">
              <div>
                <strong>{{ expense.title }}</strong>
                <small>{{ expense.category }} · {{ date(expense.spentOn) }}</small>
              </div>
              <span>{{ money(expense.amount) }}</span>
            </div>
          </div>
        </article>
      </section>

      <section v-else-if="activeTab === 'gastos'" class="stack-section">
        <article class="panel-card">
          <div class="panel-head">
            <div>
              <p class="eyebrow">novo lancamento</p>
              <h2>Cadastrar despesa</h2>
            </div>
          </div>

          <form class="expense-form" @submit.prevent="submitExpense">
            <label class="field">
              <span>Titulo</span>
              <input v-model="form.title" type="text" placeholder="Ex.: Farmacia domingo" />
            </label>

            <div class="field-grid">
              <label class="field">
                <span>Valor</span>
                <input v-model="form.amount" type="number" step="0.01" placeholder="0,00" />
              </label>

              <label class="field">
                <span>Data</span>
                <input v-model="form.spentOn" type="date" />
              </label>
            </div>

            <label class="field">
              <span>Categoria</span>
              <select v-model="form.category">
                <option v-for="category in categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>Observacao</span>
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Contexto rapido para lembrar esse gasto"
              ></textarea>
            </label>

            <p v-if="expenseError" class="feedback feedback-danger">{{ expenseError }}</p>
            <p v-if="expenseSuccess" class="feedback feedback-success">
              {{ expenseSuccess }}
            </p>

            <button class="primary-button" :disabled="savingExpense">
              {{ savingExpense ? 'Salvando...' : 'Salvar despesa' }}
            </button>
          </form>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <div>
              <p class="eyebrow">lista completa</p>
              <h2>Despesas cadastradas</h2>
            </div>
          </div>

          <div class="expense-list">
            <div
              v-for="expense in sessionState.expenses"
              :key="expense.id"
              class="expense-item"
            >
              <div>
                <strong>{{ expense.title }}</strong>
                <small>{{ expense.category }} · {{ date(expense.spentOn) }}</small>
              </div>
              <span>{{ money(expense.amount) }}</span>
            </div>
          </div>
        </article>
      </section>

      <section v-else-if="activeTab === 'assistente'" class="stack-section">
        <article class="panel-card dark">
          <div class="panel-head">
            <div>
              <p class="eyebrow">assistente ia</p>
              <h2>Leitura do seu mes</h2>
            </div>
          </div>

          <p class="assistant-copy">{{ assistantInsight }}</p>

          <div class="category-list">
            <div class="category-row">
              <div>
                <strong>Movimento recente</strong>
                <small>ultimo registro</small>
              </div>
              <span>{{ money(sessionState.summary.latestExpenseAmount) }}</span>
            </div>
            <div class="category-row">
              <div>
                <strong>Total no periodo</strong>
                <small>acumulado</small>
              </div>
              <span>{{ money(sessionState.summary.totalSpent) }}</span>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <div>
              <p class="eyebrow">sugestoes</p>
              <h2>Proximas acoes</h2>
            </div>
          </div>

          <div class="expense-list">
            <div class="expense-item">
              <div>
                <strong>Revisar categoria lider</strong>
                <small>entender a maior pressao do mes</small>
              </div>
            </div>
            <div class="expense-item">
              <div>
                <strong>Consolidar gastos recorrentes</strong>
                <small>criar rotina de comparacao semanal</small>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="stack-section">
        <article class="panel-card">
          <div class="panel-head">
            <div>
              <p class="eyebrow">perfil demo</p>
              <h2>Conta conectada</h2>
            </div>
          </div>

          <div class="profile-block">
            <div class="avatar">{{ sessionState.user?.name?.slice(0, 1) }}</div>
            <div>
              <strong>{{ sessionState.user?.name }}</strong>
              <p>{{ sessionState.user?.email }}</p>
            </div>
          </div>

          <div class="profile-metrics">
            <div class="mini-metric">
              <small>orcamento alvo</small>
              <strong>{{ money(monthlyBudget) }}</strong>
            </div>
            <div class="mini-metric">
              <small>total gasto</small>
              <strong>{{ money(sessionState.summary.totalSpent) }}</strong>
            </div>
          </div>
        </article>
      </section>

      <footer class="bottom-nav">
        <button
          class="bottom-item"
          :class="{ active: activeTab === 'home' }"
          @click="activeTab = 'home'"
        >
          <span>◐</span>
          <small>Home</small>
        </button>
        <button
          class="bottom-item"
          :class="{ active: activeTab === 'gastos' }"
          @click="activeTab = 'gastos'"
        >
          <span>◎</span>
          <small>Gastos</small>
        </button>
        <button
          class="bottom-item"
          :class="{ active: activeTab === 'assistente' }"
          @click="activeTab = 'assistente'"
        >
          <span>✦</span>
          <small>IA</small>
        </button>
        <button
          class="bottom-item"
          :class="{ active: activeTab === 'perfil' }"
          @click="activeTab = 'perfil'"
        >
          <span>◌</span>
          <small>Perfil</small>
        </button>
      </footer>
    </section>
  </main>
</template>
