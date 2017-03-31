import checkVersion from 'botpress-version-manager'

import util from 'util'
import path from 'path'
import fs from 'fs'

import Dialog from 'dialog-api/lib/messenger'

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
  if (event.platform == 'facebook') {
    let payload = {
      entry: [
        {
          messaging: [event.raw]
        }
      ]
    }

    dialog.incoming(payload, callback(event.bp.logger))
    event.bp.logger.verbose('[botpress-dialog] Incoming message')
  }

  next()
}

const outgoingMiddleware = (event, next) => {
  if (event.platform == 'facebook') {
    // Rebuild response object expected by dialog-api
    let response = {
      message_id: event.__id, // Not the real Facebook message ID, but whatever
      recipient_id: event.raw.to
    }

    // Rebuild payload object expected by dialog-api
    let payload
    if (event.type == 'text') {
      payload = {
        message: {
          text: event.raw.message,
          quick_replies: event.raw.quick_replies
        }
      }
    } else if (event.type == 'template') {
      payload = {
        message: {
          attachment: {
            type: 'template',
            payload: event.raw.payload
          }
        }
      }
    } else if (event.type == 'attachment') {
      payload = {
        message: {
          attachment: {
            type: event.raw.type,
            payload: event.raw
          }
        }
      }
    } else {
      // noop
    }

    if (payload) {
      dialog.outgoing(payload, response, callback(event.bp.logger))
      event.bp.logger.verbose('[botpress-dialog] Outgoing message')
    }
  }

  next()
}

const outgoingAttachMiddleware = (event, next) => {
  event.dialog.context = dialog.context || {}

  next()
}

module.exports = {
  config: {
    accessToken : { type: 'string', env: 'DIALOG_TOKEN' },
    botId: { type: 'string' }
  },

  init: (bp, configurator) => {
    checkVersion(bp, __dirname)

    configFile = path.join(bp.projectLocation, bp.botfile.modulesConfigDir, 'botpress-dialog.json')

    bp.middlewares.register({
      name: 'dialog.outgoing.attach',
      module: 'botpress-dialog',
      type: 'outgoing',
      handler: outgoingAttachMiddleware,
      order: 0,
      description: 'Modifies the outgoing payload of Dialog Analytics'
    })

    bp.middlewares.register({
      name: 'dialog.outgoing',
      module: 'botpress-dialog',
      type: 'outgoing',
      handler: outgoingMiddleware,
      order: 99, // Must be the last middleware to be called in order for dialog.attach() to work async
      description: 'Tracks outgoing messages with Dialog Analytics'
    })

    bp.middlewares.register({
      name: 'dialog.incoming',
      module: 'botpress-dialog',
      type: 'incoming',
      handler: incomingMiddleware,
      order: 0,
      description: 'Tracks incoming messages with Dialog Analytics'
    })

    let config = loadConfig()

    dialog = new Dialog(config.accessToken, config.botId)

    // Expose dialog methods
    bp.dialog = {
      attach: dialog.attach,
      track: dialog.track,
      event: dialog.event,
      link: dialog.link
    }
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
