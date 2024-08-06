import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { module } from "@lens-protocol/metadata";
import { uploadMetadata } from "../lib/irysService";
import { AuctionCollectAction } from "../typechain-types";
import { LENS_HUB, MODULE_REGISTRY } from "../config";

const metadata = module({
  name: "AuctionCollectAction",
  title: "Auction Collect Publication Action",
  description: "English auctions for 1 of 1 Lens Collects",
  authors: ["adonoso@itba.edu.ar", "paul@paulburke.co", "martijn.vanhalen@gmail.com"],
  initializeCalldataABI: JSON.stringify([
    { name: "availableSinceTimestamp", type: "uint64" },
    { name: "duration", type: "uint32" },
    { name: "minTimeAfterBid", type: "uint32" },
    { name: "reservePrice", type: "uint256" },
    { name: "minBidIncrement", type: "uint256" },
    { name: "referralFee", type: "uint16" },
    { name: "currency", type: "address" },
    {
      name: "recipients",
      type: "tuple(address,uint16)[]",
      components: [
        { name: "recipient", type: "address" },
        { name: "split", type: "uint16" },
      ],
    },
    { name: "onlyFollowers", type: "bool" },
    { name: "tokenName", type: "bytes32" },
    { name: "tokenSymbol", type: "bytes32" },
    { name: "tokenRoyalty", type: "uint16" },
  ]),
  processCalldataABI: JSON.stringify([{ name: "amount", type: "uint256" }]),
  attributes: [],
});

const deployAuctionCollectActionContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  let collectNFT: string | undefined;
  try {
    const { address } = await get("CustomCollectNFT");
    collectNFT = address;
  } catch (e) {}

  await deploy("AuctionCollectAction", {
    from: deployer,
    args: [LENS_HUB, LENS_HUB, LENS_HUB, LENS_HUB, MODULE_REGISTRY, collectNFT],
    log: true,
    autoMine: true,
  });

  const auctionActionModule = await hre.ethers.getContract<AuctionCollectAction>("AuctionCollectAction", deployer);

  const metadataURI = await uploadMetadata(metadata);
  await auctionActionModule.setModuleMetadataURI(metadataURI);

  // Add a delay before calling registerModule to allow for propagation
  await new Promise(resolve => setTimeout(resolve, 10000));

  const registered = await auctionActionModule.registerModule();
  console.log("registered open action: tx=", registered.hash);

  const transfer = await auctionActionModule.transferOwnership("0xdaA5EBe0d75cD16558baE6145644EDdFcbA1e868");
  console.log("registered transferred ownership to 0xdaA5EBe0d75cD16558baE6145644EDdFcbA1e868", transfer.hash);
};

export default deployAuctionCollectActionContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourActionModule
deployAuctionCollectActionContract.tags = ["AuctionCollectAction"];
