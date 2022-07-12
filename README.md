[![image](https://img.shields.io/npm/v/@phuture/keep3r-cli-job-phuture.svg?style=flat-square)](https://www.npmjs.org/package/@phuture/keep3r-cli-job-phuture)

# Phuture Keep3r CLI Job

This CLI Job enables The Keep3r Network keepers on Ethereum to execute the PhutureJob.

## How to install

1. Open a terminal inside your [CLI](https://github.com/keep3r-network/cli) setup
2. Run `yarn add @phuture/keep3r-cli-job-phuture`
3. Add job inside your CLI config file. It should look something like this:
```
{
    ...
    "jobs": [
        ...,
        {
            "path": "node_modules/@phuture/keep3r-cli-job-phuture/dist/src/mainnet/phuture"
        }
    ]
}
```

## Keeper Requirements

* Must be a valid (activated) Keeper on [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)

## Useful Links

* [Job](https://etherscan.io/address/0x133A4273589c2eE5F9Fe28898B68aC1B4B1BA9B0)
* [Sequencer](https://etherscan.io/address/0x9566eB72e47E3E20643C0b1dfbEe04Da5c7E4732)
* [Keep3r V1](https://etherscan.io/address/0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44)
