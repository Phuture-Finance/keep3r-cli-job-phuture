import {Job, JobWorkableGroup, makeid, prelog, toKebabCase} from '@keep3r-network/cli-utils';
import {getMainnetSdk} from '@src/eth-sdk-build';
import metadata from './metadata.json';

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

    logConsole.warn(`Job ${job.address} ${paused ? `is` : `is not`} paused`);

    // Check if it's the network's turn to work, go to the next job in the array if it isn't
    if (!paused) return;

    // Create work tx
    const tx = await job.populateTransaction.externalSwap(
      [],
      {
        account: '',
        buyPath: [],
        factory: '',
        maxSellShares: 0,
        minSwapOutputAmount: 0,
      },
      {
        nonce: args.keeperNonce,
        gasLimit: 2_000_000,
        type: 2,
      },
    );

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
    logConsole.warn('Simulation failed, probably in cooldown');
  }

  // Finish job process
  args.subject.complete();
};

const job: Job = {
  getWorkableTxs,
};

module.exports = job;
