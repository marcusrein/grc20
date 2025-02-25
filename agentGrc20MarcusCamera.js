import { Graph, Ipfs, Id } from "@graphprotocol/grc-20";
import dotenv from "dotenv";
import { ethers } from "ethers";
dotenv.config();

// Constants
const SPACE_ID = "MucL11M5HLWvLSVryrNKPB";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NETWORK = "MAINNET"; // Changed to MAINNET as the space exists on MAINNET

// Initialize array to store all operations
const ops = [];

// Create a timestamp for unique entity naming
const timestamp = new Date().toISOString();
console.log(`Starting script at ${timestamp}`);

// Create an image URL property
const { id: imageUrlPropertyId, ops: createImageUrlPropertyOps } = Graph.createProperty({
	type: "URL",
	name: "ImageUrl",
});
ops.push(...createImageUrlPropertyOps);
console.log("Image URL property created:", { imageUrlPropertyId });

// Create a rating property (using NUMBER instead of STRING)
const { id: ratingPropertyId, ops: createRatingPropertyOps } = Graph.createProperty({
	type: "NUMBER",
	name: "Rating",
});
ops.push(...createRatingPropertyOps);
console.log("Rating property created:", { ratingPropertyId });

// Create an image type
const { id: imageTypeId, ops: createImageTypeOps } = Graph.createType({
	name: "Image",
	properties: [imageUrlPropertyId, ratingPropertyId],
});
ops.push(...createImageTypeOps);
console.log("Image type created:", { imageTypeId });

async function main() {
	try {
		console.log("=== Starting entity creation process ===");
		
		// Create a simple image entity
		const { id: imageId, ops: createImageOps } = Graph.createEntity({
			name: `Test Image ${timestamp}`,
			types: [imageTypeId],
			properties: {
				[imageUrlPropertyId]: {
					type: "URL",
					value: "https://example.com/image.jpg",
				},
				[ratingPropertyId]: {
					type: "NUMBER",
					value: "5", // Rating as a string that will be converted to number
				},
			},
		});
		ops.push(...createImageOps);
		console.log("Image entity created:", { imageId });

		// Publish to IPFS
		console.log("Publishing to IPFS...");
		const cid = await Ipfs.publishEdit({
			name: `Create Test Image ${timestamp}`,
			ops: ops,
			author: imageId,
		});
		console.log("Published to IPFS with CID:", cid);

		// Get calldata for the space
		console.log("Getting calldata for space...", {
			spaceId: SPACE_ID,
			cid: cid,
			network: NETWORK,
		});

		const result = await fetch(
			`https://api-testnet.grc-20.thegraph.com/space/${SPACE_ID}/edit/calldata`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					cid: cid,
					network: NETWORK,
				}),
			}
		);

		if (!result.ok) {
			const errorText = await result.text();
			console.error("Space API error:", {
				status: result.status,
				statusText: result.statusText,
				error: errorText,
			});
			throw new Error(
				`Space API failed: ${result.status} ${result.statusText}`
			);
		}

		const responseData = await result.json();
		console.log("Space API response:", responseData);

		const { to, data } = responseData;

		if (!to || !data) {
			throw new Error(
				"Space API returned invalid data: missing to or data fields"
			);
		}

		console.log("Received valid calldata:", { to, data });

		// Submit the transaction to the blockchain
		if (PRIVATE_KEY) {
			console.log("Submitting transaction to blockchain...");
			
			// Create a provider and wallet
			const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth");
			const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
			
			console.log("Wallet address:", wallet.address);
			
			// Get the current gas price
			const gasPrice = await provider.getGasPrice();
			console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
			
			// Get the nonce
			const nonce = await provider.getTransactionCount(wallet.address);
			console.log("Current nonce:", nonce);
			
			// Create the transaction
			const tx = {
				to: to,
				data: data,
				gasLimit: ethers.utils.hexlify(300000), // Set a reasonable gas limit
				gasPrice: gasPrice,
				nonce: nonce,
			};
			
			console.log("Transaction details:", {
				to: tx.to,
				gasLimit: ethers.utils.formatUnits(tx.gasLimit, 0),
				gasPrice: ethers.utils.formatUnits(tx.gasPrice, "gwei"),
				nonce: tx.nonce,
			});
			
			try {
				// Sign and send the transaction
				console.log("Signing and sending transaction...");
				const signedTx = await wallet.sendTransaction(tx);
				
				console.log("Transaction sent! Hash:", signedTx.hash);
				console.log("Waiting for transaction confirmation...");
				
				// Wait for the transaction to be mined
				const receipt = await signedTx.wait();
				console.log("Transaction confirmed in block:", receipt.blockNumber);
				console.log("Transaction status:", receipt.status === 1 ? "Success" : "Failed");
				console.log("Gas used:", receipt.gasUsed.toString());
				
				// Provide a link to view the entity in the geobrowser
				console.log(`View your entity in the geobrowser: https://geobrowser.io/space/${SPACE_ID}`);
				
				return {
					cid,
					to,
					data,
					txHash: signedTx.hash,
					blockNumber: receipt.blockNumber,
					status: receipt.status === 1 ? "Success" : "Failed"
				};
			} catch (txError) {
				console.error("Transaction error:", txError);
				throw txError;
			}
		} else {
			console.warn("PRIVATE_KEY not found in environment variables. Transaction not submitted.");
			console.log("To submit the transaction manually, use the following calldata:");
			console.log("To:", to);
			console.log("Data:", data);
			return { cid, to, data };
		}
	} catch (error) {
		console.error("Error in main:", error);
		throw error;
	}
}

console.log("Starting main function...");
main()
	.then((result) => {
		console.log("Script completed successfully:", result);
	})
	.catch((error) => {
		console.error("Script failed with error:", error);
	});
