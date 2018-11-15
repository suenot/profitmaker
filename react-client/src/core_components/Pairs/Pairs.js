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
    var {stock} = this.props.data
    // console.log(stock)
    // console.log(PairsStore.pairsComputed)
    return (
      <div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(PairsStore.pairsComputed[stock], (pair) => {
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
    var {stock} = this.props.data
    PairsStore.setPairsFilter(e.target.value, stock)
  }
  setPair(pair) {
    PairsStore.setPair(pair)
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
