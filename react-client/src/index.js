import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import registerServiceWorker from './registerServiceWorker'
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles'
import blue from '@material-ui/core/colors/blue'

const theme = createMuiTheme({
  typography: {
    useNextVariants: true,
  },
  palette: {
    primary: blue,
  },
})

const Root = (
  <MuiThemeProvider theme={theme} sheetsManager={new Map()}>
    <App />
  </MuiThemeProvider>
)

ReactDOM.render(Root, document.getElementById('root'))
registerServiceWorker()
