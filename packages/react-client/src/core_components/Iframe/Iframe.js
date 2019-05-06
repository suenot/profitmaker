import React from 'react'
import { observer } from 'mobx-react'
import './Iframe.sass'

@observer
class Iframe extends React.Component {
  render() {
    return (
      <iframe className="iframe" title="Iframe" src={this.props.data.url}></iframe>
    )
  }
}

export default Iframe
