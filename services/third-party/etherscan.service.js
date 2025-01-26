import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { EtherScanHelper } from '../../utils/helpers/third-party/etherscan.helper.js';

export class EtherscanService {
    async getBalance(address) {
        try {
            const response = await EtherScanHelper.makeRequest({
                module: 'account',
                action: 'balance',
                address,
                tag: 'latest'
            });

            const balanceInWei = response.result;
            const balanceInEth = balanceInWei / 1e18;

            return {
                address,
                balanceWei: balanceInWei,
                balanceEth: balanceInEth,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Etherscan getBalance error:', error);
            throw new ApiError(500, 'Failed to fetch ETH balance');
        }
    }

    async getTransactions(address, page = 1, offset = 10, startBlock = 0, endBlock = 99999999) {
        try {
            const response = await EtherScanHelper.makeRequest({
                module: 'account',
                action: 'txlist',
                address,
                startblock: startBlock,
                endblock: endBlock,
                page,
                offset,
                sort: 'desc'
            });

            return EtherScanHelper.formatTransactions(response.result);
        } catch (error) {
            logger.error('Etherscan getTransactions error:', error);
            throw new ApiError(500, 'Failed to fetch ETH transactions');
        }
    }

    async getInternalTransactions(address, page = 1, offset = 10) {
        try {
            const response = await EtherScanHelper.makeRequest({
                module: 'account',
                action: 'txlistinternal',
                address,
                page,
                offset,
                sort: 'desc'
            });

            return EtherScanHelper.formatTransactions(response.result);
        } catch (error) {
            logger.error('Etherscan getInternalTransactions error:', error);
            throw new ApiError(500, 'Failed to fetch internal transactions');
        }
    }

    async getTokenTransfers(address, contractAddress = null, page = 1, offset = 10) {
        try {
            const params = {
                module: 'account',
                action: 'tokentx',
                address,
                page,
                offset,
                sort: 'desc'
            };

            if (contractAddress) {
                params.contractaddress = contractAddress;
            }

            const response = await EtherScanHelper.makeRequest(params);
            return EtherScanHelper.formatTokenTransfers(response.result);
        } catch (error) {
            logger.error('Etherscan getTokenTransfers error:', error);
            throw new ApiError(500, 'Failed to fetch token transfers');
        }
    }

    async getGasOracle() {
        try {
            const response = await EtherScanHelper.makeRequest({
                module: 'gastracker',
                action: 'gasoracle'
            });

            return {
                SafeLow: parseInt(response.result.SafeGasPrice),
                Standard: parseInt(response.result.ProposeGasPrice),
                Fast: parseInt(response.result.FastGasPrice),
                lastBlock: parseInt(response.result.LastBlock),
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Etherscan getGasOracle error:', error);
            throw new ApiError(500, 'Failed to fetch gas oracle data');
        }
    }

    async getBlockInfo(blockNumber) {
        try {
            const response = await EtherScanHelper.makeRequest({
                module: 'proxy',
                action: 'eth_getBlockByNumber',
                tag: `0x${parseInt(blockNumber).toString(16)}`,
                boolean: true
            });

            return EtherScanHelper.formatBlockInfo(response.result);
        } catch (error) {
            logger.error('Etherscan getBlockInfo error:', error);
            throw new ApiError(500, 'Failed to fetch block info');
        }
    }

    async getTokenInfo(contractAddress) {
        try {
            const [basicInfo, tokenSupply] = await Promise.all([
                EtherScanHelper.makeRequest({
                    module: 'token',
                    action: 'tokeninfo',
                    contractaddress: contractAddress
                }),
                EtherScanHelper.makeRequest({
                    module: 'stats',
                    action: 'tokensupply',
                    contractaddress: contractAddress
                })
            ]);

            return EtherScanHelper.formatTokenInfo(basicInfo.result[0], tokenSupply.result);
        } catch (error) {
            logger.error('Etherscan getTokenInfo error:', error);
            throw new ApiError(500, 'Failed to fetch token info');
        }
    }
}

export default new EtherscanService();