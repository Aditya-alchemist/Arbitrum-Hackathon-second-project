import express from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";
import { verifyFaceForTag } from "./faceAuth.js";

dotenv.config();

// Load ABI
const abi = JSON.parse(fs.readFileSync("./abi.json", "utf8"));

const app = express();
app.use(express.json());
app.use(cors());

// Connect to chain
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, abi, wallet);

console.log("🔧 Initializing backend...");
console.log(`📄 Contract: ${contractAddress}`);

// Root
app.get("/", (req, res) => {
  res.json({
    status: "Server running",
    contract: contractAddress,
    network: "Arbitrum Sepolia",
    message: "RFID Voting System with Face Verification"
  });
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "OK", contract: contractAddress });
});

// Initialize contract
app.post("/initialize", async (req, res) => {
  try {
    console.log("🔧 Initializing contract...");
    const tx = await contract.initialize();
    console.log(`📤 TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Initialized at block ${receipt.blockNumber}`);

    res.json({
      success: true,
      message: "Contract initialized",
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber)
    });

  } catch (error) {
    console.error("❌ Initialize error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// VOTE ENDPOINT
app.post("/vote", async (req, res) => {
  try {
    const { tagId, buttonId } = req.body;

    if (!tagId || !buttonId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing tagId or buttonId" });
    }

    console.log(`\n📝 Vote request | Tag=${tagId} | Button=${buttonId}`);

    const hasVoted = await contract.checkHasVoted(tagId);
    if (hasVoted) {
      console.log(`⚠️  Tag ${tagId} already voted`);
      return res.status(400).json({
        success: false,
        error: "This tag has already voted"
      });
    }

    // FACE VERIFICATION
    console.log(`🔐 Starting face verification for ${tagId}...`);
    const verified = await verifyFaceForTag(tagId);

    if (!verified) {
      console.log(`❌ Face verification FAILED for ${tagId}`);
      return res.status(403).json({
        success: false,
        error: "Face verification failed"
      });
    }

    console.log(`✅ Face verified for ${tagId}, casting vote...`);

    // SEND TRANSACTION
    const tx = await contract.castVote(tagId, buttonId);
    console.log(`🔗 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();

    console.log(`\n🎯 FINAL CONFIRMATION`);
    console.log(`🗳 Vote CASTED successfully for Tag ${tagId}`);
    console.log(`🔘 Button pressed: ${buttonId}`);
    console.log(`📦 Stored in Block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`💾 Tx Hash: ${tx.hash}\n`);

    res.json({
      success: true,
      message: "Vote successfully cast",
      tagId,
      buttonId,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString()
    });

  } catch (error) {
    console.error(`❌ Vote failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Votes count
app.get("/votes/count", async (req, res) => {
  try {
    const count = await contract.getVoteCount();
    console.log(`📊 Vote count: ${count}`);
    res.json({ success: true, voteCount: Number(count) });
  } catch (error) {
    console.error("❌ Error getting vote count:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// FIXED: Correct parsing for Stylus contract
app.get("/votes/all", async (req, res) => {
  try {
    console.log("\n📊 ===== LOADING ALL VOTES =====");
    
    const countResult = await contract.getVoteCount();
    const total = Number(countResult);
    
    console.log(`📊 Total votes: ${total}`);

    if (total === 0) {
      return res.json({ success: true, totalVotes: 0, votes: [] });
    }

    const votes = [];

    for (let i = 0; i < total; i++) {
      try {
        console.log(`\n📥 Vote ${i}...`);
        
        const iface = new ethers.Interface(abi);
        const data = iface.encodeFunctionData("getVote", [i]);
        
        const rawResult = await provider.call({
          to: contractAddress,
          data: data
        });
        
        const hex = rawResult.slice(2);
        
        // Stylus layout: 
        // 0x00-1F: offset (0x20)
        // 0x20-3F: string offset (0x60)
        // 0x40-5F: button_number ✅
        // 0x60-7F: timestamp ✅
        // 0x80-9F: string length
        // 0xA0+: string data ✅
        
        const buttonNumber = Number('0x' + hex.substring(128, 192));
        const timestamp = Number('0x' + hex.substring(192, 256));
        const stringLength = Number('0x' + hex.substring(256, 320));
        
        let tagId = "";
        if (stringLength > 0 && stringLength < 100) {
          const stringHex = hex.substring(320, 320 + (stringLength * 2));
          const bytes = [];
          for (let j = 0; j < stringHex.length; j += 2) {
            const byte = parseInt(stringHex.substring(j, j + 2), 16);
            if (byte !== 0) bytes.push(byte);
          }
          tagId = new TextDecoder().decode(new Uint8Array(bytes));
        }
        
        console.log(`  ✅ Tag: "${tagId}", Button: ${buttonNumber}, Time: ${timestamp}`);
        
        votes.push({
          index: i,
          tagId: tagId || `Vote_${i}`,
          buttonNumber: buttonNumber,
          timestamp: timestamp,
          date: new Date(timestamp * 1000).toISOString()
        });
        
      } catch (err) {
        console.error(`❌ Error vote ${i}:`, err.message);
        votes.push({
          index: i,
          tagId: `Error_${i}`,
          buttonNumber: 0,
          timestamp: 0,
          date: "Error"
        });
      }
    }

    console.log(`\n✅ Loaded ${votes.length}/${total} votes\n`);

    res.json({ success: true, totalVotes: total, votes });

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check tag
app.get("/check/:tagId", async (req, res) => {
  try {
    const hasVoted = await contract.checkHasVoted(req.params.tagId);
    console.log(`🔍 Tag "${req.params.tagId}" voted: ${hasVoted}`);
    res.json({ success: true, tagId: req.params.tagId, hasVoted });
  } catch (error) {
    console.error("❌ Error checking tag:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Button votes
app.get("/button/:buttonNumber", async (req, res) => {
  try {
    const votes = await contract.getButtonVotes(req.params.buttonNumber);
    console.log(`🔘 Button ${req.params.buttonNumber} votes: ${votes}`);
    res.json({
      success: true,
      buttonNumber: Number(req.params.buttonNumber),
      votes: Number(votes)
    });
  } catch (error) {
    console.error("❌ Error getting button votes:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Winner
app.get("/winner", async (req, res) => {
  try {
    console.log("🏆 Getting winner...");
    const rawResult = await contract.pickWinner();
    
    const winningButton = rawResult[0];
    const votes = rawResult[1];
    
    console.log(`  Winner: Button ${winningButton} with ${votes} votes`);
    
    res.json({
      success: true,
      winner: {
        buttonNumber: Number(winningButton),
        votes: Number(votes)
      }
    });
  } catch (error) {
    console.error("❌ Error getting winner:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset tag vote
app.post("/reset", async (req, res) => {
  try {
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing tagId" 
      });
    }

    console.log(`🔄 Resetting vote for tag: ${tagId}`);
    const tx = await contract.resetVote(tagId);
    const receipt = await tx.wait();
    console.log(`✅ Reset complete: ${tx.hash}`);

    res.json({
      success: true,
      message: `Vote reset for tag ${tagId}`,
      txHash: tx.hash,
      blockNumber: Number(receipt.blockNumber)
    });

  } catch (error) {
    console.error("❌ Error resetting vote:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Owner
app.get("/owner", async (req, res) => {
  try {
    const owner = await contract.owner();
    console.log(`👑 Owner: ${owner}`);
    res.json({ success: true, owner });
  } catch (error) {
    console.error("❌ Error getting owner:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 ===== SERVER STARTED =====`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`📄 Contract: ${contractAddress}`);
  console.log(`🌐 Network: Arbitrum Sepolia`);
  console.log(`⚡ Powered by Stylus (Rust)`);
  console.log(`🔐 Face verification enabled`);
  console.log(`============================\n`);
});
