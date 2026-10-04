import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from '@/App'
import { RecetteProvider } from '@/state/RecetteProvider'
import { SessionProvider } from '@/state/SessionProvider'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <RecetteProvider>
          <App />
        </RecetteProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
