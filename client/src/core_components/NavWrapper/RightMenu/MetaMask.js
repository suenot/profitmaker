import React from 'react';
// var logoOne = require('svg-inline-loader?classPrefix=my-prefix-!../../../assets/svg/like.svg');

// import ReactDOM from 'react-dom';

// const appendElementContainer = document.getElementById('append-element-container');
import theme from './theme.scss'

class Application extends React.Component {


    renderInstall() {

        return (
            <div className={theme.blockInstall}>
                <ul>
                    <li className={theme.li_icon}>
                        <span></span>
                    </li>
                    <li className={theme.li_hint}>
                        For more convenient work, use our modification of the MetaMask plugin.
                    </li>
                    <li className={theme.li_install}>
                        <a href="/plugin/app.zip" target="_blank">Install fork for Chrome</a>
                    </li>
                    <li className={theme.li_github}>
                        <a href="https://github.com/MetaMask/metamask-extension" target="_blank">Download form Github</a>
                    </li>
                </ul>
            </div>
        )
    }

  render() {
        // console.log(appendElementContainer)

        // let test = appendElementContainer.toString()

        return (
          <div style={{height: '100%'}}>
              <div data-el="MetaMask">
                  <div id="MetaMaskIframe">
                      {this.renderInstall()}
                  </div>
                  <div id="MetaMaskDuplicate" data-el="duplicate" className={theme.MetaMaskDuplicateHide}>
                      The MetaMask extension for BursaDex can not be displayed, because you have the original MetaMask extension installed.
                  </div>
              </div>
          </div>
         );
  }
}

export default Application
// ReactDOM.render(<Application />, document.querySelector('.react-render-element'));
