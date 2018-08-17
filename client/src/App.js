import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// components
import Orders from './core_components/Orders'
import CreateOrder from './core_components/CreateOrder'
import HeikinAshi from './core_components/charts/HeikinAshi'
import Crocodile from './core_components/charts/Crocodile'
// import GitterChat from './core_components/GitterChat'


const ResponsiveReactGridLayout = WidthProvider(Responsive);
const originalLayouts = getFromLS("layouts") || {};

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      layouts: JSON.parse(JSON.stringify(originalLayouts)),
      tokenDecimals: 18,
      tokenName: '-',
      tokenSymbol: '-',
      asks: {},
      orderbook: {
        'asks': {},
        'bids': {}
      },
      bids: {}
    };
  }

  static get defaultProps() {
    return {
      className: "layout",
      cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      rowHeight: 30
    };
  }

  resetLayout() {
    this.setState({ layouts: {} });
  }

  onLayoutChange(layout, layouts) {
    saveToLS("layouts", layouts);
    this.setState({ layouts });
  }

  render() {
    return (
      <div>
        <style jsx="true">{`
            .react-grid-item {
              background: #eee
            }
        `}</style>
        <button onClick={() => this.resetLayout()}>Reset Layout</button>
        <ResponsiveReactGridLayout
          className="layout"
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          layouts={this.state.layouts}
          onLayoutChange={(layout, layouts) =>
            this.onLayoutChange(layout, layouts)
          }
        >
          <div key="1" data-grid={{ w: 2, h: 3, x: 0, y: 0, minW: 2, minH: 3 }}>
            <HeikinAshi tokenAddress="0xe41d2489571d322189246dafa5ebde1f4699f498" />
          </div>
          <div key="2" data-grid={{ w: 2, h: 3, x: 2, y: 0, minW: 2, minH: 3 }}>
            <Crocodile tokenAddress="0xe41d2489571d322189246dafa5ebde1f4699f498" />
          </div>
          <div key="3" data-grid={{ w: 2, h: 3, x: 4, y: 0, minW: 2, minH: 3 }}>
            <Orders type="asks" />
          </div>
          <div key="4" data-grid={{ w: 2, h: 3, x: 6, y: 0, minW: 2, minH: 3 }}>
            <Orders type="bids" />
          </div>
          <div key="5" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
            <CreateOrder />
          </div>
        </ResponsiveReactGridLayout>
      </div>
    );
  }
  async componentWillMount() {

  }
}

// module.exports = ResponsiveLocalStorageLayout;

function getFromLS(key) {
  let ls = {};
  if (global.localStorage) {
    try {
      ls = JSON.parse(global.localStorage.getItem("rgl-8")) || {};
    } catch (e) {
      /*Ignore*/
    }
  }
  return ls[key];
}

function saveToLS(key, value) {
  if (global.localStorage) {
    global.localStorage.setItem(
      "rgl-8",
      JSON.stringify({
        [key]: value
      })
    );
  }
}

export default App