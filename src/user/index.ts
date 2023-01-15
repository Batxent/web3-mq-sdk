import { Client } from '../client';
import {
  ClientKeyPaires,
  SearchUsersResponse,
  UpdateMyProfileResponse,
  UserBindDidParams,
  PageParams,
  FollowOperationParams,
  PublishNotificationToFollowersParams,
  UpdateUserPermissionsParams,
} from '../types';
import {
  searchUsersRequest,
  getMyProfileRequest,
  updateMyProfileRequest,
  getUserBindDidsRequest,
  userBindDidRequest,
  followOperationRequest,
  getFollowerListRequest,
  getFollowingListRequest,
  publishNotificationToFollowersRequest,
  getUserPermissionsRequest,
  updateUserPermissionsRequest,
  getTargetUserPermissionsRequest,
} from '../api';
import { getDataSignature, transformAddress } from '../utils';

export class User {
  private readonly _client: Client;
  private readonly _keys: ClientKeyPaires;
  userInfo: SearchUsersResponse | null;
  constructor(client: Client) {
    this._client = client;
    this._keys = client.keys;
    this.userInfo = null;
  }

  async searchUsers(walletAddress: string): Promise<SearchUsersResponse> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + walletAddress + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);

    const { data } = await searchUsersRequest({
      web3mq_signature,
      userid,
      timestamp,
      keyword: walletAddress,
    });

    this.userInfo = data;
    return data;
  }

  async getMyProfile(): Promise<SearchUsersResponse> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);

    const { data } = await getMyProfileRequest({ web3mq_signature, userid, timestamp });
    return data;
  }

  async updateMyProfile(nickname: string, avatar_url: string): Promise<UpdateMyProfileResponse> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);

    const data = await updateMyProfileRequest({
      web3mq_signature,
      userid,
      timestamp,
      nickname,
      avatar_url,
    });
    return data;
  }

  async getUserBindDids(): Promise<any> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);
    const { data } = await getUserBindDidsRequest({ web3mq_signature, userid, timestamp });
    return data;
  }

  async userBindDid(
    params: Omit<UserBindDidParams, 'userid' | 'web3mq_signature' | 'timestamp'>,
  ): Promise<any> {
    const { did_type, did_value } = params;
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + did_type + did_value + timestamp;
    const web3mq_signature = await getDataSignature(PrivateKey, signContent);
    const data = await userBindDidRequest({ web3mq_signature, userid, timestamp, ...params });
    return data;
  }

  async followOperation(
    params: Pick<FollowOperationParams, 'target_userid' | 'action'>,
  ): Promise<any> {
    const { target_userid, action } = params;
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + target_userid + action + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const data = await followOperationRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      ...params,
    });
    return data;
  }

  async getFollowerList(params: PageParams): Promise<any> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const { data } = await getFollowerListRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      ...params,
    });
    return data;
  }

  async getFollowingList(params: PageParams): Promise<any> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const { data } = await getFollowingListRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      ...params,
    });
    return data;
  }

  async publishNotificationToFollowers(
    params: Pick<PublishNotificationToFollowersParams, 'title' | 'content'>,
  ): Promise<any> {
    const { title } = params;
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + title + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const data = await publishNotificationToFollowersRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      ...params,
    });
    return data;
  }

  async getUserPermissions(): Promise<any> {
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const { data } = await getUserPermissionsRequest({
      web3mq_user_signature,
      userid,
      timestamp,
    });
    return data;
  }

  async getTargetUserPermissions(userId: string) {
    const target_userid = await transformAddress(userId);
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + target_userid + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const data = await getTargetUserPermissionsRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      target_userid
    });
    return data;
  }

  async updateUserPermissions(params: Pick<UpdateUserPermissionsParams, 'permissions'>) {
    const { permissions } = params;
    const permissionsStr = JSON.stringify(permissions);
    const { userid, PrivateKey } = this._keys;
    const timestamp = Date.now();
    const signContent = userid + permissionsStr + timestamp;
    const web3mq_user_signature = await getDataSignature(PrivateKey, signContent);
    const data = await updateUserPermissionsRequest({
      web3mq_user_signature,
      userid,
      timestamp,
      ...params,
    });
    return data;
  }
}
