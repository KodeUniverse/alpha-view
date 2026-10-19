# Frontend

React 19 SPA. Owns presentation, server-state caching, the WebSocket subscription
lifecycle, and all styling.

Runs in Docker via `make start` (see the root `AGENTS.md`) on Vite's dev server.
Check with `npm run typecheck` from this directory.

## Layout

```
src/
  main.tsx              MantineProvider, theme, CSS variable resolver
  App.tsx               router + QueryClientProvider
  api/client.ts         all HTTP calls, response parsing, live socket singleton
  components/           Navbar/, SearchBar/, StockChart.tsx
  routes/               FinanceDashboard/ and its panels
  hooks/                queries.ts (TanStack wrappers), useLiveTickerFeed.ts
  types/                zod schemas + derived types  <- the API contract
  utils/                dates.ts, indicators.ts, quant.ts
  assets/               logo, favicon, gifs
```

## The zod rule

**`src/types/*.ts` is the single source of truth for every shape that crosses the
network.** A schema is declared, and the type is derived from it:

```ts
export const TickerSchema = z.object({ symbol: z.string(), name: z.string() });
export type Ticker = z.infer<typeof TickerSchema>;
```

Consequences, all of which are load-bearing:

- **Never hand-write a type that duplicates a schema.** If it needs `.parse()`, it
  needs a schema.
- **`api/client.ts` composes and `.parse()`s every response.** `OHLCVBySymbolSchema`,
  for instance, is `z.record(z.string(), OHLCVArraySchema)`. A new endpoint means a
  new schema in `src/types/` plus a `.parse()` in the client, not a cast.
- **`src/types/index.ts` is a barrel.** When you add a schema to `stock.ts`,
  `news.ts`, or `provider.ts`, re-export both the schema and its type from the
  barrel. Consumers import from `@/types`.
- **Watchlist schemas transform.** The backend emits PascalCase
  (`listId`, `sortId`, `ticker`, `name`); those schemas validate PascalCase and
  `.transform()` to camelCase. Keep the casing conversion where it is. If you change
  a backend field name, update the schema here in the same commit.
- **The WebSocket envelope is a `z.discriminatedUnion("type", [...])`** including an
  `error` variant. Add new message kinds there, not via `any`.

`getFinancials` is the one unvalidated response and carries a TODO in the code. Treat
its return shape as unchecked; do not propagate that pattern.

## Paths

`@/` is the only import alias, and every cross-directory import uses it. `@/foo/bar`
maps to `src/foo/bar`, so `@/types`, `@/api/client`, `@/components/StockChart`,
`@/routes/FinanceDashboard/FinanceDashboard`, `@/utils/quant`.

Both sides agree on this single alias: `tsconfig.json` `paths` and `vite.config.ts`
`resolve.alias` declare `@/*` and nothing else. Do not add a second alias. The
earlier `@components/*`, `@routes/*`, `@services/*`, `@assets/*`, and `@utils/*`
declarations were removed because only `@` was ever wired into Vite, so they
typechecked and then failed at runtime. A relative import (`../../utils/quant`) is
acceptable for a sibling file within the same directory tree, but reach for `@/`
whenever crossing directories.

File extensions on imports are inconsistent: `.tsx` files are sometimes imported as
`.js` or `.jsx`. It works, and normalizing it is out of scope unless asked.

## Components

```tsx
function SearchBar() {
  return <div />;
}
export default SearchBar;
```

- Named function declarations, `export default`. No arrow components.
- Props as a colocated `interface FooProps`, referenced by type only.
- Small, single-use subcomponents (`NewsItem`, `ThemeToggle`) live at the bottom of
  the file that uses them. Promote to `components/` only when reused.
- File-per-component folder (`components/Navbar/Navbar.tsx`) is the newer pattern;
  flat files are still common. Match the surrounding directory rather than
  reorganizing.
- Layout uses Mantine primitives (`Stack`, `Group`, `Card`, `Modal`) with `style` /
  `styles` props. `App.css` only sets `html, body, #root` sizing.

## State

- **Server state is TanStack Query, always.** Query and mutation hooks are wrapped in
  `hooks/queries.ts` (`use*`), not written inline in components. `QueryClient` is
  created in `App.tsx` under `QueryClientProvider`.
- **UI state is `useState`.** No Redux, Zustand, or Context stores.
- **Live bars are a module-level singleton.** `api/client.ts` owns a
  `LiveTickerFeed` instance so every consumer shares one socket and one upstream
  subscription set. Do not create a socket per component or per hook instance.

