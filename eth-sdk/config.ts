import {defineConfig} from '@dethcrypto/eth-sdk';

export default defineConfig({
  outputPath: 'src/eth-sdk-build',
  contracts: {
    mainnet: {
      job: '0x133A4273589c2eE5F9Fe28898B68aC1B4B1BA9B0',
    },
  },
});
