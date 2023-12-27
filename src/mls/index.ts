import { Client } from 'client';
import { ClientKeyPaires } from '../types';
import { request, theDidKey } from 'core/request';

/**
 * `MlsClient` is a class for managing the MLS (Messaging Layer Security) protocol.
 * It's a wrapper of the `web3mq_mls` library which is export by WASM.
 */
export class MlsClient {
  private readonly _client: Client;
  private readonly _keys: ClientKeyPaires;
  private _wasm: any;

  constructor(client: Client) {
    this._client = client;
    this._keys = client.keys;

    const { baseURL } = request.defaults;
    const { PublicKey, PrivateKey } = client.keys;
    this.setupWasm().then(() => {
      // setup mls networking config
      this.setupNetworkingConfig(baseURL, PublicKey, theDidKey, PrivateKey);
      this.initialUser()
        .then(() => {
          console.log('mls user init');
          this.registerUser();
        })
        .catch((error) => {
          console.error('Initial user failed:', error);
        });
    });
  }

  async setupWasm() {
    console.log('start loading wasm from sdk');
    this._wasm = await import('web3mq_mls');
    console.log(this._wasm, 'wasm loaded from sdk');
  }

  setupNetworkingConfig(
    base_url?: string,
    pubkey?: string,
    did_key?: string,
    private_key?: string,
  ) {
    this._wasm.setup_networking_config(base_url, pubkey, did_key, private_key);
  }

  bGreet() {
    this._wasm.greet('hello world');
  }

  async initialUser() {
    await this._wasm.initial_user(this._keys.userid);
  }

  async registerUser() {
    await this._wasm.register_user(this._keys.userid);
  }

  async createGroup(groupId: string): Promise<string> {
    return await this._wasm.create_group(this._keys.userid, groupId);
  }

  async isMlsGroup(groupId: string): Promise<boolean> {
    return await this._wasm.is_mls_group(this._keys.userid, groupId);
  }

  async syncMlsState(groupIds: string[]) {
    await this._wasm.sync_mls_state(this._keys.userid, groupIds);
  }

  async canAddMemberToGroup(targetUserId: string): Promise<boolean> {
    return await this._wasm.can_add_member_to_group(this._keys.userid, targetUserId);
  }

  async addMemberToGroup(memberUserId: string, groupId: string) {
    await this._wasm.add_member_to_group(this._keys.userid, memberUserId, groupId);
  }

  async mlsEncryptMsg(msg: string, groupId: string): Promise<string> {
    return await this._wasm.mls_encrypt_msg(this._keys.userid, msg, groupId);
  }

  async mlsDecryptMsg(msg: string, senderUserId: string, groupId: string): Promise<string> {
    return await this._wasm.mls_decrypt_msg(this._keys.userid, msg, senderUserId, groupId);
  }

  async handleMlsGroupEvent(msg: any) {
    return await this._wasm.handle_mls_group_event(this._keys.userid, msg);
  }
}
