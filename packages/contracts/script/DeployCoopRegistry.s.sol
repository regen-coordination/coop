// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/CoopRegistry.sol";

contract DeployCoopRegistry is Script {
  function setUp() public {}

  function run() public {
    // Get deployment private key from environment
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    
    // Start broadcasting transactions
    vm.startBroadcast(deployerPrivateKey);
    
    // Deploy the CoopRegistry contract
    CoopRegistry registry = new CoopRegistry();
    
    vm.stopBroadcast();
    
    // Log deployment info
    console.log("CoopRegistry deployed at:", address(registry));
    console.log("Deployer:", msg.sender);
    console.log("Chain ID:", block.chainid);
    
    // Write deployment info to file for later use
    string memory deploymentInfo = string.concat(
      "{\n",
      '  "contract": "CoopRegistry",\n',
      '  "address": "', vm.toString(address(registry)), '",\n',
      '  "deployer": "', vm.toString(msg.sender), '",\n',
      '  "chainId": ', vm.toString(block.chainid), ',\n',
      '  "timestamp": ', vm.toString(block.timestamp), ',\n',
      '  "blockNumber": ', vm.toString(block.number), '\n',
      "}\n"
    );
    
    vm.writeFile(
      string.concat("deployments/", vm.toString(block.chainid), "_", vm.toString(block.timestamp), ".json"),
      deploymentInfo
    );
  }
}
