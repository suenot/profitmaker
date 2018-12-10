
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import PairsStore from 'stores/PairsStore'

@observer
class Pairs extends React.Component {
  render() {
    return (
      <div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(PairsStore.pairsComputed, (pair) => {
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
}

export default Pairs
