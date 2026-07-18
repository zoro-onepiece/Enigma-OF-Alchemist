// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EnigmaRelics
/// @notice ERC-721 collection for "Enigma of Alchemist": puzzle-reward relics
///         minted gaslessly by the Openfort backend wallet, and cosmetic
///         skins sold to players through the in-game Merchant via x402.
contract EnigmaRelics is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    // Skin catalog — must match the in-game Merchant listing.
    uint8 public constant SKIN_CRIMSON_FLARE = 1;
    uint8 public constant SKIN_AMBER_EMBER = 2;
    uint8 public constant SKIN_MYSTIC_AMETHYST = 3;

    /// @notice Fixed ETH price per skinId, set in the constructor.
    mapping(uint8 => uint256) public skinPrices;

    /// @notice Whether `player` has purchased `skinId`.
    mapping(address => mapping(uint8 => bool)) public ownsSkin;

    event PuzzleRewardMinted(address indexed player, uint256 indexed tokenId, string tokenURI);
    event SkinPurchased(address indexed player, uint8 indexed skinId, uint256 pricePaid);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(address initialOwner) ERC721("Enigma Relics", "RELIC") Ownable(initialOwner) {
        skinPrices[SKIN_CRIMSON_FLARE] = 0.001 ether;
        skinPrices[SKIN_AMBER_EMBER] = 0.001 ether;
        skinPrices[SKIN_MYSTIC_AMETHYST] = 0.002 ether;
    }

    /// @notice Mints a puzzle-reward relic to `player`. Called by the
    ///         Openfort backend wallet, which sponsors gas on the player's
    ///         behalf — never called directly by a player wallet.
    function mintPuzzleReward(address player, string memory tokenURI_) external onlyOwner returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;
        _safeMint(player, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        emit PuzzleRewardMinted(player, tokenId, tokenURI_);
    }

    /// @notice Buys a cosmetic skin for the caller. Price is fixed per
    ///         skinId; triggered from the client through the x402 merchant
    ///         checkout flow, which settles the payment before this call.
    function purchaseSkin(uint8 skinId) public payable nonReentrant {
        uint256 price = skinPrices[skinId];
        require(price > 0, "Unknown skinId");
        require(msg.value == price, "Incorrect ETH amount");
        require(!ownsSkin[msg.sender][skinId], "Skin already owned");

        ownsSkin[msg.sender][skinId] = true;
        emit SkinPurchased(msg.sender, skinId, msg.value);
    }

    /// @notice Withdraws all accumulated ETH from skin sales to the owner.
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
        emit FundsWithdrawn(owner(), balance);
    }

    // ─── Required overrides (multiple inheritance) ───────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
