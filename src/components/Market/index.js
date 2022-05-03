import React, { useEffect, useState, useContext } from "react";
import { Row, Col, Card, Table, Button } from "react-bootstrap";
import { withStyles } from "@material-ui/core/styles";
import Switch from "@material-ui/core/Switch";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Aux from "../../hoc/_Aux";
import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListSubheader from "@material-ui/core/ListSubheader";
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import LinearProgress from "@material-ui/core/LinearProgress";
import ArrowRightIcon from "@material-ui/icons/ArrowRight";
import InfoIcon from "@material-ui/icons/Info";
import Tooltip from "@material-ui/core/Tooltip";
import * as colors from "@material-ui/core/colors";
import PCTlogo from "../../assets/images/PCT-logo.png";
import ETHlogo from "../../assets/images/ETH-logo.png";
import "xp.css/dist/XP.css";
// import Alert from "@material-ui/lab/Alert";

import { chainIdToName, ethDummyAddress } from "../../constants";
import {
  eX,
  convertToLargeNumberRepresentation,
  zeroStringIfNullish,
} from "../../helpers";
import { store } from "../../store";
import { useWeb3React } from "@web3-react/core";
// import { store } from "../../store";

// import { ethers } from "ethers";
import { MaxUint256 } from "@ethersproject/constants";
const Compound = require("@compound-finance/compound-js/dist/nodejs/src/index.js");
const compoundConstants = require("@compound-finance/compound-js/dist/nodejs/src/constants.js");
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });

