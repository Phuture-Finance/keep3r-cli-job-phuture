import {defineConfig} from '@dethcrypto/eth-sdk';

export default defineConfig({
  outputPath: 'src/eth-sdk-build',
  contracts: {
    mainnet: {
      job: '0x656027367B5e27dC21984B546e64dC24dBFaA187',
    },
  },
});
