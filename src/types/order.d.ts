import {BigNumberish} from 'ethers';

export enum OrderType {
  External = 'external',
  Internal = 'internal',
}

interface Sign {
  v: number;
  r: string;
  s: string;
  signer: string;
  deadline: string;
}

interface BaseOrder<T extends OrderType> {
  type: T;
  signs: Sign[];
}

export interface InternalOrder extends BaseOrder<OrderType.Internal> {
  internal: {
    sellAccount: string;
    buyAccount: string;
    maxSellShares: BigNumberish;
    buyPath: string[];
  };
}

export interface ExternalOrder extends BaseOrder<OrderType.External> {
  external: {
    router: string;
    factory: string;
    account: string;
    maxSellShares: BigNumberish;
    minSwapOutputAmount: BigNumberish;
    buyPath: string[];
  };
}

export type Order = InternalOrder | ExternalOrder;
