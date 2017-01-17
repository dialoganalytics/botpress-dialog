import util from 'util'
import path from 'path'
import fs from 'fs'

import includes from 'lodash.includes'
import merge from 'lodash.merge'
import uuid from 'uuid'
import Dialog from 'dialog-api'

let dialog = null
let configFile = null

const saveConfig = (config) => {
  fs.writeFileSync(configFile, JSON.stringify(config))
}

const loadConfig = () => {
  if (!fs.existsSync(configFile)) {
    const config = { accessToken : '', botId: '' }
    saveConfig(config, configFile)
  }

  const overrides = {}
  if (process.env.DIALOG_TOKEN) overrides.accessToken = process.env.DIALOG_TOKEN

  return Object.assign(JSON.parse(fs.readFileSync(configFile, 'utf-8')), overrides)
}

const callback = (logger) => {
  return (error, response, body) => {
    if (error) {
      logger.debug('[botpress-dialog] Error: ' + error.message)
    } else if (body && body.error) {
      logger.debug('[botpress-dialog] ' + body.code + ': ' + util.inspect(body.error, false, null))
    }
  }
}

const incomingMiddleware = (event, next) => {
  let types = ['attachments', 'message', 'postback', 'quick_reply']

  if (event.platform == 'facebook' && includes(types, event.type) ) {
    let payload = incomingMessage(event)

    dialog.track(payload, callback(event.bp.logger))
    event.bp.logger.verbose('[botpress-dialog] Tracking incoming message')
  }

  next()
}

const outgoingMiddleware = (event, next) => {
  let types = ['attachment', 'template', 'text']

  if (event.platform == 'facebook' && includes(types, event.type)) {
    let payload = outgoingMessage(event)

    dialog.track(payload, callback(event.bp.logger))
    event.bp.logger.verbose('[botpress-dialog] Tracking outgoing message')
  }

  next()
}

// [x] Attachments
// [x] Postbacks
// [x] Quick replies
// [x] Text messages
const incomingMessage = (event) => {
  let mapping = {
    attachments: dialog.messenger.webhook.attachment,
    postback: dialog.messenger.webhook.postback,
    message: dialog.messenger.webhook.message,
    quick_reply: dialog.messenger.webhook.quick_reply
  }

  let payloadFunc = mapping[event.type]

  let payload = {
    message: {
      platform: platformsMapping[event.platform],
      provider: "botpress-dialog",
      mtype: null,
      sent_at: event.raw.timestamp / 1000,
      properties: {}
    },
    conversation: {
      distinct_id: event.raw.sender.id + '-' + dialog.botId
    },
    creator: {
      distinct_id: event.user.id,
      type: "interlocutor",
      first_name: event.user.first_name,
      last_name: event.user.last_name,
      profile_picture: event.user.profile_pic,
      gender: event.user.gender,
      timezone: event.user.timezone,
      locale: dialog.messenger.locale(event.user.locale),
    }
  }

  return merge(payload, payloadFunc(event.raw))
}

// [x] Attachments
// [x] Templates
// [x] Text messages
const outgoingMessage = (event) => {
  let mapping = {
    attachment: dialog.messenger.send.attachment,
    template: dialog.messenger.send.template,
    text: dialog.messenger.send.text
  }

  let payloadFunc = mapping[event.type]

  let payload = {
    message: {
      distinct_id: event.__id,
      platform: "messenger",
      provider: "botpress-dialog",
      mtype: null,
      sent_at: new Date().getTime() / 1000,
      properties: {}
    },
    conversation: {
      distinct_id: event.raw.to + '-' + dialog.botId
    },
    creator: {
      distinct_id: dialog.botId,
      type: "bot"
    }
  }

  return merge(payload, payloadFunc(event.raw))
}

const platformsMapping = {
  facebook: 'messenger'
}

module.exports = {
  init: (bp) => {
    configFile = path.join(bp.projectLocation, bp.botfile.modulesConfigDir, 'botpress-dialog.json')

    bp.middlewares.register({
      name: 'dialog.outgoing',
      module: 'botpress-dialog',
      type: 'outgoing',
      handler: outgoingMiddleware,
      order: 5,
      description: 'Tracks outgoing messages with Dialog Analytics'
    })

    bp.middlewares.register({
      name: 'dialog.incoming',
      module: 'botpress-dialog',
      type: 'incoming',
      handler: incomingMiddleware,
      order: 5,
      description: 'Tracks incoming messages with Dialog Analytics'
    })

    let config = loadConfig()

    dialog = new Dialog(config.accessToken, config.botId)
  },

  ready: function(bp) {
    const router = bp.getRouter('botpress-dialog')

    router.get('/config', (req, res) => {
      res.send(loadConfig())
    })

    router.post('/config', (req, res) => {
      const { accessToken, botId } = req.body

      saveConfig({ accessToken, botId })

      dialog.apiToken = accessToken
      dialog.botId = botId

      res.sendStatus(200)
    })
  }
}
