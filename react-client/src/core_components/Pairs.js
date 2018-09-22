import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('GlobalStore')
@observer
class Pairs extends React.Component {
  render() {
    var colWidth = {
      width: 180
    }
    const {GlobalStore} = this.props
    return (
      <div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(GlobalStore.pairsComputed.slice(0, 10), (pair) => {
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
    console.log(e.target.value)
    this.props.GlobalStore.setPairsFilter(e.target.value)
  }
  setPair(pair) {
    this.props.GlobalStore.setPair(pair)
  }
}

export default Pairs
