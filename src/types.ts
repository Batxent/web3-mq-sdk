import { EVENT_MAP } from './core/events';

export type EventTypes = 'all' | keyof typeof EVENT_MAP;

export type ServiceResponse = {
  data: any;
  msg: string;
  code: number;
};

export type PageParams = {
  page?: number;
  size?: number;
};
export type Web3MQDBValuePayload = {
  [key: string]: any;
};

export type Web3MQDBValue = {
  messageId: string;
  from: string;
  contentTopic: string;
  timestamp: number;
  unread: number;
  lastMessage: string;
  updatedAt: string;
  payload: Web3MQDBValuePayload;
};

export type KeyPairsType = {
  PrivateKey: string;
  PublicKey: string;
  userid: string;
};

export type EthAccountType = {
  address: string;
  balance: number;
  shortAddress: string;
};

export type signMetaMaskParams = {
  signContentURI: string;
  EthAddress?: string;
  nickname?: string;
  avatar_url?: string;
  avatar_base64?: string;
};

export type initOptions = {
  connectUrl?: string | null;
  app_key?: string;
  env?: EnvTypes;
};

export type SignClientCallBackType = {
  type: 'connect' | 'messageStatus' | 'keys';
  data: any;
};

export type WalletUserInfoType = {
  did_signature: string;
  did_type: string;
  did_value: string;
  pubkey: string;
  pubkey_type: string;
  signature_content: string;
  timestamp: number;
  userid: string;
  wallet_address: string;
  wallet_type: string;
};

export type SendTempConnectOptions = {
  dAppID: string;
  topicID: string;
  signatureTimestamp: number;
  dAppSignature: string;
};

export type getUserInfoParams = {
  did_type: string;
  did_value: string;
  timestamp: number;
};

export interface SignConnectOptions extends SendTempConnectOptions {
  wsUrl: string;
}

export type EnvTypes = 'dev' | 'test';

export interface ClientKeyPaires extends KeyPairsType {
  userid: string;
}

export type LoginParams = {
  userid: string;
  did_type: 'eth';
  did_value: string;
  did_signature: string;
  pubkey_type: 'ed25519';
  pubkey_value: string;
  signature_content: string;
  timestamp: number;
  nickname?: string;
  avatar_base64?: string;
  avatar_url?: string;
  testnet_access_key?: string;
};

export type BaseParams = {
  userid: string;
  web3mq_signature: string;
  timestamp: number;
};

export type NewBaseParams = {
  userid: string;
  web3mq_user_signature: string;
  timestamp: number;
};

export interface CreateRoomParams extends BaseParams {
  group_name?: string;
  avatar_url?: string;
  avatar_base64?: string;
}

export interface CommonGetListPatams extends BaseParams, PageParams {}

export type ActiveChannelType = {
  avatar_base64: string;
  avatar_url: string;
  chat_name: string;
  chat_type: string;
  chatid: string;
  updatedAt?: string;
  unread?: number;
  lastMessage?: string;
  // topic: string;
  // topic_type: string;
};

export interface getMessageListParams extends BaseParams, PageParams {
  topic: string;
}

export interface getGroupMemberListParams extends BaseParams, PageParams {
  groupid: string;
}

export interface inviteGroupMemberParams extends BaseParams {
  groupid: string;
  members: string[];
}

export type MessageStatus = 'delivered' | 'read';

export interface changeMessageStatusParams extends BaseParams {
  topic: string;
  messages: string[];
  status: MessageStatus;
}

export interface syncNewMessagesParams {
  sync_timestamp: number;
  timestamp: number;
  userid: string;
  web3mq_user_signature: string;
}

export type MessageListItem = {
  cipher_suite: string;
  from: string;
  topic: string;
  from_sign: string;
  messageid: string;
  payload_type: string;
  timestamp: number;
  message_status: {
    status: MessageStatus;
    timestamp: number;
  };
  payload: string;
  version: number;
};

export interface searchParams extends BaseParams {
  keyword: string;
}

export interface profileParams extends BaseParams {
  nickname: string;
  avatar_url: string;
}

export interface sendFriendParams extends BaseParams {
  target_userid: string;
}

export interface GetUserBindDidsParams extends BaseParams {}
export interface UserBindDidParams extends BaseParams {
  provider_id: string;
  did_type: string;
  did_value: string;
  did_action?: string;
  did_content?: string;
}

export interface FollowOperationParams extends NewBaseParams {
  target_userid: string;
  action: 'follow' | 'cancel';
}

export interface GetFollowerListParams extends NewBaseParams, PageParams {}

export interface getUserPublicProfileParams {
  did_type: string;
  did_value: string;
  timestamp: number;
  my_userid: string;
}

export interface GetPublicFollowerListParams extends PageParams {
  userid: string;
  timestamp: number;
}

export interface PublishNotificationToFollowersParams extends NewBaseParams {
  title: string;
  content: string;
}
export interface UpdateUserPermissionsParams extends NewBaseParams {
  permissions: Record<string, { type: string; value: boolean }>;
}

export type ActionType = 'agree';

export interface operationFriendParams extends BaseParams {
  target_userid: string;
  action: ActionType;
}

export type ContactListItemType = {
  userid: string;
};

export type SearchUsersResponse = {
  avatar_url: string;
  nickname: string;
  userid: string;
  wallet_address: string;
  wallet_type: string;
};

export type UpdateMyProfileResponse = {
  userid: string;
  wallet_address: string;
  wallet_type: string;
  nickname: string;
  avatar_url: string;
};

export interface ChangeNotificationStatusParams extends BaseParams {
  messages: string[];
  status: MessageStatus;
}

export type NotifyResponse = {
  title: string;
  content: string;
  type: string;
  version: number;
  timestamp: number;
};

export interface CreateTopicParams extends BaseParams {
  topic_name: string;
}

export interface SubscribeTopicParams extends BaseParams {
  topicid: string;
}

export interface PublishTopicMessageParams extends SubscribeTopicParams {
  title: string;
  content: string;
}

export interface GetTopicListParams extends PageParams, BaseParams {}

export type SubscribeListType = {
  topicid: string;
  create_at: number;
};

export interface TopicListType extends SubscribeListType {
  topic_name: string;
}
