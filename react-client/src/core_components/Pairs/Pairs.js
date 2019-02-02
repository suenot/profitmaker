
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import Divider from '@material-ui/core/Divider'

import PairsStore from 'stores/PairsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Pairs extends React.Component {
  render() {
    var {stock, drawer} = this.props.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Pairs on {stock}</div>
          <CloseIcon onClick={this.drawerClose.bind(this, drawer)} className="pointer" />
        </div>
        <Divider />
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(PairsStore.pairsComputed[stock], (pair) => {
                return <tr key={pair}>
                  <td>
                    <div className="cell" onClick={this.setPair.bind(this, pair)}>
                      {pair}
                    </div>
                  </td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  toggleFilter(e) {
    PairsStore.setPairsFilter(e.target.value)
  }
  setPair(pair) {
    var group = this.props.data.group
    // PairsStore.setPair(pair)
    DashboardsStore.setWidgetsData('pair', pair, group)
  }
  componentWillMount() {
    PairsStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    PairsStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    PairsStore.count(-1, this.props.data)
  }
  componentDidUpdate() {
    PairsStore.count(1, this.props.data)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Pairs
