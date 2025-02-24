import { Graph, Ipfs } from "@graphprotocol/grc-20";
import dotenv from 'dotenv';
dotenv.config();

// Initialize array to store all operations
const ops = [];

// Create Properties
// These properties correspond to the attributes found in camera_entity in grc20example.json
const { id: brandPropertyId, ops: createBrandPropertyOps } = Graph.createProperty({
  type: 'TEXT',  // Maps to type: 1 in example
  name: 'Brand', // Used in camera_entity metadata
});
ops.push(...createBrandPropertyOps);

const { id: modelPropertyId, ops: createModelPropertyOps } = Graph.createProperty({
  type: 'TEXT',  // Maps to type: 1 in example
  name: 'Model', // Used in camera_entity metadata
});
ops.push(...createModelPropertyOps);

const { id: colorPropertyId, ops: createColorPropertyOps } = Graph.createProperty({
  type: 'TEXT',  // Maps to type: 1 in example
  name: 'Color', // Maps to camera_entity Color attribute
});
ops.push(...createColorPropertyOps);

const { id: megapixelsPropertyId, ops: createMegapixelsPropertyOps } = Graph.createProperty({
  type: 'NUMBER',  // Maps to type: 2 in example
  name: 'Megapixels', // Maps to camera_entity Megapixels attribute
});
ops.push(...createMegapixelsPropertyOps);

const { id: purchaseDatePropertyId, ops: createPurchaseDatePropertyOps } = Graph.createProperty({
  type: 'TIME',  // Maps to type: 5 in example
  name: 'Purchase Date', // Used in marcus_owns_camera_relation_entity
});
ops.push(...createPurchaseDatePropertyOps);

// Log the property IDs for verification
console.log('Created Properties:', {
  brandPropertyId,
  modelPropertyId,
  colorPropertyId,
  megapixelsPropertyId,
  purchaseDatePropertyId
});

// Create Types
// Maps to person_entity type in example
const { id: personTypeId, ops: createPersonTypeOps } = Graph.createType({
  name: 'Person', // Referenced by marcus_entity
  properties: [],
});
ops.push(...createPersonTypeOps);

// Maps to object_entity type in example
const { id: cameraTypeId, ops: createCameraTypeOps } = Graph.createType({
  name: 'Camera',
  properties: [brandPropertyId, modelPropertyId, colorPropertyId, megapixelsPropertyId],
});
ops.push(...createCameraTypeOps);

// Create Ownership Relation Type
// Maps to owns_relation_type_entity in example
const { id: ownsRelationTypeId, ops: createOwnsRelationTypeOps } = Graph.createType({
  name: 'Owns',
  description: 'Defines ownership relationships', // Matches metadata in example
  properties: [purchaseDatePropertyId],
});
ops.push(...createOwnsRelationTypeOps);

// Log the type IDs for verification
console.log('Created Types:', {
  personTypeId,
  cameraTypeId,
  ownsRelationTypeId
});

async function main() {
  try {
    // Publish to IPFS
    console.log('Publishing to IPFS...');
    const cid = await Ipfs.publishEdit({
      name: 'Create Properties and Types',
      ops: ops,
    });
    
    console.log('✓ Published to IPFS with CID:', cid);

    // Publish to space...
    console.log('Publishing to space...');
    const spaceId = 'FuvKkspixpHymrWbrRZDfc';
    
    // Log the request payload for debugging
    const payload = { 
      cid: cid,
      network: "TESTNET",
    };
    console.log('Request Payload:', payload);

    const result = await fetch(`http://api-testnet.grc-20.thegraph.com/space/${spaceId}/edit/calldata`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Get the raw response text if it's not JSON
    let responseText;
    try {
      responseText = await result.text();
      console.log('Raw Response:', responseText);
    } catch (e) {
      console.error('Failed to get response text:', e);
    }

    if (!result.ok) {
      throw new Error(`Space API call failed: ${result.status} ${result.statusText}\nResponse: ${responseText}`);
    }

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse response as JSON: ${responseText}`);
    }

    if (!responseData.to || !responseData.data) {
      throw new Error('Space API response missing required fields: ' + JSON.stringify(responseData));
    }

    const { to, data } = responseData;
    console.log('✓ Ready for on-chain transaction');
    console.log('Contract Address:', to);
    console.log('Transaction Data:', data);
    
    return { cid, to, data };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

main().catch(console.error);


