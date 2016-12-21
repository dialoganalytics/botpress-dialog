import React from 'react'
import {
  Panel,
  Grid,
  Row,
  Col,
  ControlLabel,
  FormGroup,
  FormControl,
  Alert,
  FieldGroup,
  Button
} from 'react-bootstrap'

import style from './style.scss'

export default class TemplateModule extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      message: null,
      initialStateHash: null
    }

    this.renderFields = this.renderFields.bind(this)

    this.handleAccesTokenChange = this.handleAccesTokenChange.bind(this)
    this.handleBotIdChange = this.handleBotIdChange.bind(this)
    this.handleSaveChanges = this.handleSaveChanges.bind(this)
  }

  getStateHash() {
    return this.state.accessToken + ' ' + this.state.botId
  }

  getAxios() {
    return this.props.bp.axios
  }

  componentDidMount() {
    this.getAxios().get('/api/botpress-dialog/config')
    .then((res) => {
      this.setState({
        loading: false,
        ...res.data
      })

      setImmediate(() => {
        this.setState({ initialStateHash: this.getStateHash() })
      })
    })
  }

  handleAccesTokenChange(event) {
    this.setState({
      accessToken: event.target.value
    })
  }

  handleBotIdChange(event) {
    this.setState({
      botId: event.target.value
    })
  }

  handleSaveChanges() {
    this.setState({ loading:true })

    return this.getAxios().post('/api/botpress-dialog/config', {
      accessToken: this.state.accessToken,
      botId: this.state.botId
    })
    .then(() => {
      this.setState({
        loading: false,
        initialStateHash: this.getStateHash()
      })
    })
    .catch((err) => {
      this.setState({
        message: {
          type: 'danger',
          text: 'An error occured during you were trying to save configuration: ' + err.response.data.message
        },
        loading: false,
        initialStateHash: this.getStateHash()
      })
    })
  }

  renderFields() {
    return (
      <div className="form-horizontal">
        <FormGroup>
          <Col componentClass={ControlLabel} sm={3}>
            API Token
          </Col>
          <Col sm={8}>
            <FormControl type="text" value={this.state.accessToken} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" onChange={this.handleAccesTokenChange}/>
          </Col>
        </FormGroup>

        <FormGroup>
          <Col componentClass={ControlLabel} sm={3}>
            Bot Id
          </Col>
          <Col sm={8}>
            <FormControl type="text" value={this.state.botId} placeholder="xxxxxxxx" onChange={this.handleBotIdChange}/>
          </Col>
        </FormGroup>
      </div>
    )
  }

  renderMessageAlert() {
    return this.state.message
      ? <Alert bsStyle={this.state.message.type}>{this.state.message.text}</Alert>
      : null
  }

  renderSaveButton() {
    const disabled = !(this.state.initialStateHash && this.state.initialStateHash !== this.getStateHash())

    return <Button disabled={disabled} bsStyle="success" onClick={this.handleSaveChanges}>Save</Button>
  }

  render() {
    if (this.state.loading) {
      return <h4>Module is loading...</h4>
    }

    return (
      <Grid>
        <Row>
          <Col md={8} mdOffset={2}>
            {this.renderMessageAlert()}

            <Panel header="Settings" footer={this.renderSaveButton()}>
              {this.renderFields()}
            </Panel>
          </Col>
        </Row>
      </Grid>
    )
  }
}
