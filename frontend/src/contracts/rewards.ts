import { Buffer } from 'buffer';
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
export * as contract from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const Errors = {
  1: { message: 'Overflow' },
  2: { message: 'InsufficientBalance' },
  3: { message: 'Unauthorized' },
  4: { message: 'ContractPaused' },
  5: { message: 'CreditLimitExceeded' },
  6: { message: 'UnsupportedMigration' },
  7: { message: 'InvalidMultiplier' },
  8: { message: 'RateLimitExceeded' },
  9: { message: 'VestingNotFound' },
  10: { message: 'NoPendingAdmin' },
  11: { message: 'InsufficientReserve' },
  12: { message: 'InvalidRedemptionRate' },
  13: { message: 'InvalidAdminNonce' },
  /**
   * A referrer and referee cannot be the same address.
   */
  14: { message: 'SelfReferral' },
  /**
   * The referee was previously rewarded as a referee of this referrer (cycle).
   */
  15: { message: 'CircularReferral' },
  /**
   * This referee has already triggered a referral bonus (one per referee).
   */
  16: { message: 'ReferralAlreadyRewarded' },
  /**
   * Paying this bonus would exceed the configured per-referrer cap.
   */
  17: { message: 'ReferralCapExceeded' },
  /**
   * Referral rewards have not been configured (bonus rate is zero).
   */
  18: { message: 'ReferralNotConfigured' },
  /**
   * The supplied referral configuration is invalid.
   */
  19: { message: 'InvalidReferralConfig' },
  /**
   * The computed referral bonus rounded down to zero.
   */
  20: { message: 'ZeroReferralBonus' },
  /**
   * Multi-sig configuration has not been initialised.
   */
  36: { message: 'MultiSigNotConfigured' },
  /**
   * Threshold must be >= 1 and <= len(signers).
   */
  37: { message: 'InvalidThreshold' },
  /**
   * The caller is not in the authorised signer set.
   */
  38: { message: 'NotASigner' },
  /**
   * This signer has already approved this proposal.
   */
  39: { message: 'AlreadyApproved' },
  /**
   * The referenced proposal does not exist.
   */
  40: { message: 'ProposalNotFound' },
  /**
   * The proposal has passed its expiry ledger.
   */
  41: { message: 'ProposalExpired' },
  /**
   * The proposal does not yet have enough approvals to execute.
   */
  42: { message: 'InsufficientApprovals' },
  /**
   * Governance quorum or delay has not been configured.
   */
  43: { message: 'GovernanceNotConfigured' },
  /**
   * A governance proposal for this key is already pending.
   */
  44: { message: 'ProposalAlreadyPending' },
  /**
   * The time-lock delay has not yet elapsed.
   */
  45: { message: 'TimeLockActive' },
  /**
   * The governance proposal has been cancelled or never existed.
   */
  46: { message: 'ProposalCancelled' },
  /**
   * SEP-41 token mode is not enabled.
   */
  21: { message: 'TokenModeNotEnabled' },
  /**
   * SEP-41: allowance not sufficient for transfer_from.
   */
  22: { message: 'AllowanceExceeded' },
  /**
   * SEP-41: approval expiration ledger has passed.
   */
  23: { message: 'ApprovalExpired' },
  /**
   * SEP-41: invalid expiration ledger (must be > current ledger).
   */
  24: { message: 'InvalidExpiration' },
  47: { message: 'SimpleMultisigInvalidThreshold' },
  48: { message: 'InsufficientSignatures' },
  49: { message: 'NonceReused' },
  50: { message: 'DuplicateSigner' },
  51: { message: 'UnknownSigner' },
  /**
   * Operation amount must be greater than zero (issue #1020).
   *
   * Assigned 30/31 rather than 21/22: the SEP-41 block already published
   * those codes through the generated bindings and docs/CONTRACTS_API.md,
   * so renumbering it would break decoding for existing clients.
   */
  30: { message: 'ZeroAmount' },
  /**
   * Transfer source and destination cannot be the same address (issue #1020).
   */
  31: { message: 'SelfTransfer' },
  /**
   * No clawback proposal found for the given id.
   */
  32: { message: 'ClawbackNotFound' },
  /**
   * The timelock delay for this clawback has not yet elapsed.
   */
  33: { message: 'ClawbackTimelocked' },
  /**
   * Clawback amount exceeds the target's current unclaimed balance.
   */
  34: { message: 'ClawbackOverspend' },
  /**
   * Only the configured guardian (admin) may cancel a clawback proposal.
   */
  35: { message: 'ClawbackGuardianOnly' },
};

/**
 * An in-flight on-chain governance proposal for a single parameter change.
 */
export interface ParamProposal {
  /**
   * Ledger at or after which the proposal may be executed.
   */
  execute_after_ledger: u32;
  /**
   * Whether the proposal has been executed.
   */
  executed: boolean;
  /**
   * Ledger after which the proposal expires without execution.
   */
  expires_at_ledger: u32;
  /**
   * New value encoded as a 64-bit word (caller's encoding convention).
   */
  new_value: u64;
  /**
   * Storage key for the parameter being changed.
   */
  param_key: string;
  /**
   * Unique proposal identifier.
   */
  proposal_id: u64;
  /**
   * Quorum required for execution (number of approving votes).
   */
  quorum: u32;
  /**
   * Set of addresses that voted in favour.
   */
  votes_for: Array<string>;
}

/**
 * Vesting schedule record stored per user per vest_id.
 */
export interface VestingRecord {
  claimed: u64;
  end_ledger: u32;
  start_ledger: u32;
  total: u64;
}

/**
 * Multi-sig configuration: M-of-N threshold over a signer set.
 */
export interface MultiSigConfig {
  /**
   * Ordered list of authorized signers.
   */
  signers: Array<string>;
  /**
   * Minimum number of approvals required to execute a privileged operation.
   */
  threshold: u32;
}

/**
 * Proposal record stored under `(CLAWBACK_PROPOSAL, id)`.
 */
export interface ClawbackProposal {
  amount: u64;
  /**
   * True once cancelled so stale proposals don't appear as pending.
   */
  cancelled: boolean;
  /**
   * True once executed so replay is impossible.
   */
  executed: boolean;
  /**
   * Ledger sequence number when the proposal was created.
   */
  proposed_at: u32;
  target: string;
}

/**
 * An in-flight privileged operation proposal waiting for threshold approvals.
 */
export interface PrivilegedProposal {
  /**
   * Set of signers that have approved so far.
   */
  approvals: Array<string>;
  /**
   * Ledger after which this proposal expires.
   */
  expires_at_ledger: u32;
  /**
   * Symbolic op code (e.g. `withdraw_reserve`, `upgrade`, `set_rate`).
   */
  op: string;
  /**
   * Serialised op arguments (application-defined payload).
   */
  payload: Array<string>;
  /**
   * Unique proposal identifier.
   */
  proposal_id: u64;
}

