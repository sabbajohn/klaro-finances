<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn, sessionState } from '../state/session'

const router = useRouter()
const form = reactive({
  email: 'demo@klaro.app',
  pin: '1234',
})
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''

  try {
    await signIn(form)
    router.push('/app')
  } catch (error) {
    errorMessage.value = error.message
  }
}
</script>

<template>
  <main class="mobile-page mobile-auth">
    <section class="auth-shell">
      <div class="auth-hero">
        <p class="auth-kicker">finance clarity . mobile prototype</p>
        <div class="lock-mark"></div>
        <h1>klaro</h1>
        <p class="auth-subtitle">
          Controle gastos, acompanhe o saldo e registre despesas em um fluxo
          leve, pensado primeiro para celular.
        </p>
      </div>

      <form class="auth-card" @submit.prevent="submit">
        <div class="card-header">
          <div>
            <p class="eyebrow">login simulado</p>
            <h2>Entrar no prototipo</h2>
          </div>
          <span class="status-chip">SQLite online</span>
        </div>

        <label class="field">
          <span>Email</span>
          <input v-model="form.email" type="email" inputmode="email" />
        </label>

        <label class="field">
          <span>PIN</span>
          <input
            v-model="form.pin"
            type="password"
            inputmode="numeric"
            maxlength="4"
          />
        </label>

        <p class="helper-copy">
          Credenciais demo: <strong>demo@klaro.app</strong> e <strong>1234</strong>.
        </p>

        <p v-if="errorMessage" class="feedback feedback-danger">
          {{ errorMessage }}
        </p>

        <button class="primary-button" :disabled="sessionState.authenticating">
          {{ sessionState.authenticating ? 'Entrando...' : 'Acessar agora' }}
        </button>
      </form>
    </section>
  </main>
</template>
