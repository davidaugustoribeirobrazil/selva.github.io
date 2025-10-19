// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title SelvaTimelock
/// @notice Thin wrapper para expor o TimelockController do OpenZeppelin como contrato local
contract SelvaTimelock is TimelockController {
    constructor(
        uint256 minDelay,            // atraso mínimo (em segundos)
        address[] memory proposers,  // quem pode propor (schedule)
        address[] memory executors,  // quem pode executar (execute); use address(0) para "qualquer um"
        address admin                // admin inicial (seu Safe)
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
