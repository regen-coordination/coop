export interface ColdArtifact {
  coopId: string;
  id: string;
  content: string;
}

export interface StoredArtifact {
  cid: string;
  uri: string;
}

export async function uploadToStoracha(input: ColdArtifact): Promise<StoredArtifact> {
  const cid = `bafy-${input.id}`;
  return {
    cid,
    uri: `ipfs://${cid}`,
  };
}
