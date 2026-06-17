## Roostr
# Next-Gen Spec — Telegram Mini App + TON NFT (trait-composition collectibles)

> Successor to **Penguin Parade** (see [PENGUIN-PARADE-SPEC.md](./PENGUIN-PARADE-SPEC.md)).
> Keeps the original's economy/loop principle, but **replaces the generation model**: instead of a
> raw AI image per item (which looked "too neural" and unpredictable), creatures are **composed
> from a curated library of trait layers** — exactly like **Telegram's collectible gifts**
> (Model + Backdrop + Symbol), animated, on TON.
>
> **Everything in this spec revolves around §1.**

---

## 0. What changes vs. the original

| Area | Original | Next-gen |
|------|----------|----------|
| **Look / generation** | one raw AI image per creature (SDXL), unpredictable | **curated trait layers composed deterministically** (Model × Backdrop × Symbol), Telegram-gift style |
| Output | static JPG/WebP | **animated** (Lottie/TGS) layered render |
| Rarity | single weighted roll at gen | **per-trait rarity + combinatorial scarcity** |
| Platform | Web (Vercel) | **Telegram Mini App** |
| Auth | email/password | **Telegram account** (`initData`) |
| Market / expeditions | yes | yes |
| Evolution | free | **paid** (coin sink) |
| Coins | expeditions only | expeditions **+ buy with Telegram Stars** |
| Ownership | DB row | DB row **+ real TON NFT (mint to user wallet, GetGems)** |

**Core insight:** the original was "too neural" because every item was a fresh raw model output.
Telegram's own collectibles are NOT that — they're a **fixed set of premium parts combined by
rarity**. We adopt that: AI *produces the parts once*; each item is a *composition*, not a roll of
the dice. Predictable, on-brand, premium, animated, and scarce by combination.

---

## 1. Creatures = composed collectibles (THE core idea)

Mirror Telegram collectible gifts. Every creature = three rarity-weighted layers:

- **Model** — the main artwork (the creature itself). Animated (Lottie/TGS). The "star".
- **Backdrop** — a colored/gradient background (a named palette).
- **Symbol** — a repeating emoji/icon **pattern** overlaid on the backdrop.

Optionally a 4th: **Frame/effect** (glow, particles) for top tiers.

Each layer is drawn from a **curated, bounded library** where every entry has its own **rarity
weight**. A creature is a **deterministic composition** of one entry per layer:

```
creature = { modelId, backdropId, symbolId, [frameId], seed }
render    = compose(model.lottie, backdrop.gradient, symbol.pattern, frame?)
```

### Why this fixes "too neural / unpredictable"
- Parts are **art-directed and human-curated** — no garbage frames ship.
- Per-mint output is **composition, not raw inference** — same parts always look the same.
- **Scarcity is combinatorial** (rare model + rare backdrop + rare symbol = a chase item), like TG
  gifts — far richer than one rarity number.
- It **looks native** inside Telegram (same visual language as gifts) → instant premium feel.

