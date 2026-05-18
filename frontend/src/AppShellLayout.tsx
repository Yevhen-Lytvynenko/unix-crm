import { NavLink, Outlet } from 'react-router-dom'
import { setToken } from './auth'

export function AppShellLayout() {
  const logout = () => {
    setToken(null)
    window.location.assign('/login')
  }

  return (
    <div className="app-frame gradient-bg">
      <aside className="app-sidebar glass-panel" aria-label="Навигация">
        <div className="sidebar-brand">Unix CRM</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Обзор
          </NavLink>
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Доска
          </NavLink>
          <NavLink to="/dependencies" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Зависимости
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Админ-панель
          </NavLink>
        </nav>
        <div className="sidebar-spacer" />
        <button type="button" className="sidebar-logout btn-ghost full" onClick={logout}>
          Выход
        </button>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