## Live feed lifecycle

`useLiveTickerFeed(tickers)` returns `Record<symbol, LiveTickerFeedMessage>` holding
the latest `minuteBar` and `dailyBar` per symbol.

The subscription must stay keyed on the **symbol list**, not object identity:

```ts
useEffect(() => {
  if (tickers.length === 0) return;
  api.subscribeTickers(tickers, onTick);
  return () => api.unsubscribeTickers(tickers, onTick);
}, [onTick, JSON.stringify(tickers.map((t) => t.symbol))]);
```

`JSON.stringify` of the symbols is the dependency on purpose. `tickers` is a fresh
array on most renders, so depending on it directly resubscribes every render, and
the cleanup would unsubscribe using a *different* array than the one that subscribed.
Keep this shape, and keep the unsubscribe in the cleanup.

Incoming payloads are discriminated by `data.frequency` (`"intraday"` vs `"daily"`)
and merged into the per-symbol record without clobbering the other frequency.

## Styling

Mantine v9, dark by default with a Navbar toggle.

- **Colors are CSS custom properties in `src/index.css`**: `--color-background-primary`
  / `-secondary` / `-tertiary`, `--color-text-primary` / `-secondary`,
  `--color-border`, `--color-highlighted`, `--color-hover-overlay`, `--color-chart-grid`,
  `--color-chart-up` / `-down` / `-up-fill` / `-down-fill`,
  `--color-indicator-sma` / `-ema` / `-bollinger-mid` / `-bollinger-band`,
  `--font-*`. A light-scheme override lives under `[data-mantine-color-scheme="light"]`.
- **Add new tokens there.** Every color a change needs must resolve to one of these
  properties -- not hex, not `rgb()`/`rgba()`, not an 8-digit hex carrying an alpha byte.
  Anywhere: JSX, `style` props, `utils/`, and values handed to a canvas.
  `src/utils/colors.ts` holds `getComputedColor(token)` plus the `CHART_COLOR_TOKENS` /
  `INDICATOR_COLOR_TOKENS` name maps; lightweight-charts reads tokens through it, the same
  way it already reads `--color-chart-grid`. When no token fits, **add one** under both
  color schemes before using it. The two exceptions in `main.tsx` (`#333333` border, the
  `rgba(0,0,0,0.6)` overlay) are deliberate and commented; they are not a license to add
  more.
- **In a `style` prop, prefer the token reference over the resolved value.**
  `` `var(${CHART_COLOR_TOKENS.up})` `` resolves in the browser and follows a theme toggle
  for free; `getComputedColor()` reads the value once, at the moment it is called.
- **A token that a function post-processes must keep a compatible format.** The SMA/EMA
  tokens are 6-digit hex because `moverColor()` appends an alpha byte to build the period
  fade. An `oklch()` value there yields a malformed color rather than an error.
- Global component overrides go through `createTheme` in `src/main.tsx` — `Card`,
  `TextInput`, and `Modal` are configured there. `Modal` needs its own rules because
  it portals out of the `Card` context. The `cssVariablesResolver` maps Mantine vars
  onto the custom properties for both color schemes.
- Chart styling uses the `--color-chart-grid` and text tokens so charts follow the
  active theme.

## Verification

`npm run typecheck` (`tsc --noEmit`) is the only static gate. There is no test runner
and no `lint` script, even though `eslint.config.js` exists — run `npx eslint src` if
you need lint output.

`tsconfig.json` has `strict: false`, but `strictNullChecks` is turned on explicitly, so
`tsc` **does** catch nullability mistakes — a nullable field dereferenced, a value that may
be assigned on one path but not another. It still will not catch unused symbols:
`noUnusedLocals` and `noUnusedParameters` are both off.

The nullability flag is deliberate. A `?.` chain that guards a nullable *parent* but not a
nullable *child* (`liveMessage?.minuteBar.time`) reads as safe and is not; it shipped as a
runtime crash in the watchlist panel. `strictNullChecks` is what catches that class, so keep
it on and fix what it reports rather than switching it off to get a green build.

## Assets

`dist/` and `node_modules/` are build output. In Docker, only `frontend/src`,
`index.html`, and `vite.config.ts` are mounted, so a new top-level file under
`frontend/` will **not** be visible to the running dev server until the container is
rebuilt. Adding a file under `src/` is hot-reloaded normally; adding one elsewhere
needs `make restart`.