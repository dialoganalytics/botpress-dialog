import util from 'util'
import path from 'path'
import fs from 'fs'

import merge from 'lodash.merge'
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
  let mapping = {
    message: textMessage,
    quick_reply: quickReplyMessage,
    attachments: incomingAttachmentMessage
  }

  let payloadFunc = mapping[event.type]

  if (payloadFunc) {
    let payload = payloadFunc(incomingMessage(event), event)

    dialog.track(payload, callback(event.bp.logger))
    event.bp.logger.verbose('[botpress-dialog] Tracking incoming message')
  }

  next()
}

const outgoingMiddleware = (event, next) => {
  let mapping = {
    text: textMessage,
    template: templateMessage,
    attachment: outgoingAttachmentMessage
  }

  let payloadFunc = mapping[event.type]

  if (payloadFunc) {
    let payload = payloadFunc(outgoingMessage(event), event)

    dialog.track(payload, callback(event.bp.logger))
    event.bp.logger.verbose('[botpress-dialog] Tracking outgoing message')
  }

  next()
}

const incomingMessage = (event) => {
  return {
    message: {
      distinct_id: event.raw.message.mid,
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
      locale: event.user.locale,
    }
  }
}

const outgoingMessage = (event) => {
  return {
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
}

const textMessage = (payload, event) => {
  return merge(payload, {
    message: {
      mtype: 'text',
      properties: {
        text: event.text,
        quick_replies: event.raw.quick_replies
      }
    }
  })
}

const quickReplyMessage = (payload, event) => {
  return merge(payload, {
    message: {
      mtype: 'quick_reply',
      properties: {
        text: event.raw.message.text
      }
    }
  })
}

const outgoingAttachmentMessage = (payload, event) => {
  return merge(payload, {
    message: {
      mtype: event.raw.type,
      properties: {
        url: event.raw.url,
        quick_replies: event.raw.quick_replies
      }
    }
  })
}

// @note Only the first attachment is considered
const incomingAttachmentMessage = (payload, event) => {
  let attachment = event.raw.message.attachments[0]

  return merge(payload, {
    message: {
      mtype: attachment.type,
      properties: {
        url: attachment.payload.url
      }
    }
  })
}

const templateMessage = (payload, event) => {
  return merge(payload, {
    message: {
      mtype: 'template',
      properties: event.raw.payload
    }
  })
}

const buttonMessage = (payload, event) => {
  return merge(payload, {
    message: {
      mtype: 'button',
      properties: event.raw.payload
    }
  })
}

const platformsMapping = {
  facebook: 'messenger'
}

module.exports = {
  init: function(bp) {
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
