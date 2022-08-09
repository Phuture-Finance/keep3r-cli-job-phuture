import {Job, JobWorkableGroup, makeid, prelog, toKebabCase} from '@keep3r-network/cli-utils';
import {PopulatedTransaction, BigNumberish, BytesLike} from 'ethers';
import {request} from 'undici';
import {getMainnetSdk} from '../../eth-sdk-build';
import metadata from './metadata.json';
import {orderUrl} from './constants.json';

type Address = string;

enum OrderType {
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

interface InternalOrder extends BaseOrder<OrderType.Internal> {
  internal: {
    sellAccount: Address;
    buyAccount: Address;
    sellAsset: Address;
    buyAsset: Address;
    maxSellShares: BigNumberish;
  };
}

interface ExternalOrder extends BaseOrder<OrderType.External> {
  external: {
    account: Address;
    sellAsset: Address;
    buyAsset: Address;
    sellShares: BigNumberish;
    swapTarget: Address;
    swapData: BytesLike;
  };
}

type Order = InternalOrder | ExternalOrder;

const getWorkableTxs: Job['getWorkableTxs'] = async (args) => {
  // Setup logs
  const correlationId = toKebabCase(metadata.name);
  const logMetadata = {
    job: metadata.name,
    block: args.advancedBlock,
    logId: makeid(5),
  };
  const logConsole = prelog(logMetadata);

  // Skip job if already in progress
  if (args.skipIds.includes(correlationId)) {
    logConsole.log(`Skipping job`);
    args.subject.complete();
    return;
  }

  logConsole.log(`Trying to work`);

  // Setup job
  const signer = args.fork.ethersProvider.getSigner(args.keeperAddress);
  const {job} = getMainnetSdk(signer);

  try {
    // Check if job is workable
    const paused = await job.paused({blockTag: args.advancedBlock});

    const notOrNull = paused ? `` : `not`;
    logConsole.warn(`Job ${job.address} is ${notOrNull} paused`);

    if (paused) {
      args.subject.complete();
      return;
    }

    const {statusCode, body} = await request(orderUrl);
    switch (statusCode) {
      case 200:
        logConsole.log(`Got 200 OK from Validator`);
        break;
      case 404:
        logConsole.log(`Got 404 Not Found from Validator. There are no orders currently, try again later.`);
        args.subject.complete();
        return;
      default:
        logConsole.error(`Expected to get 200 OK from Validator but instead got ${statusCode}`);
        args.subject.complete();
        return;
    }

    let tx: PopulatedTransaction;

    const {type, signs, ...order} = (await body.json()) as Order;
    switch (type) {
      case OrderType.External: {
        const {external} = order as ExternalOrder;

        await job.callStatic.externalSwap(signs, external, {
          blockTag: args.advancedBlock,
        });

        tx = await job.populateTransaction.externalSwap(signs, external, {
          nonce: args.keeperNonce,
          gasLimit: 2_000_000,
          type: 2,
        });

        break;
      }

      case OrderType.Internal: {
        const {internal} = order as InternalOrder;

        await job.callStatic.internalSwap(signs, internal, {
          blockTag: args.advancedBlock,
        });

        tx = await job.populateTransaction.internalSwap(signs, internal, {
          nonce: args.keeperNonce,
          gasLimit: 2_000_000,
          type: 2,
        });

        break;
      }

      default:
        logConsole.error(`Unexpected order type received`);
        args.subject.complete();
        return;
    }

    // Create a workable group every bundle burst
    const workableGroups: JobWorkableGroup[] = Array.from({length: args.bundleBurst}, (_, index) => ({
      targetBlock: args.targetBlock + index,
      txs: [tx],
      logId: `${logMetadata.logId}-${makeid(5)}`,
    }));

    // Submit all bundles
    args.subject.next({
      workableGroups,
      correlationId,
    });
  } catch {
    logConsole.warn('Simulation failed, probably in cool-down');
  }

  // Finish job process
  args.subject.complete();
};

const job: Job = {
  getWorkableTxs,
};

module.exports = job;
