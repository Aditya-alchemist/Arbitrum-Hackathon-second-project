import React, { useEffect, useState, useRef, useCallback } from "react";
import { ethers } from "ethers";
import Webcam from "react-webcam";
import './App.css';

// Backend API URL
const BACKEND_URL = "http://localhost:3000";

// Stylus contract address
const CONTRACT_ADDRESS = "0x16f7b54cb4002b5ca98a07ee44d81802e1009977";

// Updated ABI for Stylus contract
const contractABI = 
[
  {
    "inputs": [],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tag_id",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "button_number",
        "type": "uint256"
      }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVoteCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getVote",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pickWinner",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tag_id",
        "type": "string"
      }
    ],
    "name": "resetVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "new_owner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "button_number",
        "type": "uint256"
      }
    ],
    "name": "getButtonVotes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tag_id",
        "type": "string"
      }
    ],
    "name": "checkHasVoted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "tag_id",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "button_number",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "winning_button",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "votes",
        "type": "uint256"
      }
    ],
    "name": "WinnerDeclared",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previous_owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "new_owner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "AlreadyVoted",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "NoVotes",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "InvalidIndex",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "ReentrancyGuard",
    "type": "error"
  }
]
;

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [networkName, setNetworkName] = useState("");

  const [voteCount, setVoteCount] = useState(0);
  const [votes, setVotes] = useState([]);
  const [buttonVotes, setButtonVotes] = useState({});
  
  const [tagID, setTagID] = useState("");
  const [buttonNumber, setButtonNumber] = useState("");
  const [status, setStatus] = useState("Welcome to RFID Voting DApp with Face Verification!");
  const [loading, setLoading] = useState(false);
  
  const [isOwner, setIsOwner] = useState(false);
  const [owner, setOwner] = useState("");
  const [winner, setWinner] = useState(null);
  const [resetTag, setResetTag] = useState("");
  
  const [queryTagID, setQueryTagID] = useState("");
  const [queryButtonNumber, setQueryButtonNumber] = useState("");
  const [queryResult, setQueryResult] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Face verification state
  const [faceVerifying, setFaceVerifying] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("❌ Please install MetaMask to use this app.");
      return;
    }

    try {
      setLoading(true);
      setStatus("🔗 Connecting to wallet...");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      
      if (network.chainId !== 421614n) {
        setStatus("⚠ Please switch to Arbitrum Sepolia network (Chain ID: 421614)");
        setNetworkName(`Wrong Network (Chain ${network.chainId})`);
        return;
      }
      
      setNetworkName("Arbitrum Sepolia");

      // Check backend connectivity
      try {
        const healthCheck = await fetch(`${BACKEND_URL}/health`);
        const healthData = await healthCheck.json();
        console.log("✅ Backend connected:", healthData);
      } catch (err) {
        setStatus("⚠ Warning: Backend server not responding. Start backend with: node index.js");
        console.error("Backend connection error:", err);
        setLoading(false);
        return;
      }

      // Get owner info
      try {
        const ownerResponse = await fetch(`${BACKEND_URL}/owner`);
        const ownerData = await ownerResponse.json();
        
        if (ownerData.success) {
          setOwner(ownerData.owner);
          setIsOwner(ownerData.owner.toLowerCase() === address.toLowerCase());
          
          if (ownerData.owner !== ethers.ZeroAddress) {
            setIsInitialized(true);
            setStatus("✅ Wallet connected successfully!");
            await loadVotingData();
          } else {
            setIsInitialized(false);
            setStatus("⚠ Contract needs to be initialized first!");
          }
        }
      } catch (error) {
        setStatus("❌ Failed to connect to contract: " + error.message);
        console.error("Contract connection error:", error);
      }
      
    } catch (error) {
      setStatus("❌ Failed to connect wallet: " + error.message);
      console.error("Wallet connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount("");
    setNetworkName("");
    setIsOwner(false);
    setOwner("");
    setVoteCount(0);
    setVotes([]);
    setButtonVotes({});
    setWinner(null);
    setIsInitialized(false);
    setStatus("Wallet disconnected. Connect again to use the app.");
  };

  // Initialize contract
  const initializeContract = async () => {
    try {
      setLoading(true);
      setStatus("🔧 Initializing contract...");
      
      const response = await fetch(`${BACKEND_URL}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus("✅ Contract initialized successfully!");
        setIsInitialized(true);
        
        const ownerResponse = await fetch(`${BACKEND_URL}/owner`);
        const ownerData = await ownerResponse.json();
        if (ownerData.success) {
          setOwner(ownerData.owner);
          setIsOwner(ownerData.owner.toLowerCase() === account.toLowerCase());
        }
      } else {
        setStatus("❌ Initialization failed: " + data.error);
      }
    } catch (error) {
      console.error("Initialize error:", error);
      setStatus("❌ Initialization failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all voting data
  const loadVotingData = async () => {
    try {
      setLoading(true);
      setStatus("📊 Loading voting data...");
      
      // Get all votes
      const votesResponse = await fetch(`${BACKEND_URL}/votes/all`);
      const votesData = await votesResponse.json();
      
      console.log("Votes data received:", votesData);
      
      if (votesData.success) {
        setVoteCount(votesData.totalVotes);
        setVotes(votesData.votes);
        
        // Calculate button votes from vote history
        const buttonVotesMap = {};
        votesData.votes.forEach(vote => {
          const btn = vote.buttonNumber;
          buttonVotesMap[btn] = (buttonVotesMap[btn] || 0) + 1;
        });
        setButtonVotes(buttonVotesMap);
        
        if (votesData.totalVotes > 0) {
          setStatus(`📈 Loaded ${votesData.totalVotes} votes successfully!`);
        } else {
          setStatus("📊 No votes cast yet. Be the first to vote!");
        }
      } else {
        setStatus("❌ Error loading votes: " + votesData.error);
      }
    } catch (error) {
      console.error("Error loading voting data:", error);
      setStatus("❌ Error loading voting data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cast a vote with face verification
  const castVote = async (e) => {
    e.preventDefault();
    
    if (!tagID || !buttonNumber) {
      setStatus("❌ Please enter both tag ID and button number.");
      return;
    }

    try {
      setLoading(true);
      setFaceVerifying(true);
      setStatus("🔍 Checking if tag has already voted...");
      
      // Check if already voted
      const checkResponse = await fetch(`${BACKEND_URL}/check/${tagID}`);
      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.hasVoted) {
        setStatus("❌ This tag has already voted!");
        setLoading(false);
        setFaceVerifying(false);
        return;
      }
      
      setStatus(`📸 IMPORTANT: Python webcam window will open on your computer!`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus(`🔐 Look at the PYTHON WEBCAM WINDOW (not browser) for face verification...`);
      
      // Call backend vote endpoint (Python will open its own webcam)
      const voteResponse = await fetch(`${BACKEND_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagId: tagID,
          buttonId: buttonNumber
        })
      });
      
      const voteData = await voteResponse.json();
      
      if (voteData.success) {
        setStatus(`✅ Vote cast successfully! TX: ${voteData.txHash.substring(0, 16)}...`);
        setTagID("");
        setButtonNumber("");
        
        // Reload data after 2 seconds
        setTimeout(() => loadVotingData(), 2000);
      } else {
        if (voteData.error.includes("verification")) {
          setStatus("❌ Face verification failed! Make sure your face image exists in backend/faces/ folder");
        } else if (voteData.error.includes("already voted")) {
          setStatus("❌ This tag has already voted!");
        } else {
          setStatus("❌ Vote failed: " + voteData.error);
        }
      }
      
    } catch (error) {
      console.error("Vote error:", error);
      setStatus("❌ Vote failed: " + error.message);
    } finally {
      setLoading(false);
      setFaceVerifying(false);
    }
  };

  // Pick winner
  const pickWinner = async () => {
    try {
      setLoading(true);
      setStatus("🏆 Determining winner...");
      
      const response = await fetch(`${BACKEND_URL}/winner`);
      const data = await response.json();
      
      if (data.success) {
        setWinner(data.winner);
        setStatus(`🎉 Winner: Button ${data.winner.buttonNumber} with ${data.winner.votes} votes!`);
      } else {
        setStatus("❌ Failed to pick winner: " + data.error);
      }
    } catch (error) {
      console.error("Pick winner error:", error);
      setStatus("❌ Failed to pick winner: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset vote
  const resetVote = async (e) => {
    e.preventDefault();
    
    if (!resetTag) {
      setStatus("❌ Please enter a tag ID to reset.");
      return;
    }
    
    try {
      setLoading(true);
      setStatus("🔄 Resetting vote for tag...");
      
      const response = await fetch(`${BACKEND_URL}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: resetTag })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(`✅ Vote reset successfully for tag: ${resetTag}`);
        setResetTag("");
        setTimeout(() => loadVotingData(), 1000);
      } else {
        setStatus("❌ Failed to reset vote: " + data.error);
      }
    } catch (error) {
      console.error("Reset vote error:", error);
      setStatus("❌ Failed to reset vote: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const queryTagVoted = async () => {
    if (!queryTagID) {
      setQueryResult("❌ Please enter a tag ID to query.");
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/check/${queryTagID}`);
      const data = await response.json();
      
      if (data.success) {
        setQueryResult(`Tag "${queryTagID}" has ${data.hasVoted ? '✅ already voted' : '❌ not voted yet'}`);
      } else {
        setQueryResult("❌ Error querying tag: " + data.error);
      }
    } catch (error) {
      setQueryResult("❌ Error querying tag: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const queryButtonVotes = async () => {
    if (!queryButtonNumber) {
      setQueryResult("❌ Please enter a button number to query.");
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/button/${queryButtonNumber}`);
      const data = await response.json();
      
      if (data.success) {
        setQueryResult(`Button ${queryButtonNumber} has ${data.votes} votes`);
      } else {
        setQueryResult("❌ Error querying button: " + data.error);
      }
    } catch (error) {
      setQueryResult("❌ Error querying button: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLeader = () => {
    if (Object.keys(buttonVotes).length === 0) {
      setStatus("📊 No votes cast yet.");
      return;
    }

    let maxVotes = 0;
    let leadingButton = 0;

    Object.entries(buttonVotes).forEach(([button, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        leadingButton = parseInt(button);
      }
    });

    if (maxVotes > 0) {
      setStatus(`📊 Current leader: Button ${leadingButton} with ${maxVotes} votes`);
    }
  };

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet();
    }
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <h1>🏷 RFID Voting DApp</h1>
        <p>⚡ Powered by Arbitrum Stylus (Rust) | Secure blockchain voting with Face Verification</p>
        <div className="stylus-badge">
          <span className="badge">🦀 Rust + WebAssembly</span>
          <span className="badge">🔐 Face Verified</span>
          <span className="badge">🔗 Arbitrum Sepolia</span>
        </div>
      </header>

      {/* Wallet Connection */}
      <section className="wallet-section">
        {!account ? (
          <div className="connect-wallet">
            <button onClick={connectWallet} disabled={loading} className="connect-btn">
              {loading ? "🔄 Connecting..." : "🔗 Connect Wallet"}
            </button>
            <p className="wallet-info">Connect your MetaMask wallet to Arbitrum Sepolia to start voting</p>
          </div>
        ) : (
          <div className="wallet-info">
            <div className="account-info">
              <div className="account-details">
                <strong>🔗 Connected Account:</strong> 
                <span className="address">{account}</span>
                {isOwner && <span className="owner-badge">👑 CONTRACT OWNER</span>}
              </div>
              <div className="network-info">
                <strong>🌐 Network:</strong> {networkName}
              </div>
              <div className="contract-info">
                <strong>📄 Contract:</strong> 
                <a href={`https://sepolia.arbiscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                  {CONTRACT_ADDRESS}
                </a>
              </div>
              <button onClick={disconnectWallet} className="disconnect-btn">
                Disconnect
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Status */}
      <section className="status-section">
        <div className={`status-message ${
          status.includes('✅') ? 'success' : 
          status.includes('❌') ? 'error' : 
          status.includes('⚠') ? 'warning' :
          'info'
        }`}>
          {status}
        </div>
        {loading && <div className="loading-spinner">🔄 Processing...</div>}
      </section>

      {/* Initialize Contract */}
      {account && !isInitialized && (
        <section className="initialize-section">
          <h2>🔧 Contract Initialization Required</h2>
          <div className="initialize-notice">
            <p>⚠ This Stylus contract needs to be initialized before use.</p>
            <p>The first person to initialize it will become the contract owner.</p>
          </div>
          <button 
            onClick={initializeContract} 
            disabled={loading}
            className="initialize-btn"
          >
            {loading ? "🔄 Initializing..." : "🔧 Initialize Contract"}
          </button>
        </section>
      )}

      {account && isInitialized && (
        <>
          {/* Vote Casting with Face Verification */}
          <section className="vote-section">
            <h2>🗳 Cast Your Vote</h2>
            <div className="face-verify-notice">
              <p>🔐 <strong>Face Verification Required:</strong> Python will open a separate webcam window for verification.</p>
              <p>📁 <strong>Setup Required:</strong> Your face photo must be saved as <code>backend/faces/YOUR_TAG_ID.jpg</code></p>
              <p>📸 <strong>Example:</strong> For tagID "TAG001", save your photo as <code>faces/TAG001.jpg</code></p>
            </div>
            
            <form onSubmit={castVote} className="vote-form">
              <div className="form-group">
                <label>RFID Tag ID:</label>
                <input
                  type="text"
                  placeholder="Enter your RFID Tag ID (e.g., TAG001)"
                  value={tagID}
                  onChange={(e) => setTagID(e.target.value)}
                  disabled={loading}
                  required
                />
                <small>Make sure {tagID || 'YOUR_TAG_ID'}.jpg exists in backend/faces/ folder</small>
              </div>
              <div className="form-group">
                <label>Button Number:</label>
                <input
                  type="number"
                  placeholder="Enter button number (1, 2, 3, etc.)"
                  value={buttonNumber}
                  onChange={(e) => setButtonNumber(e.target.value)}
                  min="1"
                  max="100"
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" disabled={loading || !tagID || !buttonNumber} className="vote-btn">
                {faceVerifying ? "📸 Verifying Face (Check Python Window)..." : loading ? "🔄 Processing..." : "🗳 Cast Vote"}
              </button>
            </form>
          </section>

          {/* Voting Results */}
          <section className="results-section">
            <h2>📊 Voting Results</h2>
            <div className="stats-header">
              <button onClick={() => loadVotingData()} disabled={loading} className="refresh-btn">
                {loading ? "🔄 Loading..." : "🔄 Refresh Data"}
              </button>
              <button onClick={getCurrentLeader} disabled={loading} className="leader-btn">
                📊 Show Current Leader
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Votes</h3>
                <div className="stat-number">{voteCount}</div>
              </div>
              <div className="stat-card">
                <h3>Active Buttons</h3>
                <div className="stat-number">{Object.keys(buttonVotes).length}</div>
              </div>
              <div className="stat-card">
                <h3>Contract Owner</h3>
                <div className="stat-address">{owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : 'Loading...'}</div>
              </div>
              {winner && (
                <div className="stat-card winner-card">
                  <h3>🏆 Official Winner</h3>
                  <div className="stat-number">Button {winner.buttonNumber}</div>
                  <div className="stat-detail">{winner.votes} votes</div>
                </div>
              )}
            </div>

            {/* Button Votes Breakdown */}
            {Object.keys(buttonVotes).length > 0 && (
              <div className="button-votes">
                <h3>📊 Votes by Button</h3>
                <div className="button-grid">
                  {Object.entries(buttonVotes)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([button, count]) => (
                      <div key={button} className="button-card">
                        <div className="button-number">Button {button}</div>
                        <div className="button-votes-count">{count} votes</div>
                        <div className="vote-percentage">
                          {voteCount > 0 ? ((count / voteCount) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="vote-bar">
                          <div 
                            className="vote-bar-fill"
                            style={{
                              width: `${voteCount > 0 ? (count / voteCount) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>

          {/* All Votes Table */}
          <section className="votes-table-section">
            <h2>📋 All Votes History</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tag ID</th>
                    <th>Button</th>
                    <th>Timestamp</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {votes.length > 0 ? (
                    votes.map((vote, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td className="tag-id">{vote.tagId}</td>
                        <td className="button-number">Button {vote.buttonNumber}</td>
                        <td>{vote.timestamp}</td>
                        <td>{new Date(vote.timestamp * 1000).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">No votes cast yet. Be the first to vote!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Query Functions */}
          <section className="query-section">
            <h2>🔍 Query Functions</h2>
            <div className="query-grid">
              <div className="query-card">
                <h3>🏷 Check if Tag Voted</h3>
                <div className="query-form">
                  <input
                    type="text"
                    placeholder="Enter Tag ID"
                    value={queryTagID}
                    onChange={(e) => setQueryTagID(e.target.value)}
                  />
                  <button onClick={queryTagVoted} disabled={loading}>
                    🔍 Query Tag
                  </button>
                </div>
              </div>
              
              <div className="query-card">
                <h3>🔢 Check Button Votes</h3>
                <div className="query-form">
                  <input
                    type="number"
                    placeholder="Button Number"
                    value={queryButtonNumber}
                    onChange={(e) => setQueryButtonNumber(e.target.value)}
                    min="1"
                  />
                  <button onClick={queryButtonVotes} disabled={loading}>
                    🔍 Query Button
                  </button>
                </div>
              </div>
            </div>
            
            {queryResult && (
              <div className="query-result">
                <strong>Query Result:</strong> {queryResult}
              </div>
            )}
          </section>

          {/* Owner Functions */}
          {isOwner && (
            <section className="owner-section">
              <h2>👑 Owner Functions</h2>
              <div className="owner-notice">
                <p>⚠ You are the contract owner. Use these functions carefully!</p>
              </div>
              
              <div className="owner-grid">
                <div className="owner-card">
                  <h3>🏆 Pick Winner</h3>
                  <p>Query the winning button</p>
                  <button 
                    onClick={pickWinner} 
                    disabled={loading || voteCount === 0}
                    className="winner-btn"
                  >
                    {loading ? "🔄 Checking..." : "🏆 Check Winner"}
                  </button>
                  {voteCount === 0 && <small>⚠ Need at least 1 vote</small>}
                </div>

                <div className="owner-card">
                  <h3>🔄 Reset Tag Vote</h3>
                  <p>Allow a tag to vote again</p>
                  <form onSubmit={resetVote}>
                    <input
                      type="text"
                      placeholder="Tag ID to reset"
                      value={resetTag}
                      onChange={(e) => setResetTag(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={loading} className="reset-btn">
                      {loading ? "🔄 Resetting..." : "🔄 Reset Vote"}
                    </button>
                  </form>
                </div>

                <div className="owner-card">
                  <h3>🔄 Refresh Data</h3>
                  <p>Reload voting data</p>
                  <button 
                    onClick={() => loadVotingData()} 
                    disabled={loading}
                    className="refresh-btn"
                  >
                    {loading ? "🔄 Loading..." : "🔄 Refresh"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="contract-info">
            <h4>📄 Stylus Contract Information</h4>
            <p>
              <strong>Address:</strong> 
              <a 
                href={`https://sepolia.arbiscan.io/address/${CONTRACT_ADDRESS}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="contract-link"
              >
                {CONTRACT_ADDRESS}
              </a>
            </p>
            <p><strong>Network:</strong> {networkName || 'Not connected'}</p>
            <p><strong>Backend:</strong> {BACKEND_URL}</p>
          </div>
          <div className="footer-text">
            <p>🔐 Built with React & ethers.js | ⚡ Arbitrum Stylus</p>
            <p>🦀 Rust Smart Contract | 🔐 Python Face Verification</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