### Animation
- **Model** layer = **Lottie / TGS** (Telegram's animated-sticker format): vector, tiny, smooth,
  renders natively in the Mini App webview and exports cleanly for the NFT.
- **Backdrop** = CSS/canvas gradient; **Symbol** = tiled SVG/emoji pattern. Composition happens at
  render time on the client — no per-item raster baking for display.
- For the NFT, bake a static **preview image** + an **animated media** file (Lottie or MP4/GIF) (§8).

---

## 2. Producing the trait library (where AI now lives)

AI is no longer called per-mint. It's used **offline, by you, to manufacture the parts library**,
then humans curate. Per-mint is pure composition.

**Pipeline (asset production, run by the team / admin tooling):**
1. Generate **model artwork** (creature poses/themes) with current best image models.
2. Clean / cut out to **transparent** subject (background removal), enforce a consistent silhouette
   (the original's ControlNet-template idea still applies — keep one recognizable shape).
3. **Animate** the model → Lottie/TGS (idle bob, shimmer, etc.). (AI-assist or motion templates.)
4. Author **backdrops** (gradient palettes) and **symbols** (emoji/icon patterns) as data.
5. Tag each entry with **rarity weight**, name, tier; **version** the library.

**Tooling (as of ~Jan 2026 — fast-moving, verify before committing):**
- **Models:** FLUX.1 (dev/pro, 1.1 Pro) — much better control/quality than SDXL; Redux/ControlNet
  for consistent character. **Recraft V3** — strong for style-consistent / branded / vector-ish
  sets (great fit for a curated library). Ideogram if you need in-art text.
- **Hosting/inference:** **fal.ai** (often faster/cheaper for production) or **Replicate** (still
  fine; hosts FLUX). Pick by latency/price at build time.
- **Background removal / cutout:** dedicated matting model in the pipeline.
- **Animation:** Lottie authoring (After Effects + Bodymovin, or Lottie tooling); keep files tiny.

> Net: AI = a **content factory for the library**, not a live per-request renderer. This is the
> single biggest quality/predictability win.

---

## 3. Rarity & scarcity

- **Per-trait rarity:** each Model / Backdrop / Symbol entry has a weight (permille, like TG gifts).
- **Composition rarity:** an item's overall rarity = derived from its parts (e.g. rarest layer, or
  a score). Surface a human label (Common…Mythic) + the per-trait %s on the item card.
- **Caps:** optionally cap supply per Model (or per combo) for true chase scarcity (TG gifts cap
  editions). Keep a global cap if you want hard scarcity like the original's 1024.
- **Daily craft** rolls a composition against the weights (server-authoritative RNG + seed stored).

---

## 4. Platform: Telegram Mini App

- Next.js app rendered inside Telegram. Use `@telegram-apps/sdk-react` for viewport, theme, safe
  areas, haptics, Main/Back buttons.
- Render creatures with a **Lottie player** (e.g. `lottie-react` / `tgs` player) layered over the
  backdrop + symbol. Respect Telegram theme params.

---

## 5. Auth & registration (Telegram account)

No passwords. Identity = Telegram user.
1. Mini App exposes signed **`initData`**.
2. Backend validates: classic `secret = HMAC_SHA256(bot_token,"WebAppData")` →
   `HMAC_SHA256(secret, data_check_string) == hash`, and `auth_date` freshness. (Newer **Ed25519
   `signature`** can be verified without the bot token — use if you split services.)
3. First valid id → create user keyed by **`telegramId`**; issue a short-lived **session JWT**.
4. `languageCode` → i18n (en/ru). No email, no verification gate.

---

## 6. Core loop

1. **Craft** daily (cooldown) → server rolls a **composition** (Model/Backdrop/Symbol by weights),
   stores trait ids + seed. *No live model call.* Instant, predictable, animated.
2. **Collect / Market / Expeditions** — as original.
3. **Evolution — PAID:** fuse 6 same-tier creatures → 1 higher-tier (rolls a higher-tier
   composition). Costs **coins** (sink).
4. **Mint** — spend coins → real TON NFT (§8).

---

## 7. Economy & monetization

### Currencies
- **Coins** — soft in-game. **Stars** — Telegram real-money (buys coins). **TON** — chain layer
  (gas), abstracted from players.

### Sources → Sinks
| | Source | Sink |
|--|--------|------|
| Coins | expeditions, **Stars purchase**, market sales | **evolution (paid)**, **minting**, market buys, pay-to-skip |
| Stars | real money | → coins |
| Creatures | crafting | evolution (6→1), minting |

### Real money = **Telegram Stars** (required for digital goods)
Backend `createInvoiceLink` (currency `XTR`) for coin packs → handle `pre_checkout_query` →
on `successful_payment` credit coins **idempotently** on `telegram_payment_charge_id`. Support
`refundStarPayment`. Keep a **purchases ledger**. Price coins to cover mint gas (app-sponsored) +
margin.

---

## 8. Headline feature: mint composed creature → TON NFT (GetGems)

**Decisions:** NFT goes to the **user's own wallet** (TON Connect) · **app sponsors gas** ·
indexed on **GetGems**. Because the app owns the TEP-62 **collection**, the collection-owner wallet
mints the item with `owner = user address` and pays gas; **TON Connect** just provides/verifies the
user's address (no user signing, no user gas).

### What gets minted
The **composed collectible**, baked to portable media + trait metadata:
- **Media:** render the live composition (Model+Backdrop+Symbol) to (a) a static **preview image**
  and (b) an **animated** file (Lottie → MP4/GIF, or keep Lottie if your indexer supports it).
- **Metadata (TEP-64, off-chain JSON):** name, description, `image` (preview), animated media URL,
  and **`attributes`** = the traits (Model, Backdrop, Symbol, rarity %s) — so the on-chain item
  carries the same trait breakdown as a TG gift. Host JSON + media at an **immutable** URI
  (IPFS/content-addressed).

### Per-mint flow
1. Tap **Mint** → if no wallet, **TON Connect** → store verified `tonAddress`.
2. Check: owned, **not already minted** (per-creature idempotency lock), enough coins.
3. **Bake media + build metadata** → host immutably → store `metadataUri`.
4. **Deduct coins** → enqueue mint job.
5. **Mint worker** (collection-owner wallet) sends mint msg: item `owner = tonAddress`,
   content = `metadataUri`; **app pays gas**.
6. **Confirm on-chain** → write back `nft = { itemAddress, mintTx, metadataUri, mintedAt }`,
   flip `minted`.
7. Shows in the user's wallet + on **GetGems** (auto-indexed).

### Correctness
- **Idempotent** mint (lock + `mintRequestId`); refund coins on failure.
- **Immutable** metadata/media once minted.
- **Secure** the collection-owner hot wallet (server-only signing, min balance, auto-top-up, rate
  cap). Never a key on the client.
- Consider **locking** a minted creature from in-game sell/evolve (it now lives on-chain).

---

## 9. Data model

```
users/{telegramId}
  telegramId, username, firstName, languageCode
  coins, tonAddress?
  allowCraftAt, craftInProgress, statistics{...}
  /crystals, /expeditions, /notifications

creatures/{id}                 # composition, not a raw image
  modelId, backdropId, symbolId, frameId?, seed
  rarity { label, score, traitRarities{model,backdrop,symbol} }
  ownerId, creatorId, origin(craft|evolution|event|crystal)
  inExpedition, expedition, auction, price, gift
  minted: boolean
  nft? { itemAddress, mintTx, metadataUri, mintedAt, ownerAddress }
  mintRequestId?
  createdAt

trait_library/{layer}/{traitId}    # curated, versioned
  layer(model|backdrop|symbol|frame), name, tier, rarityWeight
  asset { lottieUrl | gradient | patternUrl }, version, enabled

purchases/{id}   # Stars ledger: telegramId, chargeId, stars, coins, status
mints/{id}       # audit: telegramId, creatureId, status, coinsCharged, gasTon, tx, error?
```

> A creature stores **trait ids**, not pixels — the visual is composed at render. Cheap, tiny,
> consistent, and the NFT media is baked only at mint time.

---

## 10. Backend architecture

- **TMA gateway:** validate `initData` → session JWT.
- **Craft service:** server-authoritative composition roll (weights from `trait_library`), store
  ids+seed. No external model call → instant.
- **Library/admin service:** manage + version trait sets, rarity weights, enable/disable.
- **Payments:** Stars invoices + webhook → idempotent coin credit + ledger.
- **Mint service:** queue + collection-owner wallet; bake media, build/host metadata, sign+send
  mint, confirm, write back, retry/refund.
- **Chain watcher:** confirm mint txs via a TON API/indexer; reconcile `mints`.

---

## 11. Tech stack

- **Client:** Next.js (App Router) in Telegram · `@telegram-apps/sdk-react` · **Lottie player** ·
  `@tonconnect/ui-react` · TypeScript · i18n (en/ru).
- **Asset production (offline):** FLUX.1 / Recraft V3 via **fal.ai** or Replicate · background
  matting · Lottie/TGS authoring. *(Verify current best models at build time.)*
- **Data:** **Postgres** (ledgers/idempotency/transactions) — preferred over Firestore here.
- **Media:** object storage (R2/S3) for Lottie/preview; **IPFS** (content-addressed) for NFT
  metadata + minted media.
- **Chain:** TON (`@ton/ton`, `@ton/core`) for collection + mint · TON Connect for wallet link ·
  GetGems for marketplace · TON API/indexer for confirmations.
- **Payments:** Telegram Stars (`XTR`).
- **Hosting:** Vercel (app) + a persistent worker host (queues + mint signer).

---

## 12. Compliance & risk

- **Stars** mandatory for selling coins (digital goods) in-app.
- **Non-custodial NFTs** (mint to user) — you only custody the **collection hot wallet**
  (operational); secure it hard, server-only signing.
- **Idempotency** on every money/chain touch (Stars credit, coin deduct, mint).
- **Immutable** NFT media/metadata; **refund** coins on failed mint, `refundStarPayment` on disputes.
- **Gas** is app COGS — cap throughput, monitor/auto-top-up, price into coins.
- **Legal:** paid randomized crafting + tradeable on-chain assets may trigger gambling/consumer
  rules — review before scaling.

---

## 13. Build phases

1. **Trait system first** — library schema, a starter set (few models/backdrops/symbols),
   composition renderer (Lottie + backdrop + symbol) in the Mini App. *This is the foundation.*
2. **TMA shell + Telegram auth** — boot, validate `initData`, user + session.
3. **Game loop** — daily craft (composition roll), library, market, expeditions, **paid** evolution.
4. **Stars economy** — coin packs, invoices, webhook credit, ledger.
5. **TON foundation** — deploy collection, hot wallet, TON Connect linking.
6. **Minting** — bake media + immutable metadata + mint worker + confirmation + GetGems, fully
   idempotent with refunds.
7. **Polish** — caps/chase items, NFT showcase, GetGems deep links, minted-creature locks.

---

*Spine of the project: **creatures are composed from a curated, animated trait library
(Telegram-gift style)** — predictable, premium, combinatorially scarce. AI builds the library;
players compose, collect, and mint to TON. Everything else (auth, economy, expeditions, minting)
hangs off that.*

---

## Appendix A — Optional / future directions (NON-BINDING)

> Everything below is **exploratory and not finalized**. It captures product ideas for where Roostr
> could go. Nothing here overrides §0–§13. Items become real only when promoted into a numbered
> section. Treat as a backlog of options, not commitments.

### A.0 Theme & framing

- **Theme:** collect funny **pixel-art chickens & roosters** ("Roostr"). Tone: playful collectible,
  not finance.
- **Reference fantasy:** Pokémon × Telegram Gifts × collectible cards. Goal = collect rare
  specimens, optionally trade.
- **Open tension to resolve:** this framing says *"not an NFT game — NFT optional, most players
  never touch chain."* The core spec (§0, §8) is NFT/TON-centric. **Decision pending:** is on-chain
  mint the headline (§8) or an opt-in export for exceptional creatures only (A.6)? Pick one before
  building economy depth.

### A.1 Alternative core loop — eggs (vs. §6 craft)

Egg-driven loop as a candidate replacement/extension of §6's daily craft:

```
Complete tasks → earn eggs → incubate (cooldown) → hatch a composed creature
  → collect / evolve / trade → show off rares → (optional) export to Gift/NFT
```

Eggs = the primary dopamine beat. Maps onto the existing server-authoritative composition roll
(§3, §6): hatching = the roll; egg **tier** biases the trait weights.

**Egg tiers:** Hay · Barn · Golden · Radioactive · Ancient · Royal · Cosmic.
**Seasonal (limited):** Halloween · Christmas · Easter.

### A.2 Expanded trait layers (extends §1)

§1's Model/Backdrop/Symbol could expand to a richer pixel-art layer stack:

`Species · Body color · Eyes · Hat · Accessory · Background · Aura · Mutation · Frame`

Example: `Rooster + black feathers + laser eyes + cowboy hat + cigar + sunset background +
rainbow aura`. Each layer keeps its own rarity weight (§3); composition stays deterministic (§1).

**Species:** Chicken · Rooster · Silkie · Polish · Phoenix · Robot · Zombie.

### A.3 Mutation layer (very rare)

A stackable rarity multiplier on top of any creature:

`Golden · Albino · Neon · Skeleton · Corrupted · Holographic · Glitched · Void`

Drop chance ≈ **1/500–1/1000**. Stacks with any species/combo.

### A.4 Shiny system (Pokémon-style)

A common base can roll into a chase piece via stacked rare layers
(e.g. `Golden + Cowboy Hat + Laser Eyes`). High-value collector bait. Folds into §3 combinatorial
scarcity.

### A.5 Evolution variants (refines §6.3)

`6 same-tier creatures + coins` → evolve to next tier (rolls a higher-tier composition).
Fusion count **fixed at 6** (reconciled with §6.3, §7).

Open option: an alternative `3 identical creatures + coins` "fast path" for exact-duplicate fusion —
not decided.

### A.6 Seasonal content & scarcity

Seasons (S1, S2, Halloween, Christmas…). **Retired traits never drop again** → scarcity + FOMO.
Versioned trait library (§9 `trait_library.version`, `enabled`) already supports retirement.

### A.7 Gift / NFT as opt-in export

Creature lives **in-game** by default. **Exceptional** creatures can export:
`creature → Telegram Gift → TON NFT`. NFT optional; most players never touch chain. (If adopted,
this reframes §8 from "headline mint" to "opt-in export path.")

### A.8 Future backlog (unsorted)

Collection albums · achievements · sets · daily quests · expeditions · leaderboards · friends ·
trading · auctions · guilds · breeding · limited events · raid bosses · community goals · pet shows ·
monthly seasons · rare world drops · secret combinations · hidden mutations.
