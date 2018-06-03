# ILP Plugin Mini Balances
> ILP Plugin Mini Accounts without unlimited spending

- [Overview](#overview)
- [Usage](#usage)

## Overview

This plugin is similar to `ilp-plugin-mini-accounts` in that anyone can connect
to it with a secret and be assigned a sub-account. It differs in that these
sub-accounts are not granted unlimited spending.

When an incoming packet is fulfilled, it increases the balance of the
sub-account.  When an outgoing packet is prepared, it decreases the balance of
the sub-account. If an outgoing packet is rejected, it increases the balance of
the sub-account.

These balances are NOT intended for long-term storage or for saving significant
amounts of value. It's intended to be an ephemeral buffer that applications can
use in order to distribute an incoming stream of money to other destinations.
Anyone running this plugin can set a maximum balance in order to further
discourage incorrect usage and prevent possible loss of money.

## Usage

```js
const PluginMiniBalances = require('ilp-plugin-mini-balances')

const plugin = new PluginMiniBalances({
  port: '7768',
  maxBalance: '1000000'
})
```

- `port` - The port to listen on (same as in `ilp-plugin-mini-accounts`) (default `3000`)
- `maxBalance` - The max number of units any one sub-account can accumulate (default `Infinity`)