export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the current admin address.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim rewards for a user (reduces balance).
   */
  claim: (
    { user, amount }: { user: string; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a credit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Credit points to a user.
   */
  credit: (
    { from, user, amount }: { from: string; user: string; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Redeem points for asset tokens.
   * Burns points_amount from user balance, transfers asset tokens to user.
   * Returns the amount of asset tokens transferred.
   */
  redeem: (
    { user, points_amount }: { user: string; points_amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current points balance for a user.
   */
  balance: (
    { user }: { user: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a migrate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Migration entrypoint for future schema changes.
   *
   * Current behavior is intentionally idempotent for version `1`, so operational
   * scripts can call this safely during deployments/upgrades.
   */
  migrate: (
    { admin, target_version }: { admin: string; target_version: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Replace the contract WASM in-place without resetting participant state.
   *
   * Calls `contract_update_current_contract_wasm` with the supplied hash of
   * the new WASM blob.  Balances and vesting records in persistent storage
   * survive because Soroban WASM-only upgrades never touch storage.
   * Requires admin auth and a valid nonce so upgrades are replay-safe.
   *
   * Typical workflow (issue #518):
   * 1. Upload new WASM → obtain `new_wasm_hash`.
   * 2. Call `upgrade(admin, nonce, new_wasm_hash)`.
   * 3. If storage layout changed, call `migrate(admin, target_version)`.
   */
  upgrade: (
    { admin, nonce, new_wasm_hash }: { admin: string; nonce: i128; new_wasm_hash: Buffer },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get contract metadata (name and symbol).
   */
  metadata: (options?: MethodOptions) => Promise<AssembledTransaction<readonly [string, string]>>;

  /**
   * Construct and simulate a snapshot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Record the current ledger number under `snapshot_id` (admin only).
   * Does NOT copy balances — stores a ledger reference for off-chain indexing.
   * Off-chain indexers can use the ledger number with Horizon `getLedgerEntries`
   * to reconstruct balances at that point in time.
   */
  snapshot: (
    { admin, snapshot_id }: { admin: string; snapshot_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a is_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if contract is paused.
   */
  is_paused: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a set_tiers transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure tiered reward distribution for a campaign (admin only).
   */
  set_tiers: (
    {
      admin,
      campaign_id,
      tiers,
    }: { admin: string; campaign_id: u64; tiers: Array<readonly [u64, u64]> },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the rewards contract (admin).
   */
  initialize: (
    { admin, name, symbol }: { admin: string; name: string; symbol: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a sep41_burn transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Burn `amount` from `from`'s balance.
   * Requires authorization from `from`.
   */
  sep41_burn: (
    { from, amount }: { from: string; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a sep41_name transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Returns the name of the token.
   */
  sep41_name: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a set_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pause the contract. Blocks credit and claim operations.
   *
   * This is a critical operation: when a multisig threshold is configured
   * (see [`Self::set_multisig_threshold`]), `signatures` must contain at
   * least `required` valid co-admin signatures over
   * `(op, nonce, sha256(paused))`; otherwise pass an empty `Vec` and the
   * legacy single-admin check applies (`nonce` is ignored in that case).
   */
  set_paused: (
    {
      admin,
      nonce,
      paused,
      signatures,
    }: { admin: string; nonce: u64; paused: boolean; signatures: Array<readonly [string, Buffer]> },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a clear_tiers transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Clear configured tiers for a campaign (admin only).
   */
  clear_tiers: (
    { admin, campaign_id }: { admin: string; campaign_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a accept_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Accept admin role. Caller MUST be the address that the current admin
   * previously proposed via `propose_admin`. Clears the pending slot on
   * success.
   */
  accept_admin: (
    { new_admin }: { new_admin: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a add_co_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a co-admin's ed25519 public key for multisig verification
   * (admin only). Overwrites the key if `co_admin` is already registered.
   */
  add_co_admin: (
    { admin, co_admin, pubkey }: { admin: string; co_admin: string; pubkey: Buffer },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a batch_credit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Credit points to multiple users in one call.
   * Each recipient counts as one call toward the rate limit.
   */
  batch_credit: (
    { from, recipients }: { from: string; recipients: Array<readonly [string, u64]> },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a claim_vested transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Claim up to `amount` from the unlocked portion of a specific vesting schedule.
   * Returns the remaining claimable amount in that vest schedule after this claim.
   */
  claim_vested: (
    { user, vest_id, amount }: { user: string; vest_id: u64; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a fund_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Fund redemption reserve (callable by anyone, typically admin).
   * Transfers asset tokens from caller to contract reserve.
   */
  fund_reserve: (
    { from, amount }: { from: string; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_snapshot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the ledger number recorded for `snapshot_id`, or `None`.
   */
  get_snapshot: (
    { snapshot_id }: { snapshot_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<u64>>>;

  /**
   * Construct and simulate a sep41_symbol transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Returns the symbol of the token.
   */
  sep41_symbol: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;

  /**
   * Construct and simulate a total_supply transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  total_supply: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a total_vested transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the sum of all vesting schedule totals for a user (vested + unvested).
   */
  total_vested: (
    { user }: { user: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a credit_vested transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Credit a linearly-vesting amount to a user (authorized caller only).
   * Vesting is linear: `unlocked = total * (now - start_ledger) / (end_ledger - start_ledger)`.
   * Returns the new vest_id for this schedule.
   */
  credit_vested: (
    {
      from,
      user,
      total_amount,
      start_ledger,
      end_ledger,
    }: { from: string; user: string; total_amount: u64; start_ledger: u32; end_ledger: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a init_multisig transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialise the M-of-N signer set (current admin only). Once configured,
   * all privileged ops on this contract flow through the multi-sig gate.
   *
   * `threshold` must be in `1..=signers.len()`.
   */
  init_multisig: (
    { admin, signers, threshold }: { admin: string; signers: Array<string>; threshold: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a is_token_mode transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if token mode is enabled.
   */
  is_token_mode: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a pending_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the pending admin address proposed by the current admin, if any.
   * `None` when there is no in-flight transfer.
   */
  pending_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>;

  /**
   * Construct and simulate a propose_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propose a new admin (current admin only). The transfer does not take
   * effect until `accept_admin` is called by the new admin.
   *
   * Calling again overwrites the previous pending admin, so the current
   * admin can cancel a proposal by calling `cancel_admin_transfer` or by
   * proposing themselves.
   */
  propose_admin: (
    { current_admin, new_admin }: { current_admin: string; new_admin: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a sep41_approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Set allowance for `spender` to spend `amount` from caller's balance.
   * If expiration_ledger is 0, the allowance does not expire.
   */
  sep41_approve: (
    {
      from,
      spender,
      amount,
      expiration_ledger,
    }: { from: string; spender: string; amount: i128; expiration_ledger: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a sep41_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Returns the balance of `id` as i128.
   * Maps internal u64 points to i128 per SEP-41 standard.
   */
  sep41_balance: (
    { id }: { id: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a storage_stats transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Storage stats for monitoring: `(participant_count, nonce_count, expired_estimate)`.
   * `participant_count` is always `0` here; the rewards contract tracks
   * balances, not participants. `expired_estimate` counts currently-stale
   * nonce records.
   */
  storage_stats: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<readonly [u64, u64, u64]>>;

  /**
   * Construct and simulate a total_claimed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total claimed rewards (global stats).
   */
  total_claimed: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a admin_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Transfer points from one user to another (admin only).
   */
  admin_transfer: (
    { admin, from, to, amount }: { admin: string; from: string; to: string; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a credit_by_rank transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Credit points to a user based on their rank.
   */
  credit_by_rank: (
    { from, user, rank, campaign_id }: { from: string; user: string; rank: u64; campaign_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a list_snapshots transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns all `(snapshot_id, ledger_number)` pairs in creation order.
   */
  list_snapshots: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Array<readonly [u64, u64]>>>;

  /**
   * Construct and simulate a schema_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the active storage schema version for this contract.
   */
  schema_version: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a sep41_decimals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Returns the number of decimals used for display.
   */
  sep41_decimals: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a sep41_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Transfer `amount` from `from` to `to`.
   * Requires authorization from `from`.
   */
  sep41_transfer: (
    { from, to, amount }: { from: string; to: string; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a vested_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the currently unlocked but unclaimed vested balance for a user
   * across all active vesting schedules.
   */
  vested_balance: (
    { user }: { user: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a cancel_clawback transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel a pending clawback proposal. Only the admin (guardian) may cancel.
   * Cancelled proposals can never be executed.
   */
  cancel_clawback: (
    { caller, proposal_id }: { caller: string; proposal_id: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a is_paused_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_paused_claim: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a multisig_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the current multi-sig configuration, if any.
   */
  multisig_config: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<MultiSigConfig>>>;

  /**
   * Construct and simulate a redemption_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get redemption rate configuration.
   * Returns (asset_address, rate_bps) or None if not configured.
   */
  redemption_rate: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<readonly [string, u32]>>>;

  /**
   * Construct and simulate a referral_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the referral configuration as `(rate_bps, per_referrer_cap)`.
   * Defaults to `(0, 0)` when referral rewards have not been configured.
   */
  referral_config: (options?: MethodOptions) => Promise<AssembledTransaction<readonly [u32, u64]>>;

  /**
   * Construct and simulate a remove_co_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Remove a co-admin from the multisig signer set (admin only).
   */
  remove_co_admin: (
    { admin, co_admin }: { admin: string; co_admin: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a sep41_allowance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Returns the allowance `owner` has granted to `spender`.
   */
  sep41_allowance: (
    { owner, spender }: { owner: string; spender: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a sep41_burn_from transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Burn `amount` from `from`'s balance using allowance.
   * Requires authorization from `spender`.
   */
  sep41_burn_from: (
    { spender, from, amount }: { spender: string; from: string; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a execute_clawback transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute a clawback proposal after the timelock has elapsed.
   * Deducts `amount` from the target's balance and total supply.
   * Anyone may call once the timelock is satisfied; replay is blocked by
   * the `executed` flag.
   */
  execute_clawback: (
    { caller, proposal_id }: { caller: string; proposal_id: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a is_paused_credit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_paused_credit: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a is_paused_redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_paused_redeem: (options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;

  /**
   * Construct and simulate a propose_clawback transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propose a clawback of `amount` unclaimed points from `target`.
   * Returns the proposal id. Admin-only; the clawback cannot be executed
   * until `CLAWBACK_TIMELOCK_LEDGERS` have elapsed so the target has time
   * to dispute. The guardian (admin) can cancel within that window.
   */
  propose_clawback: (
    { caller, target, amount }: { caller: string; target: string; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a set_paused_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pause or unpause the `claim` / `claim_vested` operations independently.
   */
  set_paused_claim: (
    { admin, paused }: { admin: string; paused: boolean },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a withdraw_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw asset tokens from redemption reserve (admin only).
   * Used to reclaim unredeemed assets.
   */
  withdraw_reserve: (
    { admin, nonce, amount }: { admin: string; nonce: i128; amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a credit_call_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the number of credit calls made by `caller` in the current window.
   */
  credit_call_count: (
    { caller }: { caller: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a enable_token_mode transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Enable token mode (admin only). One-way: once enabled, cannot be disabled.
   * This enables SEP-41-compliant token interface alongside existing points API.
   */
  enable_token_mode: (
    {
      admin,
      name,
      symbol,
      decimals,
    }: { admin: string; name: string; symbol: string; decimals: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_tier_for_rank transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get points reward for a given rank under a campaign.
   */
  get_tier_for_rank: (
    { rank, campaign_id }: { rank: u64; campaign_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a prune_used_nonces transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Remove multisig nonce records older than [`NONCE_TTL_LEDGERS`], up to
   * `max_entries` per call. Callable by anyone since it only deletes
   * stale data. Returns the number of entries pruned.
   */
  prune_used_nonces: (
    { max_entries }: { max_entries: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a set_paused_credit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pause or unpause the `credit` / `batch_credit` / `credit_vested` /
   * `credit_by_rank` operations independently of the global pause.
   */
  set_paused_credit: (
    { admin, paused }: { admin: string; paused: boolean },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a set_paused_redeem transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pause or unpause the `redeem` operation independently.
   */
  set_paused_redeem: (
    { admin, paused }: { admin: string; paused: boolean },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a vote_param_change transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cast a vote in favour of a governance proposal.
   *
   * The voter must authenticate. Returns the current vote count.
   */
  vote_param_change: (
    { voter, proposal_id }: { voter: string; proposal_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a get_param_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Return the current state of a governance proposal.
   */
  get_param_proposal: (
    { proposal_id }: { proposal_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<ParamProposal>>>;

  /**
   * Construct and simulate a multisig_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the configured M-of-N multisig threshold (0 = disabled).
   */
  multisig_threshold: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a pay_referral_bonus transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pay a referrer the configured bonus for a referee's qualifying action
   * (admin only). Enforces the anti-abuse invariants on-chain:
   *
   * - **self-referral**: `referrer == referee` is rejected.
   * - **circular**: rejected when `referrer` was itself previously rewarded as
   * a referee of `referee` (an `A → B` then `B → A` cycle).
   * - **uniqueness / sybil gate**: each `referee` can trigger at most one
   * referral bonus, ever — making the payout idempotent and all-or-nothing.
   * - **per-referrer cap**: the referrer's cumulative bonus may not exceed the
   * configured cap.
   *
   * On success the bonus is credited to `referrer`'s balance (emitting the
   * standard `credit` event so balance indexers stay consistent) and a
   * `ref_bonus` event is published for attribution/instrumentation. Returns
   * the bonus amount credited.
   */
  pay_referral_bonus: (
    {
      admin,
      referrer,
      referee,
      qualifying_amount,
    }: { admin: string; referrer: string; referee: string; qualifying_amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a redemption_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get current redemption reserve balance.
   */
  redemption_reserve: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a campaign_multiplier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns multiplier in basis points for campaign, defaults to 10_000.
   */
  campaign_multiplier: (
    { campaign_id }: { campaign_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a cancel_param_change transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel a governance proposal (admin only). Removes the proposal from
   * storage so it can never be executed.
   */
  cancel_param_change: (
    { admin, proposal_id }: { admin: string; proposal_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a credit_for_campaign transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Credit points using campaign multiplier. Rounding uses floor division:
   * `adjusted = base_amount * multiplier_bps / 10_000`.
   */
  credit_for_campaign: (
    {
      from,
      user,
      campaign_id,
      base_amount,
    }: { from: string; user: string; campaign_id: u64; base_amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a max_credit_per_call transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get maximum amount allowed per single credit call (0 means unlimited).
   */
  max_credit_per_call: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a sep41_transfer_from transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * SEP-41: Transfer `amount` from `from` to `to` using allowance.
   * Requires authorization from `spender`.
   */
  sep41_transfer_from: (
    { spender, from, to, amount }: { spender: string; from: string; to: string; amount: i128 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a set_redemption_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set redemption rate for points-to-asset conversion (admin only).
   * rate_bps: how many units of asset per 10,000 points (basis points).
   * Example: rate_bps = 100 means 100/10,000 = 0.01 asset per point.
   */
  set_redemption_rate: (
    { admin, nonce, asset, rate_bps }: { admin: string; nonce: i128; asset: string; rate_bps: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a set_referral_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the on-chain referral reward engine (admin only).
   *
   * `rate_bps` is the referrer bonus as basis points of a referee's
   * qualifying amount (`bonus = qualifying_amount * rate_bps / 10_000`) and
   * must be in `1..=MAX_REFERRAL_RATE_BPS`. `per_referrer_cap` is the maximum
   * cumulative bonus a single referrer may earn; `0` means uncapped.
   */
  set_referral_config: (
    { admin, rate_bps, per_referrer_cap }: { admin: string; rate_bps: u32; per_referrer_cap: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a execute_param_change transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute a governance proposal. Admin only. Requires:
   * - quorum votes collected
   * - time-lock delay elapsed
   * - proposal not expired or already executed
   *
   * The method records the execution and returns the parameter key and value
   * so the caller can apply the change to the correct storage entry.
   */
  execute_param_change: (
    { admin, proposal_id }: { admin: string; proposal_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<readonly [string, u64]>>>;

  /**
   * Construct and simulate a propose_param_change transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propose a governance change for parameter `param_key`.
   *
   * `new_value` is the proposed replacement value. `quorum` is the number
   * of approving votes required. `delay_ledgers` is the minimum number of
   * ledgers that must elapse before the proposal may be executed. Returns
   * the new `proposal_id`.
   */
  propose_param_change: (
    {
      proposer,
      param_key,
      new_value,
      quorum,
      delay_ledgers,
      ttl_ledgers,
    }: {
      proposer: string;
      param_key: string;
      new_value: u64;
      quorum: u32;
      delay_ledgers: u32;
      ttl_ledgers: u32;
    },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a referral_bonus_total transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cumulative referral bonus credited to `referrer`.
   */
  referral_bonus_total: (
    { referrer }: { referrer: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a rewarded_referrer_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The referrer that was rewarded for `referee`, if any.
   */
  rewarded_referrer_of: (
    { referee }: { referee: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Option<string>>>;

  /**
   * Construct and simulate a approve_privileged_op transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approve an in-flight privileged proposal. The caller must be a signer
   * and must not have already approved this proposal.
   */
  approve_privileged_op: (
    { signer, proposal_id }: { signer: string; proposal_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a cancel_admin_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel an in-flight admin transfer (current admin only).
   */
  cancel_admin_transfer: (
    { current_admin }: { current_admin: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a execute_privileged_op transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute a privileged proposal once it has reached threshold approvals.
   * Returns the number of approvals at execution time.
   *
   * The caller must be a signer. The actual effect (pause, rate change, etc.)
   * is dispatched by the caller after this returns — the contract records the
   * execution and clears the proposal from storage.
   */
  execute_privileged_op: (
    { executor, proposal_id }: { executor: string; proposal_id: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u32>>>;

  /**
   * Construct and simulate a get_credit_rate_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current rate limit config: `(max_calls, window_ledgers)`.
   * Returns `(0, 0)` when no limit is configured.
   */
  get_credit_rate_limit: (
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<readonly [u32, u32]>>;

  /**
   * Construct and simulate a propose_privileged_op transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Propose a privileged operation. The caller must be in the signer set.
   *
   * Returns the new `proposal_id`.
   */
  propose_privileged_op: (
    {
      proposer,
      op,
      payload,
      ttl_ledgers,
    }: { proposer: string; op: string; payload: Array<string>; ttl_ledgers: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a referral_reward_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Number of referees `referrer` has been rewarded for.
   */
  referral_reward_count: (
    { referrer }: { referrer: string },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<u64>>;

  /**
   * Construct and simulate a set_credit_rate_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set per-caller credit rate limit (admin only).
   * `max_calls` credits allowed per `window_ledgers` ledger window.
   * Set `max_calls = 0` to disable rate limiting.
   */
  set_credit_rate_limit: (
    { admin, max_calls, window_ledgers }: { admin: string; max_calls: u32; window_ledgers: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a payout_reserve_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Alias for redemption_reserve — returns the current payout reserve balance.
   */
  payout_reserve_balance: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a set_multisig_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the M-of-N multisig threshold for critical operations (admin only).
   * `required = 0` disables multisig (legacy single-admin auth applies).
   */
  set_multisig_threshold: (
    { admin, required }: { admin: string; required: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a set_campaign_multiplier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set campaign-specific reward multiplier in basis points (admin only).
   * Example: 10_000 = 1.0x, 12_500 = 1.25x, 5_000 = 0.5x.
   */
  set_campaign_multiplier: (
    {
      admin,
      campaign_id,
      multiplier_bps,
    }: { admin: string; campaign_id: u64; multiplier_bps: u32 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a set_max_credit_per_call transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set maximum amount allowed per single credit call (admin only).
   * Set to 0 to disable the limit.
   */
  set_max_credit_per_call: (
    { admin, max_amount }: { admin: string; max_amount: u64 },
    options?: MethodOptions,
  ) => Promise<AssembledTransaction<Result<void>>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, 'contractId'> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: 'hex' | 'base64';
      },
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        'AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAALgAAAAAAAAAIT3ZlcmZsb3cAAAABAAAAAAAAABNJbnN1ZmZpY2llbnRCYWxhbmNlAAAAAAIAAAAAAAAADFVuYXV0aG9yaXplZAAAAAMAAAAAAAAADkNvbnRyYWN0UGF1c2VkAAAAAAAEAAAAAAAAABNDcmVkaXRMaW1pdEV4Y2VlZGVkAAAAAAUAAAAAAAAAFFVuc3VwcG9ydGVkTWlncmF0aW9uAAAABgAAAAAAAAARSW52YWxpZE11bHRpcGxpZXIAAAAAAAAHAAAAAAAAABFSYXRlTGltaXRFeGNlZWRlZAAAAAAAAAgAAAAAAAAAD1Zlc3RpbmdOb3RGb3VuZAAAAAAJAAAAAAAAAA5Ob1BlbmRpbmdBZG1pbgAAAAAACgAAAAAAAAATSW5zdWZmaWNpZW50UmVzZXJ2ZQAAAAALAAAAAAAAABVJbnZhbGlkUmVkZW1wdGlvblJhdGUAAAAAAAAMAAAAAAAAABFJbnZhbGlkQWRtaW5Ob25jZQAAAAAAAA0AAAAyQSByZWZlcnJlciBhbmQgcmVmZXJlZSBjYW5ub3QgYmUgdGhlIHNhbWUgYWRkcmVzcy4AAAAAAAxTZWxmUmVmZXJyYWwAAAAOAAAASlRoZSByZWZlcmVlIHdhcyBwcmV2aW91c2x5IHJld2FyZGVkIGFzIGEgcmVmZXJlZSBvZiB0aGlzIHJlZmVycmVyIChjeWNsZSkuAAAAAAAQQ2lyY3VsYXJSZWZlcnJhbAAAAA8AAABGVGhpcyByZWZlcmVlIGhhcyBhbHJlYWR5IHRyaWdnZXJlZCBhIHJlZmVycmFsIGJvbnVzIChvbmUgcGVyIHJlZmVyZWUpLgAAAAAAF1JlZmVycmFsQWxyZWFkeVJld2FyZGVkAAAAABAAAAA/UGF5aW5nIHRoaXMgYm9udXMgd291bGQgZXhjZWVkIHRoZSBjb25maWd1cmVkIHBlci1yZWZlcnJlciBjYXAuAAAAABNSZWZlcnJhbENhcEV4Y2VlZGVkAAAAABEAAAA/UmVmZXJyYWwgcmV3YXJkcyBoYXZlIG5vdCBiZWVuIGNvbmZpZ3VyZWQgKGJvbnVzIHJhdGUgaXMgemVybykuAAAAABVSZWZlcnJhbE5vdENvbmZpZ3VyZWQAAAAAAAASAAAAL1RoZSBzdXBwbGllZCByZWZlcnJhbCBjb25maWd1cmF0aW9uIGlzIGludmFsaWQuAAAAABVJbnZhbGlkUmVmZXJyYWxDb25maWcAAAAAAAATAAAAMVRoZSBjb21wdXRlZCByZWZlcnJhbCBib251cyByb3VuZGVkIGRvd24gdG8gemVyby4AAAAAAAARWmVyb1JlZmVycmFsQm9udXMAAAAAAAAUAAAAMU11bHRpLXNpZyBjb25maWd1cmF0aW9uIGhhcyBub3QgYmVlbiBpbml0aWFsaXNlZC4AAAAAAAAVTXVsdGlTaWdOb3RDb25maWd1cmVkAAAAAAAAJAAAACtUaHJlc2hvbGQgbXVzdCBiZSA+PSAxIGFuZCA8PSBsZW4oc2lnbmVycykuAAAAABBJbnZhbGlkVGhyZXNob2xkAAAAJQAAAC9UaGUgY2FsbGVyIGlzIG5vdCBpbiB0aGUgYXV0aG9yaXNlZCBzaWduZXIgc2V0LgAAAAAKTm90QVNpZ25lcgAAAAAAJgAAAC9UaGlzIHNpZ25lciBoYXMgYWxyZWFkeSBhcHByb3ZlZCB0aGlzIHByb3Bvc2FsLgAAAAAPQWxyZWFkeUFwcHJvdmVkAAAAACcAAAAnVGhlIHJlZmVyZW5jZWQgcHJvcG9zYWwgZG9lcyBub3QgZXhpc3QuAAAAABBQcm9wb3NhbE5vdEZvdW5kAAAAKAAAACpUaGUgcHJvcG9zYWwgaGFzIHBhc3NlZCBpdHMgZXhwaXJ5IGxlZGdlci4AAAAAAA9Qcm9wb3NhbEV4cGlyZWQAAAAAKQAAADtUaGUgcHJvcG9zYWwgZG9lcyBub3QgeWV0IGhhdmUgZW5vdWdoIGFwcHJvdmFscyB0byBleGVjdXRlLgAAAAAVSW5zdWZmaWNpZW50QXBwcm92YWxzAAAAAAAAKgAAADNHb3Zlcm5hbmNlIHF1b3J1bSBvciBkZWxheSBoYXMgbm90IGJlZW4gY29uZmlndXJlZC4AAAAAF0dvdmVybmFuY2VOb3RDb25maWd1cmVkAAAAACsAAAA2QSBnb3Zlcm5hbmNlIHByb3Bvc2FsIGZvciB0aGlzIGtleSBpcyBhbHJlYWR5IHBlbmRpbmcuAAAAAAAWUHJvcG9zYWxBbHJlYWR5UGVuZGluZwAAAAAALAAAAChUaGUgdGltZS1sb2NrIGRlbGF5IGhhcyBub3QgeWV0IGVsYXBzZWQuAAAADlRpbWVMb2NrQWN0aXZlAAAAAAAtAAAAPFRoZSBnb3Zlcm5hbmNlIHByb3Bvc2FsIGhhcyBiZWVuIGNhbmNlbGxlZCBvciBuZXZlciBleGlzdGVkLgAAABFQcm9wb3NhbENhbmNlbGxlZAAAAAAAAC4AAAAhU0VQLTQxIHRva2VuIG1vZGUgaXMgbm90IGVuYWJsZWQuAAAAAAAAE1Rva2VuTW9kZU5vdEVuYWJsZWQAAAAAFQAAADNTRVAtNDE6IGFsbG93YW5jZSBub3Qgc3VmZmljaWVudCBmb3IgdHJhbnNmZXJfZnJvbS4AAAAAEUFsbG93YW5jZUV4Y2VlZGVkAAAAAAAAFgAAAC5TRVAtNDE6IGFwcHJvdmFsIGV4cGlyYXRpb24gbGVkZ2VyIGhhcyBwYXNzZWQuAAAAAAAPQXBwcm92YWxFeHBpcmVkAAAAABcAAAA9U0VQLTQxOiBpbnZhbGlkIGV4cGlyYXRpb24gbGVkZ2VyIChtdXN0IGJlID4gY3VycmVudCBsZWRnZXIpLgAAAAAAABFJbnZhbGlkRXhwaXJhdGlvbgAAAAAAABgAAAAAAAAAHlNpbXBsZU11bHRpc2lnSW52YWxpZFRocmVzaG9sZAAAAAAALwAAAAAAAAAWSW5zdWZmaWNpZW50U2lnbmF0dXJlcwAAAAAAMAAAAAAAAAALTm9uY2VSZXVzZWQAAAAAMQAAAAAAAAAPRHVwbGljYXRlU2lnbmVyAAAAADIAAAAAAAAADVVua25vd25TaWduZXIAAAAAAAAzAAABAk9wZXJhdGlvbiBhbW91bnQgbXVzdCBiZSBncmVhdGVyIHRoYW4gemVybyAoaXNzdWUgIzEwMjApLgoKQXNzaWduZWQgMzAvMzEgcmF0aGVyIHRoYW4gMjEvMjI6IHRoZSBTRVAtNDEgYmxvY2sgYWxyZWFkeSBwdWJsaXNoZWQKdGhvc2UgY29kZXMgdGhyb3VnaCB0aGUgZ2VuZXJhdGVkIGJpbmRpbmdzIGFuZCBkb2NzL0NPTlRSQUNUU19BUEkubWQsCnNvIHJlbnVtYmVyaW5nIGl0IHdvdWxkIGJyZWFrIGRlY29kaW5nIGZvciBleGlzdGluZyBjbGllbnRzLgAAAAAAClplcm9BbW91bnQAAAAAAB4AAABJVHJhbnNmZXIgc291cmNlIGFuZCBkZXN0aW5hdGlvbiBjYW5ub3QgYmUgdGhlIHNhbWUgYWRkcmVzcyAoaXNzdWUgIzEwMjApLgAAAAAAAAxTZWxmVHJhbnNmZXIAAAAfAAAALE5vIGNsYXdiYWNrIHByb3Bvc2FsIGZvdW5kIGZvciB0aGUgZ2l2ZW4gaWQuAAAAEENsYXdiYWNrTm90Rm91bmQAAAAgAAAAOVRoZSB0aW1lbG9jayBkZWxheSBmb3IgdGhpcyBjbGF3YmFjayBoYXMgbm90IHlldCBlbGFwc2VkLgAAAAAAABJDbGF3YmFja1RpbWVsb2NrZWQAAAAAACEAAAA/Q2xhd2JhY2sgYW1vdW50IGV4Y2VlZHMgdGhlIHRhcmdldCdzIGN1cnJlbnQgdW5jbGFpbWVkIGJhbGFuY2UuAAAAABFDbGF3YmFja092ZXJzcGVuZAAAAAAAACIAAABET25seSB0aGUgY29uZmlndXJlZCBndWFyZGlhbiAoYWRtaW4pIG1heSBjYW5jZWwgYSBjbGF3YmFjayBwcm9wb3NhbC4AAAAUQ2xhd2JhY2tHdWFyZGlhbk9ubHkAAAAj',
        'AAAAAQAAAEhBbiBpbi1mbGlnaHQgb24tY2hhaW4gZ292ZXJuYW5jZSBwcm9wb3NhbCBmb3IgYSBzaW5nbGUgcGFyYW1ldGVyIGNoYW5nZS4AAAAAAAAADVBhcmFtUHJvcG9zYWwAAAAAAAAIAAAANkxlZGdlciBhdCBvciBhZnRlciB3aGljaCB0aGUgcHJvcG9zYWwgbWF5IGJlIGV4ZWN1dGVkLgAAAAAAFGV4ZWN1dGVfYWZ0ZXJfbGVkZ2VyAAAABAAAACdXaGV0aGVyIHRoZSBwcm9wb3NhbCBoYXMgYmVlbiBleGVjdXRlZC4AAAAACGV4ZWN1dGVkAAAAAQAAADpMZWRnZXIgYWZ0ZXIgd2hpY2ggdGhlIHByb3Bvc2FsIGV4cGlyZXMgd2l0aG91dCBleGVjdXRpb24uAAAAAAARZXhwaXJlc19hdF9sZWRnZXIAAAAAAAAEAAAAQk5ldyB2YWx1ZSBlbmNvZGVkIGFzIGEgNjQtYml0IHdvcmQgKGNhbGxlcidzIGVuY29kaW5nIGNvbnZlbnRpb24pLgAAAAAACW5ld192YWx1ZQAAAAAAAAYAAAAsU3RvcmFnZSBrZXkgZm9yIHRoZSBwYXJhbWV0ZXIgYmVpbmcgY2hhbmdlZC4AAAAJcGFyYW1fa2V5AAAAAAAAEQAAABtVbmlxdWUgcHJvcG9zYWwgaWRlbnRpZmllci4AAAAAC3Byb3Bvc2FsX2lkAAAAAAYAAAA6UXVvcnVtIHJlcXVpcmVkIGZvciBleGVjdXRpb24gKG51bWJlciBvZiBhcHByb3Zpbmcgdm90ZXMpLgAAAAAABnF1b3J1bQAAAAAABAAAACZTZXQgb2YgYWRkcmVzc2VzIHRoYXQgdm90ZWQgaW4gZmF2b3VyLgAAAAAACXZvdGVzX2ZvcgAAAAAAA+oAAAAT',
        'AAAAAQAAADRWZXN0aW5nIHNjaGVkdWxlIHJlY29yZCBzdG9yZWQgcGVyIHVzZXIgcGVyIHZlc3RfaWQuAAAAAAAAAA1WZXN0aW5nUmVjb3JkAAAAAAAABAAAAAAAAAAHY2xhaW1lZAAAAAAGAAAAAAAAAAplbmRfbGVkZ2VyAAAAAAAEAAAAAAAAAAxzdGFydF9sZWRnZXIAAAAEAAAAAAAAAAV0b3RhbAAAAAAAAAY=',
        'AAAAAQAAADxNdWx0aS1zaWcgY29uZmlndXJhdGlvbjogTS1vZi1OIHRocmVzaG9sZCBvdmVyIGEgc2lnbmVyIHNldC4AAAAAAAAADk11bHRpU2lnQ29uZmlnAAAAAAACAAAAI09yZGVyZWQgbGlzdCBvZiBhdXRob3JpemVkIHNpZ25lcnMuAAAAAAdzaWduZXJzAAAAA+oAAAATAAAAR01pbmltdW0gbnVtYmVyIG9mIGFwcHJvdmFscyByZXF1aXJlZCB0byBleGVjdXRlIGEgcHJpdmlsZWdlZCBvcGVyYXRpb24uAAAAAAl0aHJlc2hvbGQAAAAAAAAE',
        'AAAAAQAAADdQcm9wb3NhbCByZWNvcmQgc3RvcmVkIHVuZGVyIGAoQ0xBV0JBQ0tfUFJPUE9TQUwsIGlkKWAuAAAAAAAAAAAQQ2xhd2JhY2tQcm9wb3NhbAAAAAUAAAAAAAAABmFtb3VudAAAAAAABgAAAD9UcnVlIG9uY2UgY2FuY2VsbGVkIHNvIHN0YWxlIHByb3Bvc2FscyBkb24ndCBhcHBlYXIgYXMgcGVuZGluZy4AAAAACWNhbmNlbGxlZAAAAAAAAAEAAAArVHJ1ZSBvbmNlIGV4ZWN1dGVkIHNvIHJlcGxheSBpcyBpbXBvc3NpYmxlLgAAAAAIZXhlY3V0ZWQAAAABAAAANUxlZGdlciBzZXF1ZW5jZSBudW1iZXIgd2hlbiB0aGUgcHJvcG9zYWwgd2FzIGNyZWF0ZWQuAAAAAAAAC3Byb3Bvc2VkX2F0AAAAAAQAAAAAAAAABnRhcmdldAAAAAAAEw==',
        'AAAAAQAAAEtBbiBpbi1mbGlnaHQgcHJpdmlsZWdlZCBvcGVyYXRpb24gcHJvcG9zYWwgd2FpdGluZyBmb3IgdGhyZXNob2xkIGFwcHJvdmFscy4AAAAAAAAAABJQcml2aWxlZ2VkUHJvcG9zYWwAAAAAAAUAAAApU2V0IG9mIHNpZ25lcnMgdGhhdCBoYXZlIGFwcHJvdmVkIHNvIGZhci4AAAAAAAAJYXBwcm92YWxzAAAAAAAD6gAAABMAAAApTGVkZ2VyIGFmdGVyIHdoaWNoIHRoaXMgcHJvcG9zYWwgZXhwaXJlcy4AAAAAAAARZXhwaXJlc19hdF9sZWRnZXIAAAAAAAAEAAAAQlN5bWJvbGljIG9wIGNvZGUgKGUuZy4gYHdpdGhkcmF3X3Jlc2VydmVgLCBgdXBncmFkZWAsIGBzZXRfcmF0ZWApLgAAAAAAAm9wAAAAAAARAAAANlNlcmlhbGlzZWQgb3AgYXJndW1lbnRzIChhcHBsaWNhdGlvbi1kZWZpbmVkIHBheWxvYWQpLgAAAAAAB3BheWxvYWQAAAAD6gAAABEAAAAbVW5pcXVlIHByb3Bvc2FsIGlkZW50aWZpZXIuAAAAAAtwcm9wb3NhbF9pZAAAAAAG',
        'AAAAAAAAACFSZXR1cm4gdGhlIGN1cnJlbnQgYWRtaW4gYWRkcmVzcy4AAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=',
        'AAAAAAAAACtDbGFpbSByZXdhcmRzIGZvciBhIHVzZXIgKHJlZHVjZXMgYmFsYW5jZSkuAAAAAAVjbGFpbQAAAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAYAAAABAAAD6QAAAAYAAAAD',
        'AAAAAAAAABhDcmVkaXQgcG9pbnRzIHRvIGEgdXNlci4AAAAGY3JlZGl0AAAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAEdXNlcgAAABMAAAAAAAAABmFtb3VudAAAAAAABgAAAAEAAAPpAAAABgAAAAM=',
        'AAAAAAAAAJZSZWRlZW0gcG9pbnRzIGZvciBhc3NldCB0b2tlbnMuCkJ1cm5zIHBvaW50c19hbW91bnQgZnJvbSB1c2VyIGJhbGFuY2UsIHRyYW5zZmVycyBhc3NldCB0b2tlbnMgdG8gdXNlci4KUmV0dXJucyB0aGUgYW1vdW50IG9mIGFzc2V0IHRva2VucyB0cmFuc2ZlcnJlZC4AAAAAAAZyZWRlZW0AAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAA1wb2ludHNfYW1vdW50AAAAAAAABgAAAAEAAAPpAAAACwAAAAM=',
        'AAAAAAAAACpHZXQgdGhlIGN1cnJlbnQgcG9pbnRzIGJhbGFuY2UgZm9yIGEgdXNlci4AAAAAAAdiYWxhbmNlAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAY=',
        'AAAAAAAAALdNaWdyYXRpb24gZW50cnlwb2ludCBmb3IgZnV0dXJlIHNjaGVtYSBjaGFuZ2VzLgoKQ3VycmVudCBiZWhhdmlvciBpcyBpbnRlbnRpb25hbGx5IGlkZW1wb3RlbnQgZm9yIHZlcnNpb24gYDFgLCBzbyBvcGVyYXRpb25hbApzY3JpcHRzIGNhbiBjYWxsIHRoaXMgc2FmZWx5IGR1cmluZyBkZXBsb3ltZW50cy91cGdyYWRlcy4AAAAAB21pZ3JhdGUAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA50YXJnZXRfdmVyc2lvbgAAAAAABAAAAAEAAAPpAAAABAAAAAM=',
        'AAAAAAAAAh5SZXBsYWNlIHRoZSBjb250cmFjdCBXQVNNIGluLXBsYWNlIHdpdGhvdXQgcmVzZXR0aW5nIHBhcnRpY2lwYW50IHN0YXRlLgoKQ2FsbHMgYGNvbnRyYWN0X3VwZGF0ZV9jdXJyZW50X2NvbnRyYWN0X3dhc21gIHdpdGggdGhlIHN1cHBsaWVkIGhhc2ggb2YKdGhlIG5ldyBXQVNNIGJsb2IuICBCYWxhbmNlcyBhbmQgdmVzdGluZyByZWNvcmRzIGluIHBlcnNpc3RlbnQgc3RvcmFnZQpzdXJ2aXZlIGJlY2F1c2UgU29yb2JhbiBXQVNNLW9ubHkgdXBncmFkZXMgbmV2ZXIgdG91Y2ggc3RvcmFnZS4KUmVxdWlyZXMgYWRtaW4gYXV0aCBhbmQgYSB2YWxpZCBub25jZSBzbyB1cGdyYWRlcyBhcmUgcmVwbGF5LXNhZmUuCgpUeXBpY2FsIHdvcmtmbG93IChpc3N1ZSAjNTE4KToKMS4gVXBsb2FkIG5ldyBXQVNNIOKGkiBvYnRhaW4gYG5ld193YXNtX2hhc2hgLgoyLiBDYWxsIGB1cGdyYWRlKGFkbWluLCBub25jZSwgbmV3X3dhc21faGFzaClgLgozLiBJZiBzdG9yYWdlIGxheW91dCBjaGFuZ2VkLCBjYWxsIGBtaWdyYXRlKGFkbWluLCB0YXJnZXRfdmVyc2lvbilgLgAAAAAAB3VwZ3JhZGUAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAVub25jZQAAAAAAAAsAAAAAAAAADW5ld193YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAChHZXQgY29udHJhY3QgbWV0YWRhdGEgKG5hbWUgYW5kIHN5bWJvbCkuAAAACG1ldGFkYXRhAAAAAAAAAAEAAAPtAAAAAgAAABEAAAAR',
        'AAAAAAAAAQtSZWNvcmQgdGhlIGN1cnJlbnQgbGVkZ2VyIG51bWJlciB1bmRlciBgc25hcHNob3RfaWRgIChhZG1pbiBvbmx5KS4KRG9lcyBOT1QgY29weSBiYWxhbmNlcyDigJQgc3RvcmVzIGEgbGVkZ2VyIHJlZmVyZW5jZSBmb3Igb2ZmLWNoYWluIGluZGV4aW5nLgpPZmYtY2hhaW4gaW5kZXhlcnMgY2FuIHVzZSB0aGUgbGVkZ2VyIG51bWJlciB3aXRoIEhvcml6b24gYGdldExlZGdlckVudHJpZXNgCnRvIHJlY29uc3RydWN0IGJhbGFuY2VzIGF0IHRoYXQgcG9pbnQgaW4gdGltZS4AAAAACHNuYXBzaG90AAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAtzbmFwc2hvdF9pZAAAAAAGAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAABxDaGVjayBpZiBjb250cmFjdCBpcyBwYXVzZWQuAAAACWlzX3BhdXNlZAAAAAAAAAAAAAABAAAAAQ==',
        'AAAAAAAAAEFDb25maWd1cmUgdGllcmVkIHJld2FyZCBkaXN0cmlidXRpb24gZm9yIGEgY2FtcGFpZ24gKGFkbWluIG9ubHkpLgAAAAAAAAlzZXRfdGllcnMAAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAAAAAAABXRpZXJzAAAAAAAD6gAAA+0AAAACAAAABgAAAAYAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAChJbml0aWFsaXplIHRoZSByZXdhcmRzIGNvbnRyYWN0IChhZG1pbikuAAAACmluaXRpYWxpemUAAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAEbmFtZQAAABEAAAAAAAAABnN5bWJvbAAAAAAAEQAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAFBTRVAtNDE6IEJ1cm4gYGFtb3VudGAgZnJvbSBgZnJvbWAncyBiYWxhbmNlLgpSZXF1aXJlcyBhdXRob3JpemF0aW9uIGZyb20gYGZyb21gLgAAAApzZXA0MV9idXJuAAAAAAACAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAACZTRVAtNDE6IFJldHVybnMgdGhlIG5hbWUgb2YgdGhlIHRva2VuLgAAAAAACnNlcDQxX25hbWUAAAAAAAAAAAABAAAAEQ==',
        'AAAAAAAAAX1QYXVzZSB0aGUgY29udHJhY3QuIEJsb2NrcyBjcmVkaXQgYW5kIGNsYWltIG9wZXJhdGlvbnMuCgpUaGlzIGlzIGEgY3JpdGljYWwgb3BlcmF0aW9uOiB3aGVuIGEgbXVsdGlzaWcgdGhyZXNob2xkIGlzIGNvbmZpZ3VyZWQKKHNlZSBbYFNlbGY6OnNldF9tdWx0aXNpZ190aHJlc2hvbGRgXSksIGBzaWduYXR1cmVzYCBtdXN0IGNvbnRhaW4gYXQKbGVhc3QgYHJlcXVpcmVkYCB2YWxpZCBjby1hZG1pbiBzaWduYXR1cmVzIG92ZXIKYChvcCwgbm9uY2UsIHNoYTI1NihwYXVzZWQpKWA7IG90aGVyd2lzZSBwYXNzIGFuIGVtcHR5IGBWZWNgIGFuZCB0aGUKbGVnYWN5IHNpbmdsZS1hZG1pbiBjaGVjayBhcHBsaWVzIChgbm9uY2VgIGlzIGlnbm9yZWQgaW4gdGhhdCBjYXNlKS4AAAAAAAAKc2V0X3BhdXNlZAAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAVub25jZQAAAAAAAAYAAAAAAAAABnBhdXNlZAAAAAAAAQAAAAAAAAAKc2lnbmF0dXJlcwAAAAAD6gAAA+0AAAACAAAAEwAAA+4AAABAAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAADNDbGVhciBjb25maWd1cmVkIHRpZXJzIGZvciBhIGNhbXBhaWduIChhZG1pbiBvbmx5KS4AAAAAC2NsZWFyX3RpZXJzAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAALY2FtcGFpZ25faWQAAAAABgAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAJFBY2NlcHQgYWRtaW4gcm9sZS4gQ2FsbGVyIE1VU1QgYmUgdGhlIGFkZHJlc3MgdGhhdCB0aGUgY3VycmVudCBhZG1pbgpwcmV2aW91c2x5IHByb3Bvc2VkIHZpYSBgcHJvcG9zZV9hZG1pbmAuIENsZWFycyB0aGUgcGVuZGluZyBzbG90IG9uCnN1Y2Nlc3MuAAAAAAAADGFjY2VwdF9hZG1pbgAAAAEAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAIhSZWdpc3RlciBhIGNvLWFkbWluJ3MgZWQyNTUxOSBwdWJsaWMga2V5IGZvciBtdWx0aXNpZyB2ZXJpZmljYXRpb24KKGFkbWluIG9ubHkpLiBPdmVyd3JpdGVzIHRoZSBrZXkgaWYgYGNvX2FkbWluYCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuAAAADGFkZF9jb19hZG1pbgAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIY29fYWRtaW4AAAATAAAAAAAAAAZwdWJrZXkAAAAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAGVDcmVkaXQgcG9pbnRzIHRvIG11bHRpcGxlIHVzZXJzIGluIG9uZSBjYWxsLgpFYWNoIHJlY2lwaWVudCBjb3VudHMgYXMgb25lIGNhbGwgdG93YXJkIHRoZSByYXRlIGxpbWl0LgAAAAAAAAxiYXRjaF9jcmVkaXQAAAACAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAKcmVjaXBpZW50cwAAAAAD6gAAA+0AAAACAAAAEwAAAAYAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAJ1DbGFpbSB1cCB0byBgYW1vdW50YCBmcm9tIHRoZSB1bmxvY2tlZCBwb3J0aW9uIG9mIGEgc3BlY2lmaWMgdmVzdGluZyBzY2hlZHVsZS4KUmV0dXJucyB0aGUgcmVtYWluaW5nIGNsYWltYWJsZSBhbW91bnQgaW4gdGhhdCB2ZXN0IHNjaGVkdWxlIGFmdGVyIHRoaXMgY2xhaW0uAAAAAAAADGNsYWltX3Zlc3RlZAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAd2ZXN0X2lkAAAAAAYAAAAAAAAABmFtb3VudAAAAAAABgAAAAEAAAPpAAAABgAAAAM=',
        'AAAAAAAAAHZGdW5kIHJlZGVtcHRpb24gcmVzZXJ2ZSAoY2FsbGFibGUgYnkgYW55b25lLCB0eXBpY2FsbHkgYWRtaW4pLgpUcmFuc2ZlcnMgYXNzZXQgdG9rZW5zIGZyb20gY2FsbGVyIHRvIGNvbnRyYWN0IHJlc2VydmUuAAAAAAAMZnVuZF9yZXNlcnZlAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAABmFtb3VudAAAAAAABgAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAEBSZXR1cm5zIHRoZSBsZWRnZXIgbnVtYmVyIHJlY29yZGVkIGZvciBgc25hcHNob3RfaWRgLCBvciBgTm9uZWAuAAAADGdldF9zbmFwc2hvdAAAAAEAAAAAAAAAC3NuYXBzaG90X2lkAAAAAAYAAAABAAAD6AAAAAY=',
        'AAAAAAAAAChTRVAtNDE6IFJldHVybnMgdGhlIHN5bWJvbCBvZiB0aGUgdG9rZW4uAAAADHNlcDQxX3N5bWJvbAAAAAAAAAABAAAAEQ==',
        'AAAAAAAAAAAAAAAMdG90YWxfc3VwcGx5AAAAAAAAAAEAAAAG',
        'AAAAAAAAAE5SZXR1cm5zIHRoZSBzdW0gb2YgYWxsIHZlc3Rpbmcgc2NoZWR1bGUgdG90YWxzIGZvciBhIHVzZXIgKHZlc3RlZCArIHVudmVzdGVkKS4AAAAAAAx0b3RhbF92ZXN0ZWQAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAAG',
        'AAAAAAAAAMtDcmVkaXQgYSBsaW5lYXJseS12ZXN0aW5nIGFtb3VudCB0byBhIHVzZXIgKGF1dGhvcml6ZWQgY2FsbGVyIG9ubHkpLgpWZXN0aW5nIGlzIGxpbmVhcjogYHVubG9ja2VkID0gdG90YWwgKiAobm93IC0gc3RhcnRfbGVkZ2VyKSAvIChlbmRfbGVkZ2VyIC0gc3RhcnRfbGVkZ2VyKWAuClJldHVybnMgdGhlIG5ldyB2ZXN0X2lkIGZvciB0aGlzIHNjaGVkdWxlLgAAAAANY3JlZGl0X3Zlc3RlZAAAAAAAAAUAAAAAAAAABGZyb20AAAATAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAMdG90YWxfYW1vdW50AAAABgAAAAAAAAAMc3RhcnRfbGVkZ2VyAAAABAAAAAAAAAAKZW5kX2xlZGdlcgAAAAAABAAAAAEAAAPpAAAABgAAAAM=',
        'AAAAAAAAALlJbml0aWFsaXNlIHRoZSBNLW9mLU4gc2lnbmVyIHNldCAoY3VycmVudCBhZG1pbiBvbmx5KS4gT25jZSBjb25maWd1cmVkLAphbGwgcHJpdmlsZWdlZCBvcHMgb24gdGhpcyBjb250cmFjdCBmbG93IHRocm91Z2ggdGhlIG11bHRpLXNpZyBnYXRlLgoKYHRocmVzaG9sZGAgbXVzdCBiZSBpbiBgMS4uPXNpZ25lcnMubGVuKClgLgAAAAAAAA1pbml0X211bHRpc2lnAAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAdzaWduZXJzAAAAA+oAAAATAAAAAAAAAAl0aHJlc2hvbGQAAAAAAAAEAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAB9DaGVjayBpZiB0b2tlbiBtb2RlIGlzIGVuYWJsZWQuAAAAAA1pc190b2tlbl9tb2RlAAAAAAAAAAAAAAEAAAAB',
        'AAAAAAAAAHNSZXR1cm4gdGhlIHBlbmRpbmcgYWRtaW4gYWRkcmVzcyBwcm9wb3NlZCBieSB0aGUgY3VycmVudCBhZG1pbiwgaWYgYW55LgpgTm9uZWAgd2hlbiB0aGVyZSBpcyBubyBpbi1mbGlnaHQgdHJhbnNmZXIuAAAAAA1wZW5kaW5nX2FkbWluAAAAAAAAAAAAAAEAAAPoAAAAEw==',
        'AAAAAAAAARxQcm9wb3NlIGEgbmV3IGFkbWluIChjdXJyZW50IGFkbWluIG9ubHkpLiBUaGUgdHJhbnNmZXIgZG9lcyBub3QgdGFrZQplZmZlY3QgdW50aWwgYGFjY2VwdF9hZG1pbmAgaXMgY2FsbGVkIGJ5IHRoZSBuZXcgYWRtaW4uCgpDYWxsaW5nIGFnYWluIG92ZXJ3cml0ZXMgdGhlIHByZXZpb3VzIHBlbmRpbmcgYWRtaW4sIHNvIHRoZSBjdXJyZW50CmFkbWluIGNhbiBjYW5jZWwgYSBwcm9wb3NhbCBieSBjYWxsaW5nIGBjYW5jZWxfYWRtaW5fdHJhbnNmZXJgIG9yIGJ5CnByb3Bvc2luZyB0aGVtc2VsdmVzLgAAAA1wcm9wb3NlX2FkbWluAAAAAAAAAgAAAAAAAAANY3VycmVudF9hZG1pbgAAAAAAABMAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAIZTRVAtNDE6IFNldCBhbGxvd2FuY2UgZm9yIGBzcGVuZGVyYCB0byBzcGVuZCBgYW1vdW50YCBmcm9tIGNhbGxlcidzIGJhbGFuY2UuCklmIGV4cGlyYXRpb25fbGVkZ2VyIGlzIDAsIHRoZSBhbGxvd2FuY2UgZG9lcyBub3QgZXhwaXJlLgAAAAAADXNlcDQxX2FwcHJvdmUAAAAAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEWV4cGlyYXRpb25fbGVkZ2VyAAAAAAAABAAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAGJTRVAtNDE6IFJldHVybnMgdGhlIGJhbGFuY2Ugb2YgYGlkYCBhcyBpMTI4LgpNYXBzIGludGVybmFsIHU2NCBwb2ludHMgdG8gaTEyOCBwZXIgU0VQLTQxIHN0YW5kYXJkLgAAAAAADXNlcDQxX2JhbGFuY2UAAAAAAAABAAAAAAAAAAJpZAAAAAAAEwAAAAEAAAAL',
        'AAAAAAAAAOxTdG9yYWdlIHN0YXRzIGZvciBtb25pdG9yaW5nOiBgKHBhcnRpY2lwYW50X2NvdW50LCBub25jZV9jb3VudCwgZXhwaXJlZF9lc3RpbWF0ZSlgLgpgcGFydGljaXBhbnRfY291bnRgIGlzIGFsd2F5cyBgMGAgaGVyZTsgdGhlIHJld2FyZHMgY29udHJhY3QgdHJhY2tzCmJhbGFuY2VzLCBub3QgcGFydGljaXBhbnRzLiBgZXhwaXJlZF9lc3RpbWF0ZWAgY291bnRzIGN1cnJlbnRseS1zdGFsZQpub25jZSByZWNvcmRzLgAAAA1zdG9yYWdlX3N0YXRzAAAAAAAAAAAAAAEAAAPtAAAAAwAAAAYAAAAGAAAABg==',
        'AAAAAAAAAClHZXQgdG90YWwgY2xhaW1lZCByZXdhcmRzIChnbG9iYWwgc3RhdHMpLgAAAAAAAA10b3RhbF9jbGFpbWVkAAAAAAAAAAAAAAEAAAAG',
        'AAAAAAAAADZUcmFuc2ZlciBwb2ludHMgZnJvbSBvbmUgdXNlciB0byBhbm90aGVyIChhZG1pbiBvbmx5KS4AAAAAAA5hZG1pbl90cmFuc2ZlcgAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARmcm9tAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAABmFtb3VudAAAAAAABgAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAACxDcmVkaXQgcG9pbnRzIHRvIGEgdXNlciBiYXNlZCBvbiB0aGVpciByYW5rLgAAAA5jcmVkaXRfYnlfcmFuawAAAAAABAAAAAAAAAAEZnJvbQAAABMAAAAAAAAABHVzZXIAAAATAAAAAAAAAARyYW5rAAAABgAAAAAAAAALY2FtcGFpZ25faWQAAAAABgAAAAEAAAPpAAAABgAAAAM=',
        'AAAAAAAAAENSZXR1cm5zIGFsbCBgKHNuYXBzaG90X2lkLCBsZWRnZXJfbnVtYmVyKWAgcGFpcnMgaW4gY3JlYXRpb24gb3JkZXIuAAAAAA5saXN0X3NuYXBzaG90cwAAAAAAAAAAAAEAAAPqAAAD7QAAAAIAAAAGAAAABg==',
        'AAAAAAAAADxSZXR1cm5zIHRoZSBhY3RpdmUgc3RvcmFnZSBzY2hlbWEgdmVyc2lvbiBmb3IgdGhpcyBjb250cmFjdC4AAAAOc2NoZW1hX3ZlcnNpb24AAAAAAAAAAAABAAAABA==',
        'AAAAAAAAADhTRVAtNDE6IFJldHVybnMgdGhlIG51bWJlciBvZiBkZWNpbWFscyB1c2VkIGZvciBkaXNwbGF5LgAAAA5zZXA0MV9kZWNpbWFscwAAAAAAAAAAAAEAAAAE',
        'AAAAAAAAAFJTRVAtNDE6IFRyYW5zZmVyIGBhbW91bnRgIGZyb20gYGZyb21gIHRvIGB0b2AuClJlcXVpcmVzIGF1dGhvcml6YXRpb24gZnJvbSBgZnJvbWAuAAAAAAAOc2VwNDFfdHJhbnNmZXIAAAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAGtSZXR1cm5zIHRoZSBjdXJyZW50bHkgdW5sb2NrZWQgYnV0IHVuY2xhaW1lZCB2ZXN0ZWQgYmFsYW5jZSBmb3IgYSB1c2VyCmFjcm9zcyBhbGwgYWN0aXZlIHZlc3Rpbmcgc2NoZWR1bGVzLgAAAAAOdmVzdGVkX2JhbGFuY2UAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAY=',
        'AAAAAAAAAHRDYW5jZWwgYSBwZW5kaW5nIGNsYXdiYWNrIHByb3Bvc2FsLiBPbmx5IHRoZSBhZG1pbiAoZ3VhcmRpYW4pIG1heSBjYW5jZWwuCkNhbmNlbGxlZCBwcm9wb3NhbHMgY2FuIG5ldmVyIGJlIGV4ZWN1dGVkLgAAAA9jYW5jZWxfY2xhd2JhY2sAAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAEAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAAAAAAAPaXNfcGF1c2VkX2NsYWltAAAAAAAAAAABAAAAAQ==',
        'AAAAAAAAADNSZXR1cm4gdGhlIGN1cnJlbnQgbXVsdGktc2lnIGNvbmZpZ3VyYXRpb24sIGlmIGFueS4AAAAAD211bHRpc2lnX2NvbmZpZwAAAAAAAAAAAQAAA+gAAAfQAAAADk11bHRpU2lnQ29uZmlnAAA=',
        'AAAAAAAAAF9HZXQgcmVkZW1wdGlvbiByYXRlIGNvbmZpZ3VyYXRpb24uClJldHVybnMgKGFzc2V0X2FkZHJlc3MsIHJhdGVfYnBzKSBvciBOb25lIGlmIG5vdCBjb25maWd1cmVkLgAAAAAPcmVkZW1wdGlvbl9yYXRlAAAAAAAAAAABAAAD6AAAA+0AAAACAAAAEwAAAAQ=',
        'AAAAAAAAAIpSZXR1cm5zIHRoZSByZWZlcnJhbCBjb25maWd1cmF0aW9uIGFzIGAocmF0ZV9icHMsIHBlcl9yZWZlcnJlcl9jYXApYC4KRGVmYXVsdHMgdG8gYCgwLCAwKWAgd2hlbiByZWZlcnJhbCByZXdhcmRzIGhhdmUgbm90IGJlZW4gY29uZmlndXJlZC4AAAAAAA9yZWZlcnJhbF9jb25maWcAAAAAAAAAAAEAAAPtAAAAAgAAAAQAAAAG',
        'AAAAAAAAADxSZW1vdmUgYSBjby1hZG1pbiBmcm9tIHRoZSBtdWx0aXNpZyBzaWduZXIgc2V0IChhZG1pbiBvbmx5KS4AAAAPcmVtb3ZlX2NvX2FkbWluAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIY29fYWRtaW4AAAATAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAD9TRVAtNDE6IFJldHVybnMgdGhlIGFsbG93YW5jZSBgb3duZXJgIGhhcyBncmFudGVkIHRvIGBzcGVuZGVyYC4AAAAAD3NlcDQxX2FsbG93YW5jZQAAAAACAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAEAAAAL',
        'AAAAAAAAAGNTRVAtNDE6IEJ1cm4gYGFtb3VudGAgZnJvbSBgZnJvbWAncyBiYWxhbmNlIHVzaW5nIGFsbG93YW5jZS4KUmVxdWlyZXMgYXV0aG9yaXphdGlvbiBmcm9tIGBzcGVuZGVyYC4AAAAAD3NlcDQxX2J1cm5fZnJvbQAAAAADAAAAAAAAAAdzcGVuZGVyAAAAABMAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAANJFeGVjdXRlIGEgY2xhd2JhY2sgcHJvcG9zYWwgYWZ0ZXIgdGhlIHRpbWVsb2NrIGhhcyBlbGFwc2VkLgpEZWR1Y3RzIGBhbW91bnRgIGZyb20gdGhlIHRhcmdldCdzIGJhbGFuY2UgYW5kIHRvdGFsIHN1cHBseS4KQW55b25lIG1heSBjYWxsIG9uY2UgdGhlIHRpbWVsb2NrIGlzIHNhdGlzZmllZDsgcmVwbGF5IGlzIGJsb2NrZWQgYnkKdGhlIGBleGVjdXRlZGAgZmxhZy4AAAAAABBleGVjdXRlX2NsYXdiYWNrAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAEAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAAAAAAAQaXNfcGF1c2VkX2NyZWRpdAAAAAAAAAABAAAAAQ==',
        'AAAAAAAAAAAAAAAQaXNfcGF1c2VkX3JlZGVlbQAAAAAAAAABAAAAAQ==',
        'AAAAAAAAAQlQcm9wb3NlIGEgY2xhd2JhY2sgb2YgYGFtb3VudGAgdW5jbGFpbWVkIHBvaW50cyBmcm9tIGB0YXJnZXRgLgpSZXR1cm5zIHRoZSBwcm9wb3NhbCBpZC4gQWRtaW4tb25seTsgdGhlIGNsYXdiYWNrIGNhbm5vdCBiZSBleGVjdXRlZAp1bnRpbCBgQ0xBV0JBQ0tfVElNRUxPQ0tfTEVER0VSU2AgaGF2ZSBlbGFwc2VkIHNvIHRoZSB0YXJnZXQgaGFzIHRpbWUKdG8gZGlzcHV0ZS4gVGhlIGd1YXJkaWFuIChhZG1pbikgY2FuIGNhbmNlbCB3aXRoaW4gdGhhdCB3aW5kb3cuAAAAAAAAEHByb3Bvc2VfY2xhd2JhY2sAAAADAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAABnRhcmdldAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAAGAAAAAQAAA+kAAAAEAAAAAw==',
        'AAAAAAAAAEdQYXVzZSBvciB1bnBhdXNlIHRoZSBgY2xhaW1gIC8gYGNsYWltX3Zlc3RlZGAgb3BlcmF0aW9ucyBpbmRlcGVuZGVudGx5LgAAAAAQc2V0X3BhdXNlZF9jbGFpbQAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGcGF1c2VkAAAAAAABAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAF5XaXRoZHJhdyBhc3NldCB0b2tlbnMgZnJvbSByZWRlbXB0aW9uIHJlc2VydmUgKGFkbWluIG9ubHkpLgpVc2VkIHRvIHJlY2xhaW0gdW5yZWRlZW1lZCBhc3NldHMuAAAAAAAQd2l0aGRyYXdfcmVzZXJ2ZQAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFbm9uY2UAAAAAAAALAAAAAAAAAAZhbW91bnQAAAAAAAYAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAEZHZXQgdGhlIG51bWJlciBvZiBjcmVkaXQgY2FsbHMgbWFkZSBieSBgY2FsbGVyYCBpbiB0aGUgY3VycmVudCB3aW5kb3cuAAAAAAARY3JlZGl0X2NhbGxfY291bnQAAAAAAAABAAAAAAAAAAZjYWxsZXIAAAAAABMAAAABAAAABA==',
        'AAAAAAAAAJdFbmFibGUgdG9rZW4gbW9kZSAoYWRtaW4gb25seSkuIE9uZS13YXk6IG9uY2UgZW5hYmxlZCwgY2Fubm90IGJlIGRpc2FibGVkLgpUaGlzIGVuYWJsZXMgU0VQLTQxLWNvbXBsaWFudCB0b2tlbiBpbnRlcmZhY2UgYWxvbmdzaWRlIGV4aXN0aW5nIHBvaW50cyBBUEkuAAAAABFlbmFibGVfdG9rZW5fbW9kZQAAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAEbmFtZQAAABEAAAAAAAAABnN5bWJvbAAAAAAAEQAAAAAAAAAIZGVjaW1hbHMAAAAEAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAADRHZXQgcG9pbnRzIHJld2FyZCBmb3IgYSBnaXZlbiByYW5rIHVuZGVyIGEgY2FtcGFpZ24uAAAAEWdldF90aWVyX2Zvcl9yYW5rAAAAAAAAAgAAAAAAAAAEcmFuawAAAAYAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAABAAAABg==',
        'AAAAAAAAALhSZW1vdmUgbXVsdGlzaWcgbm9uY2UgcmVjb3JkcyBvbGRlciB0aGFuIFtgTk9OQ0VfVFRMX0xFREdFUlNgXSwgdXAgdG8KYG1heF9lbnRyaWVzYCBwZXIgY2FsbC4gQ2FsbGFibGUgYnkgYW55b25lIHNpbmNlIGl0IG9ubHkgZGVsZXRlcwpzdGFsZSBkYXRhLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZW50cmllcyBwcnVuZWQuAAAAEXBydW5lX3VzZWRfbm9uY2VzAAAAAAAAAQAAAAAAAAALbWF4X2VudHJpZXMAAAAABAAAAAEAAAAE',
        'AAAAAAAAAIFQYXVzZSBvciB1bnBhdXNlIHRoZSBgY3JlZGl0YCAvIGBiYXRjaF9jcmVkaXRgIC8gYGNyZWRpdF92ZXN0ZWRgIC8KYGNyZWRpdF9ieV9yYW5rYCBvcGVyYXRpb25zIGluZGVwZW5kZW50bHkgb2YgdGhlIGdsb2JhbCBwYXVzZS4AAAAAAAARc2V0X3BhdXNlZF9jcmVkaXQAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABnBhdXNlZAAAAAAAAQAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAADZQYXVzZSBvciB1bnBhdXNlIHRoZSBgcmVkZWVtYCBvcGVyYXRpb24gaW5kZXBlbmRlbnRseS4AAAAAABFzZXRfcGF1c2VkX3JlZGVlbQAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGcGF1c2VkAAAAAAABAAAAAQAAA+kAAAACAAAAAw==',
        'AAAAAAAAAG1DYXN0IGEgdm90ZSBpbiBmYXZvdXIgb2YgYSBnb3Zlcm5hbmNlIHByb3Bvc2FsLgoKVGhlIHZvdGVyIG11c3QgYXV0aGVudGljYXRlLiBSZXR1cm5zIHRoZSBjdXJyZW50IHZvdGUgY291bnQuAAAAAAAAEXZvdGVfcGFyYW1fY2hhbmdlAAAAAAAAAgAAAAAAAAAFdm90ZXIAAAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAGAAAAAQAAA+kAAAAEAAAAAw==',
        'AAAAAAAAADJSZXR1cm4gdGhlIGN1cnJlbnQgc3RhdGUgb2YgYSBnb3Zlcm5hbmNlIHByb3Bvc2FsLgAAAAAAEmdldF9wYXJhbV9wcm9wb3NhbAAAAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAEAAAPoAAAH0AAAAA1QYXJhbVByb3Bvc2FsAAAA',
        'AAAAAAAAAEBSZXR1cm5zIHRoZSBjb25maWd1cmVkIE0tb2YtTiBtdWx0aXNpZyB0aHJlc2hvbGQgKDAgPSBkaXNhYmxlZCkuAAAAEm11bHRpc2lnX3RocmVzaG9sZAAAAAAAAAAAAAEAAAAE',
        'AAAAAAAAAxlQYXkgYSByZWZlcnJlciB0aGUgY29uZmlndXJlZCBib251cyBmb3IgYSByZWZlcmVlJ3MgcXVhbGlmeWluZyBhY3Rpb24KKGFkbWluIG9ubHkpLiBFbmZvcmNlcyB0aGUgYW50aS1hYnVzZSBpbnZhcmlhbnRzIG9uLWNoYWluOgoKLSAqKnNlbGYtcmVmZXJyYWwqKjogYHJlZmVycmVyID09IHJlZmVyZWVgIGlzIHJlamVjdGVkLgotICoqY2lyY3VsYXIqKjogcmVqZWN0ZWQgd2hlbiBgcmVmZXJyZXJgIHdhcyBpdHNlbGYgcHJldmlvdXNseSByZXdhcmRlZCBhcwphIHJlZmVyZWUgb2YgYHJlZmVyZWVgIChhbiBgQSDihpIgQmAgdGhlbiBgQiDihpIgQWAgY3ljbGUpLgotICoqdW5pcXVlbmVzcyAvIHN5YmlsIGdhdGUqKjogZWFjaCBgcmVmZXJlZWAgY2FuIHRyaWdnZXIgYXQgbW9zdCBvbmUKcmVmZXJyYWwgYm9udXMsIGV2ZXIg4oCUIG1ha2luZyB0aGUgcGF5b3V0IGlkZW1wb3RlbnQgYW5kIGFsbC1vci1ub3RoaW5nLgotICoqcGVyLXJlZmVycmVyIGNhcCoqOiB0aGUgcmVmZXJyZXIncyBjdW11bGF0aXZlIGJvbnVzIG1heSBub3QgZXhjZWVkIHRoZQpjb25maWd1cmVkIGNhcC4KCk9uIHN1Y2Nlc3MgdGhlIGJvbnVzIGlzIGNyZWRpdGVkIHRvIGByZWZlcnJlcmAncyBiYWxhbmNlIChlbWl0dGluZyB0aGUKc3RhbmRhcmQgYGNyZWRpdGAgZXZlbnQgc28gYmFsYW5jZSBpbmRleGVycyBzdGF5IGNvbnNpc3RlbnQpIGFuZCBhCmByZWZfYm9udXNgIGV2ZW50IGlzIHB1Ymxpc2hlZCBmb3IgYXR0cmlidXRpb24vaW5zdHJ1bWVudGF0aW9uLiBSZXR1cm5zCnRoZSBib251cyBhbW91bnQgY3JlZGl0ZWQuAAAAAAAAEnBheV9yZWZlcnJhbF9ib251cwAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhyZWZlcnJlcgAAABMAAAAAAAAAB3JlZmVyZWUAAAAAEwAAAAAAAAARcXVhbGlmeWluZ19hbW91bnQAAAAAAAAGAAAAAQAAA+kAAAAGAAAAAw==',
        'AAAAAAAAACdHZXQgY3VycmVudCByZWRlbXB0aW9uIHJlc2VydmUgYmFsYW5jZS4AAAAAEnJlZGVtcHRpb25fcmVzZXJ2ZQAAAAAAAAAAAAEAAAAG',
        'AAAAAAAAAERSZXR1cm5zIG11bHRpcGxpZXIgaW4gYmFzaXMgcG9pbnRzIGZvciBjYW1wYWlnbiwgZGVmYXVsdHMgdG8gMTBfMDAwLgAAABNjYW1wYWlnbl9tdWx0aXBsaWVyAAAAAAEAAAAAAAAAC2NhbXBhaWduX2lkAAAAAAYAAAABAAAABA==',
        'AAAAAAAAAGlDYW5jZWwgYSBnb3Zlcm5hbmNlIHByb3Bvc2FsIChhZG1pbiBvbmx5KS4gUmVtb3ZlcyB0aGUgcHJvcG9zYWwgZnJvbQpzdG9yYWdlIHNvIGl0IGNhbiBuZXZlciBiZSBleGVjdXRlZC4AAAAAAAATY2FuY2VsX3BhcmFtX2NoYW5nZQAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC3Byb3Bvc2FsX2lkAAAAAAYAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAHpDcmVkaXQgcG9pbnRzIHVzaW5nIGNhbXBhaWduIG11bHRpcGxpZXIuIFJvdW5kaW5nIHVzZXMgZmxvb3IgZGl2aXNpb246CmBhZGp1c3RlZCA9IGJhc2VfYW1vdW50ICogbXVsdGlwbGllcl9icHMgLyAxMF8wMDBgLgAAAAAAE2NyZWRpdF9mb3JfY2FtcGFpZ24AAAAABAAAAAAAAAAEZnJvbQAAABMAAAAAAAAABHVzZXIAAAATAAAAAAAAAAtjYW1wYWlnbl9pZAAAAAAGAAAAAAAAAAtiYXNlX2Ftb3VudAAAAAAGAAAAAQAAA+kAAAAGAAAAAw==',
        'AAAAAAAAAEZHZXQgbWF4aW11bSBhbW91bnQgYWxsb3dlZCBwZXIgc2luZ2xlIGNyZWRpdCBjYWxsICgwIG1lYW5zIHVubGltaXRlZCkuAAAAAAATbWF4X2NyZWRpdF9wZXJfY2FsbAAAAAAAAAAAAQAAAAY=',
        'AAAAAAAAAGVTRVAtNDE6IFRyYW5zZmVyIGBhbW91bnRgIGZyb20gYGZyb21gIHRvIGB0b2AgdXNpbmcgYWxsb3dhbmNlLgpSZXF1aXJlcyBhdXRob3JpemF0aW9uIGZyb20gYHNwZW5kZXJgLgAAAAAAABNzZXA0MV90cmFuc2Zlcl9mcm9tAAAAAAQAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAMVTZXQgcmVkZW1wdGlvbiByYXRlIGZvciBwb2ludHMtdG8tYXNzZXQgY29udmVyc2lvbiAoYWRtaW4gb25seSkuCnJhdGVfYnBzOiBob3cgbWFueSB1bml0cyBvZiBhc3NldCBwZXIgMTAsMDAwIHBvaW50cyAoYmFzaXMgcG9pbnRzKS4KRXhhbXBsZTogcmF0ZV9icHMgPSAxMDAgbWVhbnMgMTAwLzEwLDAwMCA9IDAuMDEgYXNzZXQgcGVyIHBvaW50LgAAAAAAABNzZXRfcmVkZW1wdGlvbl9yYXRlAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFbm9uY2UAAAAAAAALAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAACHJhdGVfYnBzAAAABAAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAU9Db25maWd1cmUgdGhlIG9uLWNoYWluIHJlZmVycmFsIHJld2FyZCBlbmdpbmUgKGFkbWluIG9ubHkpLgoKYHJhdGVfYnBzYCBpcyB0aGUgcmVmZXJyZXIgYm9udXMgYXMgYmFzaXMgcG9pbnRzIG9mIGEgcmVmZXJlZSdzCnF1YWxpZnlpbmcgYW1vdW50IChgYm9udXMgPSBxdWFsaWZ5aW5nX2Ftb3VudCAqIHJhdGVfYnBzIC8gMTBfMDAwYCkgYW5kCm11c3QgYmUgaW4gYDEuLj1NQVhfUkVGRVJSQUxfUkFURV9CUFNgLiBgcGVyX3JlZmVycmVyX2NhcGAgaXMgdGhlIG1heGltdW0KY3VtdWxhdGl2ZSBib251cyBhIHNpbmdsZSByZWZlcnJlciBtYXkgZWFybjsgYDBgIG1lYW5zIHVuY2FwcGVkLgAAAAATc2V0X3JlZmVycmFsX2NvbmZpZwAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACHJhdGVfYnBzAAAABAAAAAAAAAAQcGVyX3JlZmVycmVyX2NhcAAAAAYAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAR1FeGVjdXRlIGEgZ292ZXJuYW5jZSBwcm9wb3NhbC4gQWRtaW4gb25seS4gUmVxdWlyZXM6Ci0gcXVvcnVtIHZvdGVzIGNvbGxlY3RlZAotIHRpbWUtbG9jayBkZWxheSBlbGFwc2VkCi0gcHJvcG9zYWwgbm90IGV4cGlyZWQgb3IgYWxyZWFkeSBleGVjdXRlZAoKVGhlIG1ldGhvZCByZWNvcmRzIHRoZSBleGVjdXRpb24gYW5kIHJldHVybnMgdGhlIHBhcmFtZXRlciBrZXkgYW5kIHZhbHVlCnNvIHRoZSBjYWxsZXIgY2FuIGFwcGx5IHRoZSBjaGFuZ2UgdG8gdGhlIGNvcnJlY3Qgc3RvcmFnZSBlbnRyeS4AAAAAAAAUZXhlY3V0ZV9wYXJhbV9jaGFuZ2UAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC3Byb3Bvc2FsX2lkAAAAAAYAAAABAAAD6QAAA+0AAAACAAAAEQAAAAYAAAAD',
        'AAAAAAAAASBQcm9wb3NlIGEgZ292ZXJuYW5jZSBjaGFuZ2UgZm9yIHBhcmFtZXRlciBgcGFyYW1fa2V5YC4KCmBuZXdfdmFsdWVgIGlzIHRoZSBwcm9wb3NlZCByZXBsYWNlbWVudCB2YWx1ZS4gYHF1b3J1bWAgaXMgdGhlIG51bWJlcgpvZiBhcHByb3Zpbmcgdm90ZXMgcmVxdWlyZWQuIGBkZWxheV9sZWRnZXJzYCBpcyB0aGUgbWluaW11bSBudW1iZXIgb2YKbGVkZ2VycyB0aGF0IG11c3QgZWxhcHNlIGJlZm9yZSB0aGUgcHJvcG9zYWwgbWF5IGJlIGV4ZWN1dGVkLiBSZXR1cm5zCnRoZSBuZXcgYHByb3Bvc2FsX2lkYC4AAAAUcHJvcG9zZV9wYXJhbV9jaGFuZ2UAAAAGAAAAAAAAAAhwcm9wb3NlcgAAABMAAAAAAAAACXBhcmFtX2tleQAAAAAAABEAAAAAAAAACW5ld192YWx1ZQAAAAAAAAYAAAAAAAAABnF1b3J1bQAAAAAABAAAAAAAAAANZGVsYXlfbGVkZ2VycwAAAAAAAAQAAAAAAAAAC3R0bF9sZWRnZXJzAAAAAAQAAAABAAAD6QAAAAYAAAAD',
        'AAAAAAAAADFDdW11bGF0aXZlIHJlZmVycmFsIGJvbnVzIGNyZWRpdGVkIHRvIGByZWZlcnJlcmAuAAAAAAAAFHJlZmVycmFsX2JvbnVzX3RvdGFsAAAAAQAAAAAAAAAIcmVmZXJyZXIAAAATAAAAAQAAAAY=',
        'AAAAAAAAADVUaGUgcmVmZXJyZXIgdGhhdCB3YXMgcmV3YXJkZWQgZm9yIGByZWZlcmVlYCwgaWYgYW55LgAAAAAAABRyZXdhcmRlZF9yZWZlcnJlcl9vZgAAAAEAAAAAAAAAB3JlZmVyZWUAAAAAEwAAAAEAAAPoAAAAEw==',
        'AAAAAAAAAHdBcHByb3ZlIGFuIGluLWZsaWdodCBwcml2aWxlZ2VkIHByb3Bvc2FsLiBUaGUgY2FsbGVyIG11c3QgYmUgYSBzaWduZXIKYW5kIG11c3Qgbm90IGhhdmUgYWxyZWFkeSBhcHByb3ZlZCB0aGlzIHByb3Bvc2FsLgAAAAAVYXBwcm92ZV9wcml2aWxlZ2VkX29wAAAAAAAAAgAAAAAAAAAGc2lnbmVyAAAAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAGAAAAAQAAA+kAAAAEAAAAAw==',
        'AAAAAAAAADhDYW5jZWwgYW4gaW4tZmxpZ2h0IGFkbWluIHRyYW5zZmVyIChjdXJyZW50IGFkbWluIG9ubHkpLgAAABVjYW5jZWxfYWRtaW5fdHJhbnNmZXIAAAAAAAABAAAAAAAAAA1jdXJyZW50X2FkbWluAAAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAUBFeGVjdXRlIGEgcHJpdmlsZWdlZCBwcm9wb3NhbCBvbmNlIGl0IGhhcyByZWFjaGVkIHRocmVzaG9sZCBhcHByb3ZhbHMuClJldHVybnMgdGhlIG51bWJlciBvZiBhcHByb3ZhbHMgYXQgZXhlY3V0aW9uIHRpbWUuCgpUaGUgY2FsbGVyIG11c3QgYmUgYSBzaWduZXIuIFRoZSBhY3R1YWwgZWZmZWN0IChwYXVzZSwgcmF0ZSBjaGFuZ2UsIGV0Yy4pCmlzIGRpc3BhdGNoZWQgYnkgdGhlIGNhbGxlciBhZnRlciB0aGlzIHJldHVybnMg4oCUIHRoZSBjb250cmFjdCByZWNvcmRzIHRoZQpleGVjdXRpb24gYW5kIGNsZWFycyB0aGUgcHJvcG9zYWwgZnJvbSBzdG9yYWdlLgAAABVleGVjdXRlX3ByaXZpbGVnZWRfb3AAAAAAAAACAAAAAAAAAAhleGVjdXRvcgAAABMAAAAAAAAAC3Byb3Bvc2FsX2lkAAAAAAYAAAABAAAD6QAAAAQAAAAD',
        'AAAAAAAAAG9HZXQgdGhlIGN1cnJlbnQgcmF0ZSBsaW1pdCBjb25maWc6IGAobWF4X2NhbGxzLCB3aW5kb3dfbGVkZ2VycylgLgpSZXR1cm5zIGAoMCwgMClgIHdoZW4gbm8gbGltaXQgaXMgY29uZmlndXJlZC4AAAAAFWdldF9jcmVkaXRfcmF0ZV9saW1pdAAAAAAAAAAAAAABAAAD7QAAAAIAAAAEAAAABA==',
        'AAAAAAAAAGVQcm9wb3NlIGEgcHJpdmlsZWdlZCBvcGVyYXRpb24uIFRoZSBjYWxsZXIgbXVzdCBiZSBpbiB0aGUgc2lnbmVyIHNldC4KClJldHVybnMgdGhlIG5ldyBgcHJvcG9zYWxfaWRgLgAAAAAAABVwcm9wb3NlX3ByaXZpbGVnZWRfb3AAAAAAAAAEAAAAAAAAAAhwcm9wb3NlcgAAABMAAAAAAAAAAm9wAAAAAAARAAAAAAAAAAdwYXlsb2FkAAAAA+oAAAARAAAAAAAAAAt0dGxfbGVkZ2VycwAAAAAEAAAAAQAAA+kAAAAGAAAAAw==',
        'AAAAAAAAADROdW1iZXIgb2YgcmVmZXJlZXMgYHJlZmVycmVyYCBoYXMgYmVlbiByZXdhcmRlZCBmb3IuAAAAFXJlZmVycmFsX3Jld2FyZF9jb3VudAAAAAAAAAEAAAAAAAAACHJlZmVycmVyAAAAEwAAAAEAAAAG',
        'AAAAAAAAAJxTZXQgcGVyLWNhbGxlciBjcmVkaXQgcmF0ZSBsaW1pdCAoYWRtaW4gb25seSkuCmBtYXhfY2FsbHNgIGNyZWRpdHMgYWxsb3dlZCBwZXIgYHdpbmRvd19sZWRnZXJzYCBsZWRnZXIgd2luZG93LgpTZXQgYG1heF9jYWxscyA9IDBgIHRvIGRpc2FibGUgcmF0ZSBsaW1pdGluZy4AAAAVc2V0X2NyZWRpdF9yYXRlX2xpbWl0AAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAltYXhfY2FsbHMAAAAAAAAEAAAAAAAAAA53aW5kb3dfbGVkZ2VycwAAAAAABAAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAExBbGlhcyBmb3IgcmVkZW1wdGlvbl9yZXNlcnZlIOKAlCByZXR1cm5zIHRoZSBjdXJyZW50IHBheW91dCByZXNlcnZlIGJhbGFuY2UuAAAAFnBheW91dF9yZXNlcnZlX2JhbGFuY2UAAAAAAAAAAAABAAAACw==',
        'AAAAAAAAAIxTZXQgdGhlIE0tb2YtTiBtdWx0aXNpZyB0aHJlc2hvbGQgZm9yIGNyaXRpY2FsIG9wZXJhdGlvbnMgKGFkbWluIG9ubHkpLgpgcmVxdWlyZWQgPSAwYCBkaXNhYmxlcyBtdWx0aXNpZyAobGVnYWN5IHNpbmdsZS1hZG1pbiBhdXRoIGFwcGxpZXMpLgAAABZzZXRfbXVsdGlzaWdfdGhyZXNob2xkAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAACHJlcXVpcmVkAAAABAAAAAEAAAPpAAAAAgAAAAM=',
        'AAAAAAAAAHtTZXQgY2FtcGFpZ24tc3BlY2lmaWMgcmV3YXJkIG11bHRpcGxpZXIgaW4gYmFzaXMgcG9pbnRzIChhZG1pbiBvbmx5KS4KRXhhbXBsZTogMTBfMDAwID0gMS4weCwgMTJfNTAwID0gMS4yNXgsIDVfMDAwID0gMC41eC4AAAAAF3NldF9jYW1wYWlnbl9tdWx0aXBsaWVyAAAAAAMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAALY2FtcGFpZ25faWQAAAAABgAAAAAAAAAObXVsdGlwbGllcl9icHMAAAAAAAQAAAABAAAD6QAAAAIAAAAD',
        'AAAAAAAAAF5TZXQgbWF4aW11bSBhbW91bnQgYWxsb3dlZCBwZXIgc2luZ2xlIGNyZWRpdCBjYWxsIChhZG1pbiBvbmx5KS4KU2V0IHRvIDAgdG8gZGlzYWJsZSB0aGUgbGltaXQuAAAAAAAXc2V0X21heF9jcmVkaXRfcGVyX2NhbGwAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAptYXhfYW1vdW50AAAAAAAGAAAAAQAAA+kAAAACAAAAAw==',
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<string>,
    claim: this.txFromJSON<Result<u64>>,
    credit: this.txFromJSON<Result<u64>>,
    redeem: this.txFromJSON<Result<i128>>,
    balance: this.txFromJSON<u64>,
    migrate: this.txFromJSON<Result<u32>>,
    upgrade: this.txFromJSON<Result<void>>,
    metadata: this.txFromJSON<readonly [string, string]>,
    snapshot: this.txFromJSON<Result<void>>,
    is_paused: this.txFromJSON<boolean>,
    set_tiers: this.txFromJSON<Result<void>>,
    initialize: this.txFromJSON<Result<void>>,
    sep41_burn: this.txFromJSON<Result<void>>,
    sep41_name: this.txFromJSON<string>,
    set_paused: this.txFromJSON<Result<void>>,
    clear_tiers: this.txFromJSON<Result<void>>,
    accept_admin: this.txFromJSON<Result<void>>,
    add_co_admin: this.txFromJSON<Result<void>>,
    batch_credit: this.txFromJSON<Result<void>>,
    claim_vested: this.txFromJSON<Result<u64>>,
    fund_reserve: this.txFromJSON<Result<void>>,
    get_snapshot: this.txFromJSON<Option<u64>>,
    sep41_symbol: this.txFromJSON<string>,
    total_supply: this.txFromJSON<u64>,
    total_vested: this.txFromJSON<u64>,
    credit_vested: this.txFromJSON<Result<u64>>,
    init_multisig: this.txFromJSON<Result<void>>,
    is_token_mode: this.txFromJSON<boolean>,
    pending_admin: this.txFromJSON<Option<string>>,
    propose_admin: this.txFromJSON<Result<void>>,
    sep41_approve: this.txFromJSON<Result<void>>,
    sep41_balance: this.txFromJSON<i128>,
    storage_stats: this.txFromJSON<readonly [u64, u64, u64]>,
    total_claimed: this.txFromJSON<u64>,
    admin_transfer: this.txFromJSON<Result<void>>,
    credit_by_rank: this.txFromJSON<Result<u64>>,
    list_snapshots: this.txFromJSON<Array<readonly [u64, u64]>>,
    schema_version: this.txFromJSON<u32>,
    sep41_decimals: this.txFromJSON<u32>,
    sep41_transfer: this.txFromJSON<Result<void>>,
    vested_balance: this.txFromJSON<u64>,
    cancel_clawback: this.txFromJSON<Result<void>>,
    is_paused_claim: this.txFromJSON<boolean>,
    multisig_config: this.txFromJSON<Option<MultiSigConfig>>,
    redemption_rate: this.txFromJSON<Option<readonly [string, u32]>>,
    referral_config: this.txFromJSON<readonly [u32, u64]>,
    remove_co_admin: this.txFromJSON<Result<void>>,
    sep41_allowance: this.txFromJSON<i128>,
    sep41_burn_from: this.txFromJSON<Result<void>>,
    execute_clawback: this.txFromJSON<Result<void>>,
    is_paused_credit: this.txFromJSON<boolean>,
    is_paused_redeem: this.txFromJSON<boolean>,
    propose_clawback: this.txFromJSON<Result<u32>>,
    set_paused_claim: this.txFromJSON<Result<void>>,
    withdraw_reserve: this.txFromJSON<Result<void>>,
    credit_call_count: this.txFromJSON<u32>,
    enable_token_mode: this.txFromJSON<Result<void>>,
    get_tier_for_rank: this.txFromJSON<u64>,
    prune_used_nonces: this.txFromJSON<u32>,
    set_paused_credit: this.txFromJSON<Result<void>>,
    set_paused_redeem: this.txFromJSON<Result<void>>,
    vote_param_change: this.txFromJSON<Result<u32>>,
    get_param_proposal: this.txFromJSON<Option<ParamProposal>>,
    multisig_threshold: this.txFromJSON<u32>,
    pay_referral_bonus: this.txFromJSON<Result<u64>>,
    redemption_reserve: this.txFromJSON<u64>,
    campaign_multiplier: this.txFromJSON<u32>,
    cancel_param_change: this.txFromJSON<Result<void>>,
    credit_for_campaign: this.txFromJSON<Result<u64>>,
    max_credit_per_call: this.txFromJSON<u64>,
    sep41_transfer_from: this.txFromJSON<Result<void>>,
    set_redemption_rate: this.txFromJSON<Result<void>>,
    set_referral_config: this.txFromJSON<Result<void>>,
    execute_param_change: this.txFromJSON<Result<readonly [string, u64]>>,
    propose_param_change: this.txFromJSON<Result<u64>>,
    referral_bonus_total: this.txFromJSON<u64>,
    rewarded_referrer_of: this.txFromJSON<Option<string>>,
    approve_privileged_op: this.txFromJSON<Result<u32>>,
    cancel_admin_transfer: this.txFromJSON<Result<void>>,
    execute_privileged_op: this.txFromJSON<Result<u32>>,
    get_credit_rate_limit: this.txFromJSON<readonly [u32, u32]>,
    propose_privileged_op: this.txFromJSON<Result<u64>>,
    referral_reward_count: this.txFromJSON<u64>,
    set_credit_rate_limit: this.txFromJSON<Result<void>>,
    payout_reserve_balance: this.txFromJSON<i128>,
    set_multisig_threshold: this.txFromJSON<Result<void>>,
    set_campaign_multiplier: this.txFromJSON<Result<void>>,
    set_max_credit_per_call: this.txFromJSON<Result<void>>,
  };
}
