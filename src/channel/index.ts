import { Client } from '../client';
import {
  createRoomRequest,
  getRoomListRequest,
  getGroupMemberListRequest,
  inviteGroupMemberRequest,
  joinGroupRequest,
  getGroupPermissionsRequest,
  updateRoomListRequest,
  updateGroupPermissionsRequest,
  syncNewMessagesRequest,
  getGroupListRequest,
} from '../api';
import {
  ByteArrayToHexString,
  getDataSignature,
  getGroupId,
  getMessageUpdateDate,
  sha256,
} from '../utils';
import {
  PageParams,
  ChannelItemType,
  ClientKeyPaires,
  CreateRoomParams,
  ServiceResponse,
  UpdateRoomListParams,
  UpdateGroupPermissionsParams,
  Web3MQDBValue,
  CreateRoomApiParams,
  UpdateGroupPermissionsApiParams,
} from '../types';
import { Web3MQMessageStatusResp, Web3MQRequestMessage } from '../pb';

export class Channel {
  private readonly _client: Client;
  private readonly _keys: ClientKeyPaires;
  channelList: ChannelItemType[] | null;
  activeChannel: ChannelItemType | null;

  constructor(client: Client) {
    this._client = client;
    this._keys = client.keys;
    this.channelList = null;
    this.activeChannel = null;
  }

  private handleUpdateChannel(msg: any, chatid: string) {
    if (!this.channelList) {
      return;
    }
    this.channelList.map((item) => {
      if (item.chatid === chatid) {
        item.lastMessage = msg.lastMessage;
        item.updatedAt = msg.updatedAt;
        item.unread = msg.unread || 0;
      }
    });
    this._client.emit('channel.updated', { type: 'channel.updated' });
  }

