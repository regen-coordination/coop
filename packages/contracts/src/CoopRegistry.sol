// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title CoopRegistry
 * @dev On-chain registry for Coop communities with member management
 */
contract CoopRegistry {
  // ============ Errors ============
  error CoopNotFound(uint256 coopId);
  error NotAuthorized(uint256 coopId, address caller);
  error AlreadyMember(uint256 coopId, address member);
  error NotAMember(uint256 coopId, address member);
  error InvalidShareCode();
  error EmptyName();
  
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
  
  // ============ State ============
  uint256 public coopCount;
  
  // Coop ID => Coop data
  mapping(uint256 => Coop) public coops;
  
  // Coop ID => Member address => Member data
  mapping(uint256 => mapping(address => Member)) public members;
  
  // Coop ID => Array of member addresses (for iteration)
  mapping(uint256 => address[]) public coopMemberList;
  
  // Share code => Coop ID (for joining)
  mapping(string => uint256) public shareCodeToCoop;
  
  // Member address => Array of coop IDs they belong to
  mapping(address => uint256[]) public memberCoops;
  
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
  
  // ============ Modifiers ============
  modifier onlyCoopCreator(uint256 coopId) {
    if (coops[coopId].creator != msg.sender) {
      revert NotAuthorized(coopId, msg.sender);
    }
    _;
  }
  
  modifier onlyCoopAdmin(uint256 coopId) {
    if (members[coopId][msg.sender].role != MemberRole.Admin && 
        coops[coopId].creator != msg.sender) {
      revert NotAuthorized(coopId, msg.sender);
    }
    _;
  }
  
  modifier onlyCoopMember(uint256 coopId) {
    if (members[coopId][msg.sender].role == MemberRole.None) {
      revert NotAMember(coopId, msg.sender);
    }
    _;
  }
  
  modifier coopExists(uint256 coopId) {
    if (coopId == 0 || coopId > coopCount || !coops[coopId].active) {
      revert CoopNotFound(coopId);
    }
    _;
  }
  
  // ============ Core Functions ============
  
  /**
   * @dev Create a new Coop
   * @param name Coop name
   * @param description Coop description
   * @param metadataURI URI for off-chain metadata
   * @return coopId The ID of the newly created coop
   */
  function createCoop(
    string calldata name,
    string calldata description,
    string calldata metadataURI
  ) external returns (uint256 coopId) {
    if (bytes(name).length == 0) {
      revert EmptyName();
    }
    
    coopId = ++coopCount;
    string memory shareCode = _generateShareCode(coopId);
    
    coops[coopId] = Coop({
      name: name,
      description: description,
      metadataURI: metadataURI,
      creator: msg.sender,
      createdAt: block.timestamp,
      shareCode: shareCode,
      active: true
    });
    
    // Creator is automatically an admin
    members[coopId][msg.sender] = Member({
      account: msg.sender,
      role: MemberRole.Admin,
      joinedAt: block.timestamp,
      displayName: "Creator"
    });
    
    coopMemberList[coopId].push(msg.sender);
    memberCoops[msg.sender].push(coopId);
    shareCodeToCoop[shareCode] = coopId;
    
    emit CoopCreated(coopId, name, shareCode, msg.sender, block.timestamp);
  }
  
  /**
   * @dev Join a coop using share code
   * @param shareCode The share code to join with
   * @param displayName The display name for the joining member
   */
  function joinCoop(string calldata shareCode, string calldata displayName) 
    external 
    returns (uint256 coopId, MemberRole role) 
  {
    coopId = shareCodeToCoop[shareCode];
    
    if (coopId == 0 || !coops[coopId].active) {
      revert InvalidShareCode();
    }
    
    if (members[coopId][msg.sender].role != MemberRole.None) {
      revert AlreadyMember(coopId, msg.sender);
    }
    
    role = MemberRole.Member;
    members[coopId][msg.sender] = Member({
      account: msg.sender,
      role: role,
      joinedAt: block.timestamp,
      displayName: displayName
    });
    
    coopMemberList[coopId].push(msg.sender);
    memberCoops[msg.sender].push(coopId);
    
    emit MemberJoined(coopId, msg.sender, role, displayName, block.timestamp);
  }
  
  /**
   * @dev Update coop metadata (only creator)
   */
  function updateCoopMetadata(
    uint256 coopId,
    string calldata name,
    string calldata description,
    string calldata metadataURI
  ) external coopExists(coopId) onlyCoopCreator(coopId) {
    Coop storage coop = coops[coopId];
    
    if (bytes(name).length > 0) {
      coop.name = name;
    }
    
    coop.description = description;
    coop.metadataURI = metadataURI;
    
    emit CoopUpdated(coopId, coop.name, description, metadataURI);
  }
  
  /**
   * @dev Deactivate a coop (only creator)
   */
  function deactivateCoop(uint256 coopId) 
    external 
    coopExists(coopId) 
    onlyCoopCreator(coopId) 
  {
    coops[coopId].active = false;
    delete shareCodeToCoop[coops[coopId].shareCode];
    
    emit CoopDeactivated(coopId, block.timestamp);
  }
  
  /**
   * @dev Regenerate share code (only admin)
   */
  function regenerateShareCode(uint256 coopId) 
    external 
    coopExists(coopId) 
    onlyCoopAdmin(coopId) 
    returns (string memory newCode)
  {
    Coop storage coop = coops[coopId];
    string memory oldCode = coop.shareCode;
    
    delete shareCodeToCoop[oldCode];
    
    newCode = _generateShareCode(coopId);
    coop.shareCode = newCode;
    shareCodeToCoop[newCode] = coopId;
    
    emit ShareCodeRegenerated(coopId, oldCode, newCode);
  }
  
  /**
   * @dev Remove a member (only admin)
   */
  function removeMember(uint256 coopId, address member) 
    external 
    coopExists(coopId) 
    onlyCoopAdmin(coopId) 
  {
    if (members[coopId][member].role == MemberRole.None) {
      revert NotAMember(coopId, member);
    }
    
    // Cannot remove the creator
    if (member == coops[coopId].creator) {
      revert NotAuthorized(coopId, msg.sender);
    }
    
    // Remove from members mapping
    delete members[coopId][member];
    
    // Remove from coopMemberList array
    address[] storage memberList = coopMemberList[coopId];
    for (uint256 i = 0; i < memberList.length; i++) {
      if (memberList[i] == member) {
        memberList[i] = memberList[memberList.length - 1];
        memberList.pop();
        break;
      }
    }
    
    // Remove from memberCoops array
    uint256[] storage coopList = memberCoops[member];
    for (uint256 i = 0; i < coopList.length; i++) {
      if (coopList[i] == coopId) {
        coopList[i] = coopList[coopList.length - 1];
        coopList.pop();
        break;
      }
    }
    
    emit MemberRemoved(coopId, member, msg.sender, block.timestamp);
  }
  
  /**
   * @dev Update member role (only admin)
   */
  function updateMemberRole(uint256 coopId, address member, MemberRole newRole) 
    external 
    coopExists(coopId) 
    onlyCoopAdmin(coopId) 
  {
    Member storage memberData = members[coopId][member];
    
    if (memberData.role == MemberRole.None) {
      revert NotAMember(coopId, member);
    }
    
    MemberRole oldRole = memberData.role;
    memberData.role = newRole;
    
    emit MemberRoleUpdated(coopId, member, oldRole, newRole);
  }
  
  // ============ View Functions ============
  
  /**
   * @dev Get coop details
   */
  function getCoop(uint256 coopId) 
    external 
    view 
    coopExists(coopId) 
    returns (Coop memory) 
  {
    return coops[coopId];
  }
  
  /**
   * @dev Get member details
   */
  function getMember(uint256 coopId, address member) 
    external 
    view 
    coopExists(coopId) 
    returns (Member memory) 
  {
    return members[coopId][member];
  }
  
  /**
   * @dev Get all members of a coop
   */
  function getCoopMembers(uint256 coopId) 
    external 
    view 
    coopExists(coopId) 
    returns (address[] memory) 
  {
    return coopMemberList[coopId];
  }
  
  /**
   * @dev Get all coops a member belongs to
   */
  function getMemberCoops(address member) external view returns (uint256[] memory) {
    return memberCoops[member];
  }
  
  /**
   * @dev Check if address is a member of coop
   */
  function isCoopMember(uint256 coopId, address account) external view returns (bool) {
    return members[coopId][account].role != MemberRole.None;
  }
  
  /**
   * @dev Check if address is admin of coop
   */
  function isCoopAdmin(uint256 coopId, address account) 
    external 
    view 
    returns (bool) 
  {
    return members[coopId][account].role == MemberRole.Admin || 
           coops[coopId].creator == account;
  }
  
  /**
   * @dev Get member count for a coop
   */
  function getMemberCount(uint256 coopId) external view coopExists(coopId) returns (uint256) {
    return coopMemberList[coopId].length;
  }
  
  /**
   * @dev Get coop by share code
   */
  function getCoopByShareCode(string calldata shareCode) external view returns (Coop memory) {
    uint256 coopId = shareCodeToCoop[shareCode];
    if (coopId == 0 || !coops[coopId].active) {
      revert InvalidShareCode();
    }
    return coops[coopId];
  }
  
  // ============ Internal Functions ============
  
  /**
   * @dev Generate a unique share code
   */
  function _generateShareCode(uint256 coopId) internal view returns (string memory) {
    // Generate a code based on coopId + timestamp + randomness
    bytes32 hash = keccak256(abi.encodePacked(
      coopId,
      block.timestamp,
      block.number,
      msg.sender
    ));
    
    // Convert to alphanumeric, exclude confusing chars (0, O, 1, I, l)
    bytes memory charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    bytes memory result = new bytes(8);
    
    for (uint256 i = 0; i < 8; i++) {
      result[i] = charset[uint8(hash[i]) % 32];
    }
    
    return string(result);
  }
}
