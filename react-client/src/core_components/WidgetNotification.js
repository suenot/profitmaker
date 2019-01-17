import React from 'react'

class Empty extends React.Component {
  render() {
    var {msg, type} = this.props
    return (
      <div className={'notification ' + type}>{msg}</div>
    )
  }
}

export default Empty
