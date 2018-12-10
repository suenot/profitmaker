
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import PairsStore from 'stores/PairsStore'

@observer
class Pairs extends React.Component {
  render() {
    var stock = this.props.data.stock
    return (
      <div>
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
}

export default Pairs
