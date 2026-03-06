// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract CoopRegistry {
  struct Coop {
    string name;
    string metadataURI;
    address creator;
    uint256 createdAt;
  }

  uint256 public coopCount;
  mapping(uint256 => Coop) public coops;
  mapping(uint256 => mapping(address => bool)) public isMember;
  mapping(address => uint256[]) private memberCoops;

  event CoopCreated(uint256 indexed coopId, string name, address indexed creator);
  event MemberAdded(uint256 indexed coopId, address indexed member);

  function createCoop(string calldata name, string calldata metadataURI) external returns (uint256 coopId) {
    coopId = ++coopCount;
    coops[coopId] = Coop({
      name: name,
      metadataURI: metadataURI,
      creator: msg.sender,
      createdAt: block.timestamp
    });
    isMember[coopId][msg.sender] = true;
    memberCoops[msg.sender].push(coopId);
    emit CoopCreated(coopId, name, msg.sender);
  }

  function addMember(uint256 coopId, address member) external {
    require(coopId > 0 && coopId <= coopCount, 'Invalid coop');
    require(msg.sender == coops[coopId].creator, 'Only creator');
    if (!isMember[coopId][member]) {
      isMember[coopId][member] = true;
      memberCoops[member].push(coopId);
      emit MemberAdded(coopId, member);
    }
  }

  function getCoopsByMember(address member) external view returns (uint256[] memory) {
    return memberCoops[member];
  }
}
