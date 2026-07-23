# @opsslate/suite-ui

Versioned visual and interaction foundation for applications in the OpsSlate
product family.

## Ownership

This package is the single owner of:

- OpsSlate semantic tokens and dark-theme behavior
- suite toolbar visuals and active-application behavior
- AppShell frame, responsive sidebar, footer, and account/action slots
- Button, Badge, Card, Checkbox, Dialog, Input, Label, Select, Separator,
  Table, Tabs, and Textarea primitives
- toast, skeleton, empty-state, and table-toolbar feedback patterns

Applications own data and integration adapters only: authentication, billing,
navigation models, account actions, and application-specific overlays.

## Consumption

Applications import the shared stylesheet once from their global stylesheet:

```css
@import "tailwindcss";
@import "@opsslate/suite-ui/styles.css";
@source "../../../../packages/suite-ui/src";
```

Primitives use explicit subpath imports:

```tsx
import { Button } from "@opsslate/suite-ui/button";
import { SuiteAppShell } from "@opsslate/suite-ui/shell";
```

## Version policy

- Patch: fixes that do not alter public geometry or behavior.
- Minor: additive exports or approved compatible components.
- Major: intentional breaking changes to tokens, geometry, variants, or shell
  contracts.
- OpsSlate and Helios pin the same workspace package version.
- A visual-regression review is required before a token, primitive, toolbar,
  sidebar, or shell change is accepted.

App-local copies and variant forks are not compatible changes.
