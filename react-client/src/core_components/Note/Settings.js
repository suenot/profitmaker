import React from 'react'
import { observer } from 'mobx-react'
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import './Note.sass'
import Typography from '@material-ui/core/Typography';
import DashboardsStore from '../../stores/DashboardsStore'
import NotesStore from '../../stores/NotesStore'


const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  // textField: {
  //   marginLeft: theme.spacing.unit,
  //   marginRight: theme.spacing.unit,
  // },
  formControl: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
    // minWidth: 120,
    width: '100%'
  },
  selectEmpty: {
    marginTop: theme.spacing.unit * 4,
  },
  dense: {
    marginTop: 16,
  },
  menu: {
    width: 200,
  },
});

@observer
class Settings extends React.Component {
  state = {
    age: '',
    name: 'hai',
  };

  handleChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };
  render() {
    const { classes } = this.props
    return (
      <div className="sections">
        <div className="section">
          <form className={classes.container + ' section-body'} noValidate autoComplete="off">
            <Typography variant="h6" gutterBottom>Widget settings</Typography>
            <TextField
              id="outlined-name"
              label="Name"
              value={"Some"}
              variant="outlined"
              fullWidth
            />
            <FormControl variant="outlined" className={classes.formControl}>
              <InputLabel
                ref={ref => {
                  this.labelRef = ReactDOM.findDOMNode(ref);
                }}
                htmlFor="outlined-age-simple"
              >
                Age
              </InputLabel>
              <Select
                value={this.state.age}
                onChange={this.handleChange}
                input={
                  <OutlinedInput
                    labelWidth={this.labelRef ? this.labelRef.offsetWidth : 0}
                    name="age"
                    id="outlined-age-simple"
                  />
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value={10}>Ten</MenuItem>
                <MenuItem value={20}>Twenty</MenuItem>
                <MenuItem value={30}>Thirty</MenuItem>
              </Select>
            </FormControl>
          </form>
        </div>
      </div>
    )
  }
}

export default withStyles(styles)(Settings)
