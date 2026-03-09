// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/CoopRegistry.sol";

contract CoopRegistryTest is Test {
  CoopRegistry public registry;
  
  address public creator = address(0x1);
  address public member1 = address(0x2);
  address public member2 = address(0x3);
  address public nonMember = address(0x4);
  
  function setUp() public {
    registry = new CoopRegistry();
  }
  
  // ============ Coop Creation Tests ============
  
  function testCreateCoop() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    assertEq(coopId, 1);
    assertEq(registry.coopCount(), 1);
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    assertEq(coop.name, "Test Coop");
    assertEq(coop.description, "Description");
    assertEq(coop.creator, creator);
    assertTrue(coop.active);
    
    // Creator should be admin
    assertTrue(registry.isCoopAdmin(coopId, creator));
  }
  
  function testCreateCoopEmptyName() public {
    vm.prank(creator);
    vm.expectRevert(CoopRegistry.EmptyName.selector);
    registry.createCoop("", "Description", "ipfs://metadata");
  }
  
  function testCreateMultipleCoops() public {
    vm.startPrank(creator);
    uint256 coop1 = registry.createCoop("Coop 1", "Desc 1", "ipfs://1");
    uint256 coop2 = registry.createCoop("Coop 2", "Desc 2", "ipfs://2");
    vm.stopPrank();
    
    assertEq(coop1, 1);
    assertEq(coop2, 2);
    assertEq(registry.coopCount(), 2);
  }
  
  // ============ Join Coop Tests ============
  
  function testJoinCoop() public {
    // Create coop
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    // Get share code
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    string memory shareCode = coop.shareCode;
    
    // Join as member
    vm.prank(member1);
    (uint256 joinedCoopId, CoopRegistry.MemberRole role) = registry.joinCoop(shareCode, "Member One");
    
    assertEq(joinedCoopId, coopId);
    assertEq(uint256(role), uint256(CoopRegistry.MemberRole.Member));
    assertTrue(registry.isCoopMember(coopId, member1));
  }
  
  function testJoinCoopInvalidCode() public {
    vm.prank(member1);
    vm.expectRevert(CoopRegistry.InvalidShareCode.selector);
    registry.joinCoop("INVALID", "Member One");
  }
  
  function testJoinCoopAlreadyMember() public {
    // Create and join
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    // Try to join again
    vm.prank(member1);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.AlreadyMember.selector, coopId, member1));
    registry.joinCoop(coop.shareCode, "Member One");
  }
  
  function testJoinDeactivatedCoop() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    // Deactivate
    vm.prank(creator);
    registry.deactivateCoop(coopId);
    
    // Try to join
    vm.prank(member1);
    vm.expectRevert(CoopRegistry.InvalidShareCode.selector);
    registry.joinCoop(coop.shareCode, "Member One");
  }
  
  // ============ Member Removal Tests ============
  
  function testRemoveMember() public {
    // Setup
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    assertTrue(registry.isCoopMember(coopId, member1));
    
    // Remove member
    vm.prank(creator);
    registry.removeMember(coopId, member1);
    
    assertFalse(registry.isCoopMember(coopId, member1));
  }
  
  function testRemoveMemberNotAuthorized() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    // Try to remove as non-admin
    vm.prank(member2);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.NotAuthorized.selector, coopId, member2));
    registry.removeMember(coopId, member1);
  }
  
  function testRemoveCreator() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    // Try to remove creator
    vm.prank(creator);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.NotAuthorized.selector, coopId, creator));
    registry.removeMember(coopId, creator);
  }
  
  function testRemoveNonMember() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    vm.prank(creator);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.NotAMember.selector, coopId, nonMember));
    registry.removeMember(coopId, nonMember);
  }
  
  // ============ Metadata Update Tests ============
  
  function testUpdateCoopMetadata() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    vm.prank(creator);
    registry.updateCoopMetadata(coopId, "Updated Name", "Updated Description", "ipfs://updated");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    assertEq(coop.name, "Updated Name");
    assertEq(coop.description, "Updated Description");
  }
  
  function testUpdateCoopMetadataNotAuthorized() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    vm.prank(member1);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.NotAuthorized.selector, coopId, member1));
    registry.updateCoopMetadata(coopId, "Hacked", "Hacked", "ipfs://hacked");
  }
  
  // ============ Deactivation Tests ============
  
  function testDeactivateCoop() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    vm.prank(creator);
    registry.deactivateCoop(coopId);
    
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.CoopNotFound.selector, coopId));
    registry.getCoop(coopId);
  }
  
  function testDeactivateCoopNotAuthorized() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    vm.prank(member1);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.NotAuthorized.selector, coopId, member1));
    registry.deactivateCoop(coopId);
  }
  
  // ============ View Function Tests ============
  
  function testGetCoopMembers() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    vm.prank(member2);
    registry.joinCoop(coop.shareCode, "Member Two");
    
    address[] memory members = registry.getCoopMembers(coopId);
    assertEq(members.length, 3); // creator + 2 members
  }
  
  function testGetMemberCoops() public {
    vm.startPrank(creator);
    uint256 coop1 = registry.createCoop("Coop 1", "Desc 1", "ipfs://1");
    uint256 coop2 = registry.createCoop("Coop 2", "Desc 2", "ipfs://2");
    vm.stopPrank();
    
    CoopRegistry.Coop memory coop1Data = registry.getCoop(coop1);
    
    vm.prank(member1);
    registry.joinCoop(coop1Data.shareCode, "Member");
    
    uint256[] memory coops = registry.getMemberCoops(member1);
    assertEq(coops.length, 1);
    assertEq(coops[0], coop1);
  }
  
  function testGetMemberCount() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    assertEq(registry.getMemberCount(coopId), 1);
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    assertEq(registry.getMemberCount(coopId), 2);
  }
  
  // ============ Share Code Tests ============
  
  function testRegenerateShareCode() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    string memory oldCode = coop.shareCode;
    
    vm.prank(creator);
    string memory newCode = registry.regenerateShareCode(coopId);
    
    assertTrue(bytes(newCode).length > 0);
    assertFalse(keccak256(bytes(newCode)) == keccak256(bytes(oldCode)));
    
    // Old code should be invalid
    vm.prank(member1);
    vm.expectRevert(CoopRegistry.InvalidShareCode.selector);
    registry.joinCoop(oldCode, "Member One");
    
    // New code should work
    vm.prank(member1);
    (uint256 joinedCoopId,) = registry.joinCoop(newCode, "Member One");
    assertEq(joinedCoopId, coopId);
  }
  
  function testGetCoopByShareCode() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    CoopRegistry.Coop memory foundCoop = registry.getCoopByShareCode(coop.shareCode);
    assertEq(foundCoop.name, "Test Coop");
  }
  
  // ============ Role Tests ============
  
  function testUpdateMemberRole() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    // Promote to admin
    vm.prank(creator);
    registry.updateMemberRole(coopId, member1, CoopRegistry.MemberRole.Admin);
    
    assertTrue(registry.isCoopAdmin(coopId, member1));
  }
  
  function testUpdateMemberRoleNotAuthorized() public {
    vm.prank(creator);
    uint256 coopId = registry.createCoop("Test Coop", "Description", "ipfs://metadata");
    
    CoopRegistry.Coop memory coop = registry.getCoop(coopId);
    
    vm.prank(member1);
    registry.joinCoop(coop.shareCode, "Member One");
    
    vm.prank(member2);
    vm.expectRevert(abi.encodeWithSelector(CoopRegistry.NotAuthorized.selector, coopId, member2));
    registry.updateMemberRole(coopId, member1, CoopRegistry.MemberRole.Admin);
  }
}
