import axios, { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios';

import { ServiceResponse } from '../types';

export let request: AxiosInstance;
export let theDidKey: string = '';
export class Request {
  constructor(httpUrl: string, tempPubkey: string = '', didKey: string = '') {
    theDidKey = didKey;
    request = axios.create({
      baseURL: httpUrl,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'web3mq-request-pubkey': tempPubkey,
        didkey: didKey,
      },
      timeout: 10000,
      // withCredentials: true,
    });

    request.interceptors.request.use(
      (config: AxiosRequestConfig) => config,
      (error: any) => {
        throw new Error(error);
      },
    );

    request.interceptors.response.use(
      (response: AxiosResponse<ServiceResponse>) => {
        const { data } = response;
        if (data.code !== 0) {
          throw new Error(data.msg);
        }
        return data;
      },
      (error: any) => {
        const { status, data } = error.response;
        if (status !== 200) {
          throw new Error(data.message);
        }
      },
    );
  }
}