function Dashboard() {
  const { state: globalState, dispatch } = useContext(store);
  const { account, library } = useWeb3React();
  // const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [enterMarketDialogOpen, setEnterMarketDialogOpen] = useState(false);
  const [otherSnackbarOpen, setOtherSnackbarOpen] = useState(false);
  const [otherSnackbarMessage /*, setOtherSnackbarMessage*/] = useState("");
  const [selectedMarketDetails, setSelectedMarketDetails] = useState({});
  const [allMarketDetails, setAllMarketDetails] = useState([]);
  const [generalDetails, setGeneralDetails] = useState([]);
  const blockTime = 13.5; // seconds
  const gasLimit = "250000";
  const gasLimitSupplyDai = "535024";
  const gasLimitSupplySnx = "450000";
  const gasLimitSupplySusd = "450000";
  const gasLimitWithdrawDai = "550000";
  const gasLimitWithdrawSnx = "550000";
  const gasLimitWithdrawSusd = "550000";
  const gasLimitWithdraw = "450000";
  const gasLimitEnable = "70000";
  const gasLimitEnableDai = "66537";
  const gasLimitBorrow = "702020";
  const gasLimitBorrowDai = "729897";
  const gasLimitRepayDai = "535024";
  const gasLimitRepaySusd = "400000";
  const gasLimitEnterMarket = "112020";

  useEffect(() => {
    updateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    library,
    account /*, supplyDialogOpen, borrowDialogOpen, enterMarketDialogOpen*/,
  ]);

  const updateData = async () => {

    console.log("updateData start");

    const comptrollerAddress = process.env.REACT_APP_COMPTROLLER_ADDRESS;

    const allMarkets = await Compound.eth.read(
      comptrollerAddress,
      "function getAllMarkets() returns (address[])",
      [], // [optional] parameters
      {
        network: chainIdToName[parseInt(library?.provider?.chainId)],
        _compoundProvider: library,
      } // [optional] call options, provider, network, ethers.js "overrides"
    );

    if (account) {
      const enteredMarkets = await Compound.eth.read(
        comptrollerAddress,
        "function getAssetsIn(address) returns (address[])",
        [account], // [optional] parameters
        {
          network: chainIdToName[parseInt(library?.provider?.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      let totalSupplyBalance = new BigNumber(0);
      let totalBorrowBalance = new BigNumber(0);
      let allMarketsTotalSupplyBalance = new BigNumber(0);
      let allMarketsTotalBorrowBalance = new BigNumber(0);
      let totalBorrowLimit = new BigNumber(0);
      let yearSupplyInterest = new BigNumber(0);
      let yearBorrowInterest = new BigNumber(0);
      let yearSupplyPctRewards = new BigNumber(0);
      let yearBorrowPctRewards = new BigNumber(0);
      let totalLiquidity = new BigNumber(0);
      const pctPrice = await getPctPrice();

      async function getMarketDetails(pTokenAddress) {
        const underlyingAddress = await getUnderlyingTokenAddress(
          pTokenAddress
        );
        const symbol = await getTokenSymbol(underlyingAddress);
        console.log(symbol, underlyingAddress);
        const logoSource =
          symbol === "ETH"
            ? ETHlogo
            : `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${underlyingAddress}/logo.png`;
        const decimals = await getDecimals(underlyingAddress);
        const underlyingPrice = await getUnderlyingPrice(
          pTokenAddress,
          decimals
        );
        const supplyAndBorrowBalance = await getSupplyAndBorrowBalance(
          pTokenAddress,
          decimals,
          underlyingPrice,
          account
        );
        totalSupplyBalance = totalSupplyBalance.plus(
          supplyAndBorrowBalance?.supplyBalance
        );
        totalBorrowBalance = totalBorrowBalance.plus(
          supplyAndBorrowBalance?.borrowBalance
        );

        const marketTotalSupply = (
          await getMarketTotalSupplyInTokenUnit(pTokenAddress, decimals)
        )?.times(underlyingPrice);

        const marketTotalBorrowInTokenUnit = await getMarketTotalBorrowInTokenUnit(
          pTokenAddress,
          decimals
        );

        const marketTotalBorrow = marketTotalBorrowInTokenUnit?.times(
          underlyingPrice
        );

        if (marketTotalSupply?.isGreaterThan(0)) {
          allMarketsTotalSupplyBalance = allMarketsTotalSupplyBalance.plus(
            marketTotalSupply
          );
        }

        if (marketTotalBorrow?.isGreaterThan(0)) {
          allMarketsTotalBorrowBalance = allMarketsTotalBorrowBalance.plus(
            marketTotalBorrow
          );
        }

        const isEnterMarket = enteredMarkets.includes(pTokenAddress);

        const collateralFactor = await getCollateralFactor(
          comptrollerAddress,
          pTokenAddress
        );
        totalBorrowLimit = totalBorrowLimit.plus(
          isEnterMarket
            ? supplyAndBorrowBalance?.supplyBalance.times(collateralFactor)
            : 0
        );

        const supplyApy = await getSupplyApy(pTokenAddress);
        const borrowApy = await getBorrowApy(pTokenAddress);
        yearSupplyInterest = yearSupplyInterest.plus(
          supplyAndBorrowBalance?.supplyBalance.times(supplyApy).div(100)
        );
        yearBorrowInterest = yearBorrowInterest.plus(
          supplyAndBorrowBalance?.borrowBalance.times(borrowApy).div(100)
        );

        const underlyingAmount = await getUnderlyingAmount(
          pTokenAddress,
          decimals
        );

        const liquidity = +underlyingAmount * +underlyingPrice;

        if (liquidity > 0) {
          totalLiquidity = totalLiquidity.plus(liquidity);
        }

        return {
          pTokenAddress,
          underlyingAddress,
          symbol,
          logoSource,
          supplyApy,
          borrowApy,
          underlyingAllowance: await getAllowance(
            underlyingAddress,
            decimals,
            account,
            pTokenAddress
          ),
          walletBalance: await getBalanceOf(
            underlyingAddress,
            decimals,
            account
          ),
          supplyBalanceInTokenUnit:
            supplyAndBorrowBalance?.supplyBalanceInTokenUnit,
          supplyBalance: supplyAndBorrowBalance?.supplyBalance,
          marketTotalSupply: (
            await getMarketTotalSupplyInTokenUnit(pTokenAddress, decimals)
          )?.times(underlyingPrice),
          borrowBalanceInTokenUnit:
            supplyAndBorrowBalance?.borrowBalanceInTokenUnit,
          borrowBalance: supplyAndBorrowBalance?.borrowBalance,
          marketTotalBorrowInTokenUnit,
          marketTotalBorrow: marketTotalBorrowInTokenUnit?.times(
            underlyingPrice
          ),
          isEnterMarket,
          underlyingAmount,
          underlyingPrice,
          liquidity: +underlyingAmount * +underlyingPrice,
          collateralFactor,
          pctSpeed: await getPctSpeed(pTokenAddress),
          decimals,
        };
      }
      const details = await Promise.all(
        allMarkets.map(async (pTokenAddress) => {
          try {
            return await getMarketDetails(pTokenAddress);
          }
          catch (ex) {
            console.log(`Error getting ${pTokenAddress}: ${ex.message}`);
            console.log(ex.error);
            return {}
          }
        })
      );

      setGeneralDetails({
        comptrollerAddress,
        totalSupplyBalance,
        totalBorrowBalance,
        allMarketsTotalSupplyBalance,
        allMarketsTotalBorrowBalance,
        totalBorrowLimit,
        totalBorrowLimitUsedPercent: totalBorrowBalance
          .div(totalBorrowLimit)
          .times(100),
        yearSupplyInterest,
        yearBorrowInterest,
        netApy: yearSupplyInterest
          .minus(yearBorrowInterest)
          .div(totalSupplyBalance),
        totalSupplyPctApy: yearSupplyPctRewards?.div(totalSupplyBalance),
        totalBorrowPctApy: yearBorrowPctRewards?.div(totalBorrowBalance),
        pctPrice,
        totalLiquidity,
      });

      setAllMarketDetails(details);
    }
    await updateGasPrice();
  };

  const getPctPrice = async () => {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=percent&vs_currencies=usd"
      // "https://api.coingecko.com/api/v3/simple/price?ids=compound-governance-token&vs_currencies=usd"
    );
    const data = await response.json();
    return new BigNumber(data?.percent?.usd);
    // return new BigNumber(data["compound-governance-token"]?.usd);
  };

  const getUnderlyingTokenAddress = async (pTokenAddress) => {
    if (pTokenAddress === "0x45F157b3d3d7C415a0e40012D64465e3a0402C64") {
      //Hardcoded CEther address as it doesn't have the `underlying` function
      return ethDummyAddress
    }
    return await Compound.eth.read(
      pTokenAddress,
      "function underlying() returns (address)",
      [], // [optional] parameters
      {
        network: chainIdToName[parseInt(library?.provider?.chainId)],
        _compoundProvider: library,
      } // [optional] call options, provider, network, ethers.js "overrides"
    );
  };

  const getTokenSymbol = async (address) => {
    const saiAddress = Compound.util.getAddress(
      Compound.SAI,
      chainIdToName[parseInt(library?.provider?.chainId)]
    );
    let symbol;
    if (address.toLowerCase() === saiAddress.toLowerCase()) {
      symbol = "SAI";
    } else if (address === ethDummyAddress) {
      symbol = "ETH";
    } else if (address === "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2") {
      symbol = "MKR";
    } else {
      console.log("address", address);
      symbol = await Compound.eth.read(
        address,
        "function symbol() returns (string)",
        [], // [optional] parameters
        {
          network: chainIdToName[parseInt(library?.provider?.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );
    }
    console.log("symbol", symbol);
    return symbol;
  };

  const getSupplyApy = async (address) => {
    if (library) {
      const mantissa = 1e18; // mantissa is the same even the underlying asset has different decimals
      const blocksPerDay = (24 * 60 * 60) / blockTime;
      const daysPerYear = 365;

      let supplyRatePerBlock;
      try {
        supplyRatePerBlock = await Compound.eth.read(
          address,
          "function supplyRatePerBlock() returns (uint256)",
          [], // [optional] parameters
          {
            network: chainIdToName[parseInt(library.provider.chainId)],
            _compoundProvider: library,
          } // [optional] call options, provider, network, ethers.js "overrides"
        );
      } catch (e) {
        console.log(address, e.message, e.error.error);
        supplyRatePerBlock = new BigNumber(0);
      }

      const supplyApy = new BigNumber(
        Math.pow(
          (supplyRatePerBlock.toNumber() / mantissa) * blocksPerDay + 1,
          daysPerYear - 1
        ) - 1
      );
      return supplyApy;
    }
  };

  const getBorrowApy = async (address) => {
    if (library) {
      const mantissa = 1e18; // mantissa is the same even the underlying asset has different decimals
      const blocksPerDay = (24 * 60 * 60) / blockTime;
      const daysPerYear = 365;

      let borrowRatePerBlock;
      try {
        borrowRatePerBlock = await Compound.eth.read(
          address,
          "function borrowRatePerBlock() returns (uint256)",
          [], // [optional] parameters
          {
            network: chainIdToName[parseInt(library.provider.chainId)],
            _compoundProvider: library,
          } // [optional] call options, provider, network, ethers.js "overrides"
        );
      } catch (e) {
        borrowRatePerBlock = new BigNumber(0);
      }

      const borrowApy = new BigNumber(
        Math.pow(
          (borrowRatePerBlock.toNumber() / mantissa) * blocksPerDay + 1,
          daysPerYear - 1
        ) - 1
      );
      return borrowApy;
    }
  };

  const getDecimals = async (tokenAddress) => {
    if (library) {
      let decimals;
      if (tokenAddress === ethDummyAddress) {
        decimals = 18;
      } else {
        decimals = await Compound.eth.read(
          tokenAddress,
          "function decimals() returns (uint8)",
          [], // [optional] parameters
          {
            network: chainIdToName[parseInt(library.provider.chainId)],
            _compoundProvider: library,
          } // [optional] call options, provider, network, ethers.js "overrides"
        );
      }

      return decimals;
    }
  };

  const getBalanceOf = async (tokenAddress, decimals, walletAddress) => {
    if (library) {
      let balance;
      if (tokenAddress === ethDummyAddress) {
        balance = await library.getBalance(walletAddress);
      } else {
        balance = await Compound.eth.read(
          tokenAddress,
          "function balanceOf(address) returns (uint)",
          [walletAddress], // [optional] parameters
          {
            network: chainIdToName[parseInt(library.provider.chainId)],
            _compoundProvider: library,
          } // [optional] call options, provider, network, ethers.js "overrides"
        );
      }

      return eX(balance.toString(), -1 * decimals);
    }
  };

  const getAllowance = async (
    tokenAddress,
    decimals,
    walletAddress,
    pTokenAddress
  ) => {
    if (library) {
      let allowance;
      if (tokenAddress === ethDummyAddress) {
        allowance = MaxUint256;
      } else {
        allowance = await Compound.eth.read(
          tokenAddress,
          "function allowance(address, address) returns (uint)",
          [walletAddress, pTokenAddress], // [optional] parameters
          {
            network: chainIdToName[parseInt(library.provider.chainId)],
            _compoundProvider: library,
          } // [optional] call options, provider, network, ethers.js "overrides"
        );
      }

      return eX(allowance.toString(), -1 * decimals);
    }
  };

  const getSupplyAndBorrowBalance = async (
    tokenAddress,
    decimals,
    underlyingPrice,
    walletAddress
  ) => {
    if (library) {
      const accountSnapshot = await Compound.eth.read(
        tokenAddress,
        "function getAccountSnapshot(address) returns (uint, uint, uint, uint)",
        [walletAddress], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      const supplyBalanceInTokenUnit = eX(
        accountSnapshot[1].mul(accountSnapshot[3]).toString(),
        -1 * decimals - 18
      );
      const supplyBalanceInUsd = supplyBalanceInTokenUnit.times(
        underlyingPrice
      );
      const borrowBalanceInTokenUnit = eX(
        accountSnapshot[2].toString(),
        -1 * decimals
      );
      const borrowBalanceInUsd = borrowBalanceInTokenUnit.times(
        underlyingPrice
      );

      return {
        supplyBalanceInTokenUnit,
        supplyBalance: supplyBalanceInUsd,
        borrowBalanceInTokenUnit,
        borrowBalance: borrowBalanceInUsd,
      };
    }
  };

  const getCollateralFactor = async (comptrollerAddress, tokenAddress) => {
    if (library) {
      const market = await Compound.eth.read(
        comptrollerAddress,
        "function markets(address) returns (bool, uint, bool)",
        [tokenAddress], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );
      return eX(market[1].toString(), -18);
    }
  };

  const getUnderlyingAmount = async (tokenAddress, decimals) => {
    if (library) {
      const underlyingAmount = await Compound.eth.read(
        tokenAddress,
        "function getCash() returns (uint)",
        [], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(underlyingAmount.toString(), -1 * decimals);
    }
  };

  const getUnderlyingPrice = async (tokenAddress, decimals) => {
    if (library) {
      // const priceFeedAddress = Compound.util.getAddress(
      //   Compound.PriceFeed,
      //   chainIdToName[parseInt(library?.provider?.chainId)]
      // );

      const priceFeedAddress = process.env.REACT_APP_ORACLE_ADDRESS;

      const underlyingPrice = await Compound.eth.read(
        priceFeedAddress,
        "function getUnderlyingPrice(address) returns (uint)",
        [tokenAddress], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(underlyingPrice.toString(), decimals - 36);
    }
  };

  const getMarketTotalSupplyInTokenUnit = async (tokenAddress, decimals) => {
    if (library) {
      const cTokenTotalSupply = await Compound.eth.read(
        tokenAddress,
        "function totalSupply() returns (uint)",
        [], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      const exchangeRateStored = await Compound.eth.read(
        tokenAddress,
        "function exchangeRateStored() returns (uint)",
        [], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(
        cTokenTotalSupply.mul(exchangeRateStored).toString(),
        -1 * decimals - 18
      );
    }
  };

  const getMarketTotalBorrowInTokenUnit = async (tokenAddress, decimals) => {
    if (library) {
      const totalBorrows = await Compound.eth.read(
        tokenAddress,
        "function totalBorrows() returns (uint)",
        [], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(totalBorrows.toString(), -1 * decimals);
    }
  };

  const getPctSpeed = async (tokenAddress) => {
    if (library) {
      const pctSpeed = await Compound.eth.read(
        process.env.REACT_APP_COMPTROLLER_ADDRESS,
        "function compSpeeds(address) returns (uint)",
        [tokenAddress], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(pctSpeed.toString(), -18);
    }
  };

  const handleEnable = async (
    underlyingAddress,
    pTokenAddress,
    setTxSnackbarMessage,
    setTxSnackbarOpen,
    symbol
  ) => {
    try {
      const tx = await Compound.eth.trx(
        underlyingAddress,
        "approve",
        [pTokenAddress, MaxUint256], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          provider: library.provider,
          gasLimit: symbol === "DAI" ? gasLimitEnableDai : gasLimitEnable,
          gasPrice: globalState.gasPrice.toString(),
          abi: compoundConstants.abi.cErc20,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const handleSupply = async (
    underlyingAddress,
    pTokenAddress,
    amount,
    decimals,
    setTxSnackbarMessage,
    setTxSnackbarOpen,
    symbol
  ) => {
    let parameters = [];
    let options = {
      network: chainIdToName[parseInt(library.provider.chainId)],
      provider: library.provider,
      gasLimit:
        symbol === "DAI"
          ? gasLimitSupplyDai
          : symbol === "SNX"
          ? gasLimitSupplySnx
          : symbol === "sUSD"
          ? gasLimitSupplySusd
          : gasLimit,
      gasPrice: globalState.gasPrice.toString(),
    };

    if (underlyingAddress === ethDummyAddress) {
      options.value = eX(amount, 18).toString();
      options.abi = compoundConstants.abi.cEther;
    } else {
      parameters.push(eX(amount, decimals).toString());
      options.abi = compoundConstants.abi.cErc20;
    }

    try {
      const tx = await Compound.eth.trx(
        pTokenAddress,
        "mint",
        parameters, // [optional] parameters
        options // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const handleWithdraw = async (
    underlyingAddress,
    pTokenAddress,
    amount,
    decimals,
    setTxSnackbarMessage,
    setTxSnackbarOpen,
    symbol
  ) => {
    const options = {
      network: chainIdToName[parseInt(library.provider.chainId)],
      provider: library.provider,
      gasLimit:
        symbol === "DAI"
          ? gasLimitWithdrawDai
          : symbol === "SNX"
          ? gasLimitWithdrawSnx
          : symbol === "sUSD"
          ? gasLimitWithdrawSusd
          : gasLimitWithdraw,
      gasPrice: globalState.gasPrice.toString(),
    };

    if (underlyingAddress === ethDummyAddress) {
      options.abi = compoundConstants.abi.cEther;
    } else {
      options.abi = compoundConstants.abi.cErc20;
    }

    try {
      const tx = await Compound.eth.trx(
        pTokenAddress,
        "redeemUnderlying",
        [eX(amount, decimals).toString()], // [optional] parameters
        options // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const handleBorrow = async (
    underlyingAddress,
    pTokenAddress,
    amount,
    decimals,
    setTxSnackbarMessage,
    setTxSnackbarOpen,
    symbol
  ) => {
    const options = {
      network: chainIdToName[parseInt(library.provider.chainId)],
      provider: library.provider,
      gasLimit: symbol === "DAI" ? gasLimitBorrowDai : gasLimitBorrow,
      gasPrice: globalState.gasPrice.toString(),
    };

    if (underlyingAddress === ethDummyAddress) {
      options.abi = compoundConstants.abi.cEther;
    } else {
      options.abi = compoundConstants.abi.cErc20;
    }

    try {
      const tx = await Compound.eth.trx(
        pTokenAddress,
        "borrow",
        [eX(amount, decimals).toString()], // [optional] parameters
        options // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const handleRepay = async (
    walletAddress,
    underlyingAddress,
    pTokenAddress,
    amount,
    isFullRepay,
    decimals,
    setTxSnackbarMessage,
    setTxSnackbarOpen,
    symbol
  ) => {
    const parameters = [];
    const options = {
      network: chainIdToName[parseInt(library.provider.chainId)],
      provider: library.provider,
      gasLimit:
        symbol === "DAI"
          ? gasLimitRepayDai
          : symbol === "sUSD"
          ? gasLimitRepaySusd
          : gasLimit,
      gasPrice: globalState.gasPrice.toString(),
    };

    try {
      let tx;
      if (underlyingAddress === ethDummyAddress) {
        parameters.push(walletAddress);
        parameters.push(pTokenAddress);
        options.value = eX(amount, 18).toString();
        tx = await Compound.eth.trx(
          process.env.REACT_APP_MAXIMILLION_ADDRESS,
          {
            constant: false,
            inputs: [
              { internalType: "address", name: "borrower", type: "address" },
              { internalType: "address", name: "cEther_", type: "address" },
            ],
            name: "repayBehalfExplicit",
            outputs: [],
            payable: true,
            stateMutability: "payable",
            type: "function",
          },
          [walletAddress, pTokenAddress], // [optional] parameters
          options // [optional] call options, provider, network, ethers.js "overrides"
        );
      } else {
        if (isFullRepay) {
          parameters.push(
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          ); //-1 (i.e. 2256 - 1)
        } else {
          parameters.push(eX(amount, decimals).toString());
        }
        options.abi = compoundConstants.abi.cErc20;
        tx = await Compound.eth.trx(
          pTokenAddress,
          "repayBorrow",
          parameters, // [optional] parameters
          options // [optional] call options, provider, network, ethers.js "overrides"
        );
      }

      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const handleEnterMarket = async (
    pTokenAddress,
    setTxSnackbarMessage,
    setTxSnackbarOpen
  ) => {
    try {
      const tx = await Compound.eth.trx(
        generalDetails.comptrollerAddress,
        "enterMarkets",
        [[pTokenAddress]], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          provider: library.provider,
          gasLimitEnterMarket,
          gasPrice: globalState.gasPrice.toString(),
          abi: compoundConstants.abi.Comptroller,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const handleExitMarket = async (
    pTokenAddress,
    setTxSnackbarMessage,
    setTxSnackbarOpen
  ) => {
    try {
      const tx = await Compound.eth.trx(
        generalDetails.comptrollerAddress,
        "exitMarket",
        [pTokenAddress], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          provider: library.provider,
          gasLimitEnterMarket,
          gasPrice: globalState.gasPrice.toString(),
          abi: compoundConstants.abi.Comptroller,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setTxSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      setTxSnackbarMessage(`Error: ${JSON.stringify(e)}`);
    }

    setTxSnackbarOpen(true);
  };

  const updateGasPrice = async () => {
    const response = await fetch(
      "https://ethgasstation.info/api/ethgasAPI.json"
    );
    const data = await response.json();
    dispatch({
      type: "UPDATE_GAS_PRICE",
      gasPrice: eX(data.fast, 8),
    });
    // setGasPrice(eX?(data.fast, 8));
  };

  const getMaxAmount = (symbol, walletBalance) => {
    if (symbol === "ETH") {
      return walletBalance.minus(eX(globalState.gasPrice.times(gasLimit), -18));
    } else {
      return walletBalance;
    }
  };

  const getMaxRepayAmount = (symbol, borrowBalanceInTokenUnit, borrowApy) => {
    const maxRepayFactor = new BigNumber(1).plus(borrowApy / 100); // e.g. Borrow APY = 2% => maxRepayFactor = 1.0002
    if (symbol === "ETH") {
      return borrowBalanceInTokenUnit.times(maxRepayFactor).decimalPlaces(18); // Setting it to a bit larger, this makes sure the user can repay 100%.
    } else {
      return borrowBalanceInTokenUnit.times(maxRepayFactor).decimalPlaces(18); // The same as ETH for now. The transaction will use -1 anyway.
    }
  };

  const StyledSwitch = withStyles({
    switchBase: {
      "&$checked": {
        color: "#40c4ff",
      },
      "&$checked + $track": {
        backgroundColor: "#40c4ff",
      },
    },
    checked: {},
    track: {},
  })(Switch);

  const LightTooltip = withStyles((theme) => ({
    tooltip: {
      backgroundColor: theme.palette.common.white,
      color: "rgba(0, 0, 0, 0.87)",
      boxShadow: theme.shadows[1],
      fontSize: 11,
    },
  }))(Tooltip);

  const GreyInfoIcon = (props) => {
    return (
      <InfoIcon
        style={{
          color: colors.grey[300],
          fontSize: 18,
          margin: "0px 0px 0px 5px",
          ...props.style,
        }}
      />
    );
  };

  const SupplyMarketRow = (props) => {
    return (
      <tr
        style={{ cursor: "pointer" }}
        onClick={() => {
          setSupplyDialogOpen(true);
          setSelectedMarketDetails(props.details);
        }}
      >
        <td>
          <img
            className="rounded-circle"
            style={{ width: "40px" }}
            src={props.details.logoSource}
            alt=""
          />
        </td>
        <td>
          <h6 className="mb-1">{props.details.symbol}</h6>
        </td>
        <td>
          <h6 className="text-muted">
            {`${props.details.supplyApy?.times(100).toFixed(2)}%`}
            {props.details.supplyPctApy?.isGreaterThan(0) ? (
              <div>
                {`+ ${props.details.supplyPctApy?.times(100).toFixed(2)}% PCT`}
              </div>
            ) : null}
          </h6>
        </td>
        <td>
          <h6 className="text-muted">
            {props.details.supplyBalanceInTokenUnit.decimalPlaces(4).toString()}
          </h6>
        </td>
        <td>
          <h6 className="text-muted">
            <i
              className={`fa fa-circle${
                props.details.walletBalance.decimalPlaces(4).toNumber() <= 0
                  ? "-o"
                  : ""
              } text-c-green f-10 m-r-15`}
            />
            {props.details.walletBalance.decimalPlaces(4).toString()}
          </h6>
        </td>
        <td>
          <StyledSwitch
            checked={props.details.isEnterMarket}
            onChange={() => {
              setSupplyDialogOpen(false);
              setEnterMarketDialogOpen(true);
              setSelectedMarketDetails(props.details);
            }}
          />
        </td>
      </tr>
    );
  };

  const BorrowMarketRow = (props) => {
    return (
      <tr
        style={{ cursor: "pointer" }}
        onClick={() => {
          setBorrowDialogOpen(true);
          setSelectedMarketDetails(props.details);
        }}
      >
        <td>
          <img
            className="rounded-circle"
            style={{ width: "40px" }}
            src={props.details.logoSource}
            alt=""
          />
        </td>
        <td>
          <h6 className="mb-1">{props.details.symbol}</h6>
        </td>
        <td>
          <h6 className="text-muted">
            {`${props.details.borrowApy?.times(100).toFixed(2)}%`}
            {props.details.borrowPctApy?.isGreaterThan(0) ? (
              <div>
                {`(${props.details.borrowPctApy?.times(100).toFixed(2)}% PCT)`}
              </div>
            ) : null}
          </h6>
        </td>
        <td>
          <h6 className="text-muted">
            {props.details.borrowBalanceInTokenUnit.decimalPlaces(4).toString()}
          </h6>
        </td>
        <td>
          <h6 className="text-muted">
            {convertToLargeNumberRepresentation(
              props.details.marketTotalBorrowInTokenUnit.precision(2)
            )}
          </h6>
        </td>
        <td>
          <h6 className="text-muted">
            {props.details.walletBalance.decimalPlaces(4).toString()}
          </h6>
        </td>
        <td>
          <h6 className="text-muted">{`$${convertToLargeNumberRepresentation(
            new BigNumber(props.details.liquidity).precision(2)
          )}`}</h6>
        </td>
      </tr>
    );
  };

  const BlueStyledTabs = withStyles({
    indicator: {
      backgroundColor: "#40c4ff",
    },
  })(Tabs);

  const TabPanel = (props) => {
    const { children, value, index, ...other } = props;

    return (
      <div hidden={value !== index} {...other}>
        {value === index && (
          <Box style={{ padding: "20px 0px 0px 0px" }}>
            <div>{children}</div>
          </Box>
        )}
      </div>
    );
  };

  const DialogSupplyRatesSection = (props) => {
    return (
      <div>
        <ListSubheader style={{ fontSize: "80%", fontWeight: "bold" }}>
          Supply Rate
        </ListSubheader>
        <ListItem>
          <img
            className="rounded-circle"
            style={{ width: "30px", margin: "0px 10px 0px 0px" }}
            src={props.selectedMarketDetails.logoSource}
            alt=""
          />
          <ListItemText secondary={`Supply APY`} />
          <ListItemSecondaryAction
            style={{ margin: "0px 15px 0px 0px" }}
          >{`${props.selectedMarketDetails.supplyApy
            ?.times(100)
            .toFixed(2)}%`}</ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <img
            className="rounded-circle"
            style={{ width: "30px", margin: "0px 10px 0px 0px" }}
            src={PCTlogo}
            alt=""
          />
          <ListItemText secondary={`PCT APY`} />
          <ListItemSecondaryAction
            style={{ margin: "0px 15px 0px 0px" }}
          >{`${zeroStringIfNullish(
            props.selectedMarketDetails.supplyPctApy?.times(100).toFixed(2),
            2
          )}%`}</ListItemSecondaryAction>
        </ListItem>
      </div>
    );
  };

  const DialogBorrowLimitSection = (props) => {
    return (
      <div>
        <ListSubheader style={{ fontSize: "80%", fontWeight: "bold" }}>
          Borrow Limit
        </ListSubheader>
        <ListItem>
          <ListItemText secondary={`Borrow Limit`} />
          <ListItemSecondaryAction style={{ margin: "0px 15px 0px 0px" }}>
            <span>
              {`$${props.generalDetails.totalBorrowLimit?.toFixed(2)}`}
            </span>
            {props.newBorrowLimit ? (
              <span>
                <ArrowRightIcon style={{ color: colors.lightBlue[500] }} />
                {`$${zeroStringIfNullish(props.newBorrowLimit?.toFixed(2), 2)}`}
              </span>
            ) : null}
          </ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <ListItemText secondary={`Borrow Limit Used`} />
          <ListItemSecondaryAction style={{ margin: "0px 15px 0px 0px" }}>
            <span>{`${zeroStringIfNullish(
              props.generalDetails.totalBorrowLimitUsedPercent?.toFixed(2),
              2
            )}%`}</span>
            {props.newBorrowLimit ? (
              <span>
                <ArrowRightIcon style={{ color: colors.lightBlue[500] }} />
                <span
                  style={{
                    color: props.generalDetails.totalBorrowBalance
                      ?.div(props.newBorrowLimit)
                      .isGreaterThan(1)
                      ? colors.red[500]
                      : null,
                  }}
                >
                  {`${zeroStringIfNullish(
                    props.generalDetails.totalBorrowBalance
                      ?.div(props.newBorrowLimit)
                      .times(100)
                      .toFixed(2),
                    2
                  )}%`}
                </span>
              </span>
            ) : null}
          </ListItemSecondaryAction>
        </ListItem>
      </div>
    );
  };

  const DialogBorrowRatesSection = (props) => {
    return (
      <div>
        <ListSubheader style={{ fontSize: "80%", fontWeight: "bold" }}>
          Borrow Rate
        </ListSubheader>
        <ListItem>
          <img
            className="rounded-circle"
            style={{ width: "30px", margin: "0px 10px 0px 0px" }}
            src={props.selectedMarketDetails.logoSource}
            alt=""
          />
          <ListItemText secondary={`Borrow APY`} />
          <ListItemSecondaryAction
            style={{ margin: "0px 15px 0px 0px" }}
          >{`${props.selectedMarketDetails.borrowApy
            ?.times(100)
            .toFixed(2)}%`}</ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <img
            className="rounded-circle"
            style={{ width: "30px", margin: "0px 10px 0px 0px" }}
            src={require(`../../assets/images/PCT-logo.png`)}
            alt=""
          />
          <ListItemText secondary={`PCT APY`} />
          <ListItemSecondaryAction
            style={{ margin: "0px 15px 0px 0px" }}
          >{`${zeroStringIfNullish(
            props.selectedMarketDetails.borrowPctApy?.times(100).toFixed(2),
            2
          )}%`}</ListItemSecondaryAction>
        </ListItem>
      </div>
    );
  };

  const DialogBorrowLimitSection2 = (props) => {
    const getNewBorrowBalance = (
      originBorrowBalance,
      borrowAmount,
      repayAmount,
      underlyingPrice
    ) => {
      return originBorrowBalance?.plus(
        new BigNumber(borrowAmount).minus(repayAmount).times(underlyingPrice)
      );
    };

    return (
      <div>
        <ListSubheader style={{ fontSize: "80%", fontWeight: "bold" }}>
          Borrow Limit
        </ListSubheader>
        <ListItem>
          <ListItemText secondary={`Borrow Balance`} />
          <ListItemSecondaryAction style={{ margin: "0px 15px 0px 0px" }}>
            <span>
              {`$${props.generalDetails.totalBorrowBalance?.toFixed(2)}`}
            </span>
            {props.borrowAmount || props.repayAmount ? (
              <span>
                <ArrowRightIcon style={{ color: colors.lightBlue[500] }} />
                {`$${zeroStringIfNullish(
                  getNewBorrowBalance(
                    props.generalDetails.totalBorrowBalance,
                    props.borrowAmount,
                    props.repayAmount,
                    props.selectedMarketDetails.underlyingPrice
                  )?.toFixed(2),
                  2
                )}`}
              </span>
            ) : null}
          </ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <ListItemText secondary={`Borrow Limit Used`} />
          <ListItemSecondaryAction style={{ margin: "0px 15px 0px 0px" }}>
            <span>{`${zeroStringIfNullish(
              props.generalDetails.totalBorrowLimitUsedPercent?.toFixed(2),
              2
            )}%`}</span>
            {props.borrowAmount || props.repayAmount ? (
              <span>
                <ArrowRightIcon style={{ color: colors.lightBlue[500] }} />
                <span
                  style={{
                    color: getNewBorrowBalance(
                      props.generalDetails.totalBorrowBalance,
                      props.borrowAmount,
                      props.repayAmount,
                      props.selectedMarketDetails.underlyingPrice
                    )
                      ?.div(props.generalDetails.totalBorrowLimit)
                      .isGreaterThan(1)
                      ? colors.red[500]
                      : null,
                  }}
                >
                  {`${zeroStringIfNullish(
                    getNewBorrowBalance(
                      props.generalDetails.totalBorrowBalance,
                      props.borrowAmount,
                      props.repayAmount,
                      props.selectedMarketDetails.underlyingPrice
                    )
                      ?.div(props.generalDetails.totalBorrowLimit)
                      .times(100)
                      .toFixed(2),
                    2
                  )}%`}
                </span>
              </span>
            ) : null}
          </ListItemSecondaryAction>
        </ListItem>
      </div>
    );
  };

  const DialogMarketInfoSection = (props) => {
    return (
      <div>
        <ListSubheader style={{ fontSize: "80%", fontWeight: "bold" }}>
          Market Info
        </ListSubheader>
        <ListItem>
          <LightTooltip
            title={
              props.collateralFactorText === "Loan-to-Value"
                ? "The maximum amount of borrowing in % of the collateral value of the provided token."
                : "The point at which the protocol deems a borrowing position to be undercollateralized and subject to liquidation."
            }
          >
            <div style={{ display: "flex" }}>
              <ListItemText secondary={props.collateralFactorText} />
              <GreyInfoIcon style={{ margin: "5px 0px 0px 5px" }} />
            </div>
          </LightTooltip>
          <ListItemSecondaryAction style={{ margin: "0px 15px 0px 0px" }}>
            <span>
              {`${props.selectedMarketDetails.collateralFactor
                ?.times(100)
                .toFixed(0)}%`}
            </span>
          </ListItemSecondaryAction>
        </ListItem>
        <ListItem>
          <LightTooltip title="The amount of token supply in % of the total that is currently being lent out.">
            <div style={{ display: "flex" }}>
              <ListItemText secondary={`% of Supply Borrowed`} />
              <GreyInfoIcon style={{ margin: "5px 0px 0px 5px" }} />
            </div>
          </LightTooltip>
          <ListItemSecondaryAction style={{ margin: "0px 15px 0px 0px" }}>
            <span>
              {`${zeroStringIfNullish(
                props.selectedMarketDetails.marketTotalBorrowInTokenUnit
                  ?.div(
                    props.selectedMarketDetails.marketTotalBorrowInTokenUnit.plus(
                      props.selectedMarketDetails.underlyingAmount
                    )
                  )
                  .times(100)
                  .toFixed(2),
                2
              )}%`}
            </span>
          </ListItemSecondaryAction>
        </ListItem>
      </div>
    );
  };

  // const WarningDialog = (props) => {
  //   return (
  //     <Dialog
  //       open={warningDialogOpen}
  //       onClose={() => setWarningDialogOpen(false)}
  //     >
  //       <DialogTitle style={{ padding: "50px 100px 10px 100px" }}>
  //         IMPORTANT: Please understand the contract admin risk before using
  //         Percent Money Market
  //       </DialogTitle>
  //       <DialogContent style={{ padding: "10px 100px 50px 100px" }}>
  //         <p>
  //           The admin of the core contract is currently set to its deployer,
  //           that means it is possible for us to rug pull (we will not, but it is
  //           technically possible)!
  //         </p>
  //         <p>
  //           The admin is now being transferred to a timelock contract and the
  //           transfer is expected to be completed on Oct 3rd at ~3AM (It requires
  //           48 hour to complete).
  //         </p>
  //         <p>
  //           Until the admin is transferred, please understand the risk before
  //           using Percent Money Market!
  //         </p>
  //         <a href="https://twitter.com/PercentFinance/status/1311713112479809537?s=20">
  //           Twitter Announcement
  //         </a>
  //       </DialogContent>
  //     </Dialog>
  //   );
  // };

  const SupplyDialog = (props) => {
    const [tabValue, setTabValue] = useState(0);
    const [supplyAmount, setSupplyAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [newBorrowLimit1, setNewBorrowLimit1] = useState();
    const [newBorrowLimit2, setNewBorrowLimit2] = useState();
    const [supplyValidationMessage, setSupplyValidationMessage] = useState("");
    const [withdrawValidationMessage, setWithdrawValidationMessage] = useState(
      ""
    );
    const [txSnackbarOpen, setTxSnackbarOpen] = useState(false);
    const [txSnackbarMessage, setTxSnackbarMessage] = useState("");

    const handleTabChange = (event, newValue) => {
      setTabValue(newValue);
    };
    const handleSupplyAmountChange = (amount) => {
      setSupplyAmount(amount);

      if (amount <= 0) {
        setSupplyValidationMessage("Amount must be > 0");
      } else if (amount > +props.selectedMarketDetails.walletBalance) {
        setSupplyValidationMessage("Amount must be <= balance");
      } else {
        setSupplyValidationMessage("");
      }

      setNewBorrowLimit1(
        props.generalDetails.totalBorrowLimit.plus(
          props.selectedMarketDetails.isEnterMarket
            ? new BigNumber(amount ? amount : "0")
                .times(props.selectedMarketDetails.underlyingPrice)
                .times(props.selectedMarketDetails.collateralFactor)
            : new BigNumber(0)
        )
      );
    };
    const handleWithdrawAmountChange = (amount) => {
      setWithdrawAmount(amount);

      if (amount <= 0) {
        setWithdrawValidationMessage("Amount must be > 0");
      } else if (
        amount > +props.selectedMarketDetails.supplyBalanceInTokenUnit
      ) {
        setWithdrawValidationMessage("Amount must be <= your supply balance");
      } else if (amount > +props.selectedMarketDetails.underlyingAmount) {
        setWithdrawValidationMessage("Amount must be <= liquidity");
      } else {
        setWithdrawValidationMessage("");
      }

      setNewBorrowLimit2(
        props.generalDetails.totalBorrowLimit.minus(
          props.selectedMarketDetails.isEnterMarket
            ? new BigNumber(amount ? amount : "0")
                .times(props.selectedMarketDetails.underlyingPrice)
                .times(props.selectedMarketDetails.collateralFactor)
            : new BigNumber(0)
        )
      );
    };

    return (
      <Dialog
        open={supplyDialogOpen}
        onClose={() => setSupplyDialogOpen(false)}
      >
        <DialogTitle>
          {props.selectedMarketDetails.symbol && (
            <img
              className="rounded-circle"
              style={{ width: "30px", margin: "0px 10px 0px 0px" }}
              src={props.selectedMarketDetails.logoSource}
              alt=""
            />
          )}
          {`${props.selectedMarketDetails.symbol}`}
        </DialogTitle>
        <DialogContent>
          <AppBar position="static" color="inherit" elevation={0}>
            <BlueStyledTabs
              value={tabValue}
              onChange={handleTabChange}
              textColor="inherit"
              variant="fullWidth"
            >
              <Tab label="Supply" style={{ outline: "none" }} />
              <Tab label="Withdraw" style={{ outline: "none" }} />
            </BlueStyledTabs>
          </AppBar>
          {props.selectedMarketDetails.symbol && (
            <div>
              <TabPanel value={tabValue} index={0}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label={props.selectedMarketDetails.symbol}
                  value={supplyAmount}
                  onChange={(event) => {
                    handleSupplyAmountChange(event.target.value);
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment
                        position="end"
                        onClick={() => {
                          handleSupplyAmountChange(
                            getMaxAmount(
                              props.selectedMarketDetails.symbol,
                              props.selectedMarketDetails.walletBalance
                            ).toString()
                          );
                        }}
                      >
                        Max
                      </InputAdornment>
                    ),
                  }}
                />
                <div style={{ height: "30px", color: "red" }}>
                  {supplyValidationMessage}
                </div>
                <List>
                  <DialogSupplyRatesSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                  />
                  <br />
                  <DialogBorrowLimitSection
                    generalDetails={props.generalDetails}
                    newBorrowLimit={newBorrowLimit1}
                  />
                  <br />
                  <DialogMarketInfoSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                    collateralFactorText={"Loan-to-Value"}
                  />
                  <br />
                  <br />
                  <ListItem>
                    {props.selectedMarketDetails.underlyingAllowance?.isGreaterThan(
                      0
                    ) &&
                    props.selectedMarketDetails.underlyingAllowance?.isGreaterThanOrEqualTo(
                      +supplyAmount
                    ) ? (
                      <Button
                        variant="primary"
                        size="lg"
                        disabled={!supplyAmount || supplyValidationMessage}
                        block
                        onClick={() => {
                          handleSupply(
                            props.selectedMarketDetails.underlyingAddress,
                            props.selectedMarketDetails.pTokenAddress,
                            supplyAmount,
                            props.selectedMarketDetails.decimals,
                            setTxSnackbarMessage,
                            setTxSnackbarOpen,
                            props.selectedMarketDetails.symbol
                          );
                        }}
                      >
                        Supply
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        block
                        onClick={() => {
                          handleEnable(
                            props.selectedMarketDetails.underlyingAddress,
                            props.selectedMarketDetails.pTokenAddress,
                            setTxSnackbarMessage,
                            setTxSnackbarOpen,
                            props.selectedMarketDetails.symbol
                          );
                        }}
                      >
                        Access To Wallet
                      </Button>
                    )}
                  </ListItem>
                </List>
                <List>
                  <ListItem>
                    <ListItemText secondary={`Wallet Balance`} />
                    <ListItemSecondaryAction
                      style={{ margin: "0px 15px 0px 0px" }}
                    >{`${props.selectedMarketDetails.walletBalance
                      .decimalPlaces(4)
                      .toString()} ${
                      props.selectedMarketDetails.symbol
                    }`}</ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label={props.selectedMarketDetails.symbol}
                  value={withdrawAmount}
                  onChange={(event) => {
                    handleWithdrawAmountChange(event.target.value);
                  }}
                  // InputProps={{
                  //   endAdornment: (
                  //     <InputAdornment
                  //       position="end"
                  //       onClick={() => {
                  //         setWithdrawAmount(
                  //           getMaxAmount(
                  //             props.selectedMarketDetails.symbol,
                  //             props.selectedMarketDetails.walletBalance
                  //           ).toString()
                  //         );
                  //       }}
                  //     >
                  //       Max
                  //     </InputAdornment>
                  //   ),
                  // }}
                />
                <div style={{ height: "30px", color: "red" }}>
                  {withdrawValidationMessage}
                </div>
                <List>
                  <DialogSupplyRatesSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                  />
                  <br />
                  <DialogBorrowLimitSection
                    generalDetails={props.generalDetails}
                    newBorrowLimit={newBorrowLimit2}
                  />
                  <br />
                  <DialogMarketInfoSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                    collateralFactorText={"Loan-to-Value"}
                  />
                  <br />
                  <br />
                  <ListItem>
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={!withdrawAmount || withdrawValidationMessage}
                      block
                      onClick={() => {
                        handleWithdraw(
                          props.selectedMarketDetails.underlyingAddress,
                          props.selectedMarketDetails.pTokenAddress,
                          withdrawAmount,
                          props.selectedMarketDetails.decimals,
                          setTxSnackbarMessage,
                          setTxSnackbarOpen,
                          props.selectedMarketDetails.symbol
                        );
                      }}
                    >
                      Withdraw
                    </Button>
                  </ListItem>
                </List>
                <List>
                  <ListItem>
                    <ListItemText secondary={`You Supplied`} />
                    <ListItemSecondaryAction
                      style={{ margin: "0px 15px 0px 0px" }}
                    >{`${props.selectedMarketDetails.supplyBalanceInTokenUnit.decimalPlaces(
                      4
                    )} ${
                      props.selectedMarketDetails.symbol
                    }`}</ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>
            </div>
          )}
        </DialogContent>
        <TxSnackbar
          open={txSnackbarOpen}
          message={txSnackbarMessage}
          onClose={(event, reason) => {
            if (reason === "clickaway") {
              return;
            }
            setTxSnackbarOpen(false);
          }}
        />
      </Dialog>
    );
  };

  const BorrowDialog = (props) => {
    const [tabValue, setTabValue] = useState(0);
    const [borrowAmount, setBorrowAmount] = useState("");
    const [repayAmount, setRepayAmount] = useState("");
    const [isFullRepay, setIsFullRepay] = useState(false);
    const [borrowValidationMessage, setBorrowValidationMessage] = useState("");
    const [repayValidationMessage, setRepayValidationMessage] = useState("");
    const [txSnackbarOpen, setTxSnackbarOpen] = useState(false);
    const [txSnackbarMessage, setTxSnackbarMessage] = useState("");

    const handleTabChange = (event, newValue) => {
      setTabValue(newValue);
    };
    const handleBorrowAmountChange = (amount) => {
      setBorrowAmount(amount);

      if (amount <= 0) {
        setBorrowValidationMessage("Amount must be > 0");
      } else if (
        amount * +props.selectedMarketDetails.underlyingPrice >
        +props.generalDetails.totalBorrowLimit
      ) {
        setBorrowValidationMessage("Amount must be <= borrow limit");
      } else if (amount > +props.selectedMarketDetails.underlyingAmount) {
        setBorrowValidationMessage("Amount must be <= liquidity");
      } else {
        setBorrowValidationMessage("");
      }
    };
    const handleRepayAmountChange = (amount, isFull) => {
      setRepayAmount(amount);

      if (amount <= 0) {
        setRepayValidationMessage("Amount must be > 0");
      } else if (
        !isFull &&
        amount > +props.selectedMarketDetails.borrowBalanceInTokenUnit
      ) {
        setRepayValidationMessage("Amount must be <= your borrow balance");
      } else if (amount > +props.selectedMarketDetails.walletBalance) {
        setRepayValidationMessage("Amount must be <= balance");
      } else {
        setRepayValidationMessage("");
      }
    };

    return (
      <Dialog
        open={borrowDialogOpen}
        onClose={() => setBorrowDialogOpen(false)}
      >
        <DialogTitle>
          {props.selectedMarketDetails.symbol && (
            <img
              className="rounded-circle"
              style={{ width: "30px", margin: "0px 10px 0px 0px" }}
              src={props.selectedMarketDetails.logoSource}
              alt=""
            />
          )}
          {`${props.selectedMarketDetails.symbol}`}
        </DialogTitle>
        <DialogContent>
          <AppBar position="static" color="inherit" elevation={0}>
            <BlueStyledTabs
              value={tabValue}
              onChange={handleTabChange}
              textColor="inherit"
              variant="fullWidth"
            >
              <Tab label="Borrow" style={{ outline: "none" }} />
              <Tab label="Repay" style={{ outline: "none" }} />
            </BlueStyledTabs>
          </AppBar>
          {props.selectedMarketDetails.symbol && (
            <div>
              <TabPanel value={tabValue} index={0}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label={props.selectedMarketDetails.symbol}
                  value={borrowAmount}
                  onChange={(event) => {
                    handleBorrowAmountChange(event.target.value);
                  }}
                  // InputProps={{
                  //   endAdornment: (
                  //     <InputAdornment
                  //       position="end"
                  //       onClick={() => {
                  //         setBorrowAmount(
                  //           getMaxAmount(
                  //             props.selectedMarketDetails.symbol,
                  //             props.selectedMarketDetails.walletBalance
                  //           ).toString()
                  //         );
                  //       }}
                  //     >
                  //       Max
                  //     </InputAdornment>
                  //   ),
                  // }}
                />
                <div style={{ height: "30px", color: "red" }}>
                  {borrowValidationMessage}
                </div>
                <List>
                  <DialogBorrowRatesSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                  />
                  <br />
                  <DialogBorrowLimitSection2
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                    borrowAmount={borrowAmount}
                    repayAmount={0}
                  />
                  <br />
                  <DialogMarketInfoSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                    collateralFactorText={"Liquidation Threshold"}
                  />
                  <br />
                  <br />
                  <ListItem>
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={!borrowAmount || borrowValidationMessage}
                      block
                      onClick={() => {
                        handleBorrow(
                          props.selectedMarketDetails.underlyingAddress,
                          props.selectedMarketDetails.pTokenAddress,
                          borrowAmount,
                          props.selectedMarketDetails.decimals,
                          setTxSnackbarMessage,
                          setTxSnackbarOpen,
                          props.selectedMarketDetails.symbol
                        );
                      }}
                    >
                      Borrow
                    </Button>
                  </ListItem>
                </List>
                <List>
                  <ListItem>
                    <ListItemText secondary={`You Borrowed`} />
                    <ListItemSecondaryAction
                      style={{ margin: "0px 15px 0px 0px" }}
                    >{`${props.selectedMarketDetails.borrowBalanceInTokenUnit.decimalPlaces(
                      4
                    )} ${
                      props.selectedMarketDetails.symbol
                    }`}</ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label={props.selectedMarketDetails.symbol}
                  value={repayAmount}
                  onChange={(event) => {
                    setIsFullRepay(false);
                    handleRepayAmountChange(event.target.value, false);
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment
                        position="end"
                        onClick={() => {
                          const maxAffortable = getMaxAmount(
                            props.selectedMarketDetails.symbol,
                            props.selectedMarketDetails.walletBalance
                          );
                          const fullRepayAmount = getMaxRepayAmount(
                            props.selectedMarketDetails.symbol,
                            props.selectedMarketDetails
                              .borrowBalanceInTokenUnit,
                            props.selectedMarketDetails.borrowApy
                          );
                          const isFull = maxAffortable.gte(fullRepayAmount);
                          setIsFullRepay(isFull);
                          handleRepayAmountChange(
                            BigNumber.minimum(
                              maxAffortable,
                              fullRepayAmount
                            ).toString(),
                            isFull
                          );
                        }}
                      >
                        Max
                      </InputAdornment>
                    ),
                  }}
                />
                <div style={{ height: "30px", color: "red" }}>
                  {repayValidationMessage}
                </div>
                <List>
                  <DialogBorrowRatesSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                  />
                  <br />
                  <DialogBorrowLimitSection2
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                    borrowAmount={0}
                    repayAmount={repayAmount}
                  />
                  <br />
                  <DialogMarketInfoSection
                    generalDetails={props.generalDetails}
                    selectedMarketDetails={props.selectedMarketDetails}
                    collateralFactorText={"Liquidation Threshold"}
                  />
                  <br />
                  <br />
                  <ListItem>
                    {props.selectedMarketDetails.underlyingAllowance?.isGreaterThan(
                      0
                    ) &&
                    props.selectedMarketDetails.underlyingAllowance?.isGreaterThanOrEqualTo(
                      +repayAmount
                    ) ? (
                      <Button
                        variant="primary"
                        size="lg"
                        disabled={!repayAmount || repayValidationMessage}
                        block
                        onClick={() => {
                          handleRepay(
                            account,
                            props.selectedMarketDetails.underlyingAddress,
                            props.selectedMarketDetails.pTokenAddress,
                            repayAmount,
                            isFullRepay,
                            props.selectedMarketDetails.decimals,
                            setTxSnackbarMessage,
                            setTxSnackbarOpen,
                            props.selectedMarketDetails.symbol
                          );
                        }}
                      >
                        Repay
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        block
                        onClick={() => {
                          handleEnable(
                            props.selectedMarketDetails.underlyingAddress,
                            props.selectedMarketDetails.pTokenAddress,
                            setTxSnackbarMessage,
                            setTxSnackbarOpen
                          );
                        }}
                      >
                        Access To Wallet
                      </Button>
                    )}
                  </ListItem>
                </List>
                <List>
                  <ListItem>
                    <ListItemText secondary={`Wallet Balance`} />
                    <ListItemSecondaryAction
                      style={{ margin: "0px 15px 0px 0px" }}
                    >{`${props.selectedMarketDetails.walletBalance
                      .decimalPlaces(4)
                      .toString()} ${
                      props.selectedMarketDetails.symbol
                    }`}</ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>
            </div>
          )}
        </DialogContent>
        <TxSnackbar
          open={txSnackbarOpen}
          message={txSnackbarMessage}
          onClose={(event, reason) => {
            if (reason === "clickaway") {
              return;
            }
            setTxSnackbarOpen(false);
          }}
        />
      </Dialog>
    );
  };

  const EnterMarketDialog = (props) => {
    const [txSnackbarOpen, setTxSnackbarOpen] = useState(false);
    const [txSnackbarMessage, setTxSnackbarMessage] = useState("");

    return (
      <Dialog
        open={enterMarketDialogOpen}
        onClose={() => setEnterMarketDialogOpen(false)}
      >
        <DialogTitle>
          {props.selectedMarketDetails.symbol && (
            <img
              className="rounded-circle"
              style={{ width: "30px", margin: "0px 10px 0px 0px" }}
              src={props.selectedMarketDetails.logoSource}
              alt=""
            />
          )}
          {`${
            props.selectedMarketDetails.isEnterMarket ? "Disable" : "Enable"
          } as Collateral`}
        </DialogTitle>
        <DialogContent>
          {props.selectedMarketDetails.symbol && (
            <List>
              <br />
              <ListItem>
                {props.selectedMarketDetails.isEnterMarket ? (
                  <Typography>
                    This asset is required to support your borrowed assets.
                    Either repay borrowed assets, or supply another asset as
                    collateral.
                  </Typography>
                ) : (
                  <Typography>
                    Each asset used as collateral increases your borrowing
                    limit. Be careful, this can subject the asset to being
                    seized in liquidation.
                  </Typography>
                )}
              </ListItem>
              <DialogBorrowLimitSection generalDetails={props.generalDetails} />
              <br />
              <br />
              <ListItem>
                {props.selectedMarketDetails.isEnterMarket ? (
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    onClick={() => {
                      handleExitMarket(
                        props.selectedMarketDetails.pTokenAddress,
                        setTxSnackbarMessage,
                        setTxSnackbarOpen
                      );
                    }}
                  >
                    {`Disable ${props.selectedMarketDetails.symbol} as Collateral`}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    onClick={() => {
                      handleEnterMarket(
                        props.selectedMarketDetails.pTokenAddress,
                        setTxSnackbarMessage,
                        setTxSnackbarOpen
                      );
                    }}
                  >
                    {`Use ${props.selectedMarketDetails.symbol} as Collateral`}
                  </Button>
                )}
              </ListItem>
            </List>
          )}
        </DialogContent>
        <TxSnackbar
          open={txSnackbarOpen}
          message={txSnackbarMessage}
          onClose={(event, reason) => {
            if (reason === "clickaway") {
              return;
            }
            setTxSnackbarOpen(false);
          }}
        />
      </Dialog>
    );
  };

  const TxSnackbar = (props) => {
    return (
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        open={props.open}
        autoHideDuration={5000}
        onClose={props.onClose}
        message={props.message}
        action={null}
      />
    );
  };

  const OtherSnackbar = (props) => {
    return (
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        open={props.open}
        autoHideDuration={5000}
        onClose={props.onClose}
        message={props.message}
        action={null}
      />
    );
  };

  const compareSymbol = (a, b) => {
    if (a.symbol < b.symbol) {
      return -1;
    }
    if (a.symbol > b.symbol) {
      return 1;
    }
    return 0;
  };

  return (
    <Aux>
      <LinearProgress
        style={{
          visibility:
            generalDetails.netApy ||
            !chainIdToName[parseInt(library?.provider?.chainId)]
              ? "hidden"
              : "visible",
          margin: "0px 0px 8px 0px",
        }}
      />
      <SupplyDialog
        open={supplyDialogOpen}
        selectedMarketDetails={selectedMarketDetails}
        generalDetails={generalDetails}
      />
      <BorrowDialog
        open={borrowDialogOpen}
        selectedMarketDetails={selectedMarketDetails}
        generalDetails={generalDetails}
      />
      <EnterMarketDialog
        open={enterMarketDialogOpen}
        selectedMarketDetails={selectedMarketDetails}
        generalDetails={generalDetails}
      />
      <OtherSnackbar
        open={otherSnackbarOpen}
        message={otherSnackbarMessage}
        onClose={(event, reason) => {
          if (reason === "clickaway") {
            return;
          }
          setOtherSnackbarOpen(false);
        }}
      />
      <div class="title-bar">
        <div className="title-bar-text">Market Overview</div>
        <div class="title-bar-controls">
          <button aria-label="Close"></button>
        </div>
      </div>
      <Card>
        <Card.Body style={{ padding: "20px 20px 0px 20px" }}>
          <Row>
            <Col xs={12} lg style={{ margin: "0px 0px 20px 0px" }}>
              {/*<h6>Market Overview</h6>*/}
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3
                    className="f-w-300 d-flex align-items-center m-b-0"
                    style={{ fontSize: "120%" }}
                  >
                    <i className={`fa fa-circle text-c-blue f-10 m-r-15`} />
                    {`Total Supply: $${convertToLargeNumberRepresentation(
                      generalDetails.allMarketsTotalSupplyBalance?.precision(4)
                    )}`}
                    <br />
                    {`Total Borrow: $${convertToLargeNumberRepresentation(
                      generalDetails.allMarketsTotalBorrowBalance?.precision(4)
                    )}`}
                    <br />
                    {`Total Liquidity: $${convertToLargeNumberRepresentation(
                      generalDetails.totalLiquidity?.precision(4)
                    )}`}
                  </h3>
                </div>
              </div>
            </Col>
            <Col xs={6} lg style={{ margin: "0px 0px 20px 0px" }}>
              <h6 className="mb-4">Your Supply Balance</h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-green f-10 m-r-15`} />
                    {`$${zeroStringIfNullish(
                      generalDetails.totalSupplyBalance?.toFixed(2),
                      2
                    )}`}
                  </h3>
                </div>
              </div>
            </Col>
            <Col xs={6} lg style={{ margin: "0px 0px 20px 0px" }}>
              <h6>
                <LightTooltip
                  title="The net annual percentage yield across all of your personal deposits/borrows."
                  placement="bottom-start"
                >
                  <div>
                    Net APY
                    <GreyInfoIcon />
                  </div>
                </LightTooltip>
              </h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3
                    className="f-w-300 d-flex align-items-center m-b-0"
                    style={{ fontSize: "120%" }}
                  >
                    <i className={`fa fa-circle text-c-green f-10 m-r-15`} />
                    {`${zeroStringIfNullish(
                      generalDetails.netApy?.times(100).toFixed(2),
                      2
                    )}%`}
                    <br />
                    {`+ ${zeroStringIfNullish(
                      generalDetails.totalSupplyPctApy?.times(100).toFixed(2),
                      2
                    )}% PCT (supply)`}
                    <br />
                    {`+ ${zeroStringIfNullish(
                      generalDetails.totalBorrowPctApy?.times(100).toFixed(2),
                      2
                    )}% PCT (borrow)`}
                  </h3>
                </div>
              </div>
            </Col>
            <Col xs={6} lg style={{ margin: "0px 0px 20px 0px" }}>
              <h6 className="mb-4">
                <LightTooltip
                  title="The balance of outstanding value you borrowed from the protocol."
                  placement="bottom-start"
                >
                  <div>
                    Your Borrow Balance
                    <GreyInfoIcon />
                  </div>
                </LightTooltip>
              </h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-yellow f-10 m-r-15`} />
                    {`$${zeroStringIfNullish(
                      generalDetails.totalBorrowBalance?.toFixed(2),
                      2
                    )}`}
                  </h3>
                </div>
              </div>
            </Col>
            <Col xs={6} lg style={{ margin: "0px 0px 20px 0px" }}>
              <h6 className="mb-4">
                <LightTooltip
                  title="The maximum amount of value available for you to borrow."
                  placement="bottom-start"
                >
                  <div>
                    Your Borrow Limit
                    <GreyInfoIcon />
                  </div>
                </LightTooltip>
              </h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-yellow f-10 m-r-15`} />
                    <span>
                      {`$${zeroStringIfNullish(
                        generalDetails.totalBorrowLimit?.toFixed(2),
                        2
                      )}`}
                    </span>
                    <span
                      style={{
                        fontSize: "50%",
                        margin: "0px 0px 0px 10px",
                        color: "grey",
                      }}
                    >
                      {`(${zeroStringIfNullish(
                        generalDetails.totalBorrowLimitUsedPercent?.toFixed(2),
                        2
                      )}% Used)`}
                    </span>
                  </h3>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      {/* <Row>
        <Col xs={12} md={6}>
          <Card>
            <Card.Body className="border-bottom">
              <h6 className="mb-4">Supply Balance</h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-green f-10 m-r-15`} />
                    {`$${zeroStringIfNullish(
                      generalDetails.totalSupplyBalance?.toFixed(2),
                      2
                    )}`}
                  </h3>
                </div>
              </div>
            </Card.Body>
            <Card.Body>
              <h6 className="mb-4">Net APY</h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-green f-10 m-r-15`} />
                    {`${zeroStringIfNullish(
                      generalDetails.netApy?.times(100).toFixed(2),
                      2
                    )}%`}
                  </h3>
                </div>
              </div>
              <div className="progress m-t-30" style={{ height: "7px" }}>
                <div
                  className="progress-bar progress-c-theme"
                  role="progressbar"
                  style={{
                    width: `${generalDetails.yearBorrowInterest
                      ?.div(generalDetails.yearSupplyInterest)
                      .times(-1)
                      .plus(1)
                      .times(100)
                      .toString() || 0
                      }%`,
                  }}
                  aria-valuenow="50"
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Card.Body className="border-bottom">
              <h6 className="mb-4">Borrow Balance</h6>
              <div className="row d-flex align-items-center">
                <div className="col-12">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-yellow f-10 m-r-15`} />
                    {`$${zeroStringIfNullish(
                      generalDetails.totalBorrowBalance?.toFixed(2),
                      2
                    )}`}
                  </h3>
                </div>
              </div>
            </Card.Body>
            <Card.Body>
              <h6 className="mb-4">Borrow Limit</h6>
              <div className="row d-flex align-items-center">
                <div className="col-6">
                  <h3 className="f-w-300 d-flex align-items-center m-b-0">
                    <i className={`fa fa-circle text-c-yellow f-10 m-r-15`} />
                    {`$${zeroStringIfNullish(
                      generalDetails.totalBorrowLimit?.toFixed(2),
                      2
                    )}`}
                  </h3>
                </div>
                <div className="col-6 text-right">
                  <p className="m-b-0">{`${zeroStringIfNullish(
                    generalDetails.totalBorrowLimitUsedPercent?.toFixed(2),
                    2
                  )}% Used`}</p>
                </div>
              </div>
              <div className="progress m-t-30" style={{ height: "7px" }}>
                <div
                  className="progress-bar progress-c-theme2"
                  role="progressbar"
                  style={{
                    width: `${generalDetails.totalBorrowLimitUsedPercent?.toString()}%`,
                  }}
                  aria-valuenow="35"
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row> */}
      <div class="title-bar">
        <div className="title-bar-text">Supply Market</div>
        <div class="title-bar-controls">
          <button aria-label="Close"></button>
        </div>
      </div>
      <Row>
        <Col xs={12} xl={12}>
          <Card className="Recent-Users">
            <Card.Body className="px-0 py-2">
              <Table responsive hover style={{ marginBottom: "0px" }}>
                <tbody>
                  <tr>
                    <th>Asset</th>
                    <th></th>
                    <th>
                      <LightTooltip title="Annual percentage yield of the asset. APY constantly changes to reflect market conditions.">
                        <div>
                          APY
                          <GreyInfoIcon />
                        </div>
                      </LightTooltip>
                    </th>
                    <th>You Supplied</th>
                    <th>Wallet</th>
                    <th>
                      <LightTooltip title="By selecting this option you enable your deposited tokens to be used as collateral for borrowing.">
                        <div>
                          Use As Collateral
                          <GreyInfoIcon />
                        </div>
                      </LightTooltip>
                    </th>
                  </tr>
                  {generalDetails.totalSupplyBalance?.toNumber() > 0 && (
                    <tr>
                      <td
                        style={{
                          fontSize: "80%",
                          fontWeight: "bold",
                          padding: "1px 0px 1px 15px",
                        }}
                      >
                        Supplying
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}
                  {allMarketDetails
                    .filter((item) => item.supplyBalance?.toNumber() > 0)
                    .sort(compareSymbol)
                    .map((details, index) => (
                      <SupplyMarketRow key={index} details={details} />
                    ))}
                  {generalDetails.totalSupplyBalance?.toNumber() > 0 && (
                    <tr>
                      <td
                        style={{
                          fontSize: "80%",
                          fontWeight: "bold",
                          padding: "1px 0px 1px 15px",
                        }}
                      >
                        Other Markets
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}
                  {allMarketDetails
                    .filter((item) => item.supplyBalance?.toNumber() <= 0)
                    .sort(compareSymbol)
                    .map((details, index) => (
                      <SupplyMarketRow key={index} details={details} />
                    ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        </Row>
        <div class="title-bar">
          <div className="title-bar-text">Borrow Markets</div>
          <div class="title-bar-controls">
            <button aria-label="Close"></button>
          </div>
        </div>
        <Row>
        <Col xs={12} xl={12}>
          <Card className="Recent-Users">
            <Card.Body className="px-0 py-2">
              <Table responsive hover style={{ marginBottom: "0px" }}>
                <tbody>
                  <tr>
                    <th>Asset</th>
                    <th></th>
                    <th>APY</th>
                    <th>You Borrowed</th>
                    <th>Total Borrowed</th>
                    <th>Wallet</th>
                    <th>
                      <LightTooltip title="Total supply of a specific token in the money market.">
                        <div>
                          Liquidity
                          <GreyInfoIcon />
                        </div>
                      </LightTooltip>
                    </th>
                  </tr>
                  {generalDetails.totalBorrowBalance?.toNumber() > 0 && (
                    <tr>
                      <td
                        style={{
                          fontSize: "80%",
                          fontWeight: "bold",
                          padding: "1px 0px 1px 15px",
                        }}
                      >
                        Borrowing
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}
                  {allMarketDetails
                    .filter((item) => item.borrowBalance?.toNumber() > 0)
                    .sort(compareSymbol)
                    .map((details, index) => (
                      <BorrowMarketRow key={index} details={details} />
                    ))}
                  {generalDetails.totalBorrowBalance?.toNumber() > 0 && (
                    <tr>
                      <td
                        style={{
                          fontSize: "80%",
                          fontWeight: "bold",
                          padding: "1px 0px 1px 15px",
                        }}
                      >
                        Other Markets
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  )}
                  {allMarketDetails
                    .filter((item) => item.borrowBalance?.toNumber() <= 0)
                    .sort(compareSymbol)
                    .map((details, index) => (
                      <BorrowMarketRow key={index} details={details} />
                    ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Aux>
  );
}

export default Dashboard;
