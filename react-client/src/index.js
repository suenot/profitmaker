import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles'
import 'react-perfect-scrollbar/dist/css/styles.css'

const theme = createMuiTheme({
  typography: {
    useNextVariants: true,
  },
})

const Root = (
  <MuiThemeProvider theme={theme} sheetsManager={new Map()}>
    <App />
  </MuiThemeProvider>
)

ReactDOM.render(Root, document.getElementById('root'))
registerServiceWorker()
