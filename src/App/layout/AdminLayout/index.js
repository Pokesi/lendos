import React, { useEffect, useState, useContext } from "react";
import { Route, Link } from "react-router-dom";

import routes from "../../../routes";
import Aux from "../../../hoc/_Aux";
import { Row, Col, Navbar, Nav, Button, Dropdown } from "react-bootstrap";
import Snackbar from "@material-ui/core/Snackbar";
import { store } from "../../../store";

import "./app.scss";

import { injected } from "../../../connectors";
import { useEagerConnect, useInactiveListener } from "../../../hooks";
import { useWeb3React } from "@web3-react/core";

import { chainIdToName } from "../../../constants";
import { zeroStringIfNullish, eX } from "../../../helpers";

import PCTlogo from "../../../assets/images/PCT-logo.png";
import PCTbrandLogo from "../../../assets/images/PCT-brand-logo.png";

const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 1e9 });

const Compound = require("@compound-finance/compound-js/dist/nodejs/src/index.js");
// const compoundConstants = require("@compound-finance/compound-js/dist/nodejs/src/constants.js");

function AdminLayout() {
  const { state: globalState } = useContext(store);
  const triedEager = useEagerConnect();
  const { account, library, activate, deactivate, active } = useWeb3React();
  const [pctEarned, setPctEarned] = useState("");
  const [pctBalance, setPctBalance] = useState("");
  const [otherSnackbarOpen, setOtherSnackbarOpen] = useState(false);
  const [otherSnackbarMessage, setOtherSnackbarMessage] = useState("");
  const gasLimitClaim = "1182020";

  useInactiveListener(!triedEager);

  useEffect(() => {
    (async () => {
      setPctEarned(await getPctEarned(account));
      setPctBalance(await getPctBalance(account));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, account]);

  function ConnectButton() {
    const onConnectClick = () => {
      activate(injected);
    };

    return (
      <div>
        {active ? (
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary">
              {getShortenAddress(account)}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => deactivate()}>
                Disconnect
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        ) : (
          <Button onClick={onConnectClick} variant="outline-secondary">
            Connect
          </Button>
        )}
      </div>
    );
  }

  function getShortenAddress(address) {
    const firstCharacters = address.substring(0, 6);
    const lastCharacters = address.substring(
      address.length - 4,
      address.length
    );
    return `${firstCharacters}...${lastCharacters}`;
  }

  function PctButton() {
    return (
      <Dropdown alignRight>
        <Dropdown.Toggle variant="outline-secondary">
          <img
            className="rounded-circle"
            style={{ width: "16px", margin: "0px 10px 3px 0px" }}
            src={PCTlogo}
            alt=""
          />
          {`${new BigNumber(zeroStringIfNullish(pctBalance))
            .decimalPlaces(4)
            .toString()}`}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            style={{ cursor: "default", padding: "20px 20px 20px 20px" }}
          >
            <span>
              <span style={{ color: "grey", margin: "0px 10px 0px 0px" }}>
                PCT Balance
              </span>
              {`${new BigNumber(zeroStringIfNullish(pctBalance))
                .decimalPlaces(4)
                .toString()}`}
            </span>
          </Dropdown.Item>
          <Dropdown.Item
            style={{ cursor: "default", padding: "12px 20px 12px 20px" }}
          >
            <span>
              <span style={{ color: "grey", margin: "0px 10px 0px 0px" }}>
                PCT Earned
              </span>
              {`${new BigNumber(zeroStringIfNullish(pctEarned))
                .decimalPlaces(4)
                .toString()}`}
            </span>
            <Button
              style={{ margin: "0px 0px 0px 60px" }}
              onClick={() => {
                claimPct(account);
              }}
            >
              Collect
            </Button>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  const getPctBalance = async (walletAddress) => {
    if (library) {
      const balance = await Compound.eth.read(
        process.env.REACT_APP_PCT_ADDRESS,
        "function balanceOf(address) returns (uint)",
        [walletAddress], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(balance.toString(), -18).toString();
    }
  };

  const getPctEarned = async (walletAddress) => {
    if (library) {
      const compBalanceMetadata = await Compound.eth.read(
        process.env.REACT_APP_COMPOUND_LENS_ADDRESS,
        "function getCompBalanceMetadataExt(address, address, address) returns (uint, uint, address, uint)",
        [
          process.env.REACT_APP_PCT_ADDRESS,
          process.env.REACT_APP_COMPTROLLER_ADDRESS,
          walletAddress,
        ], // [optional] parameters
        {
          network: chainIdToName[parseInt(library.provider.chainId)],
          _compoundProvider: library,
        } // [optional] call options, provider, network, ethers.js "overrides"
      );

      return eX(compBalanceMetadata[3].toString(), -18).toString();
    }
  };

  const closeWindow = () => {
    window.opener = null;
    window.open("", "_self");
    window.close();
  };

  const claimPct = async (walletAddress) => {
    console.log(
      "globalState.gasPrice.toString()",
      globalState.gasPrice.toString()
    );
    let parameters = [walletAddress];
    let options = {
      network: chainIdToName[parseInt(library.provider.chainId)],
      provider: library.provider,
      gasLimit: gasLimitClaim,
      gasPrice: globalState.gasPrice.toString(),
      // abi: compoundConstants.abi.Comptroller,
    };

    try {
      const tx = await Compound.eth.trx(
        process.env.REACT_APP_COMPTROLLER_ADDRESS,
        {
          constant: false,
          inputs: [
            { internalType: "address", name: "holder", type: "address" },
          ],
          name: "claimComp",
          outputs: [],
          payable: false,
          stateMutability: "nonpayable",
          type: "function",
          signature: "0xe9af0292",
        },
        parameters, // [optional] parameters
        options // [optional] call options, provider, network, ethers.js "overrides"
      );
      console.log("tx", JSON.stringify(tx));
      setOtherSnackbarMessage(`Transaction sent: ${tx.hash}`);
    } catch (e) {
      console.log("tx error:", e);
      setOtherSnackbarMessage("Error occurred!");
    }

    setOtherSnackbarOpen(true);
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

  const menu = routes.map((route, index) => {
    return route.component ? (
      <Route
        key={index}
        path={route.path}
        exact={route.exact}
        name={route.name}
        render={(props) => <route.component {...props} />}
      />
    ) : null;
  });

  return (
    <Aux style={{height: '100%'}}>
      <div class="window" style={{width: '100%', height: '100%'}}>
        <div class="title-bar">
          <div class="title-bar-text">LendOS</div>
          <div class="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close"></button>
          </div>
        </div>
        <div class="window-body">
          <article role="tabpanel" id="lend">
            <Row className="justify-content-md-center" style={{ margin: "0px 3px 100px 3px", height: '100%' }}>
              <Col xs={12} xl={11}>
                {menu}
              </Col>
            </Row>
            <OtherSnackbar open={otherSnackbarOpen} message={otherSnackbarMessage} onClose={(event, reason) => { if (reason === "clickaway") { return;}
                setOtherSnackbarOpen(false);
              }}
            />
          </article>
          <section className="field-row" style={{justifyContent: 'flex-end'}}>
            <a href="https://twitter.com" target="_blank" rel="noreferrer"><button>twitter.com</button></a>
            <a href="https://github.com" target="_blank" rel="noreferrer"><button>github.com</button></a>
          </section>
        </div>
      </div>
    </Aux>
  );
}

export default AdminLayout;
