const IlpPacket = require('ilp-packet')
const PluginMiniAccounts = require('ilp-plugin-mini-accounts')
const debug = require('debug')('ilp-plugin-mini-balances')
const BigNumber = require('bignumber.js')
const crypto = require('crypto')

class PluginMiniBalances extends PluginMiniAccounts {
  constructor (opts) {
    super(opts)
    if (!this._store) {
      throw new Error('store must be provided')
    }
  }

  _balanceKey (ilpAddress) {
    return this.ilpAddressToAccount(ilpAddress) + ':balance'
  }

  _addBalance (address, amount) {
    const balance = new BigNumber(this._store.get(this._balanceKey(address)) || '0')
    const newBalance = balance.plus(amount)

    debug(`add balance. ` +
      `amount=${amount} ` +
      `balance=${balance.toString()} ` +
      `newBalance=${newBalance.toString()} ` +
      `address=${address}`)

    this._store.set(this._balanceKey(address), newBalance.toString())
  }

  async _connect (account) {
    // TODO: where should we unload these?
    await this._store.load(this._balanceKey(account))
    await this._store.set(this._balanceKey(account),
      this._store.get(this._balanceKey(account)) || '0')
  }

  async _handlePrepareResponse (destination, packet, prepare) {
    if (packet.type === IlpPacket.TYPE_FULFILL) {
      if (!crypto.createHash('sha256')
        .update(packet.data.fulfillment)
        .digest()
        .equals(prepare.data.executionCondition)) {
        throw new IlpPacket.Errors.WrongConditionError(
          `condition and fulfillment mismatch. ` +
          `condition=${prepare.data.executionCondition.toString('hex')} ` +
          `fulfillment=${packet.data.fulfillment.toString('hex')}`)
      }
      this._addBalance(destination, prepare.data.amount)
    }
  }

  async _handleCustomData (from, btpPacket) {
    const { ilp } = this.protocolDataToIlpAndCustom(btpPacket)

    if (!ilp) {
      throw new Error('invalid packet, no ilp protocol data.')
    }

    if (!this._dataHandler) {
      throw new Error('no request handler registered.')
    }

    const parsedRequest = IlpPacket.deserializeIlpPacket(ilp)
    const isPrepare = parsedRequest.type === IlpPacket.TYPE_PREPARE
    if (isPrepare) {
      const balance = new BigNumber(this._store.get(this._balanceKey(from)) || '0')
      const newBalance = balance.minus(parsedRequest.data.amount)

      debug(`subtract balance. ` +
        `amount=${parsedRequest.data.amount} ` +
        `balance=${balance.toString()} ` +
        `newBalance=${newBalance.toString()} ` +
        `address=${from}`)

      if (newBalance.isLessThan('0')) {
        return this.ilpAndCustomToProtocolData({
          ilp: IlpPacket.serializeIlpReject({
            code: 'T04',
            triggeredBy: this._prefix.substring(0, this._prefix.length - 1),
            message: 'account has insufficient balance.'
          })
        })
      }

      this._store.set(this._balanceKey(from), newBalance.toString())
    }

    const response = await this._dataHandler(ilp)
    const parsedResponse = IlpPacket.deserializeIlpPacket(response)
    if (isPrepare && parsedResponse.type === IlpPacket.TYPE_REJECT) {
      this._addBalance(from, parsedRequest.data.amount)
    }

    return this.ilpAndCustomToProtocolData({ ilp: response })
  }
}

module.exports = PluginMiniBalances
