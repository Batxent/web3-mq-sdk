import { Client } from '../client';
import { ClientKeyPaires, PageParams, MessageStatus, MessageListItem, DidType } from '../types';
import {
  getDataSignature,
  renderMessagesList,
  renderMessage,
  transformAddress,
  saveMessageUpdateDate,
  getGroupId,
  updateMessageLoadStatus,
  isGroupTopic,
} from '../utils';
import { getMessageListRequest, changeMessageStatusRequest } from '../api';
import {
  PbTypeMessage,
  PbTypeMessageStatusResp,
  PbTypeMessageChangeStatus,
  PbTypeMLSGroupEvent,
} from '../core/pbType';
import {
  Web3MQRequestMessage,
  Web3MQChangeMessageStatus,
  Web3MQMessageStatusResp,
} from '../pb/message';
import { sendMessageCommand } from '../connect/wsCommand';

export class Message {
  private readonly _client: Client;
  private readonly _keys: ClientKeyPaires;
  msg_text: string;
  messageList: MessageListItem[] | null;

  constructor(client: Client) {
    this._client = client;
    this._keys = client.keys;
    this.msg_text = '';
    client.connect.receive = this.receive;
    this.messageList = null;
  }

  async getMessageList(option: PageParams, userId?: string) {
    const topic = userId || this._client.channel.activeChannel?.chatid;
    if (topic) {
      const { userid, PrivateKey } = this._keys;
      const timestamp = Date.now();
      const msg = userid + topic + timestamp;
      const web3mq_signature = await getDataSignature(PrivateKey, msg);
      const {
        data: { result = [] },
      } = await getMessageListRequest({ userid, timestamp, web3mq_signature, topic, ...option });
      const data = await renderMessagesList(result, this._client);
      const list = data.reverse() ?? [];
      if (this.messageList && option.page !== 1) {
        this.messageList = [...this.messageList, ...list];
      } else {
        this.messageList = list;
      }
      this._client.emit('message.getList', { type: 'message.getList' });
      // return data;
    }
  }

  /**
   * if message from group chat: topic = group id
   * if message from one chat: topic = userid
   */
  async changeMessageStatus(messages: string[], status: MessageStatus = 'delivered') {
    const topic = this._client.channel.activeChannel?.chatid;
    if (topic) {
      const { userid, PrivateKey } = this._keys;
      const timestamp = Date.now();
      const signContent = userid + status + timestamp;
      const web3mq_signature = await getDataSignature(PrivateKey, signContent);

      const data = await changeMessageStatusRequest({
        topic,
        web3mq_signature,
        timestamp,
        userid,
        messages,
        status,
      });
      return data;
    }
  }

  async sendMessage(msg: string, userId?: string, didType?: DidType, enableMls: boolean = false) {
    const { keys, connect, channel } = this._client;
    const topicId = userId
      ? await transformAddress(userId, didType)
      : channel.activeChannel?.chatid;

    let cipherSuite = 'None';
    console.log('debug:sendMessage:enableMls', enableMls);
    if (topicId) {
      this.msg_text = msg;
      let isMlsGroup = await this._client.mls.isMlsGroup(topicId);
      console.log('debug:sendMessage:isMlsGroup', isMlsGroup);
      if (isGroupTopic(topicId) && isMlsGroup && enableMls) {
        cipherSuite = 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519';
        msg = await this._client.mls.mlsEncryptMsg(msg, topicId);
      }

      console.log('debug:sendMessage:cipherSuite', cipherSuite);

      const { concatArray, msgid } = await sendMessageCommand(
        keys,
        topicId,
        msg,
        connect.nodeId,
        cipherSuite,
      );

      const tempMessageData = {
        messageId: msgid,
        timestamp: BigInt(Math.round(Date.now() / 1000)),
        payload: msg,
        contentTopic: topicId,
        cipher_suite: cipherSuite,
      };

      const tempMessage = await renderMessage(
        PbTypeMessageStatusResp,
        tempMessageData,
        this._client,
      );

      if (this.messageList) {
        this.messageList = [...this.messageList, { ...tempMessage }];
      }

      if (this._client.listeners.events['message.send']) {
        this._client.emit('message.send', { type: 'message.send' });
      }

      connect.send(concatArray);
    }
  }

  receive = async (pbType: number, bytes: Uint8Array) => {
    if (pbType === PbTypeMessage) {
      const resp = Web3MQRequestMessage.fromBinary(bytes);
      if (resp.messageType === 'dapp_bridge') {
        return;
      }
      console.log('debug:receive:PbTypeMessage:resp', resp);
      saveMessageUpdateDate();
      const msg = await renderMessage(pbType, resp, this._client);
      console.log('debug:receive:PbTypeMessage:msg', msg);

      // if current channel is active, update msg list
      if (getGroupId(resp, this._client) === this._client.channel.activeChannel?.chatid) {
        if (this.messageList) {
          this.messageList = [...this.messageList, msg];
        }
        // channel.handleLastMessage(resp.comeFrom, msg);
        this._client.emit('message.getList', { type: 'message.getList', data: resp });
      }

      // unread
      await this._client.channel.handleUnread(resp, msg);
    }
    if (pbType === PbTypeMessageStatusResp) {
      const resp = Web3MQMessageStatusResp.fromBinary(bytes);
      saveMessageUpdateDate();
      const msg = await renderMessage(pbType, resp, this._client);
      console.log('debug:receive:PbTypeMessageStatusResp:PbTypeMessageStatusResp:msg', msg);
      this._client.channel.handleUnread(resp, msg);
      if (this.messageList) {
        const msgList = updateMessageLoadStatus(this.messageList, msg);
        this.messageList = [...msgList];
      }
      this._client.emit('message.delivered', { type: 'message.delivered', data: resp });
    }
    if (pbType === PbTypeMessageChangeStatus) {
      const resp = Web3MQChangeMessageStatus.fromBinary(bytes);
      console.log('changeMsgStatus:', resp);
    }
    if (pbType === PbTypeMLSGroupEvent) {
      // handle the mls group event
      const resp = Web3MQRequestMessage.fromBinary(bytes);
      console.log('debug:receive:PbTypeMLSGroupEvent', resp);
      this._client.mls.handleMlsGroupEvent(resp.payload);
      console.log('handle mls group event:', resp);
    }
  };
}
