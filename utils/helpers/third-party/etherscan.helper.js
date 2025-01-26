import axios from 'axios';
import { ApiError } from "../../ApiError.js";
import { environment } from "../../../config/environment.js";
export class EtherScanHelper {
    constructor() {
        this.baseUrl = environment.etherscan.baseUrl;
        this.apiKey = environment.etherscan.apiKey;
    }

    static async makeRequest(params) {
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

    static formatTransactions(transactions) {
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
            value: transfer.value / Math.pow(10, parseInt(transfer.tokenDecimal)),
            gasPrice: parseInt(transfer.gasPrice),
            gasUsed: parseInt(transfer.gasUsed),
            confirmations: parseInt(transfer.confirmations)
        }));
    }

    static formatBlockInfo(block) {
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

    static formatTokenInfo(basicInfo, supply) {
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