import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import { BscScanHelper } from '../../utils/helpers/third-party/bscscan.helper.js';

export class BscscanService {

    // Account Methods 
    async getBalance(address) {
        try {
            const response = await BscScanHelper.makeRequest({
                module: 'account',
                action: 'balance',
                address,
                tag: 'latest'
            });

            return {
                address,
                balance: response.result,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('BSCScan getBalance error:', error);
            throw new ApiError(500, 'Failed to fetch BSC balance');
        }
    }

    async getTransactions(address, options = {}) {
        try {
            const { page = 1, offset = 10, startBlock, endBlock } = options;

            const params = {
                module: 'account',
                action: 'txlist',
                address,
                startblock: startBlock || 0,
                endblock: endBlock || 99999999,
                page,
                offset,
                sort: 'desc'
            };

            const response = await BscScanHelper.makeRequest(params);
            return BscScanHelper.formatTransactions(response.result);
        } catch (error) {
            logger.error('BSCScan getTransactions error:', error);
            throw new ApiError(500, 'Failed to fetch BSC transactions');
        }
    }

    async getInternalTransactions(address, options = {}) {
        try {
            const { page = 1, offset = 10, startBlock, endBlock } = options;

            const params = {
                module: 'account',
                action: 'txlistinternal',
                address,
                startblock: startBlock || 0,
                endblock: endBlock || 99999999,
                page,
                offset,
                sort: 'desc'
            };

            const response = await BscScanHelper.makeRequest(params);
            return BscScanHelper.formatTransactions(response.result);
        } catch (error) {
            logger.error('BSCScan getInternalTransactions error:', error);
            throw new ApiError(500, 'Failed to fetch internal transactions');
        }
    }

    async getBEP20Transfers(address, contractAddress = null, page = 1, offset = 10) {
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

            const response = await BscScanHelper.makeRequest(params);
            return BscScanHelper.formatTokenTransfers(response.result);
        } catch (error) {
            logger.error('BSCScan getBEP20Transfers error:', error);
            throw new ApiError(500, 'Failed to fetch BEP20 transfers');
        }
    }

    // Token Methods
    async getBEP20TokenInfo(contractAddress) {
        try {
            const response = await BscScanHelper.makeRequest({
                module: 'token',
                action: 'tokeninfo',
                contractaddress: contractAddress
            });

            return BscScanHelper.formatTokenInfo(response.result[0]);
        } catch (error) {
            logger.error('BSCScan getBEP20TokenInfo error:', error);
            throw new ApiError(500, 'Failed to fetch token info');
        }
    }

    async getContractABI(contractAddress) {
        try {
            const response = await BscScanHelper.makeRequest({
                module: 'contract',
                action: 'getabi',
                address: contractAddress
            });

            if (response.message === 'NOTOK') {
                throw new ApiError(404, 'Contract ABI not found');
            }

            return JSON.parse(response.result);
        } catch (error) {
            logger.error('BSCScan getContractABI error:', error);
            throw new ApiError(500, 'Failed to fetch contract ABI');
        }
    }
}

export default new BscscanService();