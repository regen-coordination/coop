import { parseAbi } from 'viem';

export const greenGoodsGardenTokenAbi = parseAbi([
  'function mintGarden((string name,string slug,string description,string location,string bannerImage,string metadata,bool openJoining,uint8 weightScheme,uint8 domainMask,address[] gardeners,address[] operators) config) payable returns (address)',
  'event GardenMinted(uint256 indexed tokenId, address indexed account, string name, string description, string location, string bannerImage, bool openJoining)',
  'function owner() view returns (address)',
  'function deploymentRegistry() view returns (address)',
  'function openMinting() view returns (bool)',
]);

export const greenGoodsEnsAbi = parseAbi([
  'function available(string slug) view returns (bool)',
  'function getRegistrationFee(string slug, address owner, uint8 nameType) view returns (uint256)',
]);

export const greenGoodsGardenAccountAbi = parseAbi([
  'function updateName(string _name)',
  'function updateDescription(string _description)',
  'function updateLocation(string _location)',
  'function updateBannerImage(string _bannerImage)',
  'function updateMetadata(string _metadata)',
  'function setOpenJoining(bool _openJoining)',
  'function setMaxGardeners(uint256 _max)',
]);

export const greenGoodsActionRegistryAbi = parseAbi([
  'function setGardenDomains(address garden, uint8 _domainMask)',
]);

export const greenGoodsGardensModuleAbi = parseAbi([
  'function createGardenPools(address garden) returns (address[] pools)',
]);

export const greenGoodsDeploymentRegistryAbi = parseAbi([
  'function isInAllowlist(address account) view returns (bool)',
]);

export const greenGoodsEasAbi = parseAbi([
  'function attest((bytes32 schema,(address recipient,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data,uint256 value) data) request) payable returns (bytes32)',
]);

export const greenGoodsKarmaGapModuleAbi = parseAbi([
  'function addProjectAdmin(address garden, address admin)',
  'function removeProjectAdmin(address garden, address admin)',
  'function getProjectUID(address garden) view returns (bytes32)',
]);

export const greenGoodsGardenerManagementAbi = parseAbi([
  'function addGardener(address gardener)',
  'function removeGardener(address gardener)',
]);
