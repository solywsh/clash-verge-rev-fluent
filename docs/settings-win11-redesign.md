# Settings page — Windows 11 redesign

Status: **Hybrid (Option 3-leaning) — IA skeleton landed** on branch
`settings-win11-redesign`. This doc records all candidate approaches so the
decision and the alternatives stay recoverable.

> Update 2026-06-16: after building the icon+description card pass (Option 1's
> visual layer), the single long scroll was judged the weak point — it does not
> solve "hard to find". Pivoted to the user's original drill-in instinct: the
> Settings page is now a **landing grid of 4 category cards** (System / Clash /
> Appearance / Maintenance) → click into a **detail sub-view** with a Fluent
> **breadcrumb** back to Settings. Implemented via local `useState` in
> `settings.tsx` (no router sub-routes), so it is fully self-contained and easy
> to roll back. `FluentSettingList` title is now optional and each section takes
> `hideTitle` so the breadcrumb is the only heading. Heavy modal dialogs
> (Theme / Misc / Web UI / Clash Core / Update / Backup) are **left as modals**
> for now; promoting the genuinely heavy ones to breadcrumb sub-pages is the
> next optional step.

## Goal

Make the Settings page feel like the **Windows 11 Settings app**: cards with a
leading icon + title + description, consistent grouping, and detail settings
that open in place rather than via ad-hoc modal dialogs. Keep it easy to roll
back so the effect can be reviewed before committing to it.

## How Windows 11 Settings actually works (reference)

- The **left rail is the categories** (System, Bluetooth & devices, …). This
  app already has that rail (主页 / 代理 / … / 设置), so 设置 ≈ one Win11
  category.
- Inside a category, Win11 shows a **single scrolling page of `SettingsCard`s**:
  each card = `[icon] [title + description] ........ [right control]`.
- Settings with detail use an **inline `SettingsExpander`** (the card grows
  downward to reveal sub-cards), _not_ a modal dialog.
- True drill-in **sub-pages with a breadcrumb + back** exist but are used
  sparingly — only for deep/rare areas.
- Visual: ~8px radius, subtle border, hover highlight, ~4px gap between cards,
  bold group headers between stacks.

## Current state (gap analysis)

The fork already has `FluentSettingItem` (≈ SettingsCard, built on a custom
`Expander`) and `FluentSettingList` (section with a title). Gaps vs Win11:

1. Cards have **no leading icon** and **no description** (single line only).
2. Detail settings are an **inconsistent mix**: some are inline expanders
   (DNS, Tunnels, Port, LiteMode), most are **modal dialogs** opened via a ref
   (System Proxy, Theme, Layout, Misc, Controller, Web UI, Network Interface,
   Backup, Update, Clash Core, Hotkey).
3. No breadcrumb for the deep editors (profile Proxies/Rules/Groups).
4. Spacing/hover/radius are close but not tuned to Win11.

The component layer is ~80% of a Win11 SettingsCard already, so the visual half
is cheap; the work is mostly icons/descriptions + converting dialogs to
expanders.

## Candidate approaches

### Option 1 — Single page, Win11 cards + inline expanders ✅ SELECTED

Keep one scrolling Settings page. Restyle every row as a Win11 SettingsCard
(leading icon + title + description + right control), add group headers, and
convert the remaining modal dialogs into **inline expander cards** so detail
opens in place. No breadcrumb needed.

```
系统设置
┌──────────────────────────────────┐
│ 🛡  服务模式             未安装 [安装]│
│     安装后才能使用 TUN 模式         │
├──────────────────────────────────┤
│ 🌐  TUN 模式                   ◯  ⌄│
│     虚拟网卡接管全部流量             │
├──────────────────────────────────┤
│ 🧭  系统代理                   ◯  ⌄│
│   ┌ 展开后内联显示详细设置 ───────┐ │
│   │ PAC 模式 / 守卫 / 绕过 …      │ │
│   └──────────────────────────────┘ │
└──────────────────────────────────┘
```

- **Pros**: most authentic Win11 _category page_ look; least disruptive (reuses
  `canExpand`/`content`); no navigation complexity; biggest visual win per unit
  effort.
- **Cons**: no breadcrumb / drill-in (Win11 itself rarely uses these inside a
  category, so acceptable).
