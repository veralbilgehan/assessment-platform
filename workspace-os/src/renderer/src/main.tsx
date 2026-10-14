import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './stiller.css'
import './moduller' // tüm modüllerin kendini kayıt ettiği giriş noktası
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
