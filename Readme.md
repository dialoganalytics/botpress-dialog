# botpress-dialog

Official Dialog module for [Botpress](http://github.com/botpress/botpress). Uses [dialog-node](https://github.com/dialoganalytics/dialog-node) behind the scenes.

[![Dependency Status](https://gemnasium.com/badges/github.com/dialoganalytics/botpress-dialog.svg)](https://gemnasium.com/github.com/dialoganalytics/botpress-dialog)
[![NPM Version](http://img.shields.io/npm/v/botpress-dialog.svg)](https://www.npmjs.org/package/botpress-dialog)

## Examples

- [Botpress application with Messenger and Dialog modules](https://github.com/dialoganalytics/botpress-example)

## Installation

```bash
$ botpress install dialog
```

## Get Started

Configure the module with your Dialog API token which is available in your [personal account](http://app.dialoganalytics.com/users/edit), and a bot ID.

<img alt='Configuration' src='/assets/configuration-screenshot.png' width='500px;' />

Configuration can also be done programmatically by providing the settings in the file `${modules_config_dir}/botpress-dialog.json`.

**Note:** Please note this currently only works with [botpress-messenger](https://github.com/botpress/botpress-messenger)

## Usage

Once the module is installed and configured, every incoming and outgoing messages will be tracked by Dialog.

### Advanced

Advanced instrumentation is exposed via the `bp.dialog` object. The following methods are available:

#### Events

Send events to Dialog to keep track of your custom logic. Optionally pass an Interlocutor's distinct id to tie the event to one of your bot's interlocutors. See [docs.dialoganalytics.com/reference/event#create](https://docs.dialoganalytics.com/reference/event#create)

```js
bp.dialog.event('subscribed', 'interlocutorDistinctId', { custom: 'value' })
```

#### Clicks

Record clicks by interlocutors inside a conversation using a trackable link. For every links that needs to be tracked, generate a trackable URL by passing the interlocutor's distinct Id (provided by the platform or provider) and the `url` to the `link` method. See [docs.dialoganalytics.com/reference/click-tracking](https://docs.dialoganalytics.com/reference/click-tracking/)

```js
bp.dialog.link('http://example.com', interlocutorDistinctId)
// https://api.dialoganalytics.com/v1/b/7928374/clicks/?id=123456&url=http%3A%2F%2Fexample.com
```

#### Attach

Modify the current `track` payload about to be sent to Dialog's API with this helper method.

For example, you can specify a message name:

```js
bp.dialog.attach('welcome')
bp.dialog.attach({ message: { name: 'welcome' }}) // equivalent
```

This will modify the `track` payload:

```js
{
  message: {
    name: "welcome",
    ...
  },
  conversation: { ... },
  creator: { ... }
}
```
