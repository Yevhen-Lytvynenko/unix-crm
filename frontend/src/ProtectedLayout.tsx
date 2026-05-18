import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { fetchMe } from './api'
import { getToken } from './auth'

export function ProtectedLayout() {
  const token = getToken()
  const location = useLocation()
  const navigate = useNavigate()

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: Boolean(token),
  })

  useEffect(() => {
    if (!meQuery.data) return
    if (meQuery.data.mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password', { replace: true })
    }
  }, [meQuery.data, location.pathname, navigate])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (meQuery.isPending && location.pathname !== '/change-password') {
    return (
      <div className="session-check gradient-bg muted">
        <p>Проверка сессии…</p>
      </div>
    )
  }

  return <Outlet />
}
