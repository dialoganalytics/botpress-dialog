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
