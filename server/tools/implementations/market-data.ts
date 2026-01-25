/**
 * Market Data Tool Implementation
 * Get stock prices, crypto, and market data
 */

import { registerExecutor } from "../executor";
import { type ToolExecutionResult } from "@shared/schema";

interface QuoteData {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  volume?: number;
  marketCap?: number;
  timestamp: string;
}

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Alpha Vantage API
async function getQuoteAlphaVantage(symbol: string, apiKey: string): Promise<QuoteData> {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data["Error Message"]) {
    throw new Error(data["Error Message"]);
  }

  const quote = data["Global Quote"];
  if (!quote || Object.keys(quote).length === 0) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  return {
    symbol: quote["01. symbol"],
    price: parseFloat(quote["05. price"]),
    change: parseFloat(quote["09. change"]),
    changePercent: parseFloat(quote["10. change percent"]?.replace("%", "")),
    high: parseFloat(quote["03. high"]),
    low: parseFloat(quote["04. low"]),
    open: parseFloat(quote["02. open"]),
    previousClose: parseFloat(quote["08. previous close"]),
    volume: parseInt(quote["06. volume"]),
    timestamp: quote["07. latest trading day"],
  };
}

async function getHistoryAlphaVantage(
  symbol: string,
  apiKey: string,
  period: string
): Promise<HistoricalData[]> {
  // Map period to Alpha Vantage function
  let func = "TIME_SERIES_DAILY";
  let seriesKey = "Time Series (Daily)";
  
  if (period === "1d" || period === "intraday") {
    func = "TIME_SERIES_INTRADAY&interval=5min";
    seriesKey = "Time Series (5min)";
  } else if (period === "1w") {
    func = "TIME_SERIES_DAILY";
  } else if (period === "1m") {
    func = "TIME_SERIES_DAILY";
  }

  const response = await fetch(
    `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data["Error Message"]) {
    throw new Error(data["Error Message"]);
  }

  const series = data[seriesKey];
  if (!series) {
    throw new Error(`No historical data found for symbol: ${symbol}`);
  }

  // Convert to array and limit based on period
  const entries = Object.entries(series);
  let limit = 30;
  if (period === "1d") limit = 78; // Trading day in 5-min intervals
  if (period === "1w") limit = 5;
  if (period === "1m") limit = 22;
  if (period === "1y") limit = 252;

  return entries.slice(0, limit).map(([date, values]: [string, any]) => ({
    date,
    open: parseFloat(values["1. open"]),
    high: parseFloat(values["2. high"]),
    low: parseFloat(values["3. low"]),
    close: parseFloat(values["4. close"]),
    volume: parseInt(values["5. volume"]),
  }));
}

// Fallback: Yahoo Finance (unofficial)
async function getQuoteYahoo(symbol: string): Promise<QuoteData> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Yahoo Finance error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.chart?.result?.[0];
  
  if (!result) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  
  return {
    symbol: meta.symbol,
    name: meta.shortName,
    price: meta.regularMarketPrice,
    change: meta.regularMarketPrice - meta.previousClose,
    changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
    high: quote?.high?.[quote.high.length - 1],
    low: quote?.low?.[quote.low.length - 1],
    open: quote?.open?.[0],
    previousClose: meta.previousClose,
    volume: quote?.volume?.[quote.volume.length - 1],
    marketCap: meta.marketCap,
    timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
  };
}

// CoinGecko for crypto (free, no API key needed)
async function getCryptoQuote(symbol: string): Promise<QuoteData> {
  // Map common symbols to CoinGecko IDs
  const symbolMap: Record<string, string> = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "SOL": "solana",
    "DOGE": "dogecoin",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "LINK": "chainlink",
  };

  const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  const market = data.market_data;

  return {
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    price: market.current_price.usd,
    change: market.price_change_24h,
    changePercent: market.price_change_percentage_24h,
    high: market.high_24h.usd,
    low: market.low_24h.usd,
    marketCap: market.market_cap.usd,
    volume: market.total_volume.usd,
    timestamp: new Date().toISOString(),
  };
}

async function executeMarketData(
  input: Record<string, any>,
  credentials?: Record<string, any>
): Promise<ToolExecutionResult> {
  const { symbol, dataType = "quote", period = "1m" } = input;
  const logs: string[] = [];

  if (!symbol) {
    return {
      success: false,
      error: "Symbol is required",
      executionTime: 0,
      logs: ["Error: No symbol provided"],
    };
  }

  const apiKey = credentials?.apiKey;
  const upperSymbol = symbol.toUpperCase();

  try {
    logs.push(`Fetching ${dataType} data for: ${upperSymbol}`);

    // Check if it's a crypto symbol
    const cryptoSymbols = ["BTC", "ETH", "BNB", "XRP", "ADA", "SOL", "DOGE", "DOT", "MATIC", "LINK"];
    const isCrypto = cryptoSymbols.includes(upperSymbol) || symbol.includes("-USD");

    if (dataType === "quote") {
      let quote: QuoteData;

      if (isCrypto) {
        logs.push("Using CoinGecko for crypto data");
        quote = await getCryptoQuote(upperSymbol.replace("-USD", ""));
      } else if (apiKey) {
        logs.push("Using Alpha Vantage API");
        quote = await getQuoteAlphaVantage(upperSymbol, apiKey);
      } else {
        logs.push("Using Yahoo Finance (no API key)");
        quote = await getQuoteYahoo(upperSymbol);
      }

      logs.push(`Current price: $${quote.price.toFixed(2)}`);

      return {
        success: true,
        output: {
          quote,
          type: "quote",
          isCrypto,
        },
        executionTime: 0,
        logs,
      };
    }

    if (dataType === "history") {
      if (!apiKey) {
        return {
          success: false,
          error: "API key required for historical data. Connect the tool with an Alpha Vantage API key.",
          executionTime: 0,
          logs: [...logs, "Error: No API key for historical data"],
        };
      }

      logs.push(`Fetching ${period} historical data`);
      const history = await getHistoryAlphaVantage(upperSymbol, apiKey, period);
      logs.push(`Retrieved ${history.length} data points`);

      return {
        success: true,
        output: {
          history,
          symbol: upperSymbol,
          period,
          dataPoints: history.length,
          type: "history",
        },
        executionTime: 0,
        logs,
      };
    }

    return {
      success: false,
      error: `Unknown data type: ${dataType}`,
      executionTime: 0,
      logs: [...logs, `Error: Invalid dataType "${dataType}"`],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";
    logs.push(`Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      executionTime: 0,
      logs,
    };
  }
}

// Register the executor
registerExecutor("market_data", executeMarketData);

export { executeMarketData };
