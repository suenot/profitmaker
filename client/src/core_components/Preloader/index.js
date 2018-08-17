// @flow weak

import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';
// import {CircularProgress} from '@material-ui/core/CircularProgress';
// import purple from 'material-ui/colors/purple';

const styles = theme => ({
	root: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
	},
	progress: {
		// margin: `0 auto`,
	}
});

function Preloader(props) {
	const {classes, size} = props;
	let progressSize = 50
	if(size) progressSize = size

	return (
		<div className={classes.root}>
			<CircularProgress className={classes.progress} size={progressSize}/>
		</div>
	);
}

Preloader.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Preloader);
