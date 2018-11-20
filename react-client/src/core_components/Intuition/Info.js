import React from 'react'
import { observer } from 'mobx-react'

@observer
class Intuition extends React.Component {
  render() {
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th className="simpleTable-header">Amount</th>
              <th className="simpleTable-header">Profit</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>
    )
  }
}

export default Intuition
