import axios from "axios";
import { ApiError } from "../../ApiError.js";
import { environment } from "../../../config/environment.js";

export class BscScanHelper {
    static baseUrl = environment.apis.bscscan.baseUrl;
    static apiKey = environment.apis.bscscan.apiKey;

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