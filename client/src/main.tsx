import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { theme, cssVariablesResolver } from './theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
    >
      <App />
    </MantineProvider>
  </StrictMode>,
)
