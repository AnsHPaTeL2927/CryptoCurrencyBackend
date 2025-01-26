import axios from 'axios';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

export class BscscanService {
    constructor() {
        this.apiKey = environment.apis.bscscan.apiKey;
        this.baseUrl = environment.apis.bscscan.baseUrl;
    }

    // Account Methods 
    async getBalance(address) {
        try {
            const response = await this.makeRequest({
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

            const response = await this.makeRequest(params);
            return this.formatTransactions(response.result);
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

            const response = await this.makeRequest(params);
            return this.formatTransactions(response.result);
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

            const response = await this.makeRequest(params);
            return this.formatTokenTransfers(response.result);
        } catch (error) {
            logger.error('BSCScan getBEP20Transfers error:', error);
            throw new ApiError(500, 'Failed to fetch BEP20 transfers');
        }
    }

    // Token Methods
    async getBEP20TokenInfo(contractAddress) {
        try {
            const response = await this.makeRequest({
                module: 'token',
                action: 'tokeninfo',
                contractaddress: contractAddress
            });

            return this.formatTokenInfo(response.result[0]);
        } catch (error) {
            logger.error('BSCScan getBEP20TokenInfo error:', error);
            throw new ApiError(500, 'Failed to fetch token info');
        }
    }

    async getContractABI(contractAddress) {
        try {
            const response = await this.makeRequest({
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

    // Helper Methods
    static async makeRequest(params) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    ...params,
                    apikey: this.apiKey
                }
            });

            if (response.data.status === '0') {
                throw new ApiError(400, response.data.message || 'BSCScan API Error');
            }

            return response.data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'BSCScan API request failed');
        }
    }

    static formatTransactions(transactions) {
        return transactions.map(tx => ({
            hash: tx.hash,
            blockNumber: parseInt(tx.blockNumber),
            timestamp: new Date(parseInt(tx.timeStamp) * 1000),
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gasUsed: tx.gasUsed,
            gasPrice: tx.gasPrice,
            isError: tx.isError === '1',
            txreceipt_status: tx.txreceipt_status,
            input: tx.input,
            confirmations: tx.confirmations
        }));
    }

    static formatTokenTransfers(transfers) {
        return transfers.map(transfer => ({
            hash: transfer.hash,
            blockNumber: parseInt(transfer.blockNumber),
            timestamp: new Date(parseInt(transfer.timeStamp) * 1000),
            from: transfer.from,
            to: transfer.to,
            contractAddress: transfer.contractAddress,
            tokenName: transfer.tokenName,
            tokenSymbol: transfer.tokenSymbol,
            tokenDecimal: parseInt(transfer.tokenDecimal),
            value: transfer.value,
            gasUsed: transfer.gasUsed,
            gasPrice: transfer.gasPrice,
            confirmations: transfer.confirmations
        }));
    }

    static formatTokenInfo(tokenInfo) {
        return {
            contractAddress: tokenInfo.contractAddress,
            tokenName: tokenInfo.tokenName,
            symbol: tokenInfo.symbol,
            totalSupply: tokenInfo.totalSupply,
            decimals: parseInt(tokenInfo.decimals),
            website: tokenInfo.website,
            email: tokenInfo.email,
            description: tokenInfo.description,
            sourceCode: tokenInfo.sourceCode,
            createdTimestamp: new Date(parseInt(tokenInfo.createdTimestamp) * 1000)
        };
    }
}

export default new BscscanService();