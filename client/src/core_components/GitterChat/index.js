import React from 'react';
// import {Link} from 'react-router';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';

import Drawer from '@material-ui/core/Drawer';
// import Button from 'material-ui/Button';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';

import Preloader from '../Preloader'

import theme from './theme.scss'

const styles = theme => ({
});

class GiiterChat extends React.Component {

    state = {
        open: false,
        iframe_loaded: false,
    };

    toggleDrawer = (action) => {
        this.setState({
            open: action,
        });
        if(!action) {
            this.setState({
                iframe_loaded: false,
            });
        }
    };


    iframePreload() {
        this.setState({iframe_loaded: true})
    }


	render() {

        const { message } = this.props
        const { open, iframe_loaded } = this.state

		return (
			<div>
                <IconButton color="inherit" aria-label="Chat" onClick={() => this.toggleDrawer(true)}>
                    <Icon>chat</Icon>
                </IconButton>

                <Drawer
                  anchor="right"
                  open={this.state.open}
                  onClose={() => this.toggleDrawer(false)}
                >
                  <div
                    tabIndex={0}
                    role="button"
                    className={theme.wrapper}
                  >
                    <ul>
                        <li>
                            <Typography variant="title">
                                Bursa community chat
                            </Typography>
                        </li>
                        <li>
                            {!iframe_loaded ? <Preloader /> : ''}
                            <iframe className={iframe_loaded ? theme.iframeLoaded : theme.iframe}
                                frameBorder="0" src="https://gitter.im/bursado/Lobby/~embed"
                                onLoad={() => this.iframePreload()}
                                />
                        </li>
                    </ul>
                  </div>
                </Drawer>


			</div>
		);
	}
}

GiiterChat.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withStyles(styles)(GiiterChat);
