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
        <div className="el-table el-table--fit noHeader-table">
          <div className="el-table__body-wrapper">
            <table className="el-table__body">
              <tbody>
                {
                  _.map(GlobalStore.pairs, (pair) => {
                    return <tr key={pair} className="el-table__row">
                      <td style={colWidth}>
                        <div className="cell">
                          <a href="#" onClick={this.handleClick.bind(this, pair)}>{pair}</a>
                        </div>
                      </td>
                    </tr>
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
  handleClick(pair) {
    this.props.GlobalStore.setPair(pair)
  }
}

export default Pairs
