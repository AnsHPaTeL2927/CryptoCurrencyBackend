// services/third-party/etherscan.service.js
import axios from 'axios';
import { environment } from '../../config/environment.js';
import { ApiError } from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

export class EtherscanService {
   constructor() {
       this.baseUrl = environment.etherscan.baseUrl;
       this.apiKey = environment.etherscan.apiKey;
   }

   async getBalance(address) {
       try {
           const response = await this.makeRequest({
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
           const response = await this.makeRequest({
               module: 'account',
               action: 'txlist',
               address,
               startblock: startBlock,
               endblock: endBlock,
               page,
               offset,
               sort: 'desc'
           });

           return this.formatTransactions(response.result);
       } catch (error) {
           logger.error('Etherscan getTransactions error:', error);
           throw new ApiError(500, 'Failed to fetch ETH transactions');
       }
   }

   async getInternalTransactions(address, page = 1, offset = 10) {
       try {
           const response = await this.makeRequest({
               module: 'account',
               action: 'txlistinternal',
               address,
               page,
               offset,
               sort: 'desc'
           });

           return this.formatTransactions(response.result);
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

           const response = await this.makeRequest(params);
           return this.formatTokenTransfers(response.result);
       } catch (error) {
           logger.error('Etherscan getTokenTransfers error:', error);
           throw new ApiError(500, 'Failed to fetch token transfers');
       }
   }

   async getGasOracle() {
       try {
           const response = await this.makeRequest({
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
           const response = await this.makeRequest({
               module: 'proxy',
               action: 'eth_getBlockByNumber',
               tag: `0x${parseInt(blockNumber).toString(16)}`,
               boolean: true
           });

           return this.formatBlockInfo(response.result);
       } catch (error) {
           logger.error('Etherscan getBlockInfo error:', error);
           throw new ApiError(500, 'Failed to fetch block info');
       }
   }

   async getTokenInfo(contractAddress) {
       try {
           const [basicInfo, tokenSupply] = await Promise.all([
               this.makeRequest({
                   module: 'token',
                   action: 'tokeninfo',
                   contractaddress: contractAddress
               }),
               this.makeRequest({
                   module: 'stats',
                   action: 'tokensupply',
                   contractaddress: contractAddress
               })
           ]);

           return this.formatTokenInfo(basicInfo.result[0], tokenSupply.result);
       } catch (error) {
           logger.error('Etherscan getTokenInfo error:', error);
           throw new ApiError(500, 'Failed to fetch token info');
       }
   }

   private async makeRequest(params) {
       try {
           const response = await axios.get(this.baseUrl, {
               params: {
                   ...params,
                   apikey: this.apiKey
               }
           });

           if (response.data.status === '0' && response.data.message !== 'No transactions found') {
               throw new ApiError(400, response.data.result || 'Etherscan API Error');
           }

           return response.data;
       } catch (error) {
           if (error instanceof ApiError) throw error;
           throw new ApiError(500, 'Etherscan API request failed');
       }
   }

   private formatTransactions(transactions) {
       return transactions.map(tx => ({
           hash: tx.hash,
           blockNumber: parseInt(tx.blockNumber),
           timestamp: new Date(parseInt(tx.timeStamp) * 1000),
           from: tx.from,
           to: tx.to,
           value: tx.value / 1e18,
           gasPrice: parseInt(tx.gasPrice),
           gasUsed: parseInt(tx.gasUsed),
           isError: tx.isError === '1',
           txreceipt_status: tx.txreceipt_status,
           input: tx.input,
           confirmations: parseInt(tx.confirmations)
       }));
   }

   private formatTokenTransfers(transfers) {
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
           value: transfer.value / Math.pow(10, parseInt(transfer.tokenDecimal)),
           gasPrice: parseInt(transfer.gasPrice),
           gasUsed: parseInt(transfer.gasUsed),
           confirmations: parseInt(transfer.confirmations)
       }));
   }

   private formatBlockInfo(block) {
       return {
           number: parseInt(block.number, 16),
           hash: block.hash,
           parentHash: block.parentHash,
           timestamp: new Date(parseInt(block.timestamp, 16) * 1000),
           transactions: block.transactions.length,
           gasUsed: parseInt(block.gasUsed, 16),
           gasLimit: parseInt(block.gasLimit, 16),
           miner: block.miner,
           difficulty: parseInt(block.difficulty, 16),
           totalDifficulty: parseInt(block.totalDifficulty, 16),
           size: parseInt(block.size, 16)
       };
   }

   private formatTokenInfo(basicInfo, supply) {
       return {
           contractAddress: basicInfo.contractAddress,
           tokenName: basicInfo.tokenName,
           symbol: basicInfo.symbol,
           totalSupply: supply,
           decimals: parseInt(basicInfo.decimals),
           website: basicInfo.website,
           email: basicInfo.email,
           twitter: basicInfo.twitter,
           facebook: basicInfo.facebook,
           telegram: basicInfo.telegram,
           github: basicInfo.github,
           verified: basicInfo.verified === '1',
           holders: parseInt(basicInfo.holders || 0)
       };
   }
}

export default new EtherscanService();