  private async syncNewMessages(): Promise<Record<string, any>> {
    const sync_timestamp = getMessageUpdateDate();
    if (!sync_timestamp) {
      return {};
    }
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + sync_timestamp + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);
    const { data } = await syncNewMessagesRequest({
      sync_timestamp,
      timestamp,
      userid,
      web3mq_user_signature: web3mq_signature,
    });
    return data;
  }

  private async syncMlsEvents() {
    // TODO: handle the case where the user has joined more than 20 groups.
    let groupIds: string[] = await this.queryGroups({
      page: 1,
      size: 40,
    });
    console.log('groupIds:', groupIds);
    await this._client.mls.syncMlsState(groupIds);
  }

  /// Fetch all groups which the user joined.
  async queryGroups(option: PageParams): Promise<string[]> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);
    const {
      data: { result = [] },
    } = await getGroupListRequest({ web3mq_signature, userid, timestamp, ...option });
    return await Promise.all(
      result.map((item: { [key: string]: string }) => {
        return item.groupid;
      }),
    );
  }

  async handleUnread(resp: Web3MQRequestMessage | Web3MQMessageStatusResp, msg: any) {
    if (!this.activeChannel) {
      return;
    }
    const { storage } = this._client;
    let count = 0;
    const comeFrom = getGroupId(resp, this._client) || this.activeChannel.chatid;
    const data = await storage.getData(comeFrom);
    const msglist = !data ? [msg] : [...data.payload.messageList, msg];

    if (comeFrom !== this.activeChannel?.chatid) {
      count = !data ? 1 : data.unread + 1;
    }

    const indexeddbData: Web3MQDBValue = {
      messageId: resp.messageId,
      from: comeFrom,
      contentTopic: resp.contentTopic,
      timestamp: Number(resp.timestamp),
      unread: count,
      lastMessage: msg.content,
      updatedAt: msg.date,
      payload: {
        messageList: msglist,
      },
    };

    await storage.setData(comeFrom, indexeddbData);

    this.handleUpdateChannel(indexeddbData, comeFrom);
  }

  async setActiveChannel(channel: ChannelItemType | null) {
    this.activeChannel = channel;
    if (channel) {
      (this.activeChannel as ChannelItemType).unread = 0;
      const data = await this._client.storage.getData(channel.chatid);
      if (data && data.unread !== 0) {
        data.unread = 0;
        await this._client.storage.setData(channel?.chatid as string, data);
      }
      let isMls = await this._client.mls.isMlsGroup(channel.chatid);
      console.log('debug: isMls:', isMls);
      this.activeChannel!.isMls = isMls;
    }
    this._client.emit('channel.activeChange', { type: 'channel.activeChange' });
    // if (data && data.unread !== 0) {
    //   data.unread = 0;
    //   await this._client.storage.setData(channel?.chatid as string, data);
    //   this.channelList = (this.channelList as Array<ChannelItemType>).map((item) => {
    //     if (item.chatid === channel?.chatid) {
    //       item.unread = 0;
    //     }
    //     return item;
    //   });
    //   this._client.emit('channel.updated', { type: 'channel.updated' });
    // }
  }

  async queryChannels(option: PageParams) {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);

    const {
      data: { result = [] },
    } = await getRoomListRequest({ web3mq_signature, userid, timestamp, ...option });

    const allNewMessageData = await this.syncNewMessages();

    await this.syncMlsEvents();

    const list = await Promise.all(
      result.map(async (item: ChannelItemType) => {
        const data = await this._client.storage.getData(item.chatid);
        const currentNewMsgObj = allNewMessageData[item.chatid];
        let newMessageUnread = 0;
        for (let messageid in currentNewMsgObj) {
          if (
            currentNewMsgObj.hasOwnProperty(messageid) &&
            currentNewMsgObj[messageid] !== 'read'
          ) {
            newMessageUnread++;
          }
        }
        if (data) {
          if (newMessageUnread) {
            data.unread = newMessageUnread;
            await this._client.storage.setData(item.chatid, data);
          }
          const { unread, lastMessage, updatedAt } = data;
          item.unread = unread;
          item.lastMessage = lastMessage;
          item.updatedAt = updatedAt;
        }
        return item;
      }),
    );

    if (this.channelList && option.page !== 1) {
      this.channelList = [...this.channelList, ...list];
    } else {
      this.channelList = list;
    }

    this._client.emit('channel.getList', { type: 'channel.getList' });
  }

  async updateChannels(params: UpdateRoomListParams): Promise<ServiceResponse> {
    const { chatid, chatType, topic, topicType } = params;
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + topic + topicType + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);
    const data = await updateRoomListRequest({
      userid,
      web3mq_signature,
      timestamp,
      chatid,
      chat_type: chatType,
      topic,
      topic_type: topicType,
    });
    return data as any;
  }

  async createRoom(params: CreateRoomParams) {
    const { avatarUrl, avatarBase64, groupid = '', groupName, nfts, permissions } = params;
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    let payload: CreateRoomApiParams;
    if (nfts && nfts.length > 0) {
      let permission = permissions || {
        'group:join': {
          type: 'enum',
          value: 'nft_validation',
        },
      };
      const payload_hash = sha256(
        userid + groupid + JSON.stringify(permission) + JSON.stringify(nfts) + timestamp,
      );
      const payloadSting = ByteArrayToHexString(payload_hash);
      const web3mq_signature = await getDataSignature(PrivateKey, payloadSting);
      payload = {
        version: 2,
        web3mq_signature,
        userid,
        timestamp,
        avatar_base64: avatarBase64,
        avatar_url: avatarUrl,
        group_name: groupName,
        ...params,
        payload_hash: payloadSting,
        permissions: permission,
      };
    } else {
      const signContent = userid + groupid + timestamp;
      const web3mq_signature = await getDataSignature(PrivateKey, signContent);
      payload = {
        web3mq_signature,
        userid,
        timestamp,
        avatar_base64: avatarBase64,
        avatar_url: avatarUrl,
        group_name: groupName,
        ...params,
      };
    }
    const { data = { groupid: '', group_name: '', avatar_base64: '', avatar_url: '' } } =
      await createRoomRequest(payload);

    // If `createRoomRequest` success, then:
    this._client.mls.createGroup(data.groupid);

    if (!this.channelList) {
      return;
    }
    this.channelList = [
      {
        chatid: data.groupid,
        chat_type: 'group',
        chat_name: data.group_name,
        avatar_base64: data.avatar_base64,
        avatar_url: data.avatar_url,
      },
      ...this.channelList,
    ];
    this._client.emit('channel.getList', { type: 'channel.getList' });
  }

  // async updateRoom(topic: string, topic_type: string) {
  //   const { userid, PrivateKey } = this._keys;
  //   const timestamp = Date.now();
  //   const signContent = userid + timestamp;
  //   const web3mq_signature = await getDataSignature(PrivateKey, signContent);

  //   const data = await updateRoomListRequest({
  //     userid,
  //     timestamp,
  //     web3mq_signature,
  //     topic,
  //     topic_type,
  //   });
  //   return data;
  // }

  async getGroupMemberList(option: PageParams, chatId?: string) {
    const groupid = chatId || this.activeChannel?.chatid;
    if (groupid) {
      const { userid, PrivateKey } = this._keys;
      const timestamp = Date.now();
      const signContent = userid + groupid + timestamp;
      const web3mq_signature = await getDataSignature(PrivateKey, signContent);

      const data = await getGroupMemberListRequest({
        web3mq_signature,
        userid,
        timestamp,
        groupid,
        ...option,
      });
      return data;
    }
  }

  async inviteGroupMember(members: string[], chatId?: string) {
    const groupid = chatId || this.activeChannel?.chatid;
    if (groupid) {
      const { userid, PrivateKey } = this._keys;
      const timestamp = Date.now();
      const signContent = userid + groupid + timestamp;
      const web3mq_signature = await getDataSignature(PrivateKey, signContent);

      // TODO:
      // At present, we cannot determine whether a group was created by MLS.
      // For now, we will treat all groups as MLS groups.
      // In the future, we may need to add a field to the group creation interface to indicate
      // whether MLS encryption is enabled. The group information interface should also be able to
      // retrieve this identifier.

      // flitter the members who can be added to the group
      members = (
        await Promise.all(
          members.map(async (member) => {
            const canAdd = await this._client.mls.canAddMemberToGroup(member);
            return canAdd ? member : null;
          }),
        )
      ).filter((member): member is string => member !== null);

      if (members.length === 0) {
        return;
      }

      const data = await inviteGroupMemberRequest({
        web3mq_signature,
        userid,
        timestamp,
        groupid,
        members,
      });

      // If `inviteGroupMemberRequest` success, then:
      for (const member of members) {
        await this._client.mls.addMemberToGroup(member, groupid);
      }
      return data;
    }
  }

  async joinGroup(groupid: string) {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + groupid + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const { data } = await joinGroupRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      groupid,
    });
    if (!this.channelList) {
      return;
    }
    if (!this.channelList.find((item) => item.chatid !== groupid)) {
      const { groupid: group_id = '', group_name = '', avatar_base64 = '', avatar_url = '' } = data;
      this.channelList = [
        {
          chatid: group_id,
          chat_type: 'group',
          chat_name: group_name,
          avatar_base64: avatar_base64,
          avatar_url: avatar_url,
        },
        ...this.channelList,
      ];
      this._client.emit('channel.getList', { type: 'channel.getList' });
    }
  }

  async getGroupPermissions(groupid: string) {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + groupid + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const data = await getGroupPermissionsRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      groupid,
    });
    return data;
  }

  async updateGroupPermissions(params: UpdateGroupPermissionsParams) {
    const { groupid, permissions, nfts } = params;
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    let payload: UpdateGroupPermissionsApiParams;
    if (nfts && nfts.length > 0) {
      let permission = permissions || {
        'group:join': {
          type: 'enum',
          value: 'nft_validation',
        },
      };
      const payload_hash = sha256(
        userid + groupid + JSON.stringify(permission) + JSON.stringify(nfts) + timestamp,
      );
      const payloadSting = ByteArrayToHexString(payload_hash);
      const web3mq_user_signature = await getDataSignature(PrivateKey, payloadSting);
      payload = {
        version: 2,
        web3mq_user_signature,
        userid,
        groupid,
        timestamp,
        payload_hash: payloadSting,
        permissions: permission,
        nfts,
      };
    } else {
      const signContent = userid + groupid + timestamp;
      const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
      payload = {
        web3mq_user_signature,
        userid,
        timestamp,
        ...params,
      };
    }
    const data = await updateGroupPermissionsRequest(payload);
    return data;
  }
}
