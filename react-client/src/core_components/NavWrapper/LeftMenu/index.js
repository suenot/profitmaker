import React from 'react';
import {Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import {withRouter} from 'react-router';
import {connect} from 'react-redux';

import List, {ListItem, ListItemIcon, ListItemText} from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Icon from 'material-ui/Icon';
import Preloader from '../../Preloader'

const _ = require('lodash');

import theme from './theme.scss'

// import style from './theme';
const styles = theme => ({
	root: {
		width: '100%',
		maxWidth: 360,
		background: theme.palette.background.paper
	},
	nested: {
		paddingLeft: theme.spacing.unit * 4
	}
});

class LeftMenu extends React.Component {

	state = {};


	componentWillMount() {
		// console.log(this.props.config)
	}

	menuItemRemove(event, coin) {
		event.stopPropagation();
        event.preventDefault();

		this.props.onSelectCoins({type: false, array: [coin]})
	}


	renderCoinsMenu() {
		const selected_coins = this.props.config.selected_coins
		const coins_data = this.props.config.coins_data
		const coins_arr = this.props.config.coins_arr
		const currentCoin = this.props

		// console.log('here')
		// console.log(currentCoin)

		// selected_coins
		// console.log(selected_coins)
		// selected_coins.map((item, index) => {
		// 	console.log(coins_data[item])
		// })

		let allPairsLabel = `All pairs (${coins_arr.length})`
		return (
			<div className={theme.coinsMenu}>
				<Link to="/coins">
					<ListItem button>
						<ListItemIcon>
							<Icon>search</Icon>
						</ListItemIcon>
						<ListItemText primary={allPairsLabel} data-el="allPairs"/>
					</ListItem>
				</Link>
				{selected_coins.map((item, index) => {
					if(coins_data[item] != 'undefined') {
						let data = coins_data[item]
						let link = `/coins/${data.token_address}`
						return (
							<Link to={link} key={index}>
								<ListItem button>
									<ListItemIcon data-el="shortName">
										<div>{data.token_ticker}</div>
									</ListItemIcon>

									<img src={data.favicon} data-el="favicon" />

									<ListItemText primary={data.token_name}/>
									<Icon data-el="menuItemRemove" onClick={(event) => this.menuItemRemove(event, data.token_ticker)}>close</Icon>
								</ListItem>
							</Link>
						)
					}
				})}
			</div>
		)
	}

	render() {

		let showLayer = this.props.config.coins_arr.length > 0 ? true : false

		return (
			<div>
                <Divider/>
				<List>
					{showLayer ? this.renderCoinsMenu() : <Preloader />}
				</List>
			</div>
		);
	}
}

LeftMenu.propTypes = {
	classes: PropTypes.object.isRequired
};

// export default withStyles(styles)(LeftMenu);


export default
withRouter(
	(connect(
		(mapStateToProps) => (mapStateToProps),
		dispatch => ({
			onSelectCoins: (payload) => {
				dispatch({type: 'SELECT_COINS', payload})
			},
		})
	))
	(withStyles(styles)(LeftMenu))
);
