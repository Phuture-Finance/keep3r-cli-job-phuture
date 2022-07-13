import {Job, JobWorkableGroup, makeid, prelog, toKebabCase} from '@keep3r-network/cli-utils';
import {PopulatedTransaction} from 'ethers';
import {request} from 'undici';
import {getMainnetSdk} from '../../eth-sdk-build';
import {ExternalOrder, InternalOrder, Order, OrderType} from '../../types/order';
import metadata from './metadata.json';
import {orderUrl} from './constants.json';

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

    if (paused) return;

    const {statusCode, body} = await request(orderUrl);
    switch (statusCode) {
      case 200:
        logConsole.log(`Got 200 OK from Validator`);
        break;
      case 404:
        logConsole.log(`Got 404 Not Found from Validator. There are no orders currently, try again later.`);
        return;
      default:
        logConsole.error(`Expected to get 200 OK from Validator but instead got ${statusCode}`);
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