- **Effort**: medium. Component upgrade (icon + description slots) + per-item
  icons/descriptions + convert ~11 dialog viewers to expander content + polish.

### Option 2 — Category cards → sub-pages + breadcrumb

Settings landing shows the 4 categories as big cards; clicking one navigates to
a sub-page listing that category's settings, with a breadcrumb (设置 › 系统设置)
and a back button.

```
设置
┌─────────────────┐  ┌─────────────────┐
│ 🖥 系统设置    > │  │ ⚙ Clash 设置   > │
└─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│ 🎨 外观与行为  > │  │ 🧰 维护        > │
└─────────────────┘  └─────────────────┘

  点击 系统设置 ↓
设置 › 系统设置                    [← 返回]
┌──────────────────────────────────────┐
│ 服务模式                   未安装 [安装] │
│ TUN 模式                            ◯  │
│ 系统代理                         >   ◯  │
└──────────────────────────────────────┘
```

- **Pros**: literally matches "click in for detail + breadcrumb".
- **Cons**: adds a navigation level + an extra click to reach common toggles;
  more work (in-Settings routing + breadcrumb component); diverges from how
  Win11 treats a single category.
- **Effort**: high.

### Option 3 — Hybrid: inline page + breadcrumb only for deep editors

Single page with Win11 cards + inline expanders for the light settings
(Option 1), but the heavy editors that benefit from a full screen — profile
Proxies/Rules/Groups (and maybe DNS) — become **drill-in sub-pages** with a
breadcrumb/back instead of 90vw modals.

```
外观与行为
┌──────────────────────────────────┐
│ 🎨 主题设置                     ⌄ │  ← inline expand
│ 🗗 主题模式                  系统 ▾│
│ ⚙ 杂项设置                      ⌄ │
└──────────────────────────────────┘

编辑代理组 (heavy) → full sub-page:
配置 › imported-sub › 编辑代理组       [← ]
┌───────────────┬──────────────────────┐
│ 表单           │  分组列表 (搜索)      │
│ 类型/名称/…    │  • 🇭🇰 香港 …         │
└───────────────┴──────────────────────┘
```

- **Pros**: few clicks for common settings; clean navigation + breadcrumbs only
  where editing is genuinely complex.
- **Cons**: two interaction paradigms to maintain; the heavy editors are
  currently 90vw modals that already work — converting them to routes is extra
  scope.
- **Effort**: high (Option 1 + routing/breadcrumb for the editors).

## Decision

**Option 1** first — it delivers the Windows 11 look with the least risk and is
trivially revertible. If, after reviewing, drill-in/breadcrumbs are still
wanted, layer Option 3's editor sub-pages on top (Option 1 is a strict subset of
the hybrid, so no rework).

## Implementation plan (Option 1)

Done on branch `settings-win11-redesign` (so it's easy to diff / drop):

1. **Component**: extend `FluentSettingItem` / `Expander` (`setting-comp.tsx`,
   `fluent/expander.tsx`) with `icon` (leading) + `description` (secondary line)
   slots, tuned to Win11 spacing/radius/hover.
2. **System** (`setting-system.tsx`): icons + descriptions; convert System Proxy
   dialog → inline expander.
3. **Clash** (`setting-clash.tsx`): icons + descriptions; the already-inline
   expanders (DNS/Tunnels/Port/CORS) get icons; Web UI / Controller / Clash Core
   → inline expanders.
4. **Appearance** (`setting-appearance.tsx`): icons + descriptions; Theme /
   Layout / Misc / Hotkey dialogs → inline expanders.
5. **Maintenance** (`setting-maintenance.tsx`): icons + descriptions; Backup /
   Update / Network Interface → inline expanders (Backup may stay a dialog if
   the table doesn't fit an expander well — flagged during impl).
6. **Polish**: group header style, card gap/padding/hover, dark-mode tokens.

Each step is its own commit. Modal viewers are converted, not deleted, so any
can revert individually.

## Rollback

- Everything lives on `settings-win11-redesign`; `main` is untouched.
- To preview: run dev on the branch. To abandon: stay on `main` / delete the
  branch. To keep: merge (or fast-forward) into `main`.
