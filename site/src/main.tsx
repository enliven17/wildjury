import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Docs from './docs/Docs'
import './styles.css'

// ponytail: two pages, so a path check instead of a router.
const isDocs = location.pathname.replace(/\/+$/, '') === '/docs'

createRoot(document.getElementById('root')!).render(<StrictMode>{isDocs ? <Docs /> : <App />}</StrictMode>)
