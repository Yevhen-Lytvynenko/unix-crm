import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { loginRequest, setPasswordRequest } from '../api'
import { getToken, setToken } from '../auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => loginRequest(username.trim(), password),
    onSuccess: (res) => {
      setToken(res.token)
      if (res.mustChangePassword) navigate('/change-password', { replace: true })
      else navigate('/', { replace: true })
    },
    onError: (err) => setError((err as Error).message),
  })

  return (
    <div className="auth-shell">
      <div className="auth-card glass-panel">
        <h1>Вход</h1>
        <p className="muted small">Unix CRM · Kanban</p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            loginMutation.mutate()
          }}
        >
          <label className="field">
            <span>Логин</span>
            <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary full" disabled={loginMutation.isPending}>
            Войти
          </button>
        </form>
      </div>
    </div>
  )
}

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const [next, setNext] = useState('')
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () => setPasswordRequest(next),
    onSuccess: () => {
      setToken(null)
      navigate('/login', { replace: true })
    },
    onError: (err) => setError((err as Error).message),
  })

  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="auth-shell">
      <div className="auth-card glass-panel">
        <h1>Новый пароль</h1>
        <p className="muted small">При первом входе задайте пароль для вашей учётной записи.</p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (next.length < 4) {
              setError('Минимум 4 символа.')
              return
            }
            mut.mutate()
          }}
        >
          <label className="field">
            <span>Новый пароль</span>
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary full" disabled={mut.isPending}>
            Сохранить
          </button>
          <Link className="auth-link" to="/login">
            Назад к входу
          </Link>
        </form>
      </div>
    </div>
  )
}
