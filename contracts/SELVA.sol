// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SELVA
 * @notice ERC-20 token for the Base network. Fixed supply (minted once in constructor), burnable by holders,
 *         EIP-2612 permit for gasless approvals. No transfer fees, no rebasing.
 * @dev Keep ownership as a multisig or renounce if you want a fully immutable token.
 */
contract SELVA is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    /**
     * @param initialSupply Initial supply in wei (18 decimals). E.g., 1_000_000e18 for 1,000,000 SELVA.
     * @param owner_ Owner address (can be a multisig). Receives the initial supply.
     */
    constructor(uint256 initialSupply, address owner_)
        ERC20("Selva", "SELVA")
        ERC20Permit("Selva")
        Ownable(owner_)
    {
        require(owner_ != address(0), "Owner is zero");
        _mint(owner_, initialSupply);
    }
}
