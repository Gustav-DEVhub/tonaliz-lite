import { BrowserRouter } from 'react-router-dom'
import { AppBootstrap } from '@/app/bootstrap/app-bootstrap'
import { AppShell } from '@/app/layout/app-shell'

export function TonalizApp() {
  return (
    <BrowserRouter>
      <AppBootstrap />
      <AppShell />
    </BrowserRouter>
  )
}
