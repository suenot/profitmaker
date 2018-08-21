import React from "react";
import { WidthProvider, Responsive } from "react-grid-layout";
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// components
import Orders from './core_components/Orders'
import CreateOrder from './core_components/CreateOrder'
import HeikinAshi from './core_components/charts/HeikinAshi'
import Crocodile from './core_components/charts/Crocodile'
import Balance from './core_components/Balance'
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
            body {
              background: #efefef;
            }
            .widget {
              overflow: hidden;
              width: 100%;
              height: 100%;
              max-width: 100%;
              max-height: 100%;
              background: #fff;
              border: 1px solid #484747;
            }
            .title {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #484747;
              color: white;
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
            <div class="widget">
              <div class="title">
                <span>HeikinAshi</span>
                <div>icons</div>
              </div>
              <HeikinAshi tokenAddress="0xe41d2489571d322189246dafa5ebde1f4699f498" />
            </div>
          </div>
          <div key="2" data-grid={{ w: 2, h: 3, x: 2, y: 0, minW: 2, minH: 3 }}>
            <div class="widget">
              <div class="title">
                <span>Crocodile</span>
                <div>icons</div>
              </div>
              <Crocodile tokenAddress="0xe41d2489571d322189246dafa5ebde1f4699f498" />
            </div>
          </div>
          <div key="3" data-grid={{ w: 2, h: 3, x: 4, y: 0, minW: 2, minH: 3 }}>
            <div class="widget">
              <div class="title">
                <span>Asks</span>
                <div>icons</div>
              </div>
              <Orders type="asks" />
            </div>
          </div>
          <div key="4" data-grid={{ w: 2, h: 3, x: 6, y: 0, minW: 2, minH: 3 }}>
            <div class="widget">
              <div class="title">
                <span>Bids</span>
                <div>icons</div>
              </div>
              <Orders type="bids" />
            </div>
          </div>
          <div key="5" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
            <div class="widget">
              <div class="title">
                <span>Create order</span>
                <div>icons</div>
              </div>
              <CreateOrder />
            </div>
          </div>
          <div key="6" data-grid={{ w: 2, h: 3, x: 8, y: 0, minW: 2, minH: 3 }}>
            <div class="widget">
              <div class="title">
                <span>Balance</span>
                <div>icons</div>
              </div>
              <Balance />
            </div>
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
