import { Client } from 'client';
import { ClientKeyPaires } from '../types';

require('web3mq_mls');

import {
  setup_networking_config,
  initial_user,
  create_group,
  sync_mls_state,
  can_add_member_to_group,
  add_member_to_group,
  mls_encrypt_msg,
  mls_decrypt_msg,
} from 'web3mq_mls';

import { request } from 'core/request';

export class MlsClient {
  private readonly _client: Client;
  private readonly _keys: ClientKeyPaires;

  constructor(client: Client) {
    this._client = client;
    this._keys = client.keys;

    const { baseURL } = request.defaults;
    const { userid, PublicKey, PrivateKey } = client.keys;
    // setup mls networking config
    this.setupNetworkingConfig(baseURL, PublicKey, userid, PrivateKey);
  }

  setupNetworkingConfig(
    base_url?: string,
    pubkey?: string,
    did_key?: string,
    private_key?: string,
  ) {
    setup_networking_config(base_url, pubkey, did_key, private_key);
  }

  async initialUser() {
    await initial_user(this._keys.userid);
  }

  async createGroup(groupId: string): Promise<string> {
    return await create_group(this._keys.userid, groupId);
  }

  async syncMlsState() {
    await sync_mls_state(this._keys.userid);
  }

  async canAddMemberToGroup(targetUserId: string): Promise<boolean> {
    return await can_add_member_to_group(this._keys.userid, targetUserId);
  }

  async addMemberToGroup(memberUserId: string, groupId: string) {
    await add_member_to_group(this._keys.userid, memberUserId, groupId);
  }

  async mlsEncryptMsg(msg: string, groupId: string): Promise<string> {
    return await mls_encrypt_msg(this._keys.userid, msg, groupId);
  }

  async mlsDecryptMsg(msg: string, senderUserId: string, groupId: string): Promise<string> {
    return await mls_decrypt_msg(this._keys.userid, msg, senderUserId, groupId);
  }
}
