import { Client } from 'client';
import { ClientKeyPaires } from '../types';

//
import init, * as wasm from 'web3mq_mls/web3mq_mls';
import rust from '../../web3mq_mls_bg.wasm';

//
// import wasm from 'web3mq_mls';

// let wasm: any;

// import {
//   add_member_to_group,
//   can_add_member_to_group,
//   create_group,
//   greet,
//   handle_mls_group_event,
//   initial_user,
//   mls_decrypt_msg,
//   mls_encrypt_msg,
//   setup_networking_config,
//   sync_mls_state,
// } from 'web3mq_mls';

// import { request } from 'core/request';

/**
 * `MlsClient` is a class for managing the MLS (Messaging Layer Security) protocol.
 * It's a wrapper of the `web3mq_mls` library which is export by WASM.
 */
export class MlsClient {
  private readonly _client: Client;
  private readonly _keys: ClientKeyPaires;

  constructor(client: Client) {
    this._client = client;
    this._keys = client.keys;

    // import('../../web3mq_mls_bg.wasm')
    //   .then()
    // init().then((i) => {
    //   console.log('loaded_wasm:', i);
    // });

    rust().then((i: any) => {
      console.log('loaded_wasm:', i);
      init(i).then(() => {
        console.log('init wasm');
        wasm.greet('hello world');
      });
    });

    // .then((i) => init(i)ƒ)
    // .then(() => wasm.greet('hello world'));

    // rust().then({instance} => {
    //   console.log('loaded_wasm:', instance);
    //   initSync(instance).then(() => {
    //     console.log('init wasm');
    //     wasm.greet('hello world');
    //   });
    // });

    // import('web3mq_mls').then((instance) => {
    //   console.log('loaded_wasm:', instance);
    //   wasm = instance;
    //   instance.greet('hello world');
    // });

    // import('web3mq_mls')
    //   .then((m) => {
    //     wasm = m;
    //     console.log(m);
    //     m.greet('hello world');
    //   })
    //   .catch((error) => {
    //     console.error('Rust function failed:', error);
    //   });

    // wasm.greet('hello');

    // const { baseURL } = request.defaults;
    // const { userid, PublicKey, PrivateKey } = client.keys;
    // setup mls networking config

    // rust
    //   .then((m) => {
    //     wasm = m;
    //     console.log('hello!');
    //     // this.bGreet();
    //     // this.setupNetworkingConfig(baseURL, PublicKey, userid, PrivateKey);
    //     // this.initialUser().catch((error) => {
    //     //   console.error('Initial user failed:', error);
    //     // });
    //   })
    //   .catch(console.error);

    // init(wasm).then(() => {
    //   // this.bGreet();
    //   console.log('mls client init');
    // });

    // wasm().then((instance) => {
    //   init(instance).then(() => {
    //     this.bGreet();
    //     this.setupNetworkingConfig(baseURL, PublicKey, userid, PrivateKey);
    //     this.initialUser().catch((error) => {
    //       console.error('Initial user failed:', error);
    //     });
    //   });
    // });

    // init(wasm).then(() => {
    //   this.bGreet();
    //   this.setupNetworkingConfig(baseURL, PublicKey, userid, PrivateKey);
    //   this.initialUser().catch((error) => {
    //     console.error('Initial user failed:', error);
    //   });
    // });

    // this.bGreet();
    // console.log('mls client init');
    // this.setupNetworkingConfig(baseURL, PublicKey, userid, PrivateKey);
    // this.initialUser().catch((error) => {
    //   console.error('Initial user failed:', error);
    // });
  }

  setupNetworkingConfig(
    base_url?: string,
    pubkey?: string,
    did_key?: string,
    private_key?: string,
  ) {
    wasm.setup_networking_config(base_url, pubkey, did_key, private_key);
  }

  bGreet() {
    wasm.greet('hello world');
  }

  async initialUser() {
    await wasm.initial_user(this._keys.userid);
  }

  async createGroup(groupId: string): Promise<string> {
    return await wasm.create_group(this._keys.userid, groupId);
  }

  async syncMlsState(groupIds: string[]) {
    await wasm.sync_mls_state(this._keys.userid, groupIds);
  }

  async canAddMemberToGroup(targetUserId: string): Promise<boolean> {
    return await wasm.can_add_member_to_group(this._keys.userid, targetUserId);
  }

  async addMemberToGroup(memberUserId: string, groupId: string) {
    await wasm.add_member_to_group(this._keys.userid, memberUserId, groupId);
  }

  async mlsEncryptMsg(msg: string, groupId: string): Promise<string> {
    return await wasm.mls_encrypt_msg(this._keys.userid, msg, groupId);
  }

  async mlsDecryptMsg(msg: string, senderUserId: string, groupId: string): Promise<string> {
    return await wasm.mls_decrypt_msg(this._keys.userid, msg, senderUserId, groupId);
  }

  async handleMlsGroupEvent(msg: any) {
    return await wasm.handle_mls_group_event(this._keys.userid, msg);
  }
}
