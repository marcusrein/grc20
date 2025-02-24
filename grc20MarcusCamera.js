import { Graph, Ipfs, Id } from "@graphprotocol/grc-20";
import dotenv from 'dotenv';
dotenv.config();

const SPACE_ID = 'MucL11M5HLWvLSVryrNKPB';

// Initialize array to store all operations
const ops = [];

// Create an age property
const { id: agePropertyId, ops: createAgePropertyOps } = Graph.createProperty({
  type: 'NUMBER',
  name: 'Age',
});
ops.push(...createAgePropertyOps);
console.log('Age property created:', { agePropertyId });

// Create a likes property
const { id: likesPropertyId, ops: createLikesPropertyOps } = Graph.createProperty({
  type: 'RELATION',
  name: 'Likes',
});
ops.push(...createLikesPropertyOps);
console.log('Likes property created:', { likesPropertyId });

// Create a person type
const { id: personTypeId, ops: createPersonTypeOps } = Graph.createType({
  name: 'Person',
  properties: [agePropertyId, likesPropertyId],
});
ops.push(...createPersonTypeOps);
console.log('Person type created:', { personTypeId });

async function main() {
  try {
    const restaurantTypeId = Id.generate();
    const { id: restaurantId, ops: createRestaurantOps } = Graph.createEntity({
      name: 'Yum Yum',
      description: 'A restaurant serving fusion cuisine',
      types: [restaurantTypeId],
      properties: {
        website: {
          type: 'URL',
          value: 'https://example.com',
        },
      },
    });
    ops.push(...createRestaurantOps);
    console.log('Restaurant entity created:', { restaurantId });

    // Create a person entity with age as string
    const { id: personId, ops: createPersonOps } = Graph.createEntity({
      name: 'Jane Doe',
      types: [personTypeId],
      properties: {
        [agePropertyId]: {
          type: 'NUMBER',
          value: '42',
        },
        [likesPropertyId]: {
          to: restaurantId,
        },
      },
    });
    ops.push(...createPersonOps);
    console.log('Person entity created:', { personId });

    // Publish to IPFS
    console.log('Publishing to IPFS...');
    const cid = await Ipfs.publishEdit({
      name: 'Create Restaurant and Person',
      ops: ops,
      author: personId
    });
    console.log('Published to IPFS with CID:', cid);

    // Get calldata for the space
    console.log('Getting calldata for space...', {
      spaceId: SPACE_ID,
      cid: cid
    });
    
    const result = await fetch(`https://api-testnet.grc-20.thegraph.com/space/${SPACE_ID}/edit/calldata`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        cid: cid,
        network: "MAINNET"
      }),
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error('Space API error:', {
        status: result.status,
        statusText: result.statusText,
        error: errorText
      });
      throw new Error(`Space API failed: ${result.status} ${result.statusText}`);
    }

    const responseData = await result.json();
    console.log('Space API response:', responseData);

    const { to, data } = responseData;
    
    if (!to || !data) {
      throw new Error('Space API returned invalid data: missing to or data fields');
    }

    console.log('Received valid calldata:', { to, data });
    return { cid, to, data };

  } catch (error) {
    console.error('Error in main:', error);
    throw error;
  }
}

main().catch(console.error);


