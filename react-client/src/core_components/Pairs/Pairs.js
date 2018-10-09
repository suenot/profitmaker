import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
// import GlobalStore from '../stores/GlobalStore'
import PairsStore from '../../stores/PairsStore'

@observer
class Pairs extends React.Component {
  render() {
    var colWidth = {
      width: 180
    }
    return (
      <div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(PairsStore.pairsComputed.slice(0, 10), (pair) => {
                return <tr key={pair}>
                  <td style={colWidth}>
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
    PairsStore.setPair(pair)
  }
}

export default Pairs
