import React from 'react'
import { observer } from 'mobx-react'
import './Iframe.sass'


@observer
class Iframe extends React.Component {
  render() {
    return (
      <iframe className="iframe" src="http://dolphin.bi/widgets/ico-info/index.html?id=5a252cfd6ea08d0f96839b6e"></iframe>
    )
  }
}

export default Iframe
