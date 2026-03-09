// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ICoopRegistry
 * @dev Interface for CoopRegistry contract
 */
interface ICoopRegistry {
  // ============ Enums ============
  enum MemberRole { None, Member, Admin }
  
  // ============ Structs ============
  struct Coop {
    string name;
    string description;
    string metadataURI;
    address creator;
    uint256 createdAt;
    string shareCode;
    bool active;
  }
  
  struct Member {
    address account;
    MemberRole role;
    uint256 joinedAt;
    string displayName;
  }
  
  // ============ Events ============
  event CoopCreated(
    uint256 indexed coopId, 
    string name, 
    string shareCode,
    address indexed creator,
    uint256 createdAt
  );
  
  event CoopUpdated(
    uint256 indexed coopId,
    string name,
    string description,
    string metadataURI
  );
  
  event CoopDeactivated(uint256 indexed coopId, uint256 deactivatedAt);
  
  event MemberJoined(
    uint256 indexed coopId, 
    address indexed member,
    MemberRole role,
    string displayName,
    uint256 joinedAt
  );
  
  event MemberRemoved(
    uint256 indexed coopId, 
    address indexed member,
    address indexed removedBy,
    uint256 removedAt
  );
  
  event MemberRoleUpdated(
    uint256 indexed coopId,
    address indexed member,
    MemberRole oldRole,
    MemberRole newRole
  );
  
  event ShareCodeRegenerated(
    uint256 indexed coopId,
    string oldCode,
    string newCode
  );
  
  // ============ Core Functions ============
  function createCoop(
    string calldata name,
    string calldata description,
    string calldata metadataURI
  ) external returns (uint256 coopId);
  
  function joinCoop(string calldata shareCode, string calldata displayName) 
    external 
    returns (uint256 coopId, MemberRole role);
  
  function updateCoopMetadata(
    uint256 coopId,
    string calldata name,
    string calldata description,
    string calldata metadataURI
  ) external;
  
  function deactivateCoop(uint256 coopId) external;
  
  function regenerateShareCode(uint256 coopId) external returns (string memory newCode);
  
  function removeMember(uint256 coopId, address member) external;
  
  function updateMemberRole(uint256 coopId, address member, MemberRole newRole) external;
  
  // ============ View Functions ============
  function coopCount() external view returns (uint256);
  
  function coops(uint256 coopId) external view returns (Coop memory);
  
  function members(uint256 coopId, address member) external view returns (Member memory);
  
  function coopMemberList(uint256 coopId, uint256 index) external view returns (address);
  
  function shareCodeToCoop(string calldata shareCode) external view returns (uint256);
  
  function memberCoops(address member, uint256 index) external view returns (uint256);
  
  function getCoop(uint256 coopId) external view returns (Coop memory);
  
  function getMember(uint256 coopId, address member) external view returns (Member memory);
  
  function getCoopMembers(uint256 coopId) external view returns (address[] memory);
  
  function getMemberCoops(address member) external view returns (uint256[] memory);
  
  function isCoopMember(uint256 coopId, address account) external view returns (bool);
  
  function isCoopAdmin(uint256 coopId, address account) external view returns (bool);
  
  function getMemberCount(uint256 coopId) external view returns (uint256);
  
  function getCoopByShareCode(string calldata shareCode) external view returns (Coop memory);
}